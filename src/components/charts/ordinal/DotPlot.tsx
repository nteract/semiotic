"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import { buildBaseMetadataProps, buildCustomBehaviorProps, buildTooltipProps } from "../shared/streamPropsHelpers"
import * as React from "react"
import { useMemo, forwardRef, useRef } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps, StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import { useSortedData, useChartMode, useThemeCategorical } from "../shared/hooks"
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
import { useFrameImperativeHandle } from "../shared/useFrameImperativeHandle"
import { buildRegressionAnnotation, type RegressionProp } from "../shared/regressionUtils"

export interface DotPlotProps<TDatum extends Datum = Datum> extends BaseChartProps {
  data?: TDatum[]
  categoryAccessor?: ChartAccessor<TDatum, string>
  valueAccessor?: ChartAccessor<TDatum, number>
  orientation?: "vertical" | "horizontal"
  categoryLabel?: string
  valueLabel?: string
  valueFormat?: (d: number | string) => string
  colorBy?: ChartAccessor<TDatum, string>
  colorScheme?: string | string[] | Record<string, string>
  /** Category ordering. Default (`undefined`) resolves to `"auto"`, which
   *  preserves insertion order while streaming and falls through to
   *  value-desc on static data — the recommended choice when using the
   *  push API so categories don't jump around as values fluctuate.
   *  `true` forces value-desc regardless of source. `"asc"` / `"desc"`
   *  sorts by total value. `false` for insertion order regardless of
   *  source. Function comparators receive category name strings (not
   *  row objects) and run against the category list on the axis. */
  sort?: boolean | "asc" | "desc" | "auto" | ((a: string, b: string) => number)
  dotRadius?: number
  categoryPadding?: number
  enableHover?: boolean
  showGrid?: boolean
  showCategoryTicks?: boolean
  showLegend?: boolean
  legendInteraction?: LegendInteractionMode
  legendPosition?: LegendPosition
  tooltip?: TooltipProp
  annotations?: Datum[]
  /**
   * Overlay a regression line through the dots. Same shape as
   * Scatterplot's regression prop — accepts boolean, method-string,
   * or full `RegressionConfig`. Pixel positions resolve through the
   * band scale, so the line passes through dot centers. Sugar over
   * the `trend` annotation.
   */
  regression?: RegressionProp
  /** Custom formatter for category tick labels */
  categoryFormat?: CategoryFormatFn
  /** Fixed value-axis domain `[min, max]`. Either bound may be `undefined` to leave that side data-derived. */
  valueExtent?: [number | undefined, number | undefined] | [number]
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

/**
 * DotPlot - One dot per category, positioned along the value axis.
 *
 * Lighter-weight than {@link BarChart} for sorted comparisons; emphasizes
 * exact values rather than magnitude perception. Defaults to insertion
 * order while streaming (so categories don't shuffle as values change)
 * and value-descending on static data via `sort: "auto"`.
 *
 * @example
 * ```tsx
 * // Sorted ranking by metric
 * <DotPlot
 *   data={teams}
 *   categoryAccessor="name"
 *   valueAccessor="score"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Color by group + grid for axis reading
 * <DotPlot
 *   data={features}
 *   categoryAccessor="feature"
 *   valueAccessor="adoption"
 *   colorBy="team"
 *   showGrid
 *   showLegend
 * />
 * ```
 */
export const DotPlot = forwardRef(function DotPlot<TDatum extends Datum = Datum>(props: DotPlotProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showGrid: props.showGrid ?? true,
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
    orientation = "horizontal", valueFormat,
    colorBy, colorScheme, sort = "auto", dotRadius = 5,
    categoryPadding = 10, tooltip, annotations, regression, valueExtent, frameProps = {}, selection, linkedHover,
    onObservation, onClick, hoverHighlight, chartId,
    loading, loadingContent, emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
    color,
    stroke,
    strokeWidth,
    opacity,
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
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [typeof categoryAccessor === "string" ? categoryAccessor : ""],
    unwrapData: true,
    onObservation,
    onClick,
    hoverHighlight,
    mobileInteraction: resolved.mobileInteraction,
    mobileSemantics: resolved.mobileSemantics,
    chartType: "DotPlot",
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
  })

  const sortedData = useSortedData(safeData, sort, valueAccessor)

  const themeCategorical = useThemeCategorical()
  const categoryIndexMap = useMemo(() => new Map<string, number>(), [])

  // Consolidated piece-style. `r` and `fillOpacity` are mark-shape
  // defaults flowed in via `baseStyleExtras` so they sit BEFORE the
  // color resolution (and the user can override them via
  // frameProps.pieceStyle / top-level primitive props).
  const pieceStyle = useOrdinalPieceStyle({
    colorBy,
    colorScale: setup.colorScale,
    color, themeCategorical, colorScheme, categoryIndexMap,
    userPieceStyle: frameProps?.pieceStyle,
    stroke, strokeWidth, opacity,
    effectiveSelectionHook: setup.effectiveSelectionHook,
    resolvedSelection: setup.resolvedSelection,
    baseStyleExtras: { r: dotRadius, fillOpacity: 0.8 },
  })

  const defaultTooltipContent = useMemo(
    () => buildOrdinalTooltip({ categoryAccessor, valueAccessor, valueFormat }),
    [categoryAccessor, valueAccessor, valueFormat]
  )

  // Loading / empty state — returned only after every hook above has run, so
  // the hook count is identical whether or not data is present. Mounting empty
  // (loading skeleton, 0 bars) and then streaming in data must not change the
  // number of hooks between renders, or React throws "Rendered more hooks than
  // during the previous render."
  if (setup.earlyReturn) return setup.earlyReturn

  const error = validateArrayData({
    componentName: "DotPlot", data: data,
    accessors: { categoryAccessor, valueAccessor },
  })
  if (error) return <ChartError componentName="DotPlot" message={error} width={width} height={height} />

  // Splice the `regression` sugar into annotations as a `trend`
  // annotation. Trend goes first so user-supplied annotations paint
  // above it.
  const trendAnn = buildRegressionAnnotation(regression)
  const resolvedAnnotations = trendAnn
    ? [trendAnn, ...(annotations || [])]
    : annotations

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "point",
    ...(data != null && { data: sortedData }),
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    projection: orientation === "horizontal" ? "horizontal" : "vertical",
    pieceStyle,
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
    oSort: sort,
    ...setup.legendBehaviorProps,
    ...buildBaseMetadataProps({ title, description, summary, accessibleTable, className, animate: props.animate, axisExtent: props.axisExtent, autoPlaceAnnotations: props.autoPlaceAnnotations }),
    ...buildTooltipProps({ tooltip, defaultTooltipContent }),
    ...buildCustomBehaviorProps({
      linkedHover, selection, onObservation, onClick, hoverHighlight,
      mobileInteraction: setup.mobileInteraction,
      customHoverBehavior: setup.customHoverBehavior,
      customClickBehavior: setup.customClickBehavior,
    }),
    ...(resolvedAnnotations && resolvedAnnotations.length > 0 && { annotations: resolvedAnnotations }),
    ...(valueExtent && { rExtent: valueExtent }),
    // frameProps spread last for escape hatch, but pieceStyle excluded to prevent
    // clobbering the HOC's color-resolved, selection-wrapped style function.
    ...Object.fromEntries(Object.entries(frameProps).filter(([k]) => k !== "pieceStyle")),
  }

  return <SafeRender componentName="DotPlot" width={width} height={height}><StreamOrdinalFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Datum = Datum>(props: DotPlotProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
DotPlot.displayName = "DotPlot"
