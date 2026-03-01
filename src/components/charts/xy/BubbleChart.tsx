"use client"
import * as React from "react"
import { useMemo } from "react"
import XYFrame from "../../XYFrame"
import type { XYFrameProps } from "../../types/xyTypes"
import { getColor, getSize } from "../shared/colorUtils"
import { useColorScale, DEFAULT_COLOR } from "../shared/hooks"
import { createLegend } from "../shared/legendUtils"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"

/**
 * BubbleChart component props
 */
export interface BubbleChartProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps, AxisConfig {
  /**
   * Array of data points. Each point should have x, y, and size properties.
   * @example
   * ```ts
   * [{x: 1, y: 10, size: 50, category: 'A'}, {x: 2, y: 20, size: 30, category: 'B'}]
   * ```
   */
  data: TDatum[]

  /**
   * Field name or function to access x values
   * @default "x"
   */
  xAccessor?: ChartAccessor<TDatum, number>

  /**
   * Field name or function to access y values
   * @default "y"
   */
  yAccessor?: ChartAccessor<TDatum, number>

  /**
   * Field name or function to determine bubble size (required)
   * @example
   * ```ts
   * sizeBy="population"
   * sizeBy={d => Math.sqrt(d.value)}
   * ```
   */
  sizeBy: ChartAccessor<TDatum, number>

  /**
   * Min and max radius for bubbles
   * @default [5, 40]
   */
  sizeRange?: [number, number]

  /**
   * Field name or function to determine bubble color
   * @example
   * ```ts
   * colorBy="category"
   * colorBy={d => d.value > 10 ? 'red' : 'blue'}
   * ```
   */
  colorBy?: ChartAccessor<TDatum, string>

  /**
   * Color scheme for categorical data or custom colors array
   * @default "category10"
   */
  colorScheme?: string | string[]

  /**
   * Bubble opacity
   * @default 0.6
   */
  bubbleOpacity?: number

  /**
   * Bubble stroke width
   * @default 1
   */
  bubbleStrokeWidth?: number

  /**
   * Bubble stroke color
   * @default "white"
   */
  bubbleStrokeColor?: string

  /**
   * Enable hover annotations
   * @default true
   */
  enableHover?: boolean

  /**
   * Show grid lines
   * @default false
   */
  showGrid?: boolean

  /**
   * Show legend
   * @default true (when colorBy is specified)
   */
  showLegend?: boolean

  /**
   * Tooltip configuration
   */
  tooltip?: TooltipProp

  /**
   * Additional XYFrame props for advanced customization
   * For full control, consider using XYFrame directly
   * @see https://semiotic.nteract.io/guides/xy-frame
   */
  frameProps?: Partial<Omit<XYFrameProps, "points" | "size">>
}

/**
 * BubbleChart - Visualize three dimensions of data using x, y, and size
 *
 * A simplified wrapper around XYFrame for creating bubble charts. Perfect for
 * showing relationships between three continuous variables or comparing
 * magnitudes across categories.
 *
 * @example
 * ```tsx
 * // Simple bubble chart
 * <BubbleChart
 *   data={[
 *     {x: 1, y: 10, size: 50, name: 'A'},
 *     {x: 2, y: 20, size: 30, name: 'B'},
 *     {x: 3, y: 15, size: 70, name: 'C'}
 *   ]}
 *   sizeBy="size"
 *   xLabel="Time"
 *   yLabel="Value"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With color encoding
 * <BubbleChart
 *   data={data}
 *   sizeBy="population"
 *   colorBy="continent"
 *   sizeRange={[5, 50]}
 *   bubbleOpacity={0.7}
 *   xLabel="GDP per Capita"
 *   yLabel="Life Expectancy"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Advanced: Override XYFrame props
 * <BubbleChart
 *   data={data}
 *   sizeBy="value"
 *   frameProps={{
 *     customPointMark: ({ d }) => <circle r={d.r} fill="gold" />
 *   }}
 * />
 * ```
 *
 * @remarks
 * This component wraps {@link XYFrame} with sensible defaults for bubble charts.
 * For more advanced features like custom marks, annotations, or complex interactions,
 * use XYFrame directly.
 *
 * **Breadcrumb to advanced usage:**
 * - Use the `frameProps` prop to pass any XYFrame prop
 * - See XYFrame documentation: https://semiotic.nteract.io/guides/xy-frame
 * - All XYFrame props are available via `frameProps`
 *
 * @param props - BubbleChart configuration
 * @returns Rendered bubble chart
 */
