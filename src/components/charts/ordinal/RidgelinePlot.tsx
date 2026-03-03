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

export interface RidgelinePlotProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  data: TDatum[]
  categoryAccessor?: ChartAccessor<TDatum, string>
  valueAccessor?: ChartAccessor<TDatum, number>
  orientation?: "vertical" | "horizontal"
  bins?: number
  /** Amplitude factor controlling how far density extends (>1 allows overlap) @default 1.5 */
  amplitude?: number
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
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

/**
 * RidgelinePlot - Visualize distributions as overlapping one-sided density curves.
 *
 * Each category shows its value distribution as a filled area extending from a
 * baseline. The amplitude prop controls overlap between rows.
 */
export function RidgelinePlot<TDatum extends Record<string, any> = Record<string, any>>(props: RidgelinePlotProps<TDatum>) {
  const {
    data, width = 600, height = 400, margin: userMargin, className, title,
    categoryAccessor = "category", valueAccessor = "value",
    orientation = "horizontal", bins = 20, amplitude = 1.5,
    categoryLabel, valueLabel, valueFormat,
    colorBy, colorScheme = "category10", categoryPadding = 5,
    enableHover = true, showGrid = false, showLegend, tooltip,
    frameProps = {}, selection, linkedHover
  } = props

  const safeData = data || []

  const hoverConfig = normalizeLinkedHover(linkedHover, colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [typeof categoryAccessor === "string" ? categoryAccessor : ""])
  const selectionHook = useSelection({ name: selection?.name || "__unused__", fields: [] })
  const linkedHoverHook = useLinkedHover({ name: hoverConfig?.name || "hover", fields: hoverConfig?.fields || [] })
  const activeSelectionHook = selection ? { isActive: selectionHook.isActive, predicate: selectionHook.predicate } : null

  const colorScale = useColorScale(safeData, colorBy, colorScheme)

  const baseSummaryStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const color = colorBy ? getColor(d, colorBy, colorScale) : DEFAULT_COLOR
      return { fill: color, stroke: color, fillOpacity: 0.5 }
    }
  }, [colorBy, colorScale])

  const summaryStyle = useMemo(
    () => wrapStyleWithSelection(baseSummaryStyle, activeSelectionHook, selection),
    [baseSummaryStyle, activeSelectionHook, selection]
  )

  const shouldShowLegend = showLegend !== undefined ? showLegend : !!colorBy
  const legend = useMemo(() => {
    if (!shouldShowLegend || !colorBy) return undefined
    return createLegend({ data: safeData, colorBy, colorScale, getColor })
  }, [shouldShowLegend, colorBy, safeData, colorScale])

  const margin = useMemo(() => {
    const finalMargin = { top: 50, bottom: 60, left: orientation === "horizontal" ? 120 : 70, right: 40, ...userMargin }
    if (legend && finalMargin.right < 120) finalMargin.right = 120
    return finalMargin
  }, [userMargin, legend, orientation])

  const customHoverBehavior = useCallback(
    (d: Record<string, any> | null) => { if (linkedHover) linkedHoverHook.onHover(d) },
    [linkedHover, linkedHoverHook]
  )

  const defaultTooltipContent = useMemo(() => {
    return (d: Record<string, any>) => {
      const datum = d.data || d
      const category = datum.category || d.category || ""
      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          <div style={{ fontWeight: "bold" }}>{String(category)}</div>
        </div>
      )
    }
  }, [])

  const error = validateArrayData({
    componentName: "RidgelinePlot", data: safeData,
    accessors: { categoryAccessor, valueAccessor },
  })
  if (error) return <ChartError componentName="RidgelinePlot" message={error} width={width} height={height} />

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "ridgeline",
    data: safeData,
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    projection: orientation === "horizontal" ? "horizontal" : "vertical",
    summaryStyle,
    bins,
    size: [width, height],
    margin,
    barPadding: categoryPadding,
    enableHover,
    showAxes: true,
    oLabel: categoryLabel,
    rLabel: valueLabel,
    rFormat: valueFormat as any,
    showGrid,
    oSort: false,
    ...(legend && { legend }),
    ...(title && { title }),
    ...(className && { className }),
    tooltipContent: (tooltip ? normalizeTooltip(tooltip) : defaultTooltipContent) as any,
    ...(linkedHover && { customHoverBehavior }),
    ...frameProps
  } as any

  // Pass amplitude through (not in typed props, handled by store cast)
  ;(streamProps as any).amplitude = amplitude

  return <StreamOrdinalFrame {...streamProps} />
}
RidgelinePlot.displayName = "RidgelinePlot"
