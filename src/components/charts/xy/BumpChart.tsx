"use client"

import * as React from "react"
import { forwardRef, useCallback, useMemo } from "react"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type {
  StreamXYFrameProps,
  AreaSceneNode,
  PointSceneNode,
  SceneNode,
  Style,
} from "../../stream/types"
import type { LayoutContext, LayoutResult } from "../../stream/customLayout"
import { useCustomLayoutSelection } from "../../stream/customLayoutSelection"
import { XYCustomChart } from "../custom/XYCustomChart"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import type { Datum } from "../shared/datumTypes"
import type { TooltipProp } from "../../Tooltip/Tooltip"
import { defaultTooltipStyle, normalizeTooltip } from "../../Tooltip/Tooltip"
import { resolveStyleRules, type StyleRule } from "../shared/styleRules"
import { resolveDefaultFill, useThemeCategorical } from "../shared/hooks"
import { buildBumpRibbonGeometry } from "../../geometry/bumpRibbonGeometry"
import type { LegendValue } from "../../types/legendTypes"
import type { LegendInteractionMode, LegendPosition } from "../shared/useChartLegend"
import { useTheme } from "../../ThemeProvider"

const OTHER_COLOR_GROUP = "Other"

export interface RankedBumpDatum<TDatum extends Datum = Datum> extends Datum {
  x: number
  y: number
  __bumpRaw: TDatum
  __bumpSeries: string
  __bumpColorGroup: string
  __bumpValue: number
  __bumpRank: number
  __bumpXValue: unknown
  __bumpHighlighted: boolean
}

export interface RankedBumpData<TDatum extends Datum = Datum> {
  data: RankedBumpDatum<TDatum>[]
  xValues: unknown[]
  seriesOrder: string[]
  overallOrder: string[]
  valueExtent: [number, number]
}

export interface RankBumpDataOptions<TDatum extends Datum = Datum> {
  xAccessor?: ChartAccessor<TDatum, number | Date | string>
  yAccessor?: ChartAccessor<TDatum, number>
  lineBy?: ChartAccessor<TDatum, string>
  rankDirection?: "descending" | "ascending"
  highlightTop?: number
}

function accessorValue<TDatum extends Datum, TValue>(
  accessor: ChartAccessor<TDatum, TValue>,
  datum: TDatum,
  index: number,
): TValue {
  return typeof accessor === "function"
    ? accessor(datum, index)
    : datum[accessor] as TValue
}

function xIdentity(value: unknown): string {
  if (value instanceof Date) return `date:${value.getTime()}`
  return `${typeof value}:${String(value)}`
}

export function mapBumpAnnotations(
  annotations: Datum[] | undefined,
  xValues: unknown[],
): Datum[] | undefined {
  if (!annotations?.length) return undefined
  const xIndexByKey = new Map(
    xValues.map((value, index) => [xIdentity(value), index]),
  )
  return annotations.map(annotation => {
    const mapped = { ...annotation }
    const mapField = (field: "x" | "x0" | "x1" | "value") => {
      if (!(field in annotation)) return
      const index = xIndexByKey.get(xIdentity(annotation[field]))
      if (index !== undefined) mapped[field] = index
    }
    mapField("x")
    mapField("x0")
    mapField("x1")
    if (
      typeof annotation.type === "string"
      && (annotation.type === "x-threshold" || annotation.type === "x")
    ) {
      mapField("value")
    }
    return mapped
  })
}

export function resolveBumpColorScheme(options: {
  seriesOrder: string[]
  overallOrder: string[]
  highlightTop?: number
  color?: string
  colorScheme?: string | string[] | Record<string, string>
  neutralColor?: string
  themeCategorical?: string[]
  themeNeutral?: string
}): string | string[] | Record<string, string> | undefined {
  const {
    seriesOrder,
    overallOrder,
    highlightTop,
    color,
    colorScheme,
    neutralColor,
    themeCategorical,
    themeNeutral,
  } = options
  if (highlightTop == null && color == null) return colorScheme

  const topCount = highlightTop == null
    ? overallOrder.length
    : Math.max(0, Math.floor(highlightTop))
  const highlighted = new Set(overallOrder.slice(0, topCount))
  const categoryIndexMap = new Map<string, number>()
  const resolved: Record<string, string> = {}
  for (const series of seriesOrder) {
    resolved[series] = color ?? (highlighted.has(series)
      ? resolveDefaultFill(undefined, themeCategorical, colorScheme, series, categoryIndexMap)
      : neutralColor ?? themeNeutral ?? "#b8bec8")
  }
  return resolved
}

