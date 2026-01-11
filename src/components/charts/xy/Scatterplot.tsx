import * as React from "react"
import { useMemo } from "react"
import XYFrame from "../../XYFrame"
import type { XYFrameProps } from "../../types/xyTypes"
import { getColor, getSize, createColorScale } from "../shared/colorUtils"
import { formatAxis } from "../shared/formatUtils"
import type { BaseChartProps, AxisConfig, Accessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"

/**
 * Scatterplot component props
 */
export interface ScatterplotProps extends BaseChartProps, AxisConfig {
  /**
   * Array of data points. Each point should have x and y properties.
   * @example
   * ```ts
   * [{x: 1, y: 10, category: 'A'}, {x: 2, y: 20, category: 'B'}]
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
   * Field name or function to determine point color
   * @example
   * ```ts
   * colorBy="category"  // Use category field
   * colorBy={d => d.value > 10 ? 'red' : 'blue'}  // Use function
   * ```
   */
  colorBy?: Accessor<string>

  /**
   * Color scheme for categorical data or custom colors array
   * @default "category10"
   */
  colorScheme?: string | string[]

  /**
   * Field name or function to determine point size
   * @example
   * ```ts
   * sizeBy="importance"
   * sizeBy={d => Math.sqrt(d.value)}
   * ```
   */
  sizeBy?: Accessor<number>

  /**
   * Min and max radius for points
   * @default [3, 15]
   */
  sizeRange?: [number, number]

  /**
   * Default point radius when sizeBy is not specified
   * @default 5
   */
  pointRadius?: number

  /**
   * Point opacity
   * @default 0.8
   */
  pointOpacity?: number

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
   * Tooltip configuration
   * @example
   * ```tsx
   * // Simple tooltip with default behavior
   * tooltip={true}
   *
   * // Custom tooltip with specific fields
   * tooltip={Tooltip({ title: "name", format: v => v.toFixed(2) })}
   *
   * // Multi-line tooltip
   * tooltip={MultiLineTooltip({ fields: ["x", "y", "category"] })}
   *
   * // Custom tooltip function
   * tooltip={(d) => <div>{d.name}: {d.value}</div>}
   * ```
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
 * Scatterplot - Visualize relationships between two continuous variables
 *
 * A simplified wrapper around XYFrame for creating scatter plots. Perfect for
 * exploring correlations, distributions, and patterns in your data.
 *
 * @example
 * ```tsx
 * // Simple scatter plot
 * <Scatterplot
 *   data={[
 *     {x: 1, y: 10},
 *     {x: 2, y: 20},
 *     {x: 3, y: 15}
 *   ]}
 *   xLabel="Time"
 *   yLabel="Value"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With color and size encoding
 * <Scatterplot
 *   data={data}
 *   colorBy="category"
 *   sizeBy="importance"
 *   xLabel="X Axis"
 *   yLabel="Y Axis"
 *   pointOpacity={0.6}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Advanced: Override XYFrame props
 * <Scatterplot
 *   data={data}
 *   xAccessor={d => d.customX}
 *   yAccessor={d => d.customY}
 *   frameProps={{
 *     customPointMark: ({ d }) => <circle r={10} fill="red" />
 *   }}
 * />
 * ```
 *
 * @remarks
 * This component wraps {@link XYFrame} with sensible defaults for scatter plots.
 * For more advanced features like custom marks, annotations, or complex interactions,
 * use XYFrame directly.
 *
 * **Breadcrumb to advanced usage:**
 * - Use the `frameProps` prop to pass any XYFrame prop
 * - See XYFrame documentation: https://semiotic.nteract.io/guides/xy-frame
 * - All XYFrame props are available via `frameProps`
 *
 * @param props - Scatterplot configuration
 * @returns Rendered scatter plot
 */
export function Scatterplot(props: ScatterplotProps) {
  const {
    data,
    width = 600,
    height = 400,
    margin = { top: 50, bottom: 60, left: 70, right: 40 },
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
    tooltip,
    frameProps = {}
  } = props

  // Validate data
  if (!data || data.length === 0) {
    console.warn("Scatterplot: data prop is required and should not be empty")
    return null
  }

  // Create color scale if colorBy is specified
  const colorScale = useMemo(() => {
    if (!colorBy || typeof colorBy === "function") {
      return undefined
    }

    const scheme = Array.isArray(colorScheme) ? colorScheme : colorScheme
    return createColorScale(data, colorBy as string, scheme)
  }, [data, colorBy, colorScheme])

  // Calculate size domain if sizeBy is specified
  const sizeDomain = useMemo(() => {
    if (!sizeBy) return undefined

    const sizes = data.map((d) => {
      if (typeof sizeBy === "function") {
        return sizeBy(d)
      }
      return d[sizeBy]
    })

    return [Math.min(...sizes), Math.max(...sizes)] as [number, number]
  }, [data, sizeBy])

  // Point style function
  const pointStyle = useMemo(() => {
    return (d: any) => {
      const baseStyle: any = {
        fillOpacity: pointOpacity
      }

      // Apply color
      if (colorBy) {
        baseStyle.fill = getColor(d, colorBy, colorScale)
      } else {
        baseStyle.fill = "#007bff"
      }

      // Apply size
      if (sizeBy) {
        baseStyle.r = getSize(d, sizeBy, sizeRange, sizeDomain)
      } else {
        baseStyle.r = pointRadius
      }

      return baseStyle
    }
  }, [colorBy, colorScale, sizeBy, sizeRange, sizeDomain, pointRadius, pointOpacity])

  // Build axes configuration
  const axes = useMemo(() => {
    const axesConfig: any[] = []

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

  // Build XYFrame props
  const xyFrameProps: XYFrameProps = {
    size: [width, height],
    points: data,
    xAccessor,
    yAccessor,
    pointStyle,
    axes,
    hoverAnnotation: enableHover,
    margin,
    ...(className && { className }),
    ...(title && { title }),
    // Add tooltip support
    ...(tooltip && { tooltipContent: normalizeTooltip(tooltip) }),
    // Allow frameProps to override defaults
    ...frameProps
  }

  return <XYFrame {...xyFrameProps} />
}

// Export default for convenience
export default Scatterplot
