import * as React from "react"
import { useMemo } from "react"
import OrdinalFrame from "../../OrdinalFrame"
import type { OrdinalFrameProps } from "../../types/ordinalTypes"
import { getColor, createColorScale } from "../shared/colorUtils"
import type { BaseChartProps, Accessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"

/**
 * BoxPlot component props
 */
export interface BoxPlotProps extends BaseChartProps {
  /**
   * Array of data points with category and value.
   * @example
   * ```ts
   * [
   *   {category: 'Group A', value: 10},
   *   {category: 'Group A', value: 12},
   *   {category: 'Group A', value: 15},
   *   {category: 'Group B', value: 20}
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
   * Field name or function to determine box color
   * @example
   * ```ts
   * colorBy="category"
   * colorBy={d => d.group}
   * ```
   */
  colorBy?: Accessor<string>

  /**
   * Color scheme for categorical data or custom colors array
   * @default "category10"
   */
  colorScheme?: string | string[]

  /**
   * Show outlier points
   * @default true
   */
  showOutliers?: boolean

  /**
   * Outlier point radius
   * @default 3
   */
  outlierRadius?: number

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
 * BoxPlot - Visualize statistical distributions with box-and-whisker plots
 *
 * A simplified wrapper around OrdinalFrame for creating box plots.
 * Perfect for showing quartiles, median, and outliers in your data.
 *
 * @example
 * ```tsx
 * // Simple box plot
 * <BoxPlot
 *   data={[
 *     {category: 'Group A', value: 10},
 *     {category: 'Group A', value: 12},
 *     {category: 'Group A', value: 15},
 *     {category: 'Group A', value: 18},
 *     {category: 'Group B', value: 20},
 *     {category: 'Group B', value: 22}
 *   ]}
 *   categoryLabel="Group"
 *   valueLabel="Value"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With color encoding
 * <BoxPlot
 *   data={data}
 *   colorBy="category"
 *   showOutliers={true}
 *   categoryLabel="Category"
 *   valueLabel="Measurement"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Horizontal orientation
 * <BoxPlot
 *   data={data}
 *   orientation="horizontal"
 *   colorScheme="tableau10"
 * />
 * ```
 *
 * @remarks
 * This component wraps {@link OrdinalFrame} with sensible defaults for box plots.
 * For more advanced features like custom summary rendering or violin plots,
 * use OrdinalFrame directly.
 *
 * **Breadcrumb to advanced usage:**
 * - Use the `frameProps` prop to pass any OrdinalFrame prop
 * - See OrdinalFrame documentation: https://semiotic.nteract.io/guides/ordinal-frame
 * - All OrdinalFrame props are available via `frameProps`
 *
 * @param props - BoxPlot configuration
 * @returns Rendered box plot
 */
export function BoxPlot(props: BoxPlotProps) {
  const {
    data,
    width = 600,
    height = 400,
    margin = { top: 50, bottom: 60, left: 70, right: 40 },
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
    showOutliers = true,
    outlierRadius = 3,
    categoryPadding = 20,
    enableHover = true,
    showGrid = false,
    tooltip,
    frameProps = {}
  } = props

  // Validate data
  if (!data || data.length === 0) {
    console.warn("BoxPlot: data prop is required and should not be empty")
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

  // Summary style function for boxes
  const summaryStyle = useMemo(() => {
    return (d: any) => {
      const baseStyle: any = {
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
  }, [colorBy, colorScale])

  // Point style function for outliers
  const pointStyle = useMemo(() => {
    if (!showOutliers) return undefined

    return (d: any) => {
      const baseStyle: any = {
        r: outlierRadius,
        fillOpacity: 0.6
      }

      // Apply color (try to match box color)
      if (colorBy) {
        // For outliers, try to get the category from the data
        baseStyle.fill = getColor(d, colorBy, colorScale)
      } else {
        baseStyle.fill = "#007bff"
      }

      return baseStyle
    }
  }, [showOutliers, outlierRadius, colorBy, colorScale])

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

  // Build OrdinalFrame props
  const ordinalFrameProps: OrdinalFrameProps = {
    size: [width, height],
    data,
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    summaryType: { type: "boxplot", outliers: showOutliers } as any,
    summaryStyle,
    projection: orientation === "horizontal" ? "horizontal" : "vertical",
    axes,
    hoverAnnotation: enableHover,
    margin,
    oPadding: categoryPadding,
    ...(pointStyle && { pointStyle }),
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
export default BoxPlot