/**
 * Rank every x-column and return the flattened, frame-ready rows used by
 * BumpChart. Ranking is ordinal and deterministic: equal values retain series
 * first-appearance order.
 */
export function rankBumpData<TDatum extends Datum = Datum>(
  input: TDatum[],
  options: RankBumpDataOptions<TDatum> = {},
): RankedBumpData<TDatum> {
  const xAccessor = options.xAccessor ?? ("x" as ChartAccessor<TDatum, number | Date | string>)
  const yAccessor = options.yAccessor ?? ("y" as ChartAccessor<TDatum, number>)
  const lineBy = options.lineBy ?? ("series" as ChartAccessor<TDatum, string>)
  const rankDirection = options.rankDirection ?? "descending"

  const xValues: unknown[] = []
  const xIndexByKey = new Map<string, number>()
  const rowsByX = new Map<number, Array<{ datum: TDatum; inputIndex: number; series: string; value: number }>>()
  const seriesOrder: string[] = []
  const seriesIndex = new Map<string, number>()

  let valueMin = Infinity
  let valueMax = -Infinity

  input.forEach((datum, inputIndex) => {
    const xValue = accessorValue(xAccessor, datum, inputIndex)
    const key = xIdentity(xValue)
    let xIndex = xIndexByKey.get(key)
    if (xIndex == null) {
      xIndex = xValues.length
      xIndexByKey.set(key, xIndex)
      xValues.push(xValue)
      rowsByX.set(xIndex, [])
    }

    const series = String(accessorValue(lineBy, datum, inputIndex))
    if (!seriesIndex.has(series)) {
      seriesIndex.set(series, seriesOrder.length)
      seriesOrder.push(series)
    }

    const value = Number(accessorValue(yAccessor, datum, inputIndex))
    if (!Number.isFinite(value)) return
    valueMin = Math.min(valueMin, value)
    valueMax = Math.max(valueMax, value)
    rowsByX.get(xIndex)?.push({ datum, inputIndex, series, value })
  })

  const rankedRows: Array<{
    datum: TDatum
    xIndex: number
    xValue: unknown
    series: string
    value: number
    rank: number
  }> = []
  const rankTotals = new Map<string, number>()
  const rankCounts = new Map<string, number>()

  for (let xIndex = 0; xIndex < xValues.length; xIndex++) {
    const rows = rowsByX.get(xIndex) ?? []
    rows.sort((a, b) => {
      const valueOrder = rankDirection === "descending"
        ? b.value - a.value
        : a.value - b.value
      return valueOrder || (seriesIndex.get(a.series) ?? 0) - (seriesIndex.get(b.series) ?? 0)
    })

    rows.forEach((row, rankIndex) => {
      const rank = rankIndex + 1
      rankedRows.push({
        datum: row.datum,
        xIndex,
        xValue: xValues[xIndex],
        series: row.series,
        value: row.value,
        rank,
      })
      rankTotals.set(row.series, (rankTotals.get(row.series) ?? 0) + rank)
      rankCounts.set(row.series, (rankCounts.get(row.series) ?? 0) + 1)
    })
  }

  const missingRank = seriesOrder.length + 1
  const overallOrder = [...seriesOrder].sort((a, b) => {
    const aCount = rankCounts.get(a) ?? 0
    const bCount = rankCounts.get(b) ?? 0
    const aAverage = ((rankTotals.get(a) ?? 0) + (xValues.length - aCount) * missingRank)
      / Math.max(1, xValues.length)
    const bAverage = ((rankTotals.get(b) ?? 0) + (xValues.length - bCount) * missingRank)
      / Math.max(1, xValues.length)
    return aAverage - bAverage
      || (seriesIndex.get(a) ?? 0) - (seriesIndex.get(b) ?? 0)
  })

  const topCount = options.highlightTop == null
    ? overallOrder.length
    : Math.max(0, Math.floor(options.highlightTop))
  const highlighted = new Set(overallOrder.slice(0, topCount))

  const data = rankedRows.map((row): RankedBumpDatum<TDatum> => {
    const isHighlighted = highlighted.has(row.series)
    return {
      ...row.datum,
      x: row.xIndex,
      y: row.rank,
      __bumpRaw: row.datum,
      __bumpSeries: row.series,
      __bumpColorGroup: isHighlighted ? row.series : OTHER_COLOR_GROUP,
      __bumpValue: row.value,
      __bumpRank: row.rank,
      __bumpXValue: row.xValue,
      __bumpHighlighted: isHighlighted,
    }
  })

  return {
    data,
    xValues,
    seriesOrder,
    overallOrder,
    valueExtent: valueMin === Infinity ? [0, 0] : [valueMin, valueMax],
  }
}

