import * as React from "react"
import { useMemo } from "react"
import OrdinalFrame from "../../OrdinalFrame"
import type { OrdinalFrameProps } from "../../types/ordinalTypes"
import { getColor, getSize, createColorScale } from "../shared/colorUtils"
import { createLegend } from "../shared/legendUtils"
import type { BaseChartProps, Accessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"

/**
 * SwarmPlot component props
 */
export interface SwarmPlotProps extends BaseChartProps {
  /**
   * Array of data points with category and value.
   * @example
   * ```ts
   * [
   *   {category: 'Group A', value: 10, type: 'X'},
   *   {category: 'Group A', value: 12, type: 'Y'},
   *   {category: 'Group B', value: 15, type: 'X'}
   * ]
   * ```
   */
  data: Array<Record<string, any>>

  /**
   * Field name or function to access category values
   * @default "category"
   */
  categoryAccessor?: Accessor<string>

  /**
   * Field name or function to access numeric values
   * @default "value"
   */
  valueAccessor?: Accessor<number>

  /**
   * Chart orientation
   * @default "vertical"
   */
  orientation?: "vertical" | "horizontal"

  /**
   * Label for the category axis
   */
  categoryLabel?: string

  /**
   * Label for the value axis
   */
  valueLabel?: string

  /**
   * Format function for value axis tick labels
   */
  valueFormat?: (d: any) => string

  /**
   * Field name or function to determine point color
   * @example
   * ```ts
   * colorBy="type"
   * colorBy={d => d.score > 10 ? 'red' : 'blue'}
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
   * Min and max radius for points when using dynamic sizing
   * @default [3, 8]
   */
  sizeRange?: [number, number]

  /**
   * Default point radius when sizeBy is not specified
   * @default 4
   */
  pointRadius?: number

  /**
   * Point opacity
   * @default 0.7
   */
  pointOpacity?: number

  /**
   * Padding between categories (in pixels)
   * @default 20
   */
  categoryPadding?: number

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
   * Additional OrdinalFrame props for advanced customization
   * For full control, consider using OrdinalFrame directly
   * @see https://semiotic.nteract.io/guides/ordinal-frame
   */
  frameProps?: Partial<Omit<OrdinalFrameProps, "data" | "size">>
}

/**
 * SwarmPlot - Visualize distributions with non-overlapping points
 *
 * A simplified wrapper around OrdinalFrame for creating swarm plots (beeswarm plots).
 * Perfect for showing individual data points while revealing distribution patterns.
 *
 * @example
 * ```tsx
 * // Simple swarm plot
 * <SwarmPlot
 *   data={[
 *     {category: 'Group A', value: 10},
 *     {category: 'Group A', value: 12},
 *     {category: 'Group A', value: 11},
 *     {category: 'Group B', value: 15},
 *     {category: 'Group B', value: 14}
 *   ]}
 *   categoryLabel="Group"
 *   valueLabel="Value"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With color and size encoding
 * <SwarmPlot
 *   data={data}
 *   colorBy="type"
 *   sizeBy="importance"
 *   pointOpacity={0.8}
 *   categoryLabel="Category"
 *   valueLabel="Measurement"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Horizontal orientation
 * <SwarmPlot
 *   data={data}
 *   orientation="horizontal"
 *   colorBy="group"
 *   colorScheme="tableau10"
 * />
 * ```
 *
 * @remarks
 * This component wraps {@link OrdinalFrame} with sensible defaults for swarm plots.
 * For more advanced features like custom point marks or force simulation settings,
 * use OrdinalFrame directly.
 *
 * **Breadcrumb to advanced usage:**
 * - Use the `frameProps` prop to pass any OrdinalFrame prop
 * - See OrdinalFrame documentation: https://semiotic.nteract.io/guides/ordinal-frame
 * - All OrdinalFrame props are available via `frameProps`
 *
 * @param props - SwarmPlot configuration
 * @returns Rendered swarm plot
 */
export function SwarmPlot(props: SwarmPlotProps) {
  const {
    data,
    width = 600,
    height = 400,
    margin: userMargin,
    className,
    title,
    categoryAccessor = "category",
    valueAccessor = "value",
    orientation = "vertical",
    categoryLabel,
    valueLabel,
    valueFormat,
    colorBy,
    colorScheme = "category10",
    sizeBy,
    sizeRange = [3, 8],
    pointRadius = 4,
    pointOpacity = 0.7,
    categoryPadding = 20,
    enableHover = true,
    showGrid = false,
    showLegend,
    tooltip,
    frameProps = {}
  } = props

  // Validate data
  if (!data || data.length === 0) {
    console.warn("SwarmPlot: data prop is required and should not be empty")
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
  const pieceStyle = useMemo(() => {
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

    if (orientation === "vertical") {
      // Vertical: category on bottom, value on left
      axesConfig.push({
        orient: "left",
        label: valueLabel,
        tickFormat: valueFormat,
        ...(showGrid && { tickLineGenerator: () => null })
      })

      if (categoryLabel) {
        axesConfig.push({
          orient: "bottom",
          label: categoryLabel
        })
      }
    } else {
      // Horizontal: category on left, value on bottom
      if (categoryLabel) {
        axesConfig.push({
          orient: "left",
          label: categoryLabel
        })
      }

      axesConfig.push({
        orient: "bottom",
        label: valueLabel,
        tickFormat: valueFormat,
        ...(showGrid && { tickLineGenerator: () => null })
      })
    }

    return axesConfig
  }, [orientation, categoryLabel, valueLabel, valueFormat, showGrid])

  // Determine if we should show legend
  const shouldShowLegend = showLegend !== undefined ? showLegend : !!colorBy

  // Build legend if needed
  const legend = useMemo(() => {
    if (!shouldShowLegend || !colorBy) return undefined

    return createLegend({
      data,
      colorBy,
      colorScale,
      getColor
    })
  }, [shouldShowLegend, colorBy, data, colorScale])

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

  // Build OrdinalFrame props
  const ordinalFrameProps: OrdinalFrameProps = {
    size: [width, height],
    data,
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    type: "swarm",
    projection: orientation === "horizontal" ? "horizontal" : "vertical",
    style: pieceStyle,
    axes,
    hoverAnnotation: enableHover,
    margin,
    oPadding: categoryPadding,
    ...(legend && { legend }),
    ...(className && { className }),
    ...(title && { title }),
    // Add tooltip support
    ...(tooltip && { tooltipContent: normalizeTooltip(tooltip) }),
    // Allow frameProps to override defaults
    ...frameProps
  }

  return <OrdinalFrame {...ordinalFrameProps} />
}

// Export default for convenience
export default SwarmPlot
