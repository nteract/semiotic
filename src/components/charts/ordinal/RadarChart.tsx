"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import { buildBaseMetadataProps, buildCustomBehaviorProps, buildTooltipProps } from "../shared/streamPropsHelpers"
import * as React from "react"
import { useMemo, forwardRef, useRef } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps, StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import type { Style } from "../../stream/types"
import { useChartMode, useThemeCategorical } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor, CategoryFormatFn } from "../shared/types"
import { type TooltipProp } from "../../Tooltip/Tooltip"
import { buildOrdinalTooltip } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { useOrdinalPieceStyle } from "../shared/useOrdinalPieceStyle"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useChartSetup } from "../shared/useChartSetup"
import { resolveOrdinalAxisChrome } from "../../legendLayout"
import { useFrameImperativeHandle } from "../shared/useFrameImperativeHandle"
import { makeRuleValueResolver, type StyleRule } from "../shared/styleRules"

export interface RadarChartProps<TDatum extends Datum = Datum> extends BaseChartProps {
  data?: TDatum[]
  /** Axis around the radar (the variables being compared). @default "attribute" */
  categoryAccessor?: ChartAccessor<TDatum, string>
  /** Magnitude along each axis. @default "value" */
  valueAccessor?: ChartAccessor<TDatum, number>
  /**
   * Series identity — points with the same series are connected into a
   * polygon. Defaults to `colorBy` when that is a string.
   */
  seriesAccessor?: ChartAccessor<TDatum, string>
  colorBy?: ChartAccessor<TDatum, string>
  colorScheme?: string | string[] | Record<string, string>
  /** Ordered data-aware point styling; fieldless thresholds use `valueAccessor`. */
  styleRules?: StyleRule[]
  pointRadius?: number
  /** Fixed value-axis domain. Defaults to `[0, data-max]`. */
  valueExtent?: [number | undefined, number | undefined] | [number]
  enableHover?: boolean
  showGrid?: boolean
  showLegend?: boolean
  legendInteraction?: LegendInteractionMode
  legendPosition?: LegendPosition
  tooltip?: TooltipProp
  annotations?: Datum[]
  categoryFormat?: CategoryFormatFn
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

/**
 * RadarChart — multivariate comparison on a shared radial axis.
 *
 * Each category is an axis around the circle; each series is a connected
 * polygon. Data should be long-form: one row per (series, attribute).
 *
 * @example
 * ```tsx
 * <RadarChart
 *   data={[
 *     { name: "A", attribute: "speed", value: 80 },
 *     { name: "A", attribute: "power", value: 40 },
 *     { name: "B", attribute: "speed", value: 55 },
 *     { name: "B", attribute: "power", value: 70 },
 *   ]}
 *   categoryAccessor="attribute"
 *   valueAccessor="value"
 *   seriesAccessor="name"
 *   colorBy="name"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // A single profile with function accessors and an explicit description.
 * <RadarChart
 *   data={skills}
 *   categoryAccessor={(skill) => skill.label}
 *   valueAccessor={(skill) => skill.score}
 *   title="Engineering skills profile"
 *   description="Scores across six self-assessed engineering skills."
 *   pieceStyle={{ fill: "#2563eb", stroke: "#1d4ed8" }}
 * />
 * ```
 */
export const RadarChart = forwardRef(function RadarChart<TDatum extends Datum = Datum>(
  props: RadarChartProps<TDatum>,
  ref: React.Ref<RealtimeFrameHandle>
) {
  const frameRef = useRef<StreamOrdinalFrameHandle>(null)
  useFrameImperativeHandle(ref, { variant: "xy", frameRef })

  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showGrid: props.showGrid,
    enableHover: props.enableHover,
    showLegend: props.showLegend,
    title: props.title,
    mobileInteraction: props.mobileInteraction,
    mobileSemantics: props.mobileSemantics,
    responsiveRules: props.responsiveRules,
  })

  const {
    data,
    margin: userMargin,
    className,
    categoryAccessor = "attribute",
    valueAccessor = "value",
    seriesAccessor,
    colorBy,
    categoryFormat,
    colorScheme,
    styleRules,
    pointRadius = 4,
    valueExtent,
    tooltip,
    annotations,
    frameProps = {},
    selection,
    linkedHover,
    onObservation,
    onClick,
    hoverHighlight,
    chartId,
    loading,
    loadingContent,
    emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
    color,
    stroke,
    strokeWidth,
    opacity,
  } = props

  const { width, height, enableHover, showGrid, showLegend, title, description, summary, accessibleTable } = resolved
  const safeData = useMemo(() => filterSparseArray(data), [data])
  const seriesKey = seriesAccessor
    || (typeof colorBy === "string" ? colorBy : undefined)
    || (typeof colorBy === "function" ? colorBy : undefined)
  const connectorAccessor = seriesKey ?? "__radar"
  const colorByResolved = colorBy || seriesKey

