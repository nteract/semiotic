"use client"
import * as React from "react"
import { useMemo } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps } from "../../stream/ordinalTypes"
import { getColor, getSize } from "../shared/colorUtils"
import { useColorScale, useChartSelection, useChartLegendAndMargin, DEFAULT_COLOR } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { buildOrdinalTooltip } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"

export interface SwarmPlotProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  data: TDatum[]
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
  showLegend?: boolean
  tooltip?: TooltipProp
  annotations?: Record<string, any>[]
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

export function SwarmPlot<TDatum extends Record<string, any> = Record<string, any>>(props: SwarmPlotProps<TDatum>) {
  const {
    data, width = 600, height = 400, margin: userMargin, className, title,
    categoryAccessor = "category", valueAccessor = "value",
    orientation = "vertical", categoryLabel, valueLabel, valueFormat,
    colorBy, colorScheme = "category10",
    sizeBy, sizeRange = [3, 8], pointRadius = 4, pointOpacity = 0.7,
    categoryPadding = 20, enableHover = true, showGrid = false, showLegend,
    tooltip, annotations, frameProps = {}, selection, linkedHover
  } = props

  const safeData = data || []

  const { activeSelectionHook, customHoverBehavior } = useChartSelection({
    selection, linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [typeof categoryAccessor === "string" ? categoryAccessor : ""],
    unwrapData: true
  })

  const colorScale = useColorScale(safeData, colorBy, colorScheme)

  const sizeDomain = useMemo(() => {
    if (!sizeBy) return undefined
    const sizes = safeData.map((d) => typeof sizeBy === "function" ? sizeBy(d) : d[sizeBy])
    return [Math.min(...sizes), Math.max(...sizes)] as [number, number]
  }, [safeData, sizeBy])

  const basePieceStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = { fillOpacity: pointOpacity }
      baseStyle.fill = colorBy ? getColor(d, colorBy, colorScale) : DEFAULT_COLOR
      baseStyle.r = sizeBy ? getSize(d, sizeBy, sizeRange, sizeDomain) : pointRadius
      return baseStyle
    }
  }, [colorBy, colorScale, sizeBy, sizeRange, sizeDomain, pointRadius, pointOpacity])

  const pieceStyle = useMemo(
    () => wrapStyleWithSelection(basePieceStyle, activeSelectionHook, selection),
    [basePieceStyle, activeSelectionHook, selection]
  )

  const { legend, margin } = useChartLegendAndMargin({
    data: safeData, colorBy, colorScale, showLegend, userMargin
  })

  const defaultTooltipContent = useMemo(
    () => buildOrdinalTooltip({
      categoryAccessor,
      valueAccessor,
      groupAccessor: colorBy ? colorBy : undefined,
    }),
    [categoryAccessor, valueAccessor, colorBy]
  )

  const error = validateArrayData({
    componentName: "SwarmPlot", data: safeData,
    accessors: { categoryAccessor, valueAccessor },
  })
  if (error) return <ChartError componentName="SwarmPlot" message={error} width={width} height={height} />

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "swarm",
    data: safeData,
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
SwarmPlot.displayName = "SwarmPlot"
