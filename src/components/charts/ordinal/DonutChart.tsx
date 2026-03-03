"use client"
import * as React from "react"
import { useMemo, useCallback } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps } from "../../stream/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useColorScale, DEFAULT_COLOR } from "../shared/hooks"
import { createLegend } from "../shared/legendUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, defaultTooltipStyle, type TooltipProp } from "../../Tooltip/Tooltip"
import ChartError from "../shared/ChartError"
import { validateArrayData } from "../shared/validateChartData"
import { normalizeLinkedHover, wrapStyleWithSelection } from "../shared/selectionUtils"
import { useSelection } from "../../store/useSelection"
import { useLinkedHover } from "../../store/useSelection"

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

  const hoverConfig = normalizeLinkedHover(linkedHover, actualColorBy ? [typeof actualColorBy === "string" ? actualColorBy : ""] : [])
  const selectionHook = useSelection({ name: selection?.name || "__unused__", fields: [] })
  const linkedHoverHook = useLinkedHover({ name: hoverConfig?.name || "hover", fields: hoverConfig?.fields || [] })
  const activeSelectionHook = selection ? { isActive: selectionHook.isActive, predicate: selectionHook.predicate } : null

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

  const legend = useMemo(() => {
    if (!showLegend) return undefined
    return createLegend({ data: safeData, colorBy: actualColorBy, colorScale, getColor })
  }, [showLegend, safeData, actualColorBy, colorScale])

  const margin = useMemo(() => {
    const finalMargin = { top: 20, bottom: 20, left: 20, right: 20, ...userMargin }
    if (legend && finalMargin.right < 120) finalMargin.right = 120
    return finalMargin
  }, [userMargin, legend])

  const customHoverBehavior = useCallback(
    (d: Record<string, any> | null) => { if (linkedHover) linkedHoverHook.onHover(d) },
    [linkedHover, linkedHoverHook]
  )

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
