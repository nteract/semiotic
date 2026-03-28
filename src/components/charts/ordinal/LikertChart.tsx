"use client"
import * as React from "react"
import { useMemo, useCallback, forwardRef, useRef, useImperativeHandle } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps, StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useChartMode, useThemeCategorical, resolveDefaultFill } from "../shared/hooks"
import type { LegendInteractionMode } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, defaultTooltipStyle, type TooltipProp } from "../../Tooltip/Tooltip"
import { buildOrdinalTooltip } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useChartSetup } from "../shared/useChartSetup"
import { useStreamingLegend } from "../shared/useStreamingLegend"

/**
 * LikertChart — visualize Likert scale survey responses.
 *
 * Supports two data formats:
 *
 * **Raw responses** — each row is one respondent's answer:
 * ```
 * [{ question: "Q1", score: 4 }, { question: "Q1", score: 2 }, ...]
 * ```
 * Set `valueAccessor` to the integer score field. Scores are mapped to
 * `levels` by index (score 1 → levels[0], score 2 → levels[1], …).
 *
 * **Pre-aggregated** — each row is a (question, level, count) triple:
 * ```
 * [{ question: "Q1", level: "Agree", count: 45 }, ...]
 * ```
 * Set `levelAccessor` and `countAccessor`.
 *
 * **Orientation:**
 * - `"horizontal"` (default) — diverging bar chart centered at 0%.
 *   Negative levels extend left, positive right. If `levels` has an odd
 *   count, the center level is split 50/50 across the centerline and drawn
 *   in a neutral color. Even counts split cleanly at the midpoint.
 * - `"vertical"` — stacked 100% bar chart, levels stacked bottom-to-top.
 *
 * **Important:** The diverging layout assigns meaning by position in the
 * `levels` array. The first half is treated as "negative", the second half
 * as "positive", and (if odd) the middle entry as "neutral". If your data
 * doesn't follow this low-to-high convention, the chart will misrepresent
 * the polarity.
 */

export interface LikertChartProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  data?: TDatum[]

  /** Question / item accessor — the ordinal axis. */
  categoryAccessor?: ChartAccessor<TDatum, string>

  /**
   * Integer score accessor (raw response mode).
   * Scores are 1-based: score 1 maps to levels[0], score 2 to levels[1], etc.
   * Mutually exclusive with levelAccessor/countAccessor.
   */
  valueAccessor?: ChartAccessor<TDatum, number>

  /**
   * Level name accessor (pre-aggregated mode).
   * Each value must match an entry in `levels`.
   */
  levelAccessor?: ChartAccessor<TDatum, string>

  /**
   * Count/frequency accessor (pre-aggregated mode). Defaults to "count".
   */
  countAccessor?: ChartAccessor<TDatum, number>

  /**
   * Ordered response labels from most negative to most positive.
   * Example (5-point): ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]
   * Example (4-point): ["Strongly Disagree", "Disagree", "Agree", "Strongly Agree"]
   *
   * Odd count → center level is neutral. Even count → clean negative/positive split.
   */
  levels: string[]

  /**
   * "horizontal" (default): diverging bar chart centered at 0%.
   * "vertical": stacked 100% bar chart.
   */
  orientation?: "horizontal" | "vertical"

  /**
   * One color per level. Should match the length of `levels`.
   * For diverging orientation, use a diverging palette (red→neutral→blue).
   */
  colorScheme?: string[]

  categoryLabel?: string
  valueLabel?: string
  valueFormat?: (d: number | string) => string
  colorBy?: ChartAccessor<TDatum, string>
  barPadding?: number
  enableHover?: boolean
  showGrid?: boolean
  showCategoryTicks?: boolean
  showLegend?: boolean
  legendInteraction?: LegendInteractionMode
  legendPosition?: "right" | "left" | "top" | "bottom"
  tooltip?: TooltipProp
  annotations?: Record<string, any>[]
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

// ── Helpers ──────────────────────────────────────────────────────────────

function resolveAccessorFn<T>(accessor: string | ((d: any) => T) | undefined, fallback: string): (d: any) => T {
  if (typeof accessor === "function") return accessor
  const key = (accessor as string) || fallback
  return (d: any) => d[key]
}

/**
 * Generate a diverging color scheme for N levels.
 * Interpolates from red → gray → blue for odd, red → blue for even.
 */
