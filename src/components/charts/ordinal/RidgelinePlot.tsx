"use client"
import * as React from "react"
import { useMemo } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps } from "../../stream/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useChartMode, DEFAULT_COLOR } from "../shared/hooks"
import type { LegendPosition } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, defaultTooltipStyle, type TooltipProp } from "../../Tooltip/Tooltip"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import { useChartSetup } from "../shared/useChartSetup"

export interface RidgelinePlotProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  data: TDatum[]
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
  colorScheme?: string | string[]
  categoryPadding?: number
  enableHover?: boolean
  showGrid?: boolean
  showLegend?: boolean
  legendPosition?: LegendPosition
  tooltip?: TooltipProp
  annotations?: Record<string, any>[]
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

/**
 * RidgelinePlot - Visualize distributions as overlapping one-sided density curves.
 *
 * Each category shows its value distribution as a filled area extending from a
 * baseline. The amplitude prop controls overlap between rows.
 */
export function RidgelinePlot<TDatum extends Record<string, any> = Record<string, any>>(props: RidgelinePlotProps<TDatum>) {
  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showGrid: props.showGrid,
    enableHover: props.enableHover,
    showLegend: props.showLegend,
    title: props.title,
    categoryLabel: props.categoryLabel,
    valueLabel: props.valueLabel,
  })

  const {
    data, margin: userMargin, className,
    categoryAccessor = "category", valueAccessor = "value",
    orientation = "horizontal", bins = 20, amplitude = 1.5,
    valueFormat,
    colorBy, colorScheme = "category10", categoryPadding = 5,
    tooltip, annotations, frameProps = {}, selection, linkedHover,
    onObservation, chartId,
    loading, emptyContent,
    legendPosition: legendPositionProp
  } = props

  const width = resolved.width
  const height = resolved.height
  const enableHover = resolved.enableHover
  const showGrid = resolved.showGrid
  const showLegend = resolved.showLegend
  const title = resolved.title
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
    chartType: "RidgelinePlot",
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

  const baseSummaryStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const color = colorBy ? getColor(d, colorBy, setup.colorScale) : DEFAULT_COLOR
      return { fill: color, stroke: color, fillOpacity: 0.5 }
    }
  }, [colorBy, setup.colorScale])

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
      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          <div style={{ fontWeight: "bold" }}>{String(category)}</div>
        </div>
      )
    }
  }, [])

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
    showAxes: resolved.showAxes,
    oLabel: categoryLabel,
    rLabel: valueLabel,
    rFormat: valueFormat,
    showGrid,
    oSort: false,
    amplitude,
    ...setup.legendBehaviorProps,
    ...(title && { title }),
    ...(className && { className }),
    tooltipContent: tooltip === false
      ? () => null
      : (normalizeTooltip(tooltip) || defaultTooltipContent),
    ...((linkedHover || onObservation) && { customHoverBehavior: setup.customHoverBehavior }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...frameProps
  }

  return <SafeRender componentName="RidgelinePlot" width={width} height={height}><StreamOrdinalFrame {...streamProps} /></SafeRender>
}
RidgelinePlot.displayName = "RidgelinePlot"
