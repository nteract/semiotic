"use client"
import * as React from "react"
import { useMemo, useCallback } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps } from "../../stream/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useColorScale, DEFAULT_COLOR, resolveAccessor } from "../shared/hooks"
import { createLegend } from "../shared/legendUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, defaultTooltipStyle, type TooltipProp } from "../../Tooltip/Tooltip"
import ChartError from "../shared/ChartError"
import { validateArrayData } from "../shared/validateChartData"
import { normalizeLinkedHover, wrapStyleWithSelection } from "../shared/selectionUtils"
import { useSelection } from "../../store/useSelection"
import { useLinkedHover } from "../../store/useSelection"

export interface StackedBarChartProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  data: TDatum[]
  categoryAccessor?: ChartAccessor<TDatum, string>
  stackBy: ChartAccessor<TDatum, string>
  valueAccessor?: ChartAccessor<TDatum, number>
  orientation?: "vertical" | "horizontal"
  categoryLabel?: string
  valueLabel?: string
  valueFormat?: (d: number | string) => string
  colorBy?: ChartAccessor<TDatum, string>
  colorScheme?: string | string[]
  normalize?: boolean
  barPadding?: number
  enableHover?: boolean
  showGrid?: boolean
  showLegend?: boolean
  tooltip?: TooltipProp
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

export function StackedBarChart<TDatum extends Record<string, any> = Record<string, any>>(props: StackedBarChartProps<TDatum>) {
  const {
    data, width = 600, height = 400, margin: userMargin, className, title,
    categoryAccessor = "category", stackBy, valueAccessor = "value",
    orientation = "vertical", categoryLabel, valueLabel, valueFormat,
    colorBy, colorScheme = "category10", normalize = false, barPadding = 5,
    enableHover = true, showGrid = false, showLegend = true, tooltip,
    frameProps = {}, selection, linkedHover
  } = props

  const safeData = data || []
  const actualColorBy = colorBy || stackBy

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
    const finalMargin = { top: 50, bottom: 60, left: 70, right: 120, ...userMargin }
    if (legend && finalMargin.right < 120) finalMargin.right = 120
    return finalMargin
  }, [userMargin, legend])

  const customHoverBehavior = useCallback(
    (d: Record<string, any> | null) => { if (linkedHover) linkedHoverHook.onHover(d) },
    [linkedHover, linkedHoverHook]
  )

  const defaultTooltipContent = useMemo(() => {
    const getStack = resolveAccessor(stackBy)
    const getCat = resolveAccessor(categoryAccessor)
    const getVal = resolveAccessor<number>(valueAccessor)
    return (d: Record<string, any>) => {
      const datum = d.data || d
      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          <div style={{ fontWeight: "bold" }}>{String(getStack(datum))}</div>
          <div style={{ marginTop: "4px" }}>
            {String(getCat(datum))} &middot; {Number(getVal(datum)).toLocaleString()}
          </div>
        </div>
      )
    }
  }, [stackBy, categoryAccessor, valueAccessor])

  const error = validateArrayData({
    componentName: "StackedBarChart", data: safeData,
    accessors: { categoryAccessor, valueAccessor }, requiredProps: { stackBy },
  })
  if (error) return <ChartError componentName="StackedBarChart" message={error} width={width} height={height} />

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "bar",
    data: safeData,
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    stackBy,
    normalize,
    projection: orientation === "horizontal" ? "horizontal" : "vertical",
    pieceStyle,
    size: [width, height],
    margin,
    barPadding,
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
StackedBarChart.displayName = "StackedBarChart"
