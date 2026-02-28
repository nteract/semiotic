import * as React from "react"
import { useMemo } from "react"
import OrdinalFrame from "../../OrdinalFrame"
import type { OrdinalFrameProps } from "../../types/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useColorScale, DEFAULT_COLOR } from "../shared/hooks"
import { createLegend } from "../shared/legendUtils"
import type { BaseChartProps, Accessor } from "../shared/types"
import { normalizeTooltip, defaultTooltipStyle, type TooltipProp } from "../../Tooltip/Tooltip"

/**
 * StackedBarChart component props
 */
export interface StackedBarChartProps extends BaseChartProps {
  /**
   * Array of data points with category, subcategory, and value.
   * @example
   * ```ts
   * [
   *   {category: 'Q1', subcategory: 'Product A', value: 100},
   *   {category: 'Q1', subcategory: 'Product B', value: 150},
   *   {category: 'Q2', subcategory: 'Product A', value: 120}
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
   * Field name or function to access subcategory values (for stacking)
   * @default "subcategory"
   */
  stackBy: Accessor<string>

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
  valueFormat?: (d: number | string) => string

  /**
   * Field name or function to determine bar color (typically stackBy)
   * @default stackBy value
   */
  colorBy?: Accessor<string>

  /**
   * Color scheme for categorical data or custom colors array
   * @default "category10"
   */
  colorScheme?: string | string[]

  /**
   * Normalize to 100% (percentage stacked)
   * @default false
   */
  normalize?: boolean

  /**
   * Padding between bar groups (in pixels)
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
   * Show legend for stack categories
   * @default true
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
 * StackedBarChart - Visualize part-to-whole relationships with stacked bars.
 *
 * A simplified wrapper around OrdinalFrame for creating stacked bar charts.
 *
 * @example
 * ```tsx
 * <StackedBarChart
 *   data={[
 *     {category: 'Q1', product: 'A', value: 100},
 *     {category: 'Q1', product: 'B', value: 150},
 *     {category: 'Q2', product: 'A', value: 120},
 *     {category: 'Q2', product: 'B', value: 180}
 *   ]}
 *   stackBy="product"
 *   categoryLabel="Quarter"
 *   valueLabel="Sales"
 * />
 * ```
 */
export function StackedBarChart(props: StackedBarChartProps) {
  const {
    data,
    width = 600,
    height = 400,
    margin: userMargin,
    className,
    title,
    categoryAccessor = "category",
    stackBy,
    valueAccessor = "value",
    orientation = "vertical",
    categoryLabel,
    valueLabel,
    valueFormat,
    colorBy,
    colorScheme = "category10",
    normalize = false,
    barPadding = 5,
    enableHover = true,
    showGrid = false,
    showLegend = true,
    tooltip,
    frameProps = {}
  } = props

  const safeData = data || []

  // Use stackBy as colorBy if not specified
  const actualColorBy = colorBy || stackBy

  // Get unique stack values for legend
  const stackValues = useMemo(() => {
    const getStackValue = typeof stackBy === "function" ? stackBy : (d: Record<string, any>) => d[stackBy]
    return Array.from(new Set(safeData.map(getStackValue)))
  }, [safeData, stackBy])

  // Create color scale
  const colorScale = useColorScale(safeData, actualColorBy, colorScheme)

  // Piece style function
  const pieceStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {}

      // Apply color
      if (actualColorBy) {
        baseStyle.fill = getColor(d, actualColorBy, colorScale)
      } else {
        baseStyle.fill = DEFAULT_COLOR
      }

      return baseStyle
    }
  }, [actualColorBy, colorScale])

  // Build axes configuration
  const axes = useMemo(() => {
    const axesConfig: Array<Record<string, unknown>> = []

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

  // Build legend if needed
  const legend = useMemo(() => {
    if (!showLegend) return undefined

    return createLegend({
      data: safeData,
      colorBy: actualColorBy,
      colorScale,
      getColor
    })
  }, [showLegend, safeData, actualColorBy, colorScale])

  // Adjust margin for legend if present
  const margin = useMemo(() => {
    const defaultMargin = { top: 50, bottom: 60, left: 70, right: 120 }
    const finalMargin = { ...defaultMargin, ...userMargin }

    // If legend is present and right margin is too small, increase it
    if (legend && finalMargin.right < 120) {
      finalMargin.right = 120
    }

    return finalMargin
  }, [userMargin, legend])

  // Default tooltip function for piece hover
  const defaultTooltipContent = useMemo(() => {
    const getStack = typeof stackBy === "function" ? stackBy : (d: Record<string, any>) => d[stackBy]
    const getCat = typeof categoryAccessor === "function" ? categoryAccessor : (d: Record<string, any>) => d[categoryAccessor]
    const getVal = typeof valueAccessor === "function" ? valueAccessor : (d: Record<string, any>) => d[valueAccessor]

    return (d: Record<string, any>) => {
      const stackValue = String(getStack(d))
      const cat = String(getCat(d))
      const val = Number(getVal(d))
      const pieces = d.pieces || []
      const total = pieces.reduce((sum: number, p: Record<string, any>) => sum + (Number(getVal(p)) || 0), 0)
      const showTotal = pieces.length > 1

      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          <div style={{ fontWeight: "bold" }}>{stackValue}</div>
          <div style={{ marginTop: "4px" }}>
            {cat} &middot; {val.toLocaleString()}
          </div>
          {showTotal && (
            <div style={{ marginTop: "2px", opacity: 0.8 }}>
              Total: {total.toLocaleString()}
            </div>
          )}
        </div>
      )
    }
  }, [stackBy, categoryAccessor, valueAccessor])

  // Validate data and stackBy (after all hooks)
  if (safeData.length === 0) {
    console.warn("StackedBarChart: data prop is required and should not be empty")
    return null
  }

  if (!stackBy) {
    console.warn("StackedBarChart: stackBy prop is required for stacked bar charts")
    return null
  }

  // Build OrdinalFrame props
  const ordinalFrameProps: OrdinalFrameProps = {
    size: [width, height],
    data: safeData,
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    type: "bar",
    projection: orientation === "horizontal" ? "horizontal" : "vertical",
    style: pieceStyle,
    axes: axes as any,
    hoverAnnotation: enableHover,
    margin,
    oPadding: barPadding,
    // Configure stacking
    pieceIDAccessor: stackBy,
    ...(normalize && { rExtent: [0, 1] }),
    ...(legend && { legend }),
    ...(className && { className }),
    ...(title && { title }),
    // Add tooltip support
    tooltipContent: (tooltip ? normalizeTooltip(tooltip) : defaultTooltipContent) as Function,
    // Allow frameProps to override defaults
    ...frameProps
  }

  return <OrdinalFrame {...ordinalFrameProps} />
}
