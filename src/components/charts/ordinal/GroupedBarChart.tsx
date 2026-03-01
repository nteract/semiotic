"use client"
import * as React from "react"
import { useMemo } from "react"
import OrdinalFrame from "../../OrdinalFrame"
import type { OrdinalFrameProps } from "../../types/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useColorScale, DEFAULT_COLOR, resolveAccessor } from "../shared/hooks"
import { createLegend } from "../shared/legendUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, defaultTooltipStyle, type TooltipProp } from "../../Tooltip/Tooltip"

/**
 * GroupedBarChart component props
 */
export interface GroupedBarChartProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  /**
   * Array of data points with category, group, and value.
   * @example
   * ```ts
   * [
   *   {category: 'Q1', product: 'A', value: 100},
   *   {category: 'Q1', product: 'B', value: 150},
   *   {category: 'Q2', product: 'A', value: 120},
   *   {category: 'Q2', product: 'B', value: 180}
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
   * Field name or function to access group values (for grouping bars side by side)
   */
  groupBy: ChartAccessor<TDatum, string>

  /**
   * Field name or function to access numeric values
   * @default "value"
   */
  valueAccessor?: ChartAccessor<TDatum, number>

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
   * Field name or function to determine bar color
   * @default groupBy value
   */
  colorBy?: ChartAccessor<TDatum, string>

  /**
   * Color scheme for categorical data or custom colors array
   * @default "category10"
   */
  colorScheme?: string | string[]

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
   * Show legend for groups
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
   */
  frameProps?: Partial<Omit<OrdinalFrameProps, "data" | "size">>
}

/**
 * GroupedBarChart - Visualize comparisons across categories with side-by-side bars.
 *
 * A simplified wrapper around OrdinalFrame using clusterbar type.
 *
 * @example
 * ```tsx
 * <GroupedBarChart
 *   data={[
 *     {category: 'Q1', product: 'A', value: 100},
 *     {category: 'Q1', product: 'B', value: 150},
 *     {category: 'Q2', product: 'A', value: 120},
 *     {category: 'Q2', product: 'B', value: 180}
 *   ]}
 *   groupBy="product"
 *   categoryLabel="Quarter"
 *   valueLabel="Sales"
 * />
 * ```
 */
export function GroupedBarChart<TDatum extends Record<string, any> = Record<string, any>>(props: GroupedBarChartProps<TDatum>) {
  const {
    data,
    width = 600,
    height = 400,
    margin: userMargin,
    className,
    title,
    categoryAccessor = "category",
    groupBy,
    valueAccessor = "value",
    orientation = "vertical",
    categoryLabel,
    valueLabel,
    valueFormat,
    colorBy,
    colorScheme = "category10",
    barPadding = 5,
    enableHover = true,
    showGrid = false,
    showLegend = true,
    tooltip,
    frameProps = {}
  } = props

  const safeData = data || []

  // Default colorBy to groupBy for grouped bar charts
  const actualColorBy = colorBy || groupBy

  // Create color scale
  const colorScale = useColorScale(safeData, actualColorBy, colorScheme)

  // Piece style function
  const pieceStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {}

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
    const defaultMargin = { top: 50, bottom: 60, left: 70, right: 40 }
    const finalMargin = { ...defaultMargin, ...userMargin }

    if (legend && finalMargin.right < 120) {
      finalMargin.right = 120
    }

    return finalMargin
  }, [userMargin, legend])

  // Default tooltip
  const defaultTooltipContent = useMemo(() => {
    const getGroup = resolveAccessor(groupBy)
    const getCat = resolveAccessor(categoryAccessor)
    const getVal = resolveAccessor<number>(valueAccessor)

    return (d: Record<string, any>) => {
      const groupValue = String(getGroup(d))
      const cat = String(getCat(d))
      const val = Number(getVal(d))

      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          <div style={{ fontWeight: "bold" }}>{groupValue}</div>
          <div style={{ marginTop: "4px" }}>
            {cat} &middot; {val.toLocaleString()}
          </div>
        </div>
      )
    }
  }, [groupBy, categoryAccessor, valueAccessor])

  // Validate data and groupBy (after all hooks)
  if (safeData.length === 0) {
    console.warn("GroupedBarChart: data prop is required and should not be empty")
    return null
  }

  if (!groupBy) {
    console.warn("GroupedBarChart: groupBy prop is required for grouped bar charts")
    return null
  }

  // Build OrdinalFrame props
  const ordinalFrameProps: OrdinalFrameProps = {
    size: [width, height],
    data: safeData,
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    type: "clusterbar",
    projection: orientation === "horizontal" ? "horizontal" : "vertical",
    style: pieceStyle,
    axes: axes as any,
    hoverAnnotation: enableHover,
    margin,
    oPadding: barPadding,
    pieceIDAccessor: groupBy,
    ...(legend && { legend }),
    ...(className && { className }),
    ...(title && { title }),
    tooltipContent: (tooltip ? normalizeTooltip(tooltip) : defaultTooltipContent) as Function,
    transition: true,
    ...frameProps
  }

  return <OrdinalFrame {...ordinalFrameProps} />
}
