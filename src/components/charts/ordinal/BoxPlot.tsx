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
 * BoxPlot component props
 */
export interface BoxPlotProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
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
   * Field name or function to determine box color
   * @example
   * ```ts
   * colorBy="category"
   * colorBy={d => d.group}
   * ```
   */
  colorBy?: ChartAccessor<TDatum, string>

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
 * BoxPlot - Visualize statistical distributions with box-and-whisker plots.
 *
 * A simplified wrapper around OrdinalFrame for creating box plots.
 *
 * @example
 * ```tsx
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
 */
export function BoxPlot<TDatum extends Record<string, any> = Record<string, any>>(props: BoxPlotProps<TDatum>) {
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
    showOutliers = true,
    outlierRadius = 3,
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

  // Summary style function for boxes
  const summaryStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const color = colorBy ? getColor(d, colorBy, colorScale) : DEFAULT_COLOR

      return {
        fill: color,
        stroke: color,
        fillOpacity: 0.8
      }
    }
  }, [colorBy, colorScale])

  // Point style function for outliers
  const pointStyle = useMemo(() => {
    if (!showOutliers) return undefined

    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {
        r: outlierRadius,
        fillOpacity: 0.6
      }

      // Apply color (try to match box color)
      if (colorBy) {
        baseStyle.fill = getColor(d, colorBy, colorScale)
      } else {
        baseStyle.fill = DEFAULT_COLOR
      }

      return baseStyle
    }
  }, [showOutliers, outlierRadius, colorBy, colorScale])

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
    console.warn("BoxPlot: data prop is required and should not be empty")
    return null
  }

  // Default tooltip for summary hover (boxplot quartile points)
  const defaultTooltipContent = useMemo(() => {
    const getVal = resolveAccessor<number>(valueAccessor)

    return (d: Record<string, any>) => {
      // d has: label, key, summaryPieceName, value, column, pieces
      const pieces = d.pieces || []
      const values = pieces.map((p: Record<string, any>) => Number(getVal(p))).filter((v: number) => !isNaN(v)).sort((a: number, b: number) => a - b)
      const n = values.length

      const fmt = (v: unknown) => typeof v === "number" ? v.toLocaleString() : String(v ?? "")

      // Compute quartiles from the raw data
      let stats: { label: string; value: string; active: boolean }[] = []
      if (n >= 2) {
        const q = (p: number) => {
          const i = p * (n - 1)
          const lo = Math.floor(i)
          const hi = Math.ceil(i)
          return values[lo] + (values[hi] - values[lo]) * (i - lo)
        }
        stats = [
          { label: "Max", value: fmt(values[n - 1]), active: d.summaryPieceName === "max" },
          { label: "Third Quartile", value: fmt(q(0.75)), active: d.summaryPieceName === "q3area" },
          { label: "Median", value: fmt(q(0.5)), active: d.summaryPieceName === "median" },
          { label: "First Quartile", value: fmt(q(0.25)), active: d.summaryPieceName === "q1area" },
          { label: "Min", value: fmt(values[0]), active: d.summaryPieceName === "min" },
        ]
      }

      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{String(d.key)}</div>
          {stats.map(s => (
            <div key={s.label} style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontWeight: s.active ? "bold" : "normal" }}>
              <span>{s.label}</span>
              <span>{s.value}</span>
            </div>
          ))}
          {n > 0 && (
            <div style={{ marginTop: "4px", opacity: 0.6, fontSize: "0.9em" }}>n={n}</div>
          )}
        </div>
      )
    }
  }, [valueAccessor])

  // Build OrdinalFrame props
  const ordinalFrameProps: OrdinalFrameProps = {
    size: [width, height],
    data: safeData,
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    summaryType: { type: "boxplot", outliers: showOutliers } as any,
    summaryStyle,
    projection: orientation === "horizontal" ? "horizontal" : "vertical",
    axes: axes as any,
    summaryHoverAnnotation: enableHover,
    margin,
    oPadding: categoryPadding,
    ...(pointStyle && { pointStyle }),
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