function defaultDivergingScheme(n: number): string[] {
  // Carbon-inspired diverging: red → neutral gray → blue
  const negColors = ["#da1e28", "#ff8389", "#ffb3b8"]
  const posColors = ["#a6c8ff", "#4589ff", "#0043ce"]
  const neutral = "#a8a8a8"

  if (n <= 0) return []
  if (n === 1) return [neutral]

  const isOdd = n % 2 !== 0
  const halfSize = Math.floor(n / 2)

  const result: string[] = []

  // Negative side
  for (let i = 0; i < halfSize; i++) {
    const idx = Math.min(i, negColors.length - 1)
    result.push(negColors[Math.min(Math.floor(i * negColors.length / halfSize), negColors.length - 1)])
  }

  // Neutral center (if odd)
  if (isOdd) result.push(neutral)

  // Positive side
  for (let i = 0; i < halfSize; i++) {
    result.push(posColors[Math.min(Math.floor(i * posColors.length / halfSize), posColors.length - 1)])
  }

  return result
}

interface AggregatedRow {
  __likertCategory: string
  __likertLevel: string
  __likertCount: number
  __likertPct: number
  __likertLevelIndex: number
}

function aggregateData(
  data: any[],
  levels: string[],
  getCat: (d: any) => string,
  getScore: ((d: any) => number) | null,
  getLevel: ((d: any) => string) | null,
  getCount: ((d: any) => number) | null,
): AggregatedRow[] {
  // Build counts per category per level
  const counts = new Map<string, Map<string, number>>()

  for (const d of data) {
    const cat = getCat(d)
    if (!counts.has(cat)) counts.set(cat, new Map<string, number>())
    const catMap = counts.get(cat)!

    if (getScore) {
      // Raw response mode: score → level
      const score = getScore(d)
      if (score == null || !Number.isFinite(score)) continue
      const idx = Math.round(score) - 1 // 1-based → 0-based
      if (idx < 0 || idx >= levels.length) continue
      const level = levels[idx]
      catMap.set(level, (catMap.get(level) || 0) + 1)
    } else if (getLevel && getCount) {
      // Pre-aggregated mode
      const level = getLevel(d)
      const count = getCount(d)
      if (!levels.includes(level)) continue
      catMap.set(level, (catMap.get(level) || 0) + (Number.isFinite(count) ? count : 0))
    }
  }

  // Compute percentages and build output
  const rows: AggregatedRow[] = []
  for (const [cat, catMap] of counts) {
    let total = 0
    for (const level of levels) total += catMap.get(level) || 0
    if (total === 0) continue

    for (let li = 0; li < levels.length; li++) {
      const level = levels[li]
      const count = catMap.get(level) || 0
      rows.push({
        __likertCategory: cat,
        __likertLevel: level,
        __likertCount: count,
        __likertPct: (count / total) * 100,
        __likertLevelIndex: li,
      })
    }
  }

  return rows
}

/** Sentinel level names for the neutral split halves */
const NEUTRAL_NEG = "__likert_neutral_neg"
const NEUTRAL_POS = "__likert_neutral_pos"

/**
 * Transform percentages into diverging values.
 * Negative levels get negative %, positive get positive %.
 * Neutral (if odd) is split into two halves that straddle zero.
 */
function toDivergingValues(rows: AggregatedRow[], levels: string[]): AggregatedRow[] {
  const n = levels.length
  const isOdd = n % 2 !== 0
  const midIdx = Math.floor(n / 2)

  const result: AggregatedRow[] = []
  for (const r of rows) {
    const li = r.__likertLevelIndex

    if (isOdd && li === midIdx) {
      // Neutral: split into two halves centered on zero
      const half = r.__likertPct / 2
      result.push({ ...r, __likertLevel: NEUTRAL_NEG, __likertPct: -half })
      result.push({ ...r, __likertLevel: NEUTRAL_POS, __likertPct: half })
    } else if (li < midIdx) {
      result.push({ ...r, __likertPct: -r.__likertPct })
    } else {
      result.push(r)
    }
  }
  return result
}

/**
 * For diverging mode, reorder levels so that:
 * 1. Negative levels stack in reverse order (most negative first, touching center last)
 * 2. Neutral halves straddle the center (neg half last on left, pos half first on right)
 * 3. Positive levels stack outward from center
 *
 * The bar scene builder stacks in discovery order, so we control the visual
 * layout by controlling the data order.
 */
