"use client"
import * as React from "react"
import { useMemo } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps } from "../../stream/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useColorScale, useSortedData, useChartSelection, useChartLegendAndMargin, useChartMode, DEFAULT_COLOR } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { buildOrdinalTooltip } from "../shared/tooltipUtils"
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
  annotations?: Record<string, any>[]
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

export function DotPlot<TDatum extends Record<string, any> = Record<string, any>>(props: DotPlotProps<TDatum>) {
  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showGrid: props.showGrid ?? true,
    enableHover: props.enableHover,
    showLegend: props.showLegend,
    title: props.title,
    categoryLabel: props.categoryLabel,
    valueLabel: props.valueLabel,
  })

  const {
    data, margin: userMargin, className,
    categoryAccessor = "category", valueAccessor = "value",
    orientation = "horizontal", valueFormat,
    colorBy, colorScheme = "category10", sort = true, dotRadius = 5,
    categoryPadding = 10, tooltip, annotations, frameProps = {}, selection, linkedHover,
    onObservation, chartId
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

  const { activeSelectionHook, customHoverBehavior } = useChartSelection({
    selection, linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [typeof categoryAccessor === "string" ? categoryAccessor : ""],
    unwrapData: true,
    onObservation, chartType: "DotPlot", chartId
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
    defaults: resolved.marginDefaults,
  })

  const defaultTooltipContent = useMemo(
    () => buildOrdinalTooltip({ categoryAccessor, valueAccessor }),
    [categoryAccessor, valueAccessor]
  )

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
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin,
    barPadding: categoryPadding,
    enableHover,
    showAxes: resolved.showAxes,
    oLabel: categoryLabel,
    rLabel: valueLabel,
    rFormat: valueFormat as any,
    showGrid,
    oSort: sort as any,
    ...(legend && { legend }),
    ...(title && { title }),
    ...(className && { className }),
    tooltipContent: (tooltip ? normalizeTooltip(tooltip) : defaultTooltipContent) as any,
    ...((linkedHover || onObservation) && { customHoverBehavior }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...frameProps
  }

  return <StreamOrdinalFrame {...streamProps} />
}
DotPlot.displayName = "DotPlot"
