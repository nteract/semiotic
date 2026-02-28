"use client"
import * as React from "react"
import { useMemo } from "react"
import { scaleSequential } from "d3-scale"
import { interpolateBlues, interpolateReds, interpolateGreens, interpolateViridis } from "d3-scale-chromatic"
import XYFrame from "../../XYFrame"
import type { XYFrameProps } from "../../types/xyTypes"
import { DEFAULT_COLOR, resolveAccessor } from "../shared/hooks"
import type { BaseChartProps, Accessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"

/**
 * Heatmap component props
 */
export interface HeatmapProps extends BaseChartProps {
  /**
   * Array of data points with x, y, and value properties.
   * @example
   * ```ts
   * [{x: 1, y: 1, value: 10}, {x: 1, y: 2, value: 20}, {x: 2, y: 1, value: 15}]
   * ```
   */
  data: Array<Record<string, any>>

  /**
   * Field name or function to access x values
   * @default "x"
   */
  xAccessor?: Accessor<number>

  /**
   * Field name or function to access y values
   * @default "y"
   */
  yAccessor?: Accessor<number>

  /**
   * Field name or function to access cell values
   * @default "value"
   */
  valueAccessor?: Accessor<number>

  /**
   * Label for the x-axis
   */
  xLabel?: string

  /**
   * Label for the y-axis
   */
  yLabel?: string

  /**
   * Format function for x-axis tick labels
   */
  xFormat?: (d: any) => string

  /**
   * Format function for y-axis tick labels
   */
  yFormat?: (d: any) => string

  /**
   * Color scheme for the heatmap
   * @default "blues"
   */
  colorScheme?: "blues" | "reds" | "greens" | "viridis" | "custom"

  /**
   * Custom color scale (used when colorScheme is "custom")
   * @example
   * ```ts
   * customColorScale={scaleSequential(interpolatePlasma).domain([0, 100])}
   * ```
   */
  customColorScale?: any

  /**
   * Show values in cells
   * @default false
   */
  showValues?: boolean

  /**
   * Format function for cell value labels
   */
  valueFormat?: (d: number) => string

  /**
   * Cell border color
   * @default "#fff"
   */
  cellBorderColor?: string

  /**
   * Cell border width
   * @default 1
   */
  cellBorderWidth?: number

  /**
   * Enable hover annotations
   * @default true
   */
  enableHover?: boolean

  /**
   * Tooltip configuration
   */
  tooltip?: TooltipProp

  /**
   * Additional XYFrame props for advanced customization
   * For full control, consider using XYFrame directly
   * @see https://semiotic.nteract.io/guides/xy-frame
   */
  frameProps?: Partial<Omit<XYFrameProps, "summaries" | "size">>
}

/**
 * Heatmap - Visualize matrix data with color-encoded cells
 *
 * A simplified wrapper around XYFrame for creating heatmaps. Perfect for
 * showing patterns, correlations, and distributions in 2D data.
 *
 * @example
 * ```tsx
 * // Simple heatmap
 * <Heatmap
 *   data={[
 *     {x: 1, y: 1, value: 10},
 *     {x: 1, y: 2, value: 20},
 *     {x: 2, y: 1, value: 15},
 *     {x: 2, y: 2, value: 25}
 *   ]}
 *   xLabel="Time"
 *   yLabel="Category"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With custom color scheme and value labels
 * <Heatmap
 *   data={data}
 *   colorScheme="viridis"
 *   showValues={true}
 *   valueFormat={d => d.toFixed(1)}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Advanced: Custom color scale
 * <Heatmap
 *   data={data}
 *   colorScheme="custom"
 *   customColorScale={
 *     scaleSequential(interpolatePlasma).domain([0, 100])
 *   }
 * />
 * ```
 *
 * @remarks
 * This component wraps {@link XYFrame} with sensible defaults for heatmaps.
 * For more advanced features like hexbins, contours, or custom summaries,
 * use XYFrame directly.
 *
 * **Breadcrumb to advanced usage:**
 * - Use the `frameProps` prop to pass any XYFrame prop
 * - See XYFrame documentation: https://semiotic.nteract.io/guides/xy-frame
 * - All XYFrame props are available via `frameProps`
 *
 * @param props - Heatmap configuration
 * @returns Rendered heatmap
 */
export function Heatmap(props: HeatmapProps) {
  const {
    data,
    width = 600,
    height = 400,
    margin = { top: 50, bottom: 60, left: 70, right: 80 },
    className,
    title,
    xAccessor = "x",
    yAccessor = "y",
    valueAccessor = "value",
    xLabel,
    yLabel,
    xFormat,
    yFormat,
    colorScheme = "blues",
    customColorScale,
    showValues = false,
    valueFormat,
    cellBorderColor = "#fff",
    cellBorderWidth = 1,
    enableHover = true,
    tooltip,
    frameProps = {}
  } = props

  const safeData = data || []

  // Get value accessor function
  const getValueFn = useMemo(() => {
    return typeof valueAccessor === "function"
      ? valueAccessor
      : (d: Record<string, any>) => d[valueAccessor]
  }, [valueAccessor])

  // Calculate value domain
  const valueDomain = useMemo(() => {
    const values = safeData.map(getValueFn)
    return [Math.min(...values), Math.max(...values)] as [number, number]
  }, [safeData, getValueFn])

  // Create color scale
  const colorScale = useMemo(() => {
    if (colorScheme === "custom" && customColorScale) {
      return customColorScale
    }

    const interpolators = {
      blues: interpolateBlues,
      reds: interpolateReds,
      greens: interpolateGreens,
      viridis: interpolateViridis
    }

    const interpolator = interpolators[colorScheme] || interpolateBlues

    return scaleSequential(interpolator).domain(valueDomain)
  }, [colorScheme, customColorScale, valueDomain])

  // Get unique x and y values for bin sizing
  const { xBinCount, yBinCount } = useMemo(() => {
    const getX = resolveAccessor(xAccessor)
    const getY = resolveAccessor(yAccessor)

    return {
      xBinCount: new Set(safeData.map(getX)).size,
      yBinCount: new Set(safeData.map(getY)).size
    }
  }, [safeData, xAccessor, yAccessor])

  // Transform data to summary format for XYFrame
  const summaryData = useMemo(() => {
    return { coordinates: safeData }
  }, [safeData])

  // Summary style function
  const summaryStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const value = getValueFn(d)
      return {
        fill: colorScale(value),
        stroke: cellBorderColor,
        strokeWidth: cellBorderWidth
      }
    }
  }, [getValueFn, colorScale, cellBorderColor, cellBorderWidth])

  // Summary render function (for value labels)
  const summaryRenderMode = useMemo(() => {
    if (!showValues) return undefined

    const midpoint = (valueDomain[0] + valueDomain[1]) / 2

    return (d: Record<string, any>, i: number) => {
      const value = getValueFn(d)
      const displayValue = valueFormat ? valueFormat(value) : String(value)

      return (
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          fill={getValueFn(d) > midpoint ? "#fff" : "#000"}
          fontSize="12px"
        >
          {displayValue}
        </text>
      )
    }
  }, [showValues, getValueFn, valueFormat, valueDomain])

  // Build axes configuration
  const axes = useMemo(() => {
    const axesConfig: Array<Record<string, unknown>> = []

    // Y axis (left)
    axesConfig.push({
      orient: "left",
      label: yLabel,
      tickFormat: yFormat
    })

    // X axis (bottom)
    axesConfig.push({
      orient: "bottom",
      label: xLabel,
      tickFormat: xFormat
    })

    return axesConfig
  }, [xLabel, yLabel, xFormat, yFormat])

  // Validate data (after all hooks)
  if (safeData.length === 0) {
    console.warn("Heatmap: data prop is required and should not be empty")
    return null
  }

  // Build XYFrame props
  const xyFrameProps: XYFrameProps = {
    size: [width, height],
    summaries: summaryData,
    xAccessor,
    yAccessor,
    summaryType: {
      type: "heatmap",
      xBins: xBinCount,
      yBins: yBinCount,
      binValue: (items: Array<Record<string, any>>) => {
        if (items.length === 0) return 0
        const sum = items.reduce((acc, item) => acc + getValueFn(item), 0)
        return sum / items.length
      }
    },
    summaryStyle,
    axes: axes as any,
    hoverAnnotation: enableHover,
    margin,
    ...(summaryRenderMode && { summaryRenderMode }),
    ...(className && { className }),
    ...(title && { title }),
    // Add tooltip support
    ...(tooltip && { tooltipContent: normalizeTooltip(tooltip) as Function }),
    // Allow frameProps to override defaults
    ...frameProps
  }

  return <XYFrame {...xyFrameProps} />
}