export function BubbleChart<TDatum extends Record<string, any> = Record<string, any>>(props: BubbleChartProps<TDatum>) {
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
    sizeBy,
    sizeRange = [5, 40],
    colorBy,
    colorScheme = "category10",
    bubbleOpacity = 0.6,
    bubbleStrokeWidth = 1,
    bubbleStrokeColor = "white",
    enableHover = true,
    showGrid = false,
    showLegend,
    tooltip,
    frameProps = {}
  } = props

  const safeData = data || []

  // Create color scale if colorBy is specified
  const colorScale = useColorScale(safeData, colorBy, colorScheme)

  // Calculate size domain
  const sizeDomain = useMemo(() => {
    const sizes = safeData.map((d) => {
      if (typeof sizeBy === "function") {
        return sizeBy(d)
      }
      return d[sizeBy]
    })

    return [Math.min(...sizes), Math.max(...sizes)] as [number, number]
  }, [safeData, sizeBy])

  // Point style function
  const pointStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {
        fillOpacity: bubbleOpacity,
        strokeWidth: bubbleStrokeWidth,
        stroke: bubbleStrokeColor
      }

      // Apply color
      if (colorBy) {
        baseStyle.fill = getColor(d, colorBy, colorScale)
      } else {
        baseStyle.fill = DEFAULT_COLOR
      }

      // Apply size
      baseStyle.r = getSize(d, sizeBy, sizeRange, sizeDomain)

      return baseStyle
    }
  }, [colorBy, colorScale, sizeBy, sizeRange, sizeDomain, bubbleOpacity, bubbleStrokeWidth, bubbleStrokeColor])

  // Build axes configuration
  const axes = useMemo(() => {
    const axesConfig: Array<Record<string, unknown>> = []

    // Y axis (left)
    axesConfig.push({
      orient: "left",
      label: yLabel,
      tickFormat: yFormat,
      ...(showGrid && { tickLineGenerator: () => null })
    })

    // X axis (bottom)
    axesConfig.push({
      orient: "bottom",
      label: xLabel,
      tickFormat: xFormat,
      ...(showGrid && { tickLineGenerator: () => null })
    })

    return axesConfig
  }, [xLabel, yLabel, xFormat, yFormat, showGrid])

  // Determine if we should show legend
  const shouldShowLegend = showLegend !== undefined ? showLegend : !!colorBy

  // Build legend if needed
  const legend = useMemo(() => {
    if (!shouldShowLegend || !colorBy) return undefined

    return createLegend({
      data: safeData,
      colorBy,
      colorScale,
      getColor,
      strokeColor: bubbleStrokeColor,
      strokeWidth: bubbleStrokeWidth
    })
  }, [shouldShowLegend, colorBy, safeData, colorScale, bubbleStrokeColor, bubbleStrokeWidth])

  // Adjust margin for legend if present
  const margin = useMemo(() => {
    const defaultMargin = { top: 50, bottom: 60, left: 70, right: 40 }
    const finalMargin = { ...defaultMargin, ...userMargin }

    // If legend is present and right margin is too small, increase it
    if (legend && finalMargin.right < 120) {
      finalMargin.right = 120
    }

    return finalMargin
  }, [userMargin, legend])

  // Validate data (after all hooks)
  if (safeData.length === 0) {
    console.warn("BubbleChart: data prop is required and should not be empty")
    return null
  }

  if (!sizeBy) {
    console.warn("BubbleChart: sizeBy prop is required for bubble charts")
    return null
  }

  // Build XYFrame props
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
    // Add tooltip support
    ...(tooltip && { tooltipContent: normalizeTooltip(tooltip) as Function }),
    // Allow frameProps to override defaults
    ...frameProps
  }

  return <XYFrame {...xyFrameProps} />
}
