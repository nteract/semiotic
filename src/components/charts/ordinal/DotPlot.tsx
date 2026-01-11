import * as React from "react"
import { useMemo } from "react"
import OrdinalFrame from "../../OrdinalFrame"
import type { OrdinalFrameProps } from "../../types/ordinalTypes"
import { getColor, createColorScale } from "../shared/colorUtils"
import type { BaseChartProps, Accessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"

/**
 * DotPlot component props
 */
export interface DotPlotProps extends BaseChartProps {
  /**
   * Array of data points with category and value.
   * @example
   * ```ts
   * [
   *   {category: 'Item A', value: 25},
   *   {category: 'Item B', value: 40},
   *   {category: 'Item C', value: 15}
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
   * @default "horizontal"
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
   * Field name or function to determine dot color
   * @example
   * ```ts
   * colorBy="type"
   * colorBy={d => d.value > 20 ? 'high' : 'low'}
   * ```
   */
  colorBy?: Accessor<string>

  /**
   * Color scheme for categorical data or custom colors array
   * @default "category10"
   */
  colorScheme?: string | string[]

  /**
   * Sort categories by value
   * @default true
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
   * Dot radius
   * @default 5
   */
  dotRadius?: number

  /**
   * Padding between categories (in pixels)
   * @default 10
   */
  categoryPadding?: number

  /**
   * Enable hover annotations
   * @default true
   */
  enableHover?: boolean

  /**
   * Show grid lines
   * @default true
   */
  showGrid?: boolean

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
 * DotPlot - Visualize categorical data with Cleveland dot plots
 *
 * A simplified wrapper around OrdinalFrame for creating dot plots.
 * Perfect for comparing values across categories with a clean, minimal style.
 *
 * @example
 * ```tsx
 * // Simple dot plot
 * <DotPlot
 *   data={[
 *     {category: 'Item A', value: 25},
 *     {category: 'Item B', value: 40},
 *     {category: 'Item C', value: 15}
 *   ]}
 *   categoryLabel="Items"
 *   valueLabel="Value"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With color encoding and sorting
 * <DotPlot
 *   data={data}
 *   colorBy="type"
 *   sort="desc"
 *   dotRadius={6}
 *   showGrid={true}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Vertical orientation
 * <DotPlot
 *   data={data}
 *   orientation="vertical"
 *   colorScheme="tableau10"
 *   sort="asc"
 * />
 * ```
 *
 * @remarks
 * This component wraps {@link OrdinalFrame} with sensible defaults for dot plots.
 * For more advanced features like range connectors (dumbbell style) or custom marks,
 * use OrdinalFrame directly.
 *
 * **Breadcrumb to advanced usage:**
 * - Use the `frameProps` prop to pass any OrdinalFrame prop
 * - See OrdinalFrame documentation: https://semiotic.nteract.io/guides/ordinal-frame
 * - All OrdinalFrame props are available via `frameProps`
 *
 * @param props - DotPlot configuration
 * @returns Rendered dot plot
 */
export function DotPlot(props: DotPlotProps) {
  const {
    data,
    width = 600,
    height = 400,
    margin = { top: 50, bottom: 60, left: 120, right: 40 },
    className,
    title,
    categoryAccessor = "category",
    valueAccessor = "value",
    orientation = "horizontal",
    categoryLabel,
    valueLabel,
    valueFormat,
    colorBy,
    colorScheme = "category10",
    sort = true,
    dotRadius = 5,
    categoryPadding = 10,
    enableHover = true,
    showGrid = true,
    tooltip,
    frameProps = {}
  } = props

  // Validate data
  if (!data || data.length === 0) {
    console.warn("DotPlot: data prop is required and should not be empty")
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
      const baseStyle: any = {
        r: dotRadius,
        fillOpacity: 0.8
      }

      // Apply color
      if (colorBy) {
        baseStyle.fill = getColor(d, colorBy, colorScale)
      } else {
        baseStyle.fill = "#007bff"
      }

      return baseStyle
    }
  }, [colorBy, colorScale, dotRadius])

  // Build axes configuration
  const axes = useMemo(() => {
    const axesConfig: any[] = []

    if (orientation === "horizontal") {
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
    } else {
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
    }

    return axesConfig
  }, [orientation, categoryLabel, valueLabel, valueFormat, showGrid])

  // Build OrdinalFrame props
  const ordinalFrameProps: OrdinalFrameProps = {
    size: [width, height],
    data: sortedData,
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    type: "point",
    projection: orientation === "horizontal" ? "horizontal" : "vertical",
    style: pieceStyle,
    axes,
    hoverAnnotation: enableHover,
    margin,
    oPadding: categoryPadding,
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
export default DotPlot
