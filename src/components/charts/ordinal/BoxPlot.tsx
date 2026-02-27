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
export function BoxPlot(props: BoxPlotProps) {
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
    return (d: any) => {
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

    return (d: any) => {
      const baseStyle: any = {
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

  // Default tooltip function for piece hover
  const defaultTooltipContent = useMemo(() => {
    const getVal = typeof valueAccessor === "function" ? valueAccessor : (d: any) => d[valueAccessor]
    const getCat = typeof categoryAccessor === "function" ? categoryAccessor : (d: any) => d[categoryAccessor]

    return (d: any) => {
      const cat = getCat(d)
      const val = getVal(d)
      const pieces = d.pieces || []
      const values = pieces.map((p: any) => Number(getVal(p))).filter((v: number) => !isNaN(v)).sort((a: number, b: number) => a - b)
      const n = values.length

      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          <div style={{ fontWeight: "bold" }}>{String(cat)}</div>
          <div style={{ marginTop: "4px" }}>
            Value: {typeof val === "number" ? val.toLocaleString() : String(val)}
          </div>
          {n > 0 && (
            <div style={{ marginTop: "2px", opacity: 0.8 }}>
              n={n}, median={values[Math.floor(n / 2)].toLocaleString()}
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
    summaryType: { type: "boxplot", outliers: showOutliers } as any,
    summaryStyle,
    projection: orientation === "horizontal" ? "horizontal" : "vertical",
    axes,
    pieceHoverAnnotation: enableHover,
    margin,
    oPadding: categoryPadding,
    ...(pointStyle && { pointStyle }),
    ...(legend && { legend }),
    ...(className && { className }),
    ...(title && { title }),
    // Add tooltip support
    tooltipContent: tooltip ? normalizeTooltip(tooltip) : defaultTooltipContent,
    // Allow frameProps to override defaults
    ...frameProps
  }

  return <OrdinalFrame {...ordinalFrameProps} />
}
