"use client"
import * as React from "react"
import { useMemo, forwardRef, useRef, useImperativeHandle } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps, StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useChartMode, useThemeCategorical, resolveDefaultFill } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor, CategoryFormatFn } from "../shared/types"
import { normalizeTooltip, defaultTooltipStyle, type TooltipProp } from "../../Tooltip/Tooltip"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useChartSetup } from "../shared/useChartSetup"
import { useOrdinalBrush } from "../shared/useOrdinalBrush"

export interface HistogramProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  data?: TDatum[]
  categoryAccessor?: ChartAccessor<TDatum, string>
  valueAccessor?: ChartAccessor<TDatum, number>
  bins?: number
  relative?: boolean
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
  legendInteraction?: LegendInteractionMode
  legendPosition?: LegendPosition
  tooltip?: TooltipProp
  annotations?: Record<string, any>[]
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

export const Histogram = forwardRef(function Histogram<TDatum extends Record<string, any> = Record<string, any>>(props: HistogramProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
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
    orientation: "horizontal",
  })

  const frameRef = useRef<StreamOrdinalFrameHandle>(null)
  useImperativeHandle(ref, () => ({
    push: (point) => frameRef.current?.push(point),
    pushMany: (points) => frameRef.current?.pushMany(points),
    remove: (id) => frameRef.current?.remove(id) ?? [],
    update: (id, updater) => frameRef.current?.update(id, updater) ?? [],
    clear: () => frameRef.current?.clear(),
    getData: () => frameRef.current?.getData() ?? []
  }))

  const {
    data, margin: userMargin, className,
    categoryAccessor = "category", valueAccessor = "value",
    bins = 25, relative = false,
    valueFormat,
    colorBy, colorScheme, categoryPadding = 20,
    tooltip, annotations,
    brush: brushProp, onBrush: onBrushProp, linkedBrush,
    frameProps = {}, selection, linkedHover,
    onObservation, onClick, hoverHighlight, chartId,
    loading, emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
    color: colorProp,
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

  const safeData = data || []

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
    chartType: "Histogram",
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

  // Compute global value extent across all categories so bins are shared
  const rExtent = useMemo(() => {
    if (safeData.length === 0) return undefined
    const getVal = typeof valueAccessor === "function" ? valueAccessor : (d: any) => d[valueAccessor]
    let min = Infinity
    let max = -Infinity
    for (const d of safeData) {
      const v = getVal(d)
      if (v != null && isFinite(v)) {
        if (v < min) min = v
        if (v > max) max = v
      }
    }
    return min <= max ? [min, max] as [number, number] : undefined
  }, [safeData, valueAccessor])

  const themeCategorical = useThemeCategorical()
  const categoryIndexMap = useMemo(() => new Map<string, number>(), [safeData])

  const baseSummaryStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const resolvedColor = colorBy ? getColor(d, colorBy, setup.colorScale) : resolveDefaultFill(colorProp, themeCategorical, colorScheme, undefined, categoryIndexMap)
      return { fill: resolvedColor, stroke: resolvedColor, fillOpacity: 0.8 }
    }
  }, [colorBy, setup.colorScale, colorProp, themeCategorical, colorScheme, categoryIndexMap])

  const summaryStyle = useMemo(
    () => wrapStyleWithSelection(baseSummaryStyle, setup.effectiveSelectionHook, selection),
    [baseSummaryStyle, setup.effectiveSelectionHook, selection]
  )

  const defaultTooltipContent = useMemo(() => {
    return (d: Record<string, any>) => {
      const datum = d.data || d
      const category = datum.category || d.category || ""
      const count = datum.count
      const range = datum.range
      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          {category && <div style={{ fontWeight: "bold" }}>{String(category)}</div>}
          {count != null && <div>Count: {count}</div>}
          {range && range.length === 2 && (
            <div style={{ opacity: 0.8 }}>
              {Number(range[0]).toFixed(1)} – {Number(range[1]).toFixed(1)}
            </div>
          )}
        </div>
      )
    }
  }, [])

  const error = validateArrayData({
    componentName: "Histogram", data: data,
    accessors: { categoryAccessor, valueAccessor },
  })
  if (error) return <ChartError componentName="Histogram" message={error} width={width} height={height} />

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "histogram",
    ...(data != null && { data: safeData }),
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    projection: "horizontal",
    summaryStyle,
    bins,
    normalize: relative,
    ...(rExtent && { rExtent }),
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

  return <SafeRender componentName="Histogram" width={width} height={height}><StreamOrdinalFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Record<string, any> = Record<string, any>>(props: HistogramProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
Histogram.displayName = "Histogram"