  const setup = useChartSetup({
    data: safeData,
    rawData: data,
    colorBy: colorByResolved,
    colorScheme,
    legendInteraction,
    legendPosition: legendPositionProp,
    frameLegend: frameProps,
    selection,
    linkedHover,
    fallbackFields: [
      typeof colorByResolved === "string" ? colorByResolved : "",
      typeof categoryAccessor === "string" ? categoryAccessor : "",
    ].filter(Boolean),
    unwrapData: true,
    onObservation,
    onClick,
    hoverHighlight,
    mobileInteraction: resolved.mobileInteraction,
    mobileSemantics: resolved.mobileSemantics,
    chartType: "RadarChart",
    chartId,
    showLegend,
    userMargin,
    marginDefaults: resolved.marginDefaults,
    loading,
    loadingContent,
    emptyContent,
    width,
    height,
    hasTitle: !!title,
    axisChrome: resolveOrdinalAxisChrome({
      showAxes: true,
      projection: "radial",
      hasCategoryLabel: false,
      hasValueLabel: false,
    }),
  })

  const themeCategorical = useThemeCategorical()
  const categoryIndexMap = useMemo(() => new Map<string, number>(), [])
  const resolveRuleValue = useMemo(
    () => makeRuleValueResolver(valueAccessor as string | ((d: Datum) => unknown)),
    [valueAccessor],
  )
  const pieceStyle = useOrdinalPieceStyle({
    colorBy: colorByResolved,
    colorScale: setup.colorScale,
    color,
    themeCategorical,
    colorScheme,
    categoryIndexMap,
    userPieceStyle: frameProps?.pieceStyle,
    stroke,
    strokeWidth,
    opacity,
    effectiveSelectionHook: setup.effectiveSelectionHook,
    resolvedSelection: setup.resolvedSelection,
    baseStyleExtras: { r: pointRadius, fillOpacity: 0.85 },
    styleRules,
    resolveRuleValue,
  })

  const defaultTooltipContent = useMemo(
    () => buildOrdinalTooltip({
      categoryAccessor,
      valueAccessor,
      groupAccessor: seriesKey,
      groupLabel: typeof seriesKey === "string" ? seriesKey : "series",
    }),
    [categoryAccessor, valueAccessor, seriesKey]
  )

  if (setup.earlyReturn) return setup.earlyReturn

  const error = validateArrayData({
    componentName: "RadarChart",
    data,
    accessors: { categoryAccessor, valueAccessor },
  })
  if (error) return <ChartError componentName="RadarChart" message={error} width={width} height={height} />

  const connectorStyle = (d: Datum): Style => {
    const piece = typeof pieceStyle === "function" ? pieceStyle(d) : {}
    const fill = typeof piece.fill === "string" ? piece.fill : undefined
    return {
      fill,
      fillOpacity: 0.15,
      stroke: fill,
      strokeWidth: 2,
      opacity: 0.7,
    }
  }

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "point",
    projection: "radial",
    ...(data != null && { data: safeData }),
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    connectorAccessor,
    connectorStyle,
    pieceStyle,
    ...(categoryFormat && { oFormat: categoryFormat }),
    rExtent: valueExtent ?? [0],
    oLabel: "",
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: setup.margin,
    enableHover,
    showAxes: true,
    showGrid,
    ...setup.legendBehaviorProps,
    ...buildBaseMetadataProps({
      title,
      description,
      summary,
      accessibleTable,
      className,
      animate: props.animate,
      maxDevicePixelRatio: props.maxDevicePixelRatio,
      axisExtent: props.axisExtent,
      autoPlaceAnnotations: props.autoPlaceAnnotations,
    }),
    ...buildTooltipProps({ tooltip, defaultTooltipContent }),
    ...buildCustomBehaviorProps({
      linkedHover,
      selection,
      onObservation,
      onClick,
      hoverHighlight,
      mobileInteraction: setup.mobileInteraction,
      customHoverBehavior: setup.customHoverBehavior,
      customClickBehavior: setup.customClickBehavior,
    }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...Object.fromEntries(Object.entries(frameProps).filter(([k]) => k !== "pieceStyle" && k !== "connectorStyle")),
  }

  return (
    <SafeRender componentName="RadarChart" width={width} height={height}>
      <StreamOrdinalFrame ref={frameRef} {...streamProps} />
    </SafeRender>
  )
}) as unknown as {
  <TDatum extends Datum = Datum>(props: RadarChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
RadarChart.displayName = "RadarChart"
