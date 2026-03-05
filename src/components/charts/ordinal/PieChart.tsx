"use client"
import * as React from "react"
import { useMemo } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps } from "../../stream/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useColorScale, useChartSelection, useChartLegendAndMargin, DEFAULT_COLOR } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { buildOrdinalTooltip } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"

export interface PieChartProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  data: TDatum[]
  categoryAccessor?: ChartAccessor<TDatum, string>
  valueAccessor?: ChartAccessor<TDatum, number>
  colorBy?: ChartAccessor<TDatum, string>
  colorScheme?: string | string[]
  startAngle?: number
  slicePadding?: number
  enableHover?: boolean
  showLegend?: boolean
  tooltip?: TooltipProp
  annotations?: Record<string, any>[]
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

export function PieChart<TDatum extends Record<string, any> = Record<string, any>>(props: PieChartProps<TDatum>) {
  const {
    data, width = 400, height = 400, margin: userMargin, className, title,
    categoryAccessor = "category", valueAccessor = "value",
    colorBy, colorScheme = "category10", startAngle = 0, slicePadding = 2,
    enableHover = true, showLegend = true, tooltip, annotations, frameProps = {},
    selection, linkedHover
  } = props

  const safeData = data || []
  const actualColorBy = colorBy || categoryAccessor

  const { activeSelectionHook, customHoverBehavior } = useChartSelection({
    selection, linkedHover,
    fallbackFields: actualColorBy ? [typeof actualColorBy === "string" ? actualColorBy : ""] : [],
    unwrapData: true
  })

  const colorScale = useColorScale(safeData, actualColorBy, colorScheme)

  const basePieceStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      if (actualColorBy) return { fill: getColor(d, actualColorBy, colorScale) }
      return { fill: DEFAULT_COLOR }
    }
  }, [actualColorBy, colorScale])

  const pieceStyle = useMemo(
    () => wrapStyleWithSelection(basePieceStyle, activeSelectionHook, selection),
    [basePieceStyle, activeSelectionHook, selection]
  )

  const { legend, margin } = useChartLegendAndMargin({
    data: safeData, colorBy: actualColorBy, colorScale, showLegend, userMargin,
    defaults: { top: 20, bottom: 20, left: 20, right: 20 }
  })

  const defaultTooltipContent = useMemo(
    () => buildOrdinalTooltip({
      categoryAccessor,
      valueAccessor,
      groupAccessor: colorBy && colorBy !== categoryAccessor ? colorBy : undefined,
      groupLabel: typeof colorBy === "string" ? colorBy : "group",
      pieData: true
    }),
    [categoryAccessor, valueAccessor, colorBy]
  )

  const error = validateArrayData({
    componentName: "PieChart", data: safeData,
    accessors: { categoryAccessor, valueAccessor },
  })
  if (error) return <ChartError componentName="PieChart" message={error} width={width} height={height} />

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "pie",
    data: safeData,
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    projection: "radial",
    pieceStyle,
    startAngle,
    size: [width, height],
    margin,
    enableHover,
    showAxes: false,
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
PieChart.displayName = "PieChart"
