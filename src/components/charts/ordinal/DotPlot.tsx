"use client"
import * as React from "react"
import { useMemo } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps } from "../../stream/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useColorScale, useSortedData, useChartSelection, useChartLegendAndMargin, DEFAULT_COLOR } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, defaultTooltipStyle, type TooltipProp } from "../../Tooltip/Tooltip"
import ChartError from "../shared/ChartError"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"

export interface DotPlotProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  data: TDatum[]
  categoryAccessor?: ChartAccessor<TDatum, string>
  valueAccessor?: ChartAccessor<TDatum, number>
  orientation?: "vertical" | "horizontal"
  categoryLabel?: string
  valueLabel?: string
  valueFormat?: (d: number | string) => string
  colorBy?: ChartAccessor<TDatum, string>
  colorScheme?: string | string[]
  sort?: boolean | "asc" | "desc" | ((a: Record<string, any>, b: Record<string, any>) => number)
  dotRadius?: number
  categoryPadding?: number
  enableHover?: boolean
  showGrid?: boolean
  showLegend?: boolean
  tooltip?: TooltipProp
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

export function DotPlot<TDatum extends Record<string, any> = Record<string, any>>(props: DotPlotProps<TDatum>) {
  const {
    data, width = 600, height = 400, margin: userMargin, className, title,
    categoryAccessor = "category", valueAccessor = "value",
    orientation = "horizontal", categoryLabel, valueLabel, valueFormat,
    colorBy, colorScheme = "category10", sort = true, dotRadius = 5,
    categoryPadding = 10, enableHover = true, showGrid = true, showLegend,
    tooltip, frameProps = {}, selection, linkedHover
  } = props

  const safeData = data || []

  const { activeSelectionHook, customHoverBehavior } = useChartSelection({
    selection, linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [typeof categoryAccessor === "string" ? categoryAccessor : ""],
    unwrapData: true
  })

  const sortedData = useSortedData(safeData, sort, valueAccessor)
  const colorScale = useColorScale(safeData, colorBy, colorScheme)

  const basePieceStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = { r: dotRadius, fillOpacity: 0.8 }
      baseStyle.fill = colorBy ? getColor(d, colorBy, colorScale) : DEFAULT_COLOR
      return baseStyle
    }
  }, [colorBy, colorScale, dotRadius])

  const pieceStyle = useMemo(
    () => wrapStyleWithSelection(basePieceStyle, activeSelectionHook, selection),
    [basePieceStyle, activeSelectionHook, selection]
  )

  const { legend, margin } = useChartLegendAndMargin({
    data: sortedData, colorBy, colorScale, showLegend, userMargin,
    defaults: { top: 50, bottom: 60, left: 120, right: 40 }
  })

  const defaultTooltipContent = useMemo(() => {
    return (d: Record<string, any>) => {
      const datum = d.data || d
      const cat = typeof categoryAccessor === "function" ? categoryAccessor(datum as TDatum) : datum[categoryAccessor]
      const val = typeof valueAccessor === "function" ? valueAccessor(datum as TDatum) : datum[valueAccessor]
      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          <div style={{ fontWeight: "bold" }}>{String(cat)}</div>
          <div style={{ marginTop: "4px" }}>
            {typeof val === "number" ? val.toLocaleString() : String(val)}
          </div>
        </div>
      )
    }
  }, [categoryAccessor, valueAccessor])

  const error = validateArrayData({
    componentName: "DotPlot", data: safeData,
    accessors: { categoryAccessor, valueAccessor },
  })
  if (error) return <ChartError componentName="DotPlot" message={error} width={width} height={height} />

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "point",
    data: sortedData,
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    projection: orientation === "horizontal" ? "horizontal" : "vertical",
    pieceStyle,
    size: [width, height],
    margin,
    barPadding: categoryPadding,
    enableHover,
    showAxes: true,
    oLabel: categoryLabel,
    rLabel: valueLabel,
    rFormat: valueFormat as any,
    showGrid,
    oSort: sort as any,
    ...(legend && { legend }),
    ...(title && { title }),
    ...(className && { className }),
    tooltipContent: (tooltip ? normalizeTooltip(tooltip) : defaultTooltipContent) as any,
    ...(linkedHover && { customHoverBehavior }),
    ...frameProps
  }

  return <StreamOrdinalFrame {...streamProps} />
}
DotPlot.displayName = "DotPlot"
