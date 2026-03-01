"use client"
import * as React from "react"
import { useMemo } from "react"
import OrdinalFrame from "../../OrdinalFrame"
import type { OrdinalFrameProps } from "../../types/ordinalTypes"
import { getColor, getSize } from "../shared/colorUtils"
import { useColorScale, DEFAULT_COLOR, resolveAccessor } from "../shared/hooks"
import { createLegend } from "../shared/legendUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, defaultTooltipStyle, type TooltipProp } from "../../Tooltip/Tooltip"

/**
 * SwarmPlot component props
 */
export interface SwarmPlotProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
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
   * Field name or function to determine point color
   * @example
   * ```ts
   * colorBy="type"
   * colorBy={d => d.score > 10 ? 'red' : 'blue'}
   * ```
   */
  colorBy?: ChartAccessor<TDatum, string>

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
  sizeBy?: ChartAccessor<TDatum, number>

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
 * SwarmPlot - Visualize distributions with non-overlapping points.
 *
 * A simplified wrapper around OrdinalFrame for creating swarm plots (beeswarm plots).
 *
 * @example
 * ```tsx
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
 */
export function SwarmPlot<TDatum extends Record<string, any> = Record<string, any>>(props: SwarmPlotProps<TDatum>) {
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

  const safeData = data || []

  // Create color scale if colorBy is specified
  const colorScale = useColorScale(safeData, colorBy, colorScheme)

  // Calculate size domain if sizeBy is specified
  const sizeDomain = useMemo(() => {
    if (!sizeBy) return undefined

    const sizes = safeData.map((d) => {
      if (typeof sizeBy === "function") {
        return sizeBy(d)
      }
      return d[sizeBy]
    })

    return [Math.min(...sizes), Math.max(...sizes)] as [number, number]
  }, [safeData, sizeBy])

  // Point style function
  const pieceStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {
        fillOpacity: pointOpacity
      }

      // Apply color
      if (colorBy) {
        baseStyle.fill = getColor(d, colorBy, colorScale)
      } else {
        baseStyle.fill = DEFAULT_COLOR
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
    const axesConfig: Array<Record<string, unknown>> = []

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
      data: safeData,
      colorBy,
      colorScale,
      getColor
    })
  }, [shouldShowLegend, colorBy, safeData, colorScale])

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
    console.warn("SwarmPlot: data prop is required and should not be empty")
    return null
  }

  // Default tooltip function for piece hover
  const defaultTooltipContent = useMemo(() => {
    const getVal = resolveAccessor<number>(valueAccessor)
    const getCat = resolveAccessor(categoryAccessor)

    return (d: Record<string, any>) => {
      const cat = getCat(d)
      const val = getVal(d)
      const pieces = d.pieces || []
      const showCount = pieces.length > 1

      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          <div style={{ fontWeight: "bold" }}>{String(cat)}</div>
          <div style={{ marginTop: "4px" }}>
            {typeof val === "number" ? val.toLocaleString() : String(val)}
          </div>
          {showCount && (
            <div style={{ marginTop: "2px", opacity: 0.8 }}>
              {pieces.length} points in group
            </div>
          )}
        </div>
      )
    }
  }, [categoryAccessor, valueAccessor])

  // Build OrdinalFrame props
  const ordinalFrameProps: OrdinalFrameProps = {
    size: [width, height],
    data: safeData,
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    type: "swarm",
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
    ...frameProps
  }

  return <OrdinalFrame {...ordinalFrameProps} />
}
