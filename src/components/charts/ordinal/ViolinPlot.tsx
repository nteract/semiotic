"use client"
import * as React from "react"
import { useMemo, useCallback, forwardRef, useRef, useImperativeHandle } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps, StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useChartMode, useThemeCategorical, resolveDefaultFill } from "../shared/hooks"
import type { LegendPosition } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, defaultTooltipStyle, type TooltipProp } from "../../Tooltip/Tooltip"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection, normalizeLinkedBrush } from "../shared/selectionUtils"
import { useBrushSelection } from "../../store/useSelection"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useChartSetup } from "../shared/useChartSetup"

export interface ViolinPlotProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  data?: TDatum[]
  categoryAccessor?: ChartAccessor<TDatum, string>
  valueAccessor?: ChartAccessor<TDatum, number>
  orientation?: "vertical" | "horizontal"
  bins?: number
  curve?: string
  showIQR?: boolean
  categoryLabel?: string
  valueLabel?: string
  valueFormat?: (d: number | string) => string
  colorBy?: ChartAccessor<TDatum, string>
  colorScheme?: string | string[]
  categoryPadding?: number
  enableHover?: boolean
  showGrid?: boolean
  showCategoryTicks?: boolean
  showLegend?: boolean
  legendPosition?: LegendPosition
  tooltip?: TooltipProp
  annotations?: Record<string, any>[]
  /** Enable brush on the value axis */
  brush?: boolean
  /** Callback when brush selection changes */
  onBrush?: (extent: { r: [number, number] } | null) => void
  /** LinkedCharts brush integration */
  linkedBrush?: string | { name: string; rField?: string }
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

