"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import { buildBaseMetadataProps, buildCustomBehaviorProps, buildTooltipProps } from "../shared/streamPropsHelpers"
import * as React from "react"
import { useMemo, forwardRef, useRef } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps, StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import { useChartMode, useThemeCategorical } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor, CategoryFormatFn } from "../shared/types"
import { type TooltipProp } from "../../Tooltip/Tooltip"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { useOrdinalPieceStyle } from "../shared/useOrdinalPieceStyle"
import { useChartSetup } from "../shared/useChartSetup"
import { resolveOrdinalAxisChrome } from "../../legendLayout"
import { useFrameImperativeHandle } from "../shared/useFrameImperativeHandle"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { buildStatsTooltip } from "../shared/statsTooltip"
import { makeRuleValueResolver, type StyleRule } from "../shared/styleRules"

export interface RidgelinePlotProps<TDatum extends Datum = Datum> extends BaseChartProps {
  data?: TDatum[]
  categoryAccessor?: ChartAccessor<TDatum, string>
  valueAccessor?: ChartAccessor<TDatum, number>
  orientation?: "vertical" | "horizontal"
  bins?: number
  /** Amplitude factor controlling how far density extends (>1 allows overlap) @default 1.5 */
  amplitude?: number
  categoryLabel?: string
  valueLabel?: string
  valueFormat?: (d: number | string) => string
  colorBy?: ChartAccessor<TDatum, string>
  colorScheme?: string | string[] | Record<string, string>
  /** Ordered summary styling; fieldless thresholds use each category's median. Statistical fields include `n`, `min`, `q1`, `median`, `q3`, `max`, and `mean`. */
  styleRules?: StyleRule[]
  categoryPadding?: number
  enableHover?: boolean
  showGrid?: boolean
  showCategoryTicks?: boolean
  showLegend?: boolean
  legendInteraction?: LegendInteractionMode
  legendPosition?: LegendPosition
  tooltip?: TooltipProp
  annotations?: Datum[]
  /** Custom formatter for category tick labels */
  categoryFormat?: CategoryFormatFn
  /** Fixed value-axis domain `[min, max]`. Either bound may be `undefined` to leave that side data-derived. */
  valueExtent?: [number | undefined, number | undefined] | [number]
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

/**
 * RidgelinePlot - Visualize distributions as overlapping one-sided density curves.
 *
 * Each category shows its value distribution as a filled area extending from a
 * baseline. The amplitude prop controls overlap between rows.
 *
 * Compare with {@link ViolinPlot} (mirrored, side-by-side) and
 * {@link BoxPlot} (five-number summaries only). Best for ≤30 categories
 * with enough observations per category to estimate density.
 *
 * @example
 * ```tsx
 * // Test scores per class — distributions stacked vertically
 * <RidgelinePlot
 *   data={observations}
 *   categoryAccessor="class"
 *   valueAccessor="score"
 *   bins={30}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // More overlap (denser packing) + smooth curve
 * <RidgelinePlot
 *   data={observations}
 *   categoryAccessor="month"
 *   valueAccessor="temperature"
 *   amplitude={2.5}
 *   curve="monotoneX"
 * />
 * ```
 */
export const RidgelinePlot = forwardRef(function RidgelinePlot<TDatum extends Datum = Datum>(props: RidgelinePlotProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
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
      mobileInteraction: props.mobileInteraction,
    mobileSemantics: props.mobileSemantics,
    responsiveRules: props.responsiveRules,
})

  const frameRef = useRef<StreamOrdinalFrameHandle>(null)
  useFrameImperativeHandle(ref, { variant: "xy", frameRef })

  const {
    data, margin: userMargin, className,
    categoryAccessor = "category", valueAccessor = "value",
    orientation = "horizontal", bins = 20, amplitude = 1.5,
    valueFormat,
    colorBy, colorScheme, styleRules, categoryPadding = 5,
    tooltip, annotations, valueExtent, frameProps = {}, selection, linkedHover,
    onObservation, onClick, hoverHighlight, chartId,
    loading, loadingContent, emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
    color: colorProp,
    stroke,
    strokeWidth,
    opacity,
    showCategoryTicks,
    categoryFormat
  } = props

  const { width, height, enableHover, showGrid, showLegend, title, description, summary, accessibleTable, categoryLabel, valueLabel } = resolved

  const safeData = useMemo(() => filterSparseArray(data), [data])

