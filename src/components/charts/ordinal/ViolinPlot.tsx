"use client"
import * as React from "react"
import { useMemo } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps } from "../../stream/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useColorScale, useChartSelection, useChartLegendAndMargin, DEFAULT_COLOR, resolveAccessor } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, defaultTooltipStyle, type TooltipProp } from "../../Tooltip/Tooltip"
import ChartError from "../shared/ChartError"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"

export interface ViolinPlotProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  data: TDatum[]
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
  showLegend?: boolean
  tooltip?: TooltipProp
  annotations?: Record<string, any>[]
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

export function ViolinPlot<TDatum extends Record<string, any> = Record<string, any>>(props: ViolinPlotProps<TDatum>) {
  const {
    data, width = 600, height = 400, margin: userMargin, className, title,
    categoryAccessor = "category", valueAccessor = "value",
    orientation = "vertical", bins = 25, curve = "catmullRom", showIQR = true,
    categoryLabel, valueLabel, valueFormat,
    colorBy, colorScheme = "category10", categoryPadding = 20,
    enableHover = true, showGrid = false, showLegend, tooltip,
    annotations, frameProps = {}, selection, linkedHover
  } = props

  const safeData = data || []

  const { activeSelectionHook, customHoverBehavior } = useChartSelection({
    selection, linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [typeof categoryAccessor === "string" ? categoryAccessor : ""],
    unwrapData: true
  })

  const colorScale = useColorScale(safeData, colorBy, colorScheme)

  const baseSummaryStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const color = colorBy ? getColor(d, colorBy, colorScale) : DEFAULT_COLOR
      return { fill: color, stroke: color, fillOpacity: 0.6 }
    }
  }, [colorBy, colorScale])

  const summaryStyle = useMemo(
    () => wrapStyleWithSelection(baseSummaryStyle, activeSelectionHook, selection),
    [baseSummaryStyle, activeSelectionHook, selection]
  )

  const { legend, margin } = useChartLegendAndMargin({
    data: safeData, colorBy, colorScale, showLegend, userMargin
  })

  const defaultTooltipContent = useMemo(() => {
    const getVal = resolveAccessor<number>(valueAccessor)
    return (d: Record<string, any>) => {
      const datum = d.data || d
      const category = datum.category || d.category || ""
      // datum is the array of piece data for the column
      const pieces = Array.isArray(datum) ? datum : []
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
    componentName: "ViolinPlot", data: safeData,
    accessors: { categoryAccessor, valueAccessor },
  })
  if (error) return <ChartError componentName="ViolinPlot" message={error} width={width} height={height} />

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "violin",
    data: safeData,
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    projection: orientation === "horizontal" ? "horizontal" : "vertical",
    summaryStyle,
    bins,
    showIQR,
    size: [width, height],
    margin,
    barPadding: categoryPadding,
    enableHover,
    showAxes: true,
    oLabel: categoryLabel,
    rLabel: valueLabel,
    rFormat: valueFormat as any,
    showGrid,
    ...(legend && { legend }),
    ...(title && { title }),
    ...(className && { className }),
    tooltipContent: (tooltip ? normalizeTooltip(tooltip) : defaultTooltipContent) as any,
    ...(linkedHover && { customHoverBehavior }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...frameProps
  }

  return <StreamOrdinalFrame {...streamProps} />
}
ViolinPlot.displayName = "ViolinPlot"
