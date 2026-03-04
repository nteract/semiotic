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

export interface DonutChartProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  data: TDatum[]
  categoryAccessor?: ChartAccessor<TDatum, string>
  valueAccessor?: ChartAccessor<TDatum, number>
  innerRadius?: number
  centerContent?: React.ReactNode
  colorBy?: ChartAccessor<TDatum, string>
  colorScheme?: string | string[]
  startAngle?: number
  slicePadding?: number
  enableHover?: boolean
  showLegend?: boolean
  tooltip?: TooltipProp
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

export function DonutChart<TDatum extends Record<string, any> = Record<string, any>>(props: DonutChartProps<TDatum>) {
  const {
    data, width = 400, height = 400, margin: userMargin, className, title,
    categoryAccessor = "category", valueAccessor = "value",
    innerRadius = 60, centerContent,
    colorBy, colorScheme = "category10", startAngle = 0, slicePadding = 2,
    enableHover = true, showLegend = true, tooltip, frameProps = {},
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

  const defaultTooltipContent = useMemo(() => {
    const showColorField = colorBy && colorBy !== categoryAccessor
    return (d: Record<string, any>) => {
      const datum = d.data?.[0] || d.data || d
      const cat = typeof categoryAccessor === "function" ? categoryAccessor(datum as TDatum) : datum[categoryAccessor]
      const val = typeof valueAccessor === "function" ? valueAccessor(datum as TDatum) : datum[valueAccessor]
      const colorVal = showColorField
        ? (typeof colorBy === "function" ? (colorBy as Function)(datum) : datum[colorBy as string])
        : null
      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          <div style={{ fontWeight: "bold" }}>{String(cat)}</div>
          <div style={{ marginTop: "4px" }}>
            {typeof val === "number" ? val.toLocaleString() : String(val)}
          </div>
          {colorVal != null && (
            <div style={{ marginTop: "2px", opacity: 0.8 }}>
              {typeof colorBy === "string" ? colorBy : "group"}: {String(colorVal)}
            </div>
          )}
        </div>
      )
    }
  }, [categoryAccessor, valueAccessor, colorBy])

  const error = validateArrayData({
    componentName: "DonutChart", data: safeData,
    accessors: { categoryAccessor, valueAccessor },
  })
  if (error) return <ChartError componentName="DonutChart" message={error} width={width} height={height} />

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "donut",
    data: safeData,
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    projection: "radial",
    pieceStyle,
    innerRadius,
    startAngle,
    centerContent,
    size: [width, height],
    margin,
    enableHover,
    showAxes: false,
    ...(legend && { legend }),
    ...(title && { title }),
    ...(className && { className }),
    tooltipContent: (tooltip ? normalizeTooltip(tooltip) : defaultTooltipContent) as any,
    ...(linkedHover && { customHoverBehavior }),
    ...frameProps
  }

  return <StreamOrdinalFrame {...streamProps} />
}
DonutChart.displayName = "DonutChart"
