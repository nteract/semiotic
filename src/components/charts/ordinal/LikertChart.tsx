"use client"
import * as React from "react"
import { useMemo, useCallback, forwardRef, useRef, useImperativeHandle } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps, StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import { useChartMode } from "../shared/hooks"
import type { LegendInteractionMode } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor, CategoryFormatFn } from "../shared/types"
import { normalizeTooltip, defaultTooltipStyle, type TooltipProp } from "../../Tooltip/Tooltip"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useChartSetup } from "../shared/useChartSetup"
import { useStreamingLegend } from "../shared/useStreamingLegend"
import {
  useLikertAggregation,
  defaultDivergingScheme,
  NEUTRAL_NEG,
  NEUTRAL_POS,
} from "../shared/useLikertAggregation"

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
  barPadding?: number
  enableHover?: boolean
  showGrid?: boolean
  showCategoryTicks?: boolean
  showLegend?: boolean
  legendInteraction?: LegendInteractionMode
  legendPosition?: "right" | "left" | "top" | "bottom"
  tooltip?: TooltipProp
  annotations?: Record<string, any>[]
  /** Custom formatter for category tick labels */
  categoryFormat?: CategoryFormatFn
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
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
    onObservation, onClick, chartId, valueFormat,
    loading, emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
    categoryFormat,
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

  const isDiverging = orientation === "horizontal"
  const isPushMode = data === undefined
  const isRawMode = !levelAccessor

  // ── Color scheme ─────────────────────────────────────────────────────
  const colorScheme = useMemo(() => {
    if (colorSchemeProp && Array.isArray(colorSchemeProp) && colorSchemeProp.length >= levels.length) {
      return colorSchemeProp
    }
    return defaultDivergingScheme(levels.length)
  }, [colorSchemeProp, levels.length])

  const levelColorMap = useMemo(() => {
    const m = new Map<string, string>()
    for (let i = 0; i < levels.length; i++) {
      m.set(levels[i], colorScheme[i] || "#888")
    }
    return m
  }, [levels, colorScheme])

  // ── Aggregation (extracted hook) ───────────────────────────────────
  const { processedData, reAggregate, accumulatorRef } = useLikertAggregation({
    data,
    levels,
    categoryAccessor,
    valueAccessor,
    levelAccessor,
    countAccessor,
    isDiverging,
    frameRef,
  })

  // ── Streaming legend (for margin adjustment only — legend is deterministic) ──
  const effectiveColorBy = "__likertLevelLabel"
  const streaming = useStreamingLegend({
    isPushMode,
    colorBy: effectiveColorBy,
    colorScheme,
    showLegend,
    legendPosition: legendPositionProp,
  })

  const wrappedPush = useCallback(
    streaming.wrapPush((d: any) => {
      accumulatorRef.current.push(d)
      reAggregate(accumulatorRef.current)
    }),
    [streaming.wrapPush, reAggregate, accumulatorRef]
  )
  const wrappedPushMany = useCallback(
    streaming.wrapPushMany((d: any[]) => {
      accumulatorRef.current.push(...d)
      reAggregate(accumulatorRef.current)
    }),
    [streaming.wrapPushMany, reAggregate, accumulatorRef]
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
  }), [wrappedPush, wrappedPushMany, streaming.resetCategories, accumulatorRef])

  // ── Chart setup ──────────────────────────────────────────────────────
  const setup = useChartSetup({
    data: processedData,
    rawData: data,
    colorBy: effectiveColorBy,
    colorScheme,
    legendInteraction,
    legendPosition: legendPositionProp,
    selection,
    linkedHover,
    fallbackFields: ["__likertLevelLabel"],
    unwrapData: true,
    onObservation,
    onClick,
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

  // ── Neutral color (for split halves) ────────────────────────────────
  const neutralColor = useMemo(() => {
    const n = levels.length
    if (n % 2 !== 0) return levelColorMap.get(levels[Math.floor(n / 2)]) || "#888"
    return "#888"
  }, [levels, levelColorMap])

  // ── Piece style ──────────────────────────────────────────────────────
  const basePieceStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const label = d.__likertLevelLabel || d.data?.__likertLevelLabel
      const level = d.__likertLevel || d.data?.__likertLevel
      if (level === NEUTRAL_NEG || level === NEUTRAL_POS) {
        return { fill: neutralColor }
      }
      const key = label || level
      if (key && levelColorMap.has(key)) {
        return { fill: levelColorMap.get(key)! }
      }
      return { fill: "#888" }
    }
  }, [levelColorMap, neutralColor])

  const pieceStyle = useMemo(
    () => wrapStyleWithSelection(basePieceStyle, setup.effectiveSelectionHook, selection),
    [basePieceStyle, setup.effectiveSelectionHook, selection]
  )

  // ── Tooltip ──────────────────────────────────────────────────────────
  const neutralLevelName = useMemo(() => {
    const n = levels.length
    return n % 2 !== 0 ? levels[Math.floor(n / 2)] : ""
  }, [levels])

  const defaultTooltipContent = useMemo(() => {
    return (d: any) => {
      const row = d.data || d
      const rawLevel = row.__likertLevel || "Unknown"
      const level = (rawLevel === NEUTRAL_NEG || rawLevel === NEUTRAL_POS)
        ? neutralLevelName
        : rawLevel
      const category = row.__likertCategory || ""
      const rawPct = Math.abs(row.__likertPct || 0)
      const pct = (rawLevel === NEUTRAL_NEG || rawLevel === NEUTRAL_POS) ? rawPct * 2 : rawPct
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
    if (valueAccessor && levelAccessor) {
      return "LikertChart: provide either `valueAccessor` (raw responses) or `levelAccessor` + `countAccessor` (pre-aggregated), not both."
    }
    if (levelAccessor && !countAccessor) {
      return "LikertChart: pre-aggregated mode requires both `levelAccessor` and `countAccessor`."
    }
    if (data !== undefined && data.length === 0) return null
    const accessors: Record<string, any> = { categoryAccessor }
    if (isRawMode) {
      if (valueAccessor) accessors.valueAccessor = valueAccessor
    } else {
      if (levelAccessor) accessors.levelAccessor = levelAccessor
      if (countAccessor) accessors.countAccessor = countAccessor
    }
    return validateArrayData({
      componentName: "LikertChart",
      data,
      accessors,
      requiredProps: { levels },
    })
  }, [data, categoryAccessor, valueAccessor, levelAccessor, countAccessor, levels, isRawMode])

  // ── Legend ────────────────────────────────────────────────────────────
  const legendGroups = useMemo(() => {
    return [{
      styleFn: (item: { label: string }) => ({ fill: levelColorMap.get(item.label) || "#888" }),
      items: levels.map((l) => ({ label: l })),
      label: "",
    }]
  }, [levels, levelColorMap])

  const effectiveLegendProps = useMemo(() => {
    if (showLegend !== false) {
      return {
        ...setup.legendBehaviorProps,
        legend: { legendGroups },
        legendPosition: legendPositionProp || setup.legendPosition || "bottom",
      }
    }
    return setup.legendBehaviorProps
  }, [setup.legendBehaviorProps, setup.legendPosition, legendPositionProp, showLegend, legendGroups])

  const effectiveMargin = useMemo(() => {
    const m = { ...setup.margin }
    // In push mode, streaming legend can't discover categories from raw data
    // (it looks for __likertLevelLabel which isn't on raw inputs). Apply fixed
    // legend margin based on position since legend is deterministic from levels.
    if (isPushMode && showLegend !== false) {
      const pos = legendPositionProp || "bottom"
      if (pos === "bottom" && m.bottom < 80) m.bottom = 80
      else if (pos === "top" && m.top < 50) m.top = 50
      else if (pos === "right" && m.right < 110) m.right = 110
      else if (pos === "left" && m.left < 110) m.left = 110
    } else if (streaming.streamingMarginAdjust) {
      for (const [key, val] of Object.entries(streaming.streamingMarginAdjust)) {
        const k = key as keyof typeof m
        if (m[k] < val) m[k] = val
      }
    }
    if (isDiverging && m.left < 100) m.left = 100
    return m
  }, [setup.margin, streaming.streamingMarginAdjust, isDiverging, isPushMode, showLegend, legendPositionProp])

  // ── Axis format ────────────────────────────────────────────────────
  const rFormat = useMemo(() => {
    if (valueFormat) return valueFormat
    if (isDiverging) {
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
    normalize: false,
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
    ...(categoryFormat && { oFormat: categoryFormat }),
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
    ...((linkedHover || onObservation || onClick) && { customHoverBehavior: setup.customHoverBehavior }),
    ...((onObservation || onClick) && { customClickBehavior: setup.customClickBehavior }),
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
