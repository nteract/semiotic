"use client"
import * as React from "react"
import { useMemo } from "react"
import XYFrame from "../../XYFrame"
import type { XYFrameProps } from "../../types/xyTypes"
import { getColor, getSize } from "../shared/colorUtils"
import { createLegend } from "../shared/legendUtils"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { useColorScale, DEFAULT_COLOR } from "../shared/hooks"

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
  frameProps?: Partial<Omit<XYFrameProps, "points" | "size">>
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
    frameProps = {}
  } = props

  const safeData = data || []

  const colorScale = useColorScale(safeData, colorBy, colorScheme)

  const sizeDomain = useMemo(() => {
    if (!sizeBy || safeData.length === 0) return undefined
    const sizes = safeData.map((d) =>
      typeof sizeBy === "function" ? sizeBy(d) : d[sizeBy]
    )
    return [Math.min(...sizes), Math.max(...sizes)] as [number, number]
  }, [safeData, sizeBy])

  const pointStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = { fillOpacity: pointOpacity }
      baseStyle.fill = colorBy ? getColor(d, colorBy, colorScale) : DEFAULT_COLOR
      baseStyle.r = sizeBy
        ? getSize(d, sizeBy, sizeRange, sizeDomain)
        : pointRadius
      return baseStyle
    }
  }, [colorBy, colorScale, sizeBy, sizeRange, sizeDomain, pointRadius, pointOpacity])

  const axes = useMemo((): Array<Record<string, unknown>> => [
    {
      orient: "left",
      label: yLabel,
      tickFormat: yFormat,
      ...(showGrid && { tickLineGenerator: () => null })
    },
    {
      orient: "bottom",
      label: xLabel,
      tickFormat: xFormat,
      ...(showGrid && { tickLineGenerator: () => null })
    }
  ], [xLabel, yLabel, xFormat, yFormat, showGrid])

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

  // Validate after all hooks (Rules of Hooks compliance)
  if (safeData.length === 0) return null

  const xyFrameProps: XYFrameProps = {
    size: [width, height],
    points: safeData,
    xAccessor,
    yAccessor,
    pointStyle,
    axes: axes as any,
    hoverAnnotation: enableHover,
    margin,
    ...(legend && { legend }),
    ...(className && { className }),
    ...(title && { title }),
    ...(tooltip && { tooltipContent: normalizeTooltip(tooltip) as Function }),
    ...frameProps
  }

  return <XYFrame {...xyFrameProps} />
}
