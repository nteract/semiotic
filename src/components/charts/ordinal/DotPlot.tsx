"use client"
import * as React from "react"
import { useMemo } from "react"
import OrdinalFrame from "../../OrdinalFrame"
import type { OrdinalFrameProps } from "../../types/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useColorScale, useSortedData, DEFAULT_COLOR } from "../shared/hooks"
import { createLegend } from "../shared/legendUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, defaultTooltipStyle, type TooltipProp } from "../../Tooltip/Tooltip"

/**
 * DotPlot component props
 */
export interface DotPlotProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
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
  data: TDatum[]

  /**
   * Field name or function to access category values
   * @default "category"
   */
  categoryAccessor?: ChartAccessor<TDatum, string>

  /**
   * Field name or function to access numeric values
   * @default "value"
   */
  valueAccessor?: ChartAccessor<TDatum, number>

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
  valueFormat?: (d: number | string) => string

  /**
   * Field name or function to determine dot color
   * @example
   * ```ts
   * colorBy="type"
   * colorBy={d => d.value > 20 ? 'high' : 'low'}
   * ```
   */
  colorBy?: ChartAccessor<TDatum, string>

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
  sort?: boolean | "asc" | "desc" | ((a: Record<string, any>, b: Record<string, any>) => number)

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
 * DotPlot - Visualize categorical data with Cleveland dot plots.
 *
 * A simplified wrapper around OrdinalFrame for creating dot plots.
 *
 * @example
 * ```tsx
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
 */
export function DotPlot<TDatum extends Record<string, any> = Record<string, any>>(props: DotPlotProps<TDatum>) {
  const {
    data,
    width = 600,
    height = 400,
    margin: userMargin,
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
    showLegend,
    tooltip,
    frameProps = {}
  } = props

  const safeData = data || []

  // Sort data if requested
  const sortedData = useSortedData(safeData, sort, valueAccessor)

  // Create color scale if colorBy is specified
  const colorScale = useColorScale(safeData, colorBy, colorScheme)

  // Piece style function
  const pieceStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {
        r: dotRadius,
        fillOpacity: 0.8
      }

      // Apply color
      if (colorBy) {
        baseStyle.fill = getColor(d, colorBy, colorScale)
      } else {
        baseStyle.fill = DEFAULT_COLOR
      }

      return baseStyle
    }
  }, [colorBy, colorScale, dotRadius])

  // Build axes configuration
  const axes = useMemo(() => {
    const axesConfig: Array<Record<string, unknown>> = []

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
    const defaultMargin = { top: 50, bottom: 60, left: 120, right: 40 }
    const finalMargin = { ...defaultMargin, ...userMargin }

    // If legend is present and right margin is too small, increase it
    if (legend && finalMargin.right < 120) {
      finalMargin.right = 120
    }

    return finalMargin
  }, [userMargin, legend])

  // Validate data (after all hooks)
  if (safeData.length === 0) {
    console.warn("DotPlot: data prop is required and should not be empty")
    return null
  }

  // Default tooltip function for piece hover
  const defaultTooltipContent = useMemo(() => {
    return (d: Record<string, any>) => {
      const cat = typeof categoryAccessor === "function" ? categoryAccessor(d as TDatum) : d[categoryAccessor]
      const val = typeof valueAccessor === "function" ? valueAccessor(d as TDatum) : d[valueAccessor]
      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          <div style={{ fontWeight: "bold" }}>{String(cat)}</div>
          <div style={{ marginTop: "4px" }}>
            {typeof val === "number" ? val.toLocaleString() : String(val)}
          </div>
        </div>
      )
    }
  }, [categoryAccessor, valueAccessor])

  // Build OrdinalFrame props
  const ordinalFrameProps: OrdinalFrameProps = {
    size: [width, height],
    data: sortedData,
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    type: "point",
    projection: orientation === "horizontal" ? "horizontal" : "vertical",
    style: pieceStyle,
    axes: axes as any,
    pieceHoverAnnotation: enableHover,
    margin,
    oPadding: categoryPadding,
    ...(legend && { legend }),
    ...(className && { className }),
    ...(title && { title }),
    // Add tooltip support
    tooltipContent: (tooltip ? normalizeTooltip(tooltip) : defaultTooltipContent) as Function,
    // Allow frameProps to override defaults
    transition: true,
    ...frameProps
  }

  return <OrdinalFrame {...ordinalFrameProps} />
}