function orderForDiverging(rows: AggregatedRow[], levels: string[]): AggregatedRow[] {
  const n = levels.length
  const isOdd = n % 2 !== 0
  const midIdx = Math.floor(n / 2)

  // Group by category, then reorder within each
  const byCategory = new Map<string, AggregatedRow[]>()
  for (const r of rows) {
    const arr = byCategory.get(r.__likertCategory) || []
    arr.push(r)
    byCategory.set(r.__likertCategory, arr)
  }

  const result: AggregatedRow[] = []
  for (const [, catRows] of byCategory) {
    // Index by level index for standard levels, and by sentinel name for neutral halves
    const byIdx = new Map<number, AggregatedRow>()
    let neutralNeg: AggregatedRow | undefined
    let neutralPos: AggregatedRow | undefined
    for (const r of catRows) {
      if (r.__likertLevel === NEUTRAL_NEG) neutralNeg = r
      else if (r.__likertLevel === NEUTRAL_POS) neutralPos = r
      else byIdx.set(r.__likertLevelIndex, r)
    }

    // Bar scene builder stacks in discovery order: first negative item = closest to 0.
    // We want: neutralNeg at center (closest to 0), then less-negative, then most-negative (leftmost).
    // So: neutralNeg first, then reversed negatives (midIdx-1 down to 0).
    if (isOdd && neutralNeg) result.push(neutralNeg)
    // Negative levels: reversed so less-extreme is closer to center
    for (let i = midIdx - 1; i >= 0; i--) {
      const r = byIdx.get(i)
      if (r) result.push(r)
    }
    // Neutral positive half (closest to center on right)
    if (isOdd && neutralPos) result.push(neutralPos)
    // Positive levels: in order (closest to center first)
    const posStart = isOdd ? midIdx + 1 : midIdx
    for (let i = posStart; i < n; i++) {
      const r = byIdx.get(i)
      if (r) result.push(r)
    }
  }

  return result
}

// ── Component ────────────────────────────────────────────────────────────