export interface BumpLayoutConfig {
  ribbon: boolean
  curve: "smooth" | "linear"
  samplesPerSegment: number
  ribbonSizeRange: [number, number]
  valueExtent: [number, number]
  seriesOrder: string[]
  lineWidth: number
  ribbonOpacity: number
  lineOpacity: number
  neutralColor?: string
  color?: string
  stroke?: string
  strokeWidth?: number
  opacity?: number
  styleRules?: ReadonlyArray<StyleRule>
  areaStyle?: (datum: Datum) => Style
  pointStyle?: (datum: Datum) => Style & { r?: number }
  labelStyle?: React.CSSProperties | ((datum: Datum) => React.CSSProperties)
  showPoints: boolean
  pointRadius: number
  showLabels: boolean | "start" | "end" | "both"
}

interface BumpLabelProps {
  datum: RankedBumpDatum
  x: number
  y: number
  side: "start" | "end"
  color: string
  highlighted: boolean
  labelStyle?: React.CSSProperties | ((datum: Datum) => React.CSSProperties)
}

function BumpLabel({
  datum,
  x,
  y,
  side,
  color,
  highlighted,
  labelStyle,
}: BumpLabelProps): React.ReactElement {
  const selection = useCustomLayoutSelection()
  const dimmed = selection.isActive && !selection.predicate(datum)
  const customStyle = typeof labelStyle === "function"
    ? labelStyle(datum.__bumpRaw)
    : labelStyle

  return (
    <text
      className="semiotic-bump-label"
      x={x + (side === "end" ? 8 : -8)}
      y={y}
      dy="0.35em"
      textAnchor={side === "end" ? "start" : "end"}
      fill={color}
      fillOpacity={dimmed ? 0.16 : 1}
      fontWeight={highlighted ? 650 : 450}
      style={{
        pointerEvents: "none",
        fontFamily: "var(--semiotic-font-family, sans-serif)",
        fontSize: "var(--semiotic-axis-label-font-size, 11px)",
        ...customStyle,
      }}
    >
      {datum.__bumpSeries}
    </text>
  )
}

function nodeBumpDatum(node: SceneNode): RankedBumpDatum | undefined {
  const datum = Array.isArray(node.datum) ? node.datum[0] : node.datum
  return datum && typeof datum === "object" && "__bumpSeries" in datum
    ? datum as RankedBumpDatum
    : undefined
}

function interpolateWidth(
  value: number,
  extent: [number, number],
  range: [number, number],
): number {
  const [domainMin, domainMax] = extent
  const [rangeMin, rangeMax] = range
  if (domainMax === domainMin) return (rangeMin + rangeMax) / 2
  const t = Math.max(0, Math.min(1, (value - domainMin) / (domainMax - domainMin)))
  return rangeMin + (rangeMax - rangeMin) * t
}

