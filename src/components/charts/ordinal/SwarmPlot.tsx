"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import * as React from "react"
import { useMemo, forwardRef, useRef, useImperativeHandle } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps, StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import { getColor, getSize } from "../shared/colorUtils"
import { useChartMode, useThemeCategorical, resolveDefaultFill } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor, CategoryFormatFn } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { buildOrdinalTooltip } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import { mergeShapeStyle } from "../shared/mergeShapeStyle"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useChartSetup } from "../shared/useChartSetup"
import { useOrdinalBrush } from "../shared/useOrdinalBrush"

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
  useImperativeHandle(ref, () => ({
    push: (point) => frameRef.current?.push(point),
    pushMany: (points) => frameRef.current?.pushMany(points),
    remove: (id) => frameRef.current?.remove(id) ?? [],
    update: (id, updater) => frameRef.current?.update(id, updater) ?? [],
    clear: () => frameRef.current?.clear(),
    getData: () => frameRef.current?.getData() ?? [],
    getScales: () => frameRef.current?.getScales() ?? null
  }))

  const {
    data, margin: userMargin, className,
    categoryAccessor = "category", valueAccessor = "value",
    orientation = "vertical", valueFormat,
    colorBy, colorScheme,
    sizeBy, sizeRange = [3, 8], pointRadius = 4, pointOpacity = 0.7,
    categoryPadding = 20, tooltip, annotations,
    brush: brushProp, onBrush: onBrushProp, linkedBrush,
    frameProps = {}, selection, linkedHover,
    onObservation, onClick, hoverHighlight, chartId,
    loading, emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
    color,
    stroke,
    strokeWidth,
    opacity,
    showCategoryTicks,
    categoryFormat
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
    emptyContent,
    width,
    height,
  })

  const ordinalBrush = useOrdinalBrush({ brushProp, onBrushProp, linkedBrush, valueAccessor })

  if (setup.earlyReturn) return setup.earlyReturn

  const sizeDomain = useMemo(() => {
    if (!sizeBy) return undefined
    const sizes = safeData.map((d) => typeof sizeBy === "function" ? sizeBy(d) : d[sizeBy])
    return [Math.min(...sizes), Math.max(...sizes)] as [number, number]
  }, [safeData, sizeBy])

  const themeCategorical = useThemeCategorical()
  const categoryIndexMap = useMemo(() => new Map<string, number>(), [safeData])

  const fpPieceStyle = frameProps.pieceStyle as ((d: any, c?: string) => Datum) | undefined

  const basePieceStyle = useMemo(() => {
    return (d: Datum, category?: string) => {
      const base: Record<string, string | number> = { fillOpacity: pointOpacity }
      base.fill = colorBy ? getColor(d, colorBy, setup.colorScale) : resolveDefaultFill(color, themeCategorical, colorScheme, undefined, categoryIndexMap)
      base.r = sizeBy ? getSize(d, sizeBy, sizeRange, sizeDomain) : pointRadius
      if (fpPieceStyle) {
        const extra = fpPieceStyle(d, category)
        if (extra.stroke) base.stroke = extra.stroke
        if (extra.strokeWidth != null) base.strokeWidth = extra.strokeWidth
        if (extra.strokeOpacity != null) base.strokeOpacity = extra.strokeOpacity
      }
      return base
    }
  }, [colorBy, setup.colorScale, sizeBy, sizeRange, sizeDomain, pointRadius, pointOpacity, color, themeCategorical, colorScheme, categoryIndexMap, fpPieceStyle])

  const basePieceStyleWithPrimitives = useMemo(
    () => mergeShapeStyle(basePieceStyle, { stroke, strokeWidth, opacity }),
    [basePieceStyle, stroke, strokeWidth, opacity]
  )

  const pieceStyle = useMemo(
    () => wrapStyleWithSelection(basePieceStyleWithPrimitives, setup.effectiveSelectionHook, setup.resolvedSelection),
    [basePieceStyleWithPrimitives, setup.effectiveSelectionHook, setup.resolvedSelection]
  )

  const defaultTooltipContent = useMemo(
    () => buildOrdinalTooltip({
      categoryAccessor,
      valueAccessor,
      groupAccessor: colorBy ? colorBy : undefined,
      valueFormat,
    }),
    [categoryAccessor, valueAccessor, colorBy, valueFormat]
  )

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
    ...(title && { title }),
    ...(description && { description }),
    ...(summary && { summary }),
    ...(accessibleTable !== undefined && { accessibleTable }),
    ...(className && { className }),
    ...(props.animate != null && { animate: props.animate }),
    tooltipContent: tooltip === false
      ? () => null
      : (normalizeTooltip(tooltip) || defaultTooltipContent),
    ...((linkedHover || onObservation || onClick || hoverHighlight) && { customHoverBehavior: setup.customHoverBehavior }),
    ...((onObservation || onClick || linkedHover) && { customClickBehavior: setup.customClickBehavior }),
    ...(annotations && annotations.length > 0 && { annotations }),
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
