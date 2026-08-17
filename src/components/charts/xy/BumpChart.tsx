"use client"

import * as React from "react"
import { forwardRef, useMemo } from "react"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { StreamXYFrameProps, Style } from "../../stream/types"
import { XYCustomChart } from "../custom/XYCustomChart"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import type { Datum } from "../shared/datumTypes"
import type { TooltipProp } from "../../Tooltip/Tooltip"
import type { StyleRule } from "../shared/styleRules"
import { useThemeCategorical } from "../shared/hooks"
import type { LegendValue } from "../../types/legendTypes"
import type { LegendInteractionMode, LegendPosition } from "../shared/useChartLegend"
import { useTheme } from "../../ThemeProvider"
import { useBumpTooltip } from "./bumpTooltip"
import { bumpLayout, type BumpLayoutConfig } from "./bumpLayout"
import {
  mapBumpAnnotations,
  rankBumpData,
  resolveBumpColorScheme,
} from "./bumpData"
import type {
  RankedBumpDatum,
} from "./bumpData"

export { mapBumpAnnotations, rankBumpData, resolveBumpColorScheme } from "./bumpData"
export type { RankBumpDataOptions, RankedBumpData, RankedBumpDatum } from "./bumpData"

export {
  bumpLayout,
  selectBumpLabelCandidates,
} from "./bumpLayout"
export type {
  BumpLayoutConfig,
  BumpLabelSelectionCandidate,
} from "./bumpLayout"

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
  /** Endpoint labels. `true` is equivalent to `"end"`; `"auto"` sheds labels by plot density. Default `true`. */
  showLabels?: boolean | "start" | "end" | "both" | "auto"
  /** Numeric field or accessor used to keep higher-priority labels when labels collide. */
  labelPriorityAccessor?: ChartAccessor<TDatum, number>
  /** Optional hard cap on visible labels when `showLabels="auto"`. */
  maxLabels?: number
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
  /** Tooltip configuration. Pass `"multi"` to compare every trajectory at the hovered x position. */
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
    labelPriorityAccessor,
    maxLabels,
    showAxes = true,
    showGrid = true,
    showLegend = false,
    enableHover = true,
    hoverHighlight = true,
    tooltip,
    frameProps = {},
    xFormat,
    yFormat,
    onClick,
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
    colorMap: resolvedColorScheme && typeof resolvedColorScheme === "object" && !Array.isArray(resolvedColorScheme)
      ? resolvedColorScheme
      : undefined,
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
    labelPriorityAccessor: labelPriorityAccessor as BumpLayoutConfig["labelPriorityAccessor"],
    maxLabels,
  }), [
    ribbon, curve, samplesPerSegment, ribbonSizeRange, ranked.valueExtent,
    ranked.seriesOrder, lineWidth, ribbonOpacity, lineOpacity, neutralColor, resolvedColorScheme,
    props.color, props.stroke, props.strokeWidth, props.opacity, styleRules,
    frameAreaStyle, framePointStyle, labelStyle, showPoints, pointRadius, showLabels,
    labelPriorityAccessor, maxLabels,
  ])

  const { tooltip: resolvedTooltip, formatX } = useBumpTooltip<TDatum>({
    tooltip,
    xValues: ranked.xValues,
    xFormat,
    yFormat,
  })

  const handleClick = useMemo(() => {
    if (!onClick) return undefined
    return (datum: Datum, event: { x: number; y: number }) => {
      const rankedDatum = datum as RankedBumpDatum<TDatum>
      onClick(rankedDatum.__bumpRaw ?? datum, event)
    }
  }, [onClick])

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
      tooltip={resolvedTooltip}
      onClick={handleClick}
      hoverRadius={props.hoverRadius}
      width={props.width}
      height={props.height}
      responsiveWidth={props.responsiveWidth}
      responsiveHeight={props.responsiveHeight}
      maxDevicePixelRatio={props.maxDevicePixelRatio}
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