function numericStyleValue(value: unknown): number | undefined {
  const numeric = value instanceof Date ? value.getTime() : Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

function bumpRuleContext(datum: RankedBumpDatum) {
  return {
    value: datum.__bumpValue,
    x: numericStyleValue(datum.__bumpXValue),
    y: datum.__bumpValue,
    category: datum.__bumpSeries,
  }
}

export function bumpLayout(ctx: LayoutContext<BumpLayoutConfig>): LayoutResult {
  const config = ctx.config
  const bySeries = new Map<string, RankedBumpDatum[]>()
  for (const datum of ctx.data as RankedBumpDatum[]) {
    const rows = bySeries.get(datum.__bumpSeries) ?? []
    rows.push(datum)
    bySeries.set(datum.__bumpSeries, rows)
  }

  // Neutral trajectories paint first so the highlighted overall leaders stay
  // legible at crossings.
  const orderedSeries = config.seriesOrder
    .filter(series => bySeries.has(series))
    .sort((a, b) => {
      const ah = bySeries.get(a)?.[0]?.__bumpHighlighted ? 1 : 0
      const bh = bySeries.get(b)?.[0]?.__bumpHighlighted ? 1 : 0
      return ah - bh || config.seriesOrder.indexOf(a) - config.seriesOrder.indexOf(b)
    })

  const nodes: Array<AreaSceneNode | PointSceneNode> = []
  const labels: React.ReactNode[] = []

  for (const series of orderedSeries) {
    const rows = (bySeries.get(series) ?? []).sort((a, b) => a.x - b.x)
    if (rows.length < 2) continue

    const isHighlighted = rows[0].__bumpHighlighted
    const resolvedSeriesColor = ctx.resolveColor(rows[0].__bumpSeries, rows[0])
    const color = config.color ?? (isHighlighted
      ? resolvedSeriesColor
      : config.neutralColor
        ?? ctx.theme.semantic.textSecondary
        ?? ctx.theme.semantic.border
        ?? resolvedSeriesColor)
    const centers = rows.map(row => ({
      x: ctx.scales.x(row.x),
      y: ctx.scales.y(row.y),
      radius: config.ribbon
        ? interpolateWidth(row.__bumpValue, config.valueExtent, config.ribbonSizeRange) / 2
        : Math.max(0.5, config.lineWidth / 2),
    }))
    const geometry = buildBumpRibbonGeometry(centers, {
      curve: config.curve,
      samplesPerSegment: config.samplesPerSegment,
    })
    const sampledData = geometry.datumIndices.map(index => rows[index])

    // Both modes deliberately emit the same area node. Line mode is simply a
    // constant-width ribbon, so toggling `ribbon` interpolates the two
    // perpendicular boundaries without changing mark type or centerline.
    const areaStyle: Style = {
      fill: color,
      fillOpacity: 1,
      opacity: isHighlighted
        ? (config.ribbon ? config.ribbonOpacity : config.lineOpacity)
        : Math.min(config.ribbon ? config.ribbonOpacity : config.lineOpacity, 0.58),
    }
    if (config.styleRules?.length) {
      Object.assign(
        areaStyle,
        resolveStyleRules(rows[0].__bumpRaw, config.styleRules, bumpRuleContext(rows[0])),
      )
    }
    if (config.areaStyle) {
      Object.assign(areaStyle, config.areaStyle(rows[0].__bumpRaw) ?? {})
    }
    if (config.stroke !== undefined) areaStyle.stroke = config.stroke
    if (config.strokeWidth !== undefined) areaStyle.strokeWidth = config.strokeWidth
    if (config.opacity !== undefined) areaStyle.opacity = config.opacity

    nodes.push({
      type: "area",
      topPath: geometry.topPath,
      bottomPath: geometry.bottomPath,
      style: areaStyle,
      datum: sampledData,
      accessibleDatum: rows.map(row => row.__bumpRaw),
      accessibility: {
        label: `${series} ranking trajectory`,
        tableFields: rows.map(row => row.__bumpRaw),
      },
      group: series,
      interactive: true,
    })

    if (config.showPoints) {
      rows.forEach((row, index) => {
        const pointStyle: Style & { r?: number } = {
          fill: color,
          stroke: "none",
          opacity: isHighlighted ? 1 : 0.75,
        }
        if (config.styleRules?.length) {
          Object.assign(
            pointStyle,
            resolveStyleRules(row.__bumpRaw, config.styleRules, bumpRuleContext(row)),
          )
        }
        if (config.pointStyle) {
          Object.assign(pointStyle, config.pointStyle(row.__bumpRaw) ?? {})
        }
        if (config.stroke !== undefined) pointStyle.stroke = config.stroke
        if (config.strokeWidth !== undefined) pointStyle.strokeWidth = config.strokeWidth
        if (config.opacity !== undefined) pointStyle.opacity = config.opacity

        nodes.push({
          type: "point",
          x: centers[index].x,
          y: centers[index].y,
          r: pointStyle.r ?? config.pointRadius,
          style: pointStyle,
          datum: row,
          accessibleDatum: row.__bumpRaw,
          accessibility: {
            label: `${series}, rank ${row.__bumpRank}, value ${row.__bumpValue}`,
          },
          pointId: `${series}:${row.x}`,
        })
      })
    }

    const labelMode = config.showLabels === true ? "end" : config.showLabels
    const addLabel = (row: RankedBumpDatum, index: number, side: "start" | "end") => {
      labels.push(
        <BumpLabel
          key={`${series}-${side}`}
          datum={row}
          x={centers[index].x}
          y={centers[index].y}
          side={side}
          color={typeof areaStyle.fill === "string" ? areaStyle.fill : color}
          highlighted={isHighlighted}
          labelStyle={config.labelStyle}
        />,
      )
    }
    if (labelMode === "start" || labelMode === "both") addLabel(rows[0], 0, "start")
    if (labelMode === "end" || labelMode === "both") addLabel(rows.at(-1)!, rows.length - 1, "end")
  }

  return {
    nodes,
    overlays: labels.length ? <g className="semiotic-bump-labels">{labels}</g> : undefined,
    restyle: (node, selection) => {
      const datum = nodeBumpDatum(node)
      if (selection?.isActive && datum && !selection.predicate(datum)) {
        return { opacity: 0.14 }
      }
    },
  }
}

export interface BumpChartProps<TDatum extends Datum = Datum> extends BaseChartProps, AxisConfig {
  /** Flat observations. Each x-column is ranked from `yAccessor`. */
  data: TDatum[]
  /** Ranking column accessor. First-seen order determines the x-axis order. Default `"x"`. */
  xAccessor?: ChartAccessor<TDatum, number | Date | string>
  /** Numeric magnitude to rank and, in ribbon mode, encode as width. Default `"y"`. */
  yAccessor?: ChartAccessor<TDatum, number>
  /** Series identity accessor. Default `"series"`. */
  lineBy?: ChartAccessor<TDatum, string>
  /** Highest values rank first by default; use `"ascending"` for metrics where lower is better. */
  rankDirection?: "descending" | "ascending"
  /** Draw magnitude-encoded, perpendicular-offset areas instead of fixed-width lines. */
  ribbon?: boolean
  /** Centerline shape. Smooth uses horizontal-tangent cubic segments. Default `"smooth"`. */
  curve?: "smooth" | "linear"
  /** Full ribbon width range in pixels. Default `[4, 28]`. */
  ribbonSizeRange?: [number, number]
  /** Number of centerline samples per ranking interval. Default `12`. */
  samplesPerSegment?: number
  /** Fixed line width when `ribbon` is false. Default `3`. */
  lineWidth?: number
  /** Highlight only the N best series by mean rank; all others share `neutralColor`. */
  highlightTop?: number
  /** Shared color for trajectories outside `highlightTop`. */
  neutralColor?: string
  /** Ordered per-datum style rules. Trajectory rules resolve against each series' first observation. */
  styleRules?: StyleRule[]
  /** Style endpoint labels globally or per original datum. */
  labelStyle?: React.CSSProperties | ((datum: TDatum) => React.CSSProperties)
  colorScheme?: string | string[] | Record<string, string>
  ribbonOpacity?: number
  lineOpacity?: number
  showPoints?: boolean
  pointRadius?: number
  /** Endpoint labels. `true` is equivalent to `"end"`. Default `true`. */
  showLabels?: boolean | "start" | "end" | "both"
  showAxes?: boolean
  showGrid?: boolean
  showLegend?: boolean
  /** Additional legend content. */
  legend?: LegendValue
  legendInteraction?: LegendInteractionMode
  legendPosition?: LegendPosition
  enableHover?: boolean
  /** Dim every trajectory except the hovered series. Default `true`. */
  hoverHighlight?: boolean | "series"
  tooltip?: TooltipProp
  /** Annotation objects. X coordinates may use the original x values. */
  annotations?: Datum[]
  /** Additional frame props, with BumpChart geometry remaining controlled. */
  frameProps?: Partial<Omit<
    StreamXYFrameProps,
    "chartType" | "data" | "size" | "customLayout" | "layoutConfig"
  >>
}

/**
 * Ranking-based bump chart. Each x-column ranks its series by `yAccessor`, and
 * rank becomes vertical position. With `ribbon`, magnitude is encoded by true
 * screen-space ribbon thickness instead of a vertically interpolated area.
 *
 * @example
 * // Fixed-width ranking lines, coloring only the top 3 series by mean rank.
 * <BumpChart
 *   data={data}
 *   xAccessor="quarter"
 *   yAccessor="sales"
 *   lineBy="team"
 *   highlightTop={3}
 * />
 *
 * @example
 * // Magnitude-encoded ribbons (width ∝ value) with ascending rank for a
 * // "lower is better" metric.
 * <BumpChart
 *   data={data}
 *   xAccessor="week"
 *   yAccessor="latencyMs"
 *   lineBy="service"
 *   rankDirection="ascending"
 *   ribbon
 * />
 */
export const BumpChart = forwardRef(function BumpChart<TDatum extends Datum = Datum>(
  props: BumpChartProps<TDatum>,
  ref: React.Ref<RealtimeFrameHandle>,
) {
  const themeCategorical = useThemeCategorical()
  const theme = useTheme()
  const {
    data,
    xAccessor,
    yAccessor,
    lineBy,
    rankDirection = "descending",
    ribbon = false,
    curve = "smooth",
    ribbonSizeRange = [4, 28],
    samplesPerSegment = 12,
    lineWidth = 3,
    highlightTop,
    neutralColor,
    styleRules,
    labelStyle,
    colorScheme,
    ribbonOpacity = 0.82,
    lineOpacity = 0.9,
    showPoints = false,
    pointRadius = 3,
    showLabels = true,
    showAxes = true,
    showGrid = true,
    showLegend = false,
    enableHover = true,
    hoverHighlight = true,
    tooltip,
    frameProps = {},
  } = props

  const ranked = useMemo(
    () => rankBumpData(data, { xAccessor, yAccessor, lineBy, rankDirection, highlightTop }),
    [data, xAccessor, yAccessor, lineBy, rankDirection, highlightTop],
  )

  const {
    axes: userAxes,
    areaStyle: frameAreaStyle,
    pointStyle: framePointStyle,
    ...restFrameProps
  } = frameProps

  const resolvedColorScheme = useMemo(
    () => resolveBumpColorScheme({
      seriesOrder: ranked.seriesOrder,
      overallOrder: ranked.overallOrder,
      highlightTop,
      color: props.color,
      colorScheme,
      neutralColor,
      themeCategorical,
      themeNeutral: theme.colors.textSecondary,
    }),
    [
      ranked.seriesOrder,
      ranked.overallOrder,
      highlightTop,
      props.color,
      colorScheme,
      neutralColor,
      themeCategorical,
      theme.colors.textSecondary,
    ],
  )

  const layoutConfig = useMemo<BumpLayoutConfig>(() => ({
    ribbon,
    curve,
    samplesPerSegment,
    ribbonSizeRange,
    valueExtent: ranked.valueExtent,
    seriesOrder: ranked.seriesOrder,
    lineWidth,
    ribbonOpacity,
    lineOpacity,
    neutralColor,
    color: props.color,
    stroke: props.stroke,
    strokeWidth: props.strokeWidth,
    opacity: props.opacity,
    styleRules,
    areaStyle: frameAreaStyle as ((datum: Datum) => Style) | undefined,
    pointStyle: framePointStyle as ((datum: Datum) => Style & { r?: number }) | undefined,
    labelStyle: labelStyle as BumpLayoutConfig["labelStyle"],
    showPoints,
    pointRadius,
    showLabels,
  }), [
    ribbon, curve, samplesPerSegment, ribbonSizeRange, ranked.valueExtent,
    ranked.seriesOrder, lineWidth, ribbonOpacity, lineOpacity, neutralColor,
    props.color, props.stroke, props.strokeWidth, props.opacity, styleRules,
    frameAreaStyle, framePointStyle, labelStyle, showPoints, pointRadius, showLabels,
  ])

  const formatX = useCallback((value: number | Date | string, index?: number) => {
    if (ranked.xValues.length === 0) return ""
    const numericIndex = Math.max(0, Math.min(ranked.xValues.length - 1, Math.round(Number(value))))
    const raw = ranked.xValues[numericIndex] as number | Date | string
    return props.xFormat ? props.xFormat(raw, index) : String(raw instanceof Date ? raw.toLocaleDateString() : raw)
  }, [ranked.xValues, props.xFormat])

  const formatValue = useCallback((value: number) => {
    return props.yFormat ? props.yFormat(value) : value.toLocaleString()
  }, [props.yFormat])

  const normalizedTooltip = useMemo(
    () => tooltip === "multi" ? undefined : normalizeTooltip(tooltip),
    [tooltip],
  )
  const tooltipContent = useCallback((hover: Datum) => {
    const internal = (hover?.data ?? hover) as RankedBumpDatum<TDatum> | undefined
    if (!internal) return null
    if (tooltip === false) return null
    if (normalizedTooltip) {
      return normalizedTooltip({
        ...hover,
        data: internal.__bumpRaw,
        __semioticHoverData: true,
      })
    }
    return (
      <div className="semiotic-tooltip" style={defaultTooltipStyle}>
        <div style={{ fontWeight: 700 }}>{internal.__bumpSeries}</div>
        <div>{formatX(internal.x)} · Rank {internal.__bumpRank}</div>
        <div>Value: {formatValue(internal.__bumpValue)}</div>
      </div>
    )
  }, [formatValue, formatX, normalizedTooltip, tooltip])

  const handleClick = useMemo(() => {
    if (!props.onClick) return undefined
    return (datum: Datum, event: { x: number; y: number }) => {
      const rankedDatum = datum as RankedBumpDatum<TDatum>
      props.onClick?.(rankedDatum.__bumpRaw ?? datum, event)
    }
  }, [props.onClick])

  const maxRank = Math.max(1, ranked.seriesOrder.length)
  const xTickValues = ranked.xValues.map((_, index) => index)
  const yTickValues = Array.from({ length: maxRank }, (_, index) => index + 1)
  const axes = userAxes ?? [
    {
      orient: "left" as const,
      tickValues: yTickValues,
      tickFormat: (value: string | number | Date) => String(value),
      label: props.yLabel ?? "Rank",
      baseline: false,
    },
    {
      orient: "bottom" as const,
      tickValues: xTickValues,
      tickFormat: formatX,
      label: props.xLabel,
      tickAnchor: "edges" as const,
    },
  ]

  const mappedAnnotations = useMemo(
    () => mapBumpAnnotations(props.annotations, ranked.xValues),
    [props.annotations, ranked.xValues],
  )

  return (
    <XYCustomChart
      ref={ref}
      data={ranked.data}
      layout={bumpLayout}
      layoutConfig={layoutConfig}
      xExtent={[0, Math.max(1, ranked.xValues.length - 1)]}
      yExtent={[maxRank + 0.5, 0.5]}
      showAxes={showAxes}
      showGrid={showGrid}
      showLegend={showLegend}
      enableHover={enableHover}
      hoverHighlight={hoverHighlight}
      colorBy="__bumpSeries"
      colorScheme={resolvedColorScheme}
      tooltip={tooltipContent}
      onClick={handleClick}
      hoverRadius={props.hoverRadius}
      width={props.width}
      height={props.height}
      responsiveWidth={props.responsiveWidth}
      responsiveHeight={props.responsiveHeight}
      responsiveRules={props.responsiveRules}
      mobileInteraction={props.mobileInteraction}
      mobileSemantics={props.mobileSemantics}
      mode={props.mode}
      margin={props.margin ?? { top: 20, right: showLabels ? 110 : 24, bottom: 48, left: 48 }}
      className={props.className}
      title={props.title}
      description={props.description}
      summary={props.summary}
      accessibleTable={props.accessibleTable}
      selection={props.selection}
      linkedHover={props.linkedHover}
      legend={props.legend}
      legendInteraction={props.legendInteraction}
      legendPosition={props.legendPosition}
      onObservation={props.onObservation}
      chartId={props.chartId}
      loading={props.loading}
      loadingContent={props.loadingContent}
      emptyContent={props.emptyContent}
      animate={props.animate}
      autoPlaceAnnotations={props.autoPlaceAnnotations}
      annotations={mappedAnnotations}
      xLabel={props.xLabel}
      yLabel={props.yLabel ?? "Rank"}
      frameProps={{
        axes,
        axisExtent: "exact",
        ...restFrameProps,
      }}
    />
  )
}) as unknown as {
  <TDatum extends Datum = Datum>(
    props: BumpChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>
  ): React.ReactElement | null
  displayName?: string
}

;(BumpChart as { displayName?: string }).displayName = "BumpChart"