export const ViolinPlot = forwardRef(function ViolinPlot<TDatum extends Record<string, any> = Record<string, any>>(props: ViolinPlotProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
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
    clear: () => frameRef.current?.clear(),
    getData: () => frameRef.current?.getData() ?? []
  }))

  const {
    data, margin: userMargin, className,
    categoryAccessor = "category", valueAccessor = "value",
    orientation = "vertical", bins = 25, curve = "catmullRom", showIQR = true,
    valueFormat,
    colorBy, colorScheme = "category10", categoryPadding = 20,
    tooltip, annotations,
    brush: brushProp, onBrush: onBrushProp, linkedBrush,
    frameProps = {}, selection, linkedHover,
    onObservation, chartId,
    loading, emptyContent,
    legendPosition: legendPositionProp,
    color: colorProp,
    showCategoryTicks
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

  const safeData = data || []

  const setup = useChartSetup({
    data: safeData,
    rawData: data,
    colorBy,
    colorScheme,
    legendInteraction: undefined,
    legendPosition: legendPositionProp,
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [typeof categoryAccessor === "string" ? categoryAccessor : ""],
    unwrapData: true,
    onObservation,
    chartType: "ViolinPlot",
    chartId,
    showLegend,
    userMargin,
    marginDefaults: resolved.marginDefaults,
    loading,
    emptyContent,
    width,
    height,
  })

  const normalizedLinkedBrush = typeof linkedBrush === "string"
    ? linkedBrush
    : linkedBrush ? { name: linkedBrush.name, xField: linkedBrush.rField } : undefined
  const brushConfig = normalizeLinkedBrush(normalizedLinkedBrush)
  const rFieldStr = typeof valueAccessor === "string" ? valueAccessor : "value"
  const brushHook = useBrushSelection({ name: brushConfig?.name || "__unused_violin_brush__", xField: brushConfig?.xField || rFieldStr })
  const brushInteractionRef = useRef(brushHook.brushInteraction)
  brushInteractionRef.current = brushHook.brushInteraction
  const handleBrush = useCallback((extent: { r: [number, number] } | null) => {
    if (brushConfig) {
      const bi = brushInteractionRef.current
      if (!extent) { bi.end(null) } else { bi.end(extent.r) }
    }
    onBrushProp?.(extent)
  }, [onBrushProp, brushConfig])
  const hasBrush = !!(brushProp || linkedBrush || onBrushProp)

  if (setup.earlyReturn) return setup.earlyReturn

  const themeCategorical = useThemeCategorical()
  const categoryIndexMap = useMemo(() => new Map<string, number>(), [safeData])

  const baseSummaryStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const resolvedColor = colorBy ? getColor(d, colorBy, setup.colorScale) : resolveDefaultFill(colorProp, themeCategorical, colorScheme, undefined, categoryIndexMap)
      return { fill: resolvedColor, stroke: resolvedColor, fillOpacity: 0.6 }
    }
  }, [colorBy, setup.colorScale, colorProp, themeCategorical, colorScheme, categoryIndexMap])

  const summaryStyle = useMemo(
    () => wrapStyleWithSelection(baseSummaryStyle, setup.activeSelectionHook, selection),
    [baseSummaryStyle, setup.activeSelectionHook, selection]
  )

  const defaultTooltipContent = useMemo(() => {
    return (d: Record<string, any>) => {
      const category = d.category || (d.data && d.data[0]?.category) || ""
      const stats = d.stats
      if (stats) {
        return (
          <div className="semiotic-tooltip" style={defaultTooltipStyle}>
            {category && <div style={{ fontWeight: "bold" }}>{String(category)}</div>}
            <div>n = {stats.n}</div>
            <div>Min: {stats.min.toLocaleString()}</div>
            <div>Q1: {stats.q1.toLocaleString()}</div>
            <div>Median: {stats.median.toLocaleString()}</div>
            <div>Q3: {stats.q3.toLocaleString()}</div>
            <div>Max: {stats.max.toLocaleString()}</div>
            <div style={{ opacity: 0.8 }}>Mean: {stats.mean.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </div>
        )
      }
      // Fallback: compute from raw data
      const pieces = Array.isArray(d.data) ? d.data : []
      const values = pieces.map((p: any) => {
        const v = typeof valueAccessor === "function" ? (valueAccessor as Function)(p) : p[valueAccessor as string]
        return Number(v)
      }).filter((v: number) => !isNaN(v)).sort((a: number, b: number) => a - b)
      const n = values.length
      const median = n > 0 ? values[Math.floor(n / 2)] : null
      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          {category && <div style={{ fontWeight: "bold" }}>{String(category)}</div>}
          {n > 0 && <div>n = {n}</div>}
          {median != null && <div>Median: {median.toLocaleString()}</div>}
        </div>
      )
    }
  }, [valueAccessor])

  const error = validateArrayData({
    componentName: "ViolinPlot", data: data,
    accessors: { categoryAccessor, valueAccessor },
  })
  if (error) return <ChartError componentName="ViolinPlot" message={error} width={width} height={height} />

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "violin",
    ...(data != null && { data: safeData }),
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    projection: orientation === "horizontal" ? "horizontal" : "vertical",
    summaryStyle,
    bins,
    showIQR,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: setup.margin,
    barPadding: categoryPadding,
    enableHover,
    showAxes: resolved.showAxes,
    oLabel: categoryLabel,
    rLabel: valueLabel,
    rFormat: valueFormat,
    showGrid,
    showCategoryTicks,
    ...setup.legendBehaviorProps,
    ...(title && { title }),
    ...(description && { description }),
    ...(summary && { summary }),
    ...(accessibleTable !== undefined && { accessibleTable }),
    ...(className && { className }),
    tooltipContent: tooltip === false
      ? () => null
      : (normalizeTooltip(tooltip) || defaultTooltipContent),
    ...((linkedHover || onObservation) && { customHoverBehavior: setup.customHoverBehavior }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...(hasBrush && { brush: { dimension: "r" as const }, onBrush: handleBrush }),
    ...frameProps
  }

  return <SafeRender componentName="ViolinPlot" width={width} height={height}><StreamOrdinalFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Record<string, any> = Record<string, any>>(props: ViolinPlotProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
ViolinPlot.displayName = "ViolinPlot"
