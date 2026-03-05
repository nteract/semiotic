"use client"
import * as React from "react"
import { useMemo } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps } from "../../stream/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useColorScale, useChartSelection, useChartLegendAndMargin, DEFAULT_COLOR } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, defaultTooltipStyle, type TooltipProp } from "../../Tooltip/Tooltip"
import ChartError from "../shared/ChartError"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"

export interface HistogramProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  data: TDatum[]
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
  showLegend?: boolean
  tooltip?: TooltipProp
  annotations?: Record<string, any>[]
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

export function Histogram<TDatum extends Record<string, any> = Record<string, any>>(props: HistogramProps<TDatum>) {
  const {
    data, width = 600, height = 400, margin: userMargin, className, title,
    categoryAccessor = "category", valueAccessor = "value",
    bins = 25, relative = false,
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
      return { fill: color, stroke: color, fillOpacity: 0.8 }
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
    componentName: "Histogram", data: safeData,
    accessors: { categoryAccessor, valueAccessor },
  })
  if (error) return <ChartError componentName="Histogram" message={error} width={width} height={height} />

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "histogram",
    data: safeData,
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    projection: "horizontal",
    summaryStyle,
    bins,
    normalize: relative,
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
Histogram.displayName = "Histogram"
