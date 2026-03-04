"use client"
import * as React from "react"
import { useMemo, useCallback } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps } from "../../stream/ordinalTypes"
import { getColor, getSize } from "../shared/colorUtils"
import { useColorScale, DEFAULT_COLOR, resolveAccessor } from "../shared/hooks"
import { createLegend } from "../shared/legendUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, defaultTooltipStyle, type TooltipProp } from "../../Tooltip/Tooltip"
import ChartError from "../shared/ChartError"
import { validateArrayData } from "../shared/validateChartData"
import { normalizeLinkedHover, wrapStyleWithSelection } from "../shared/selectionUtils"
import { useSelection } from "../../store/useSelection"
import { useLinkedHover } from "../../store/useSelection"

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
    tooltip, frameProps = {}, selection, linkedHover
  } = props

  const safeData = data || []

  const hoverConfig = normalizeLinkedHover(linkedHover, colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [typeof categoryAccessor === "string" ? categoryAccessor : ""])
  const selectionHook = useSelection({ name: selection?.name || "__unused__", fields: [] })
  const linkedHoverHook = useLinkedHover({ name: hoverConfig?.name || "hover", fields: hoverConfig?.fields || [] })
  const activeSelectionHook = selection ? { isActive: selectionHook.isActive, predicate: selectionHook.predicate } : null

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

  const shouldShowLegend = showLegend !== undefined ? showLegend : !!colorBy
  const legend = useMemo(() => {
    if (!shouldShowLegend || !colorBy) return undefined
    return createLegend({ data: safeData, colorBy, colorScale, getColor })
  }, [shouldShowLegend, colorBy, safeData, colorScale])

  const margin = useMemo(() => {
    const finalMargin = { top: 50, bottom: 60, left: 70, right: 40, ...userMargin }
    if (legend && finalMargin.right < 120) finalMargin.right = 120
    return finalMargin
  }, [userMargin, legend])

  const customHoverBehavior = useCallback(
    (d: Record<string, any> | null) => { if (linkedHover) linkedHoverHook.onHover(d) },
    [linkedHover, linkedHoverHook]
  )

  const defaultTooltipContent = useMemo(() => {
    const getVal = resolveAccessor<number>(valueAccessor)
    const getCat = resolveAccessor(categoryAccessor)
    return (d: Record<string, any>) => {
      const datum = d.data || d
      const cat = getCat(datum)
      const val = getVal(datum)
      const colorVal = colorBy
        ? (typeof colorBy === "function" ? (colorBy as Function)(datum) : datum[colorBy as string])
        : null
      const sizeVal = sizeBy
        ? (typeof sizeBy === "function" ? (sizeBy as Function)(datum) : datum[sizeBy as string])
        : null
      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          <div style={{ fontWeight: "bold" }}>{String(cat)}</div>
          <div style={{ marginTop: "4px" }}>
            {typeof val === "number" ? val.toLocaleString() : String(val)}
          </div>
          {colorVal != null && (
            <div style={{ marginTop: "2px", opacity: 0.8 }}>
              {typeof colorBy === "string" ? colorBy : "color"}: {String(colorVal)}
            </div>
          )}
          {sizeVal != null && (
            <div style={{ marginTop: "2px", opacity: 0.8 }}>
              {typeof sizeBy === "string" ? sizeBy : "size"}: {typeof sizeVal === "number" ? sizeVal.toLocaleString() : String(sizeVal)}
            </div>
          )}
        </div>
      )
    }
  }, [categoryAccessor, valueAccessor, colorBy, sizeBy])

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
    ...frameProps
  }

  return <StreamOrdinalFrame {...streamProps} />
}
SwarmPlot.displayName = "SwarmPlot"
