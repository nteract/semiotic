"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import { buildBaseMetadataProps, buildCustomBehaviorProps, buildTooltipProps } from "../shared/streamPropsHelpers"
import * as React from "react"
import { useMemo, forwardRef, useRef } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps, StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import { getSize } from "../shared/colorUtils"
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
import { useFrameImperativeHandle } from "../shared/useFrameImperativeHandle"
import { useOrdinalBrush } from "../shared/useOrdinalBrush"
import { getMinMax } from "../shared/minMax"

export interface SwarmPlotProps<TDatum extends Datum = Datum> extends BaseChartProps {
  data?: TDatum[]
  categoryAccessor?: ChartAccessor<TDatum, string>
  valueAccessor?: ChartAccessor<TDatum, number>
  orientation?: "vertical" | "horizontal"
  categoryLabel?: string
  valueLabel?: string
  valueFormat?: (d: number | string) => string
  colorBy?: ChartAccessor<TDatum, string>
  colorScheme?: string | string[]
  sizeBy?: ChartAccessor<TDatum, number>
  sizeRange?: [number, number]
  pointRadius?: number
  pointOpacity?: number
  categoryPadding?: number
  enableHover?: boolean
  showGrid?: boolean
  showCategoryTicks?: boolean
  showLegend?: boolean
  legendInteraction?: LegendInteractionMode
  legendPosition?: LegendPosition
  tooltip?: TooltipProp
  annotations?: Datum[]
  /** Enable brush on the value axis */
  brush?: boolean
  /** Callback when brush selection changes */
  onBrush?: (extent: { r: [number, number] } | null) => void
  /** LinkedCharts brush integration */
  linkedBrush?: string | { name: string; rField?: string }
  /** Custom formatter for category tick labels */
  categoryFormat?: CategoryFormatFn
  /** Fixed value-axis domain `[min, max]`. Either bound may be `undefined` to leave that side data-derived. */
  valueExtent?: [number | undefined, number | undefined] | [number]
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

/**
 * SwarmPlot - Show every individual observation per category as a beeswarm.
 *
 * Points are placed along the value axis and offset perpendicular to it
 * to avoid overlap, producing a packed cluster per category. Best for
 * datasets where you want both the distribution shape AND the individual
 * observations visible — typically dozens to a few thousand points.
 *
 * For aggregate distribution shape only, prefer {@link ViolinPlot},
 * {@link BoxPlot}, or {@link RidgelinePlot}.
 *
 * @example
 * ```tsx
 * // Reaction-time observations per cohort
 * <SwarmPlot
 *   data={observations}
 *   categoryAccessor="cohort"
 *   valueAccessor="reactionTime"
 *   pointRadius={3}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Color by group within each category, sized by weight
 * <SwarmPlot
 *   data={observations}
 *   categoryAccessor="condition"
 *   valueAccessor="score"
 *   colorBy="group"
 *   sizeBy="weight"
 *   sizeRange={[2, 10]}
 *   showLegend
 * />
 * ```
 */
export const SwarmPlot = forwardRef(function SwarmPlot<TDatum extends Datum = Datum>(props: SwarmPlotProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
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
  useFrameImperativeHandle(ref, { variant: "xy", frameRef })

  const {
    data, margin: userMargin, className,
    categoryAccessor = "category", valueAccessor = "value",
    orientation = "vertical", valueFormat,
    colorBy, colorScheme,
    sizeBy, sizeRange = [3, 8], pointRadius = 4, pointOpacity = 0.7,
    categoryPadding = 20, tooltip, annotations, valueExtent,
    brush: brushProp, onBrush: onBrushProp, linkedBrush,
    frameProps = {}, selection, linkedHover,
    onObservation, onClick, hoverHighlight, chartId,
    loading, loadingContent, emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
    color,
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
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [typeof categoryAccessor === "string" ? categoryAccessor : ""],
    unwrapData: true,
    onObservation,
    onClick,
    hoverHighlight,
    chartType: "SwarmPlot",
    chartId,
    showLegend,
    userMargin,
    marginDefaults: resolved.marginDefaults,
    loading,
    loadingContent,
    emptyContent,
    width,
    height,
  })

  const ordinalBrush = useOrdinalBrush({ brushProp, onBrushProp, linkedBrush, valueAccessor })

  const sizeDomain = useMemo(() => {
    if (!sizeBy) return undefined
    const sizes = safeData.map((d) => typeof sizeBy === "function" ? sizeBy(d) : d[sizeBy])
    return getMinMax(sizes)
  }, [safeData, sizeBy])

  const themeCategorical = useThemeCategorical()
  const categoryIndexMap = useMemo(() => new Map<string, number>(), [safeData])

  // Consolidated piece-style. The size encoding (`r` from sizeBy)
  // is per-datum, so it flows through `baseStyleExtras` as a
  // function form. fillOpacity is constant.
  const pieceStyle = useOrdinalPieceStyle({
    colorBy,
    colorScale: setup.colorScale,
    color, themeCategorical, colorScheme, categoryIndexMap,
    userPieceStyle: frameProps?.pieceStyle,
    stroke, strokeWidth, opacity,
    effectiveSelectionHook: setup.effectiveSelectionHook,
    resolvedSelection: setup.resolvedSelection,
    baseStyleExtras: (d) => ({
      fillOpacity: pointOpacity,
      r: sizeBy ? getSize(d, sizeBy, sizeRange, sizeDomain) : pointRadius,
    }),
  })

  const defaultTooltipContent = useMemo(
    () => buildOrdinalTooltip({
      categoryAccessor,
      valueAccessor,
      groupAccessor: colorBy ? colorBy : undefined,
      valueFormat,
    }),
    [categoryAccessor, valueAccessor, colorBy, valueFormat]
  )

  // Loading / empty state — returned only after every hook above has run, so
  // the hook count is identical whether or not data is present. Mounting empty
  // (loading skeleton, 0 bars) and then streaming in data must not change the
  // number of hooks between renders, or React throws "Rendered more hooks than
  // during the previous render."
  if (setup.earlyReturn) return setup.earlyReturn

  const error = validateArrayData({
    componentName: "SwarmPlot", data: data,
    accessors: { categoryAccessor, valueAccessor },
  })
  if (error) return <ChartError componentName="SwarmPlot" message={error} width={width} height={height} />

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "swarm",
    ...(data != null && { data: safeData }),
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
    showCategoryTicks,
    ...setup.legendBehaviorProps,
    ...buildBaseMetadataProps({ title, description, summary, accessibleTable, className, animate: props.animate, axisExtent: props.axisExtent, autoPlaceAnnotations: props.autoPlaceAnnotations }),
    ...buildTooltipProps({ tooltip, defaultTooltipContent }),
    ...buildCustomBehaviorProps({
      linkedHover, onObservation, onClick, hoverHighlight,
      customHoverBehavior: setup.customHoverBehavior,
      customClickBehavior: setup.customClickBehavior,
    }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...(valueExtent && { rExtent: valueExtent }),
    ...ordinalBrush.brushStreamProps,
    // frameProps spread last for escape hatch, but pieceStyle excluded to prevent
    // clobbering the HOC's color-resolved, selection-wrapped style function.
    ...Object.fromEntries(Object.entries(frameProps).filter(([k]) => k !== "pieceStyle")),
  }

  return <SafeRender componentName="SwarmPlot" width={width} height={height}><StreamOrdinalFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Datum = Datum>(props: SwarmPlotProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
SwarmPlot.displayName = "SwarmPlot"