  const setup = useChartSetup({
    data: safeData,
    rawData: data,
    colorBy,
    colorScheme,
    legendInteraction,
    legendPosition: legendPositionProp,
    frameLegend: frameProps,
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [typeof categoryAccessor === "string" ? categoryAccessor : ""],
    unwrapData: true,
    onObservation,
    onClick,
    hoverHighlight,
    mobileInteraction: resolved.mobileInteraction,
    mobileSemantics: resolved.mobileSemantics,
    chartType: "RidgelinePlot",
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
      showAxes: resolved.showAxes,
      projection: orientation === "horizontal" ? "horizontal" : "vertical",
      hasCategoryLabel: !!categoryLabel,
      hasValueLabel: !!valueLabel,
    }),
  })

  const themeCategorical = useThemeCategorical()
  const categoryIndexMap = useMemo(() => new Map<string, number>(), [])
  const resolveRuleValue = useMemo(() => {
    const readValue = makeRuleValueResolver(valueAccessor as string | ((d: Datum) => unknown))
    return (d: Datum) => typeof d.median === "number" ? d.median : readValue(d)
  }, [valueAccessor])

  // Consolidated summary-style — same recipe as BoxPlot/ViolinPlot/
  // Histogram. Lower fillOpacity (0.5) since ridges stack and
  // overlap.
  const summaryStyle = useOrdinalPieceStyle({
    colorBy,
    colorScale: setup.colorScale,
    color: colorProp, themeCategorical, colorScheme, categoryIndexMap,
    userPieceStyle: undefined,
    stroke, strokeWidth, opacity,
    effectiveSelectionHook: setup.effectiveSelectionHook,
    resolvedSelection: setup.resolvedSelection,
    baseStyleExtras: { fillOpacity: 0.5 },
    linkStrokeToFill: true,
    styleRules,
    resolveRuleValue,
  })

  const defaultTooltipContent = useMemo(() => buildStatsTooltip(), [])

  // Loading / empty state — returned only after every hook above has run, so
  // the hook count is identical whether or not data is present. Mounting empty
  // (loading skeleton, 0 bars) and then streaming in data must not change the
  // number of hooks between renders, or React throws "Rendered more hooks than
  // during the previous render."
  if (setup.earlyReturn) return setup.earlyReturn

  const error = validateArrayData({
    componentName: "RidgelinePlot", data: data,
    accessors: { categoryAccessor, valueAccessor },
  })
  if (error) return <ChartError componentName="RidgelinePlot" message={error} width={width} height={height} />

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "ridgeline",
    ...(data != null && { data: safeData }),
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    projection: orientation === "horizontal" ? "horizontal" : "vertical",
    summaryStyle,
    bins,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: setup.margin,
    barPadding: categoryPadding,
    enableHover,
    ...(props.dataIdAccessor && { dataIdAccessor: props.dataIdAccessor }),
    showAxes: resolved.showAxes,
    oLabel: categoryLabel,
    rLabel: valueLabel,
    rFormat: valueFormat,
    ...(categoryFormat && { oFormat: categoryFormat }),
    showGrid,
    showCategoryTicks,
    oSort: false,
    amplitude,
    ...setup.legendBehaviorProps,
    ...buildBaseMetadataProps({ title, description, summary, accessibleTable, className, animate: props.animate, maxDevicePixelRatio: props.maxDevicePixelRatio, axisExtent: props.axisExtent, autoPlaceAnnotations: props.autoPlaceAnnotations }),
    ...buildTooltipProps({ tooltip, defaultTooltipContent }),
    ...buildCustomBehaviorProps({
      linkedHover, selection, onObservation, onClick, hoverHighlight,
      mobileInteraction: setup.mobileInteraction,
      customHoverBehavior: setup.customHoverBehavior,
      customClickBehavior: setup.customClickBehavior,
    }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...(valueExtent && { rExtent: valueExtent }),
    // frameProps spread last for escape hatch, but pieceStyle excluded to prevent
    // clobbering the HOC's color-resolved, selection-wrapped style function.
    ...Object.fromEntries(Object.entries(frameProps).filter(([k]) => k !== "pieceStyle")),
  }

  return <SafeRender componentName="RidgelinePlot" width={width} height={height}><StreamOrdinalFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Datum = Datum>(props: RidgelinePlotProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
RidgelinePlot.displayName = "RidgelinePlot"
