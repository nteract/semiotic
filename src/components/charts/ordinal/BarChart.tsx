import * as React from "react"
import { useMemo } from "react"
import OrdinalFrame from "../../OrdinalFrame"
import type { OrdinalFrameProps } from "../../types/ordinalTypes"
import { getColor, createColorScale } from "../shared/colorUtils"
import { createLegend } from "../shared/legendUtils"
import type { BaseChartProps, Accessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"

/**
 * BarChart component props
 */
export interface BarChartProps extends BaseChartProps {
  /**
   * Array of data points. Each point should have a category and value.
   * @example
   * ```ts
   * [{category: 'A', value: 10}, {category: 'B', value: 20}]
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
   * Field name or function to determine bar color
   * @example
   * ```ts
   * colorBy="category"  // Use category field
   * colorBy={d => d.value > 10 ? 'green' : 'red'}  // Use function
   * ```
   */
  colorBy?: Accessor<string>

  /**
   * Color scheme for categorical data or custom colors array
   * @default "category10"
   */
  colorScheme?: string | string[]

  /**
   * Sort bars by value
   * @default false
   * @example
   * ```ts
   * sort="asc"  // Ascending
   * sort="desc"  // Descending
   * sort={true}  // Descending (default)
   * sort={(a, b) => a.value - b.value}  // Custom function
   * ```
   */
  sort?: boolean | "asc" | "desc" | ((a: any, b: any) => number)

  /**
   * Padding between bars (in pixels)
   * @default 5
   */
  barPadding?: number

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
 * BarChart - Visualize categorical data with bars
 *
 * A simplified wrapper around OrdinalFrame for creating bar charts. Perfect for
 * comparing values across categories.
 *
 * @example
 * ```tsx
 * // Simple bar chart
 * <BarChart
 *   data={[
 *     {category: 'A', value: 10},
 *     {category: 'B', value: 20},
 *     {category: 'C', value: 15}
 *   ]}
 *   categoryLabel="Category"
 *   valueLabel="Value"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Horizontal bar chart with color encoding
 * <BarChart
 *   data={data}
 *   orientation="horizontal"
 *   colorBy="category"
 *   colorScheme="tableau10"
 *   sort="desc"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Advanced: Override OrdinalFrame props
 * <BarChart
 *   data={data}
 *   categoryAccessor={d => d.name}
 *   valueAccessor={d => d.count}
 *   frameProps={{
 *     pieceHoverAnnotation: true,
 *     tooltipContent: d => <div>{d.name}: {d.count}</div>
 *   }}
 * />
 * ```
 *
 * @remarks
 * This component wraps {@link OrdinalFrame} with sensible defaults for bar charts.
 * For more advanced features like stacking, grouping, or custom marks,
 * use OrdinalFrame directly.
 *
 * **Breadcrumb to advanced usage:**
 * - Use the `frameProps` prop to pass any OrdinalFrame prop
 * - See OrdinalFrame documentation: https://semiotic.nteract.io/guides/ordinal-frame
 * - All OrdinalFrame props are available via `frameProps`
 *
 * @param props - BarChart configuration
 * @returns Rendered bar chart
 */
export function BarChart(props: BarChartProps) {
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
    sort = false,
    barPadding = 5,
    enableHover = true,
    showGrid = false,
    showLegend,
    tooltip,
    frameProps = {}
  } = props

  // Validate data
  if (!data || data.length === 0) {
    console.warn("BarChart: data prop is required and should not be empty")
    return null
  }

  // Sort data if requested
  const sortedData = useMemo(() => {
    if (!sort) return data

    const dataCopy = [...data]

    if (typeof sort === "function") {
      return dataCopy.sort(sort)
    }

    // Get value accessor function
    const getValue = typeof valueAccessor === "function"
      ? valueAccessor
      : (d: any) => d[valueAccessor]

    if (sort === "asc") {
      return dataCopy.sort((a, b) => getValue(a) - getValue(b))
    } else {
      // sort === "desc" or sort === true
      return dataCopy.sort((a, b) => getValue(b) - getValue(a))
    }
  }, [data, sort, valueAccessor])

  // Create color scale if colorBy is specified
  const colorScale = useMemo(() => {
    if (!colorBy || typeof colorBy === "function") {
      return undefined
    }

    const scheme = Array.isArray(colorScheme) ? colorScheme : colorScheme
    return createColorScale(sortedData, colorBy as string, scheme)
  }, [sortedData, colorBy, colorScheme])

  // Piece style function
  const pieceStyle = useMemo(() => {
    return (d: any) => {
      const baseStyle: any = {}

      // Apply color
      if (colorBy) {
        baseStyle.fill = getColor(d, colorBy, colorScale)
      } else {
        baseStyle.fill = "#007bff"
      }

      return baseStyle
    }
  }, [colorBy, colorScale])

  // Build axes configuration
  const axes = useMemo(() => {
    const axesConfig: any[] = []

    if (orientation === "vertical") {
      // Vertical bars: category on bottom, value on left
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
      // Horizontal bars: category on left, value on bottom
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
      data: sortedData,
      colorBy,
      colorScale,
      getColor
    })
  }, [shouldShowLegend, colorBy, sortedData, colorScale])

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
    data: sortedData,
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    type: "bar",
    projection: orientation === "horizontal" ? "horizontal" : "vertical",
    style: pieceStyle,
    axes,
    hoverAnnotation: enableHover,
    margin,
    oPadding: barPadding,
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
export default BarChart
