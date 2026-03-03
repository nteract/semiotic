"use client"
import * as React from "react"
import { useMemo, useCallback } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps } from "../../stream/types"
import { getColor, getSize } from "../shared/colorUtils"
import { createLegend } from "../shared/legendUtils"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { useColorScale, DEFAULT_COLOR } from "../shared/hooks"
import ChartError from "../shared/ChartError"
import { validateArrayData } from "../shared/validateChartData"
import { normalizeLinkedHover, normalizeLinkedBrush, wrapStyleWithSelection } from "../shared/selectionUtils"
import { useSelection } from "../../store/useSelection"
import { useLinkedHover } from "../../store/useSelection"
import { useBrushSelection } from "../../store/useSelection"

/**
 * Scatterplot component props
 */
export interface ScatterplotProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps, AxisConfig {
  /** Array of data points. Each point should have x and y properties. */
  data: TDatum[]
  /** Field name or function to access x values @default "x" */
  xAccessor?: ChartAccessor<TDatum, number>
  /** Field name or function to access y values @default "y" */
  yAccessor?: ChartAccessor<TDatum, number>
  /** Field name or function to determine point color */
  colorBy?: ChartAccessor<TDatum, string>
  /** Color scheme for categorical data or custom colors array @default "category10" */
  colorScheme?: string | string[]
  /** Field name or function to determine point size */
  sizeBy?: ChartAccessor<TDatum, number>
  /** Min and max radius for points @default [3, 15] */
  sizeRange?: [number, number]
  /** Default point radius when sizeBy is not specified @default 5 */
  pointRadius?: number
  /** Point opacity @default 0.8 */
  pointOpacity?: number
  /** Enable hover annotations @default true */
  enableHover?: boolean
  /** Show grid lines @default false */
  showGrid?: boolean
  /** Show legend @default true (when colorBy is specified) */
  showLegend?: boolean
  /** Tooltip configuration */
  tooltip?: TooltipProp
  /** Additional XYFrame props for advanced customization */
  frameProps?: Partial<Omit<StreamXYFrameProps, "chartType" | "data" | "size">>
}

/**
 * Scatterplot - Visualize relationships between two continuous variables
 *
 * @example
 * ```tsx
 * <Scatterplot
 *   data={[{x: 1, y: 10}, {x: 2, y: 20}]}
 *   xLabel="Time"
 *   yLabel="Value"
 * />
 * ```
 */
export function Scatterplot<TDatum extends Record<string, any> = Record<string, any>>(props: ScatterplotProps<TDatum>) {
  const {
    data,
    width = 600,
    height = 400,
    margin: userMargin,
    className,
    title,
    xLabel,
    yLabel,
    xFormat,
    yFormat,
    xAccessor = "x",
    yAccessor = "y",
    colorBy,
    colorScheme = "category10",
    sizeBy,
    sizeRange = [3, 15],
    pointRadius = 5,
    pointOpacity = 0.8,
    enableHover = true,
    showGrid = false,
    showLegend,
    tooltip,
    frameProps = {},
    selection,
    linkedHover,
    linkedBrush
  } = props

  const safeData = data || []

  // ── Selection hooks (always called, conditional logic inside) ──────────

  const hoverConfig = normalizeLinkedHover(linkedHover, colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [])
  const brushConfig = normalizeLinkedBrush(linkedBrush)

  const selectionHook = useSelection({
    name: selection?.name || "__unused__",
    fields: []
  })

  const linkedHoverHook = useLinkedHover({
    name: hoverConfig?.name || "hover",
    fields: hoverConfig?.fields || []
  })

  const brushHook = useBrushSelection({
    name: brushConfig?.name || "__unused_brush__",
    xField: brushConfig?.xField || (typeof xAccessor === "string" ? xAccessor : undefined),
    yField: brushConfig?.yField || (typeof yAccessor === "string" ? yAccessor : undefined)
  })

  // Only use the hooks when the corresponding props are provided
  const activeSelectionHook = selection ? { isActive: selectionHook.isActive, predicate: selectionHook.predicate } : null

  // ── Core chart logic ───────────────────────────────────────────────────

  const colorScale = useColorScale(safeData, colorBy, colorScheme)

  const sizeDomain = useMemo(() => {
    if (!sizeBy || safeData.length === 0) return undefined
    const sizes = safeData.map((d) =>
      typeof sizeBy === "function" ? sizeBy(d) : d[sizeBy]
    )
    return [Math.min(...sizes), Math.max(...sizes)] as [number, number]
  }, [safeData, sizeBy])

  const basePointStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = { fillOpacity: pointOpacity }
      baseStyle.fill = colorBy ? getColor(d, colorBy, colorScale) : DEFAULT_COLOR
      baseStyle.r = sizeBy
        ? getSize(d, sizeBy, sizeRange, sizeDomain)
        : pointRadius
      return baseStyle
    }
  }, [colorBy, colorScale, sizeBy, sizeRange, sizeDomain, pointRadius, pointOpacity])

  const pointStyle = useMemo(
    () => wrapStyleWithSelection(basePointStyle, activeSelectionHook, selection),
    [basePointStyle, activeSelectionHook, selection]
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

  // ── Hover behavior ─────────────────────────────────────────────────────

  const customHoverBehavior = useCallback(
    (d: Record<string, any> | null) => {
      if (linkedHover) {
        linkedHoverHook.onHover(d)
      }
    },
    [linkedHover, linkedHoverHook]
  )

  // Validate data (after all hooks)
  const error = validateArrayData({
    componentName: "Scatterplot",
    data: safeData,
    accessors: {
      xAccessor,
      yAccessor,
    },
  })
  if (error) return <ChartError componentName="Scatterplot" message={error} width={width} height={height} />

  const streamProps: StreamXYFrameProps = {
    chartType: "scatter",
    data: safeData,
    xAccessor,
    yAccessor,
    colorAccessor: colorBy || undefined,
    sizeAccessor: sizeBy || undefined,
    sizeRange,
    pointStyle,
    colorScheme,
    size: [width, height],
    margin,
    showAxes: true,
    xLabel,
    yLabel,
    xFormat,
    yFormat,
    enableHover,
    showGrid,
    ...(legend && { legend: legend as any }),
    ...(title && { title }),
    ...(className && { className }),
    ...(tooltip && { tooltipContent: normalizeTooltip(tooltip) as any }),
    ...(linkedHover && { customHoverBehavior }),
    ...frameProps
  }

  return <StreamXYFrame {...streamProps} />
}
Scatterplot.displayName = "Scatterplot"