export const LikertChart = forwardRef(function LikertChart<TDatum extends Record<string, any> = Record<string, any>>(
  props: LikertChartProps<TDatum>,
  ref: React.Ref<RealtimeFrameHandle>
) {
  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showGrid: props.showGrid,
    enableHover: props.enableHover,
    showLegend: props.showLegend,
    title: props.title,
    description: props.description,
    accessibleTable: props.accessibleTable,
    summary: props.summary,
    categoryLabel: props.categoryLabel,
    valueLabel: props.valueLabel,
    showCategoryTicks: props.showCategoryTicks,
    orientation: props.orientation,
  })

  const frameRef = useRef<StreamOrdinalFrameHandle>(null)

  const {
    data, margin: userMargin, className,
    categoryAccessor = "question", valueAccessor, levelAccessor, countAccessor = "count",
    levels, orientation = "horizontal",
    colorScheme: colorSchemeProp, barPadding = 20,
    tooltip, annotations, frameProps = {}, selection, linkedHover,
    onObservation, chartId, valueFormat,
    loading, emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
    color, colorBy,
  } = props

  const width = resolved.width
  const height = resolved.height
  const enableHover = resolved.enableHover
  const showGrid = resolved.showGrid
  const showLegend = resolved.showLegend
  const title = resolved.title
  const description = resolved.description
  const summary = resolved.summary
  const accessibleTable = resolved.accessibleTable
  const categoryLabel = resolved.categoryLabel
  const valueLabel = resolved.valueLabel

  // ── Resolve data format ──────────────────────────────────────────────
  const isRawMode = !levelAccessor
  const getCat = useMemo(() => resolveAccessorFn<string>(categoryAccessor, "question"), [categoryAccessor])
  const getScore = useMemo(() => isRawMode ? resolveAccessorFn<number>(valueAccessor, "score") : null, [isRawMode, valueAccessor])
  const getLevel = useMemo(() => !isRawMode ? resolveAccessorFn<string>(levelAccessor, "level") : null, [isRawMode, levelAccessor])
  const getCount = useMemo(() => !isRawMode ? resolveAccessorFn<number>(countAccessor, "count") : null, [isRawMode, countAccessor])

  const safeData = data || []
  const isDiverging = orientation === "horizontal"
  const isPushMode = data === undefined
  // Accumulator for push mode — stores raw pushed data for re-aggregation
  const accumulatorRef = useRef<any[]>([])

  // ── Color scheme ─────────────────────────────────────────────────────
  const colorScheme = useMemo(() => {
    if (colorSchemeProp && Array.isArray(colorSchemeProp) && colorSchemeProp.length >= levels.length) {
      return colorSchemeProp
    }
    return defaultDivergingScheme(levels.length)
  }, [colorSchemeProp, levels.length])

  // Map level names to colors
  const levelColorMap = useMemo(() => {
    const m = new Map<string, string>()
    for (let i = 0; i < levels.length; i++) {
      m.set(levels[i], colorScheme[i] || "#888")
    }
    return m
  }, [levels, colorScheme])

  // ── Aggregate and transform ──────────────────────────────────────────
  const processedData = useMemo(() => {
    if (safeData.length === 0) return []

    let agg = aggregateData(safeData, levels, getCat, getScore, getLevel, getCount)
    if (isDiverging) {
      agg = toDivergingValues(agg, levels)
      agg = orderForDiverging(agg, levels)
    }
    return agg
  }, [safeData, levels, getCat, getScore, getLevel, getCount, isDiverging])

  // ── Streaming legend ─────────────────────────────────────────────────
  const actualColorBy = "__likertLevel"
  const streaming = useStreamingLegend({
    isPushMode,
    colorBy: actualColorBy,
    colorScheme,
    showLegend,
    legendPosition: legendPositionProp,
  })

  // For push mode, we need to accumulate raw data and re-aggregate on each push,
  // because likert charts require full re-aggregation (percentages change with every new datum).
  const reAggregate = useCallback((rawData: any[]) => {
    let agg = aggregateData(rawData, levels, getCat, getScore, getLevel, getCount)
    if (isDiverging) {
      agg = toDivergingValues(agg, levels)
      agg = orderForDiverging(agg, levels)
    }
    // Replace all frame data with newly aggregated data
    frameRef.current?.clear()
    if (agg.length > 0) {
      frameRef.current?.pushMany(agg)
    }
  }, [levels, getCat, getScore, getLevel, getCount, isDiverging])

  const wrappedPush = useCallback(
    streaming.wrapPush((d: any) => {
      accumulatorRef.current.push(d)
      reAggregate(accumulatorRef.current)
    }),
    [streaming.wrapPush, reAggregate]
  )
  const wrappedPushMany = useCallback(
    streaming.wrapPushMany((d: any[]) => {
      accumulatorRef.current.push(...d)
      reAggregate(accumulatorRef.current)
    }),
    [streaming.wrapPushMany, reAggregate]
  )

  useImperativeHandle(ref, () => ({
    push: wrappedPush,
    pushMany: wrappedPushMany,
    clear: () => {
      accumulatorRef.current = []
      streaming.resetCategories()
      frameRef.current?.clear()
    },
    getData: () => frameRef.current?.getData() ?? []
  }), [wrappedPush, wrappedPushMany, streaming.resetCategories])

  // ── Chart setup ──────────────────────────────────────────────────────
  const setup = useChartSetup({
    data: processedData,
    rawData: data,
    colorBy: actualColorBy,
    colorScheme,
    legendInteraction,
    legendPosition: legendPositionProp,
    selection,
    linkedHover,
    fallbackFields: ["__likertLevel"],
    unwrapData: true,
    onObservation,
    chartType: "LikertChart",
    chartId,
    showLegend,
    userMargin,
    marginDefaults: resolved.marginDefaults,
    loading,
    emptyContent,
    width,
    height,
  })

  if (setup.earlyReturn) return setup.earlyReturn

  const themeCategorical = useThemeCategorical()

  // ── Neutral color (for split halves) ────────────────────────────────
  const neutralColor = useMemo(() => {
    const n = levels.length
    if (n % 2 !== 0) return levelColorMap.get(levels[Math.floor(n / 2)]) || "#888"
    return "#888"
  }, [levels, levelColorMap])

  // ── Piece style ──────────────────────────────────────────────────────
  const basePieceStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const level = d.__likertLevel || d.data?.__likertLevel
      // Map neutral split sentinel names back to the neutral color
      if (level === NEUTRAL_NEG || level === NEUTRAL_POS) {
        return { fill: neutralColor }
      }
      if (level && levelColorMap.has(level)) {
        return { fill: levelColorMap.get(level)! }
      }
      return { fill: "#888" }
    }
  }, [levelColorMap, neutralColor])

  const pieceStyle = useMemo(
    () => wrapStyleWithSelection(basePieceStyle, setup.effectiveSelectionHook, selection),
    [basePieceStyle, setup.effectiveSelectionHook, selection]
  )

  // ── Tooltip ──────────────────────────────────────────────────────────
  // Map sentinel level names back to the original neutral level name
  const neutralLevelName = useMemo(() => {
    const n = levels.length
    return n % 2 !== 0 ? levels[Math.floor(n / 2)] : ""
  }, [levels])

  const defaultTooltipContent = useMemo(() => {
    return (d: any) => {
      const row = d.data || d
      const rawLevel = row.__likertLevel || "Unknown"
      // Map sentinel names back to readable level name
      const level = (rawLevel === NEUTRAL_NEG || rawLevel === NEUTRAL_POS)
        ? neutralLevelName
        : rawLevel
      const category = row.__likertCategory || ""
      const pct = Math.abs(row.__likertPct || 0)
      const count = row.__likertCount || 0
      return React.createElement("div", { className: "semiotic-tooltip", style: defaultTooltipStyle },
        React.createElement("div", { style: { fontWeight: "bold" } }, category),
        React.createElement("div", { style: { marginTop: 4 } },
          `${level}: ${pct.toFixed(1)}% (n=${count})`
        )
      )
    }
  }, [neutralLevelName])

  // ── Validation ───────────────────────────────────────────────────────
  const validationError = useMemo(() => {
    if (!levels || levels.length < 2) {
      return "LikertChart requires `levels` with at least 2 entries."
    }
    if (data !== undefined && data.length === 0) return null
    return validateArrayData({
      componentName: "LikertChart",
      data,
      accessors: { categoryAccessor },
      requiredProps: { levels },
    })
  }, [data, categoryAccessor, levels])

  // ── Legend ────────────────────────────────────────────────────────────
  // Build a custom legend that shows levels in correct order with their colors
  const legendGroups = useMemo(() => {
    return [{
      styleFn: (item: { label: string }) => ({ fill: levelColorMap.get(item.label) || "#888" }),
      items: levels.map((l) => ({ label: l })),
      label: "",
    }]
  }, [levels, levelColorMap])

  const effectiveLegendProps = useMemo(() => {
    if (streaming.streamingLegend) {
      return {
        ...setup.legendBehaviorProps,
        legend: streaming.streamingLegend,
        legendPosition: legendPositionProp || setup.legendPosition,
      }
    }
    if (showLegend !== false) {
      return {
        ...setup.legendBehaviorProps,
        legend: { legendGroups },
        legendPosition: legendPositionProp || setup.legendPosition || "bottom",
      }
    }
    return setup.legendBehaviorProps
  }, [setup.legendBehaviorProps, setup.legendPosition, streaming.streamingLegend, legendPositionProp, showLegend, legendGroups])

  const effectiveMargin = useMemo(() => {
    const m = { ...setup.margin }
    if (streaming.streamingMarginAdjust) {
      for (const [key, val] of Object.entries(streaming.streamingMarginAdjust)) {
        const k = key as keyof typeof m
        if (m[k] < val) m[k] = val
      }
    }
    // Diverging horizontal needs wider left margin for category labels
    if (isDiverging && m.left < 100) m.left = 100
    return m
  }, [setup.margin, streaming.streamingMarginAdjust, isDiverging])

  // ── Axis format for diverging ────────────────────────────────────────
  const rFormat = useMemo(() => {
    if (valueFormat) return valueFormat
    if (isDiverging) {
      // Show absolute percentage values on the diverging axis
      return (v: number | string) => `${Math.abs(Number(v)).toFixed(0)}%`
    }
    return (v: number | string) => `${Number(v).toFixed(0)}%`
  }, [isDiverging, valueFormat])

  // ── Build frame props ────────────────────────────────────────────────
  const streamProps: StreamOrdinalFrameProps = {
    chartType: "bar",
    ...(data != null && { data: processedData }),
    oAccessor: "__likertCategory",
    rAccessor: "__likertPct",
    stackBy: "__likertLevel",
    normalize: !isDiverging, // Vertical mode normalizes to 100%
    projection: isDiverging ? "horizontal" : "vertical",
    pieceStyle,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: effectiveMargin,
    barPadding,
    enableHover,
    showAxes: resolved.showAxes,
    oLabel: categoryLabel,
    rLabel: valueLabel || (isDiverging ? undefined : "Percentage"),
    rFormat,
    showGrid,
    ...effectiveLegendProps,
    ...(title && { title }),
    ...(description && { description }),
    ...(summary && { summary }),
    ...(accessibleTable !== undefined && { accessibleTable }),
    ...(className && { className }),
    tooltipContent: tooltip === false
      ? () => null
      : tooltip === true
        ? defaultTooltipContent
        : (normalizeTooltip(tooltip) || defaultTooltipContent),
    ...((linkedHover || onObservation) && { customHoverBehavior: setup.customHoverBehavior }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...frameProps
  }

  if (validationError) {
    return <ChartError componentName="LikertChart" message={validationError} width={width} height={height} />
  }

  return (
    <SafeRender componentName="LikertChart" width={width} height={height}>
      <StreamOrdinalFrame ref={frameRef} {...streamProps} />
    </SafeRender>
  )
}) as unknown as {
  <TDatum extends Record<string, any> = Record<string, any>>(
    props: LikertChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>
  ): React.ReactElement | null
  displayName?: string
}
LikertChart.displayName = "LikertChart"
