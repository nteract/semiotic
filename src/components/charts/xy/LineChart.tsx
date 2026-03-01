"use client"
import * as React from "react"
import { useMemo } from "react"
import {
  curveLinear,
  curveMonotoneX,
  curveMonotoneY,
  curveStep,
  curveStepAfter,
  curveStepBefore,
  curveBasis,
  curveCardinal,
  curveCatmullRom
} from "d3-shape"
import XYFrame from "../../XYFrame"
import type { XYFrameProps } from "../../types/xyTypes"
import type { LineTypeSettings } from "../../types/generalTypes"
import { getColor } from "../shared/colorUtils"
import { useColorScale, DEFAULT_COLOR } from "../shared/hooks"
import { createLegend } from "../shared/legendUtils"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"

/** Map of curve name strings to d3-shape curve functions */
const CURVE_MAP = {
  linear: curveLinear,
  monotoneX: curveMonotoneX,
  monotoneY: curveMonotoneY,
  step: curveStep,
  stepAfter: curveStepAfter,
  stepBefore: curveStepBefore,
  basis: curveBasis,
  cardinal: curveCardinal,
  catmullRom: curveCatmullRom
} as const

/**
 * LineChart component props
 */
export interface LineChartProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps, AxisConfig {
  /**
   * Array of data points or array of line objects with coordinates.
   * @example
   * ```ts
   * // Simple format (single line)
   * [{x: 1, y: 10}, {x: 2, y: 20}]
   *
   * // Multiple lines with grouping
   * [{x: 1, y: 10, series: 'A'}, {x: 2, y: 20, series: 'A'}, {x: 1, y: 15, series: 'B'}]
   *
   * // Line objects format
   * [{label: 'Series A', coordinates: [{x: 1, y: 10}, {x: 2, y: 20}]}]
   * ```
   */
  data: TDatum[]

  /**
   * Field name or function to access x values
   * @default "x"
   */
  xAccessor?: ChartAccessor<TDatum, number>

  /**
   * Field name or function to access y values
   * @default "y"
   */
  yAccessor?: ChartAccessor<TDatum, number>

  /**
   * Field name or function to group data into multiple lines
   * @example
   * ```ts
   * lineBy="series"  // Group by series field
   * lineBy={d => d.category}  // Use function
   * ```
   */
  lineBy?: ChartAccessor<TDatum, string>

  /**
   * Field name in line objects that contains coordinate arrays
   * Used when data is in line objects format
   * @default "coordinates"
   */
  lineDataAccessor?: string

  /**
   * Field name or function to determine line color
   * @example
   * ```ts
   * colorBy="series"
   * colorBy={d => d.label}
   * ```
   */
  colorBy?: ChartAccessor<TDatum, string>

  /**
   * Color scheme for categorical data or custom colors array
   * @default "category10"
   */
  colorScheme?: string | string[]

  /**
   * Curve interpolation type
   * @default "linear"
   */
  curve?: "linear" | "monotoneX" | "monotoneY" | "step" | "stepAfter" | "stepBefore" | "basis" | "cardinal" | "catmullRom"

  /**
   * Show points on the line
   * @default false
   */
  showPoints?: boolean

  /**
   * Point radius when showPoints is true
   * @default 3
   */
  pointRadius?: number

  /**
   * Fill area under the line
   * @default false
   */
  fillArea?: boolean

  /**
   * Area opacity when fillArea is true
   * @default 0.3
   */
  areaOpacity?: number

  /**
   * Line stroke width
   * @default 2
   */
  lineWidth?: number

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
   * Show legend for multiple lines
   * @default true (when multiple lines)
   */
  showLegend?: boolean

  /**
   * Tooltip configuration
   */
  tooltip?: TooltipProp

  /**
   * Additional XYFrame props for advanced customization
   * For full control, consider using XYFrame directly
   * @see https://semiotic.nteract.io/guides/xy-frame
   */
  frameProps?: Partial<Omit<XYFrameProps, "lines" | "size">>
}

/**
 * LineChart - Visualize trends and time series data with lines
 *
 * A simplified wrapper around XYFrame for creating line charts. Perfect for
 * showing trends, comparisons, and temporal patterns in your data.
 *
 * @example
 * ```tsx
 * // Simple line chart
 * <LineChart
 *   data={[
 *     {x: 1, y: 10},
 *     {x: 2, y: 20},
 *     {x: 3, y: 15}
 *   ]}
 *   xLabel="Time"
 *   yLabel="Value"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Multiple lines with grouping
 * <LineChart
 *   data={[
 *     {x: 1, y: 10, series: 'A'},
 *     {x: 2, y: 20, series: 'A'},
 *     {x: 1, y: 15, series: 'B'},
 *     {x: 2, y: 25, series: 'B'}
 *   ]}
 *   lineBy="series"
 *   colorBy="series"
 *   xLabel="Time"
 *   yLabel="Value"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Area chart with custom curve
 * <LineChart
 *   data={data}
 *   curve="monotoneX"
 *   fillArea={true}
 *   areaOpacity={0.3}
 *   showPoints={true}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Advanced: Override XYFrame props
 * <LineChart
 *   data={data}
 *   frameProps={{
 *     lineType: { type: "line", interpolator: d3.curveCardinal },
 *     customLineMark: ({ d }) => <path stroke="red" />
 *   }}
 * />
 * ```
 *
 * @remarks
 * This component wraps {@link XYFrame} with sensible defaults for line charts.
 * For more advanced features like custom marks, annotations, or complex interactions,
 * use XYFrame directly.
 *
 * **Breadcrumb to advanced usage:**
 * - Use the `frameProps` prop to pass any XYFrame prop
 * - See XYFrame documentation: https://semiotic.nteract.io/guides/xy-frame
 * - All XYFrame props are available via `frameProps`
 *
 * @param props - LineChart configuration
 * @returns Rendered line chart
 */
export function LineChart<TDatum extends Record<string, any> = Record<string, any>>(props: LineChartProps<TDatum>) {
  const {
    data,
    width = 600,
    height = 400,
    margin: userMargin,
    className,
    title,
    xLabel,
    yLabel,
    xFormat,
    yFormat,
    xAccessor = "x",
    yAccessor = "y",
    lineBy,
    lineDataAccessor = "coordinates",
    colorBy,
    colorScheme = "category10",
    curve = "linear",
    showPoints = false,
    pointRadius = 3,
    fillArea = false,
    areaOpacity = 0.3,
    lineWidth = 2,
    enableHover = true,
    showGrid = false,
    showLegend,
    tooltip,
    frameProps = {}
  } = props

  const safeData = data || []

  // Check if data is in line objects format (has lineDataAccessor field)
  const isLineObjectFormat = safeData[0]?.[lineDataAccessor] !== undefined

  // Transform data to line format if needed
  const lineData = useMemo(() => {
    if (isLineObjectFormat) {
      // Data is already in line objects format
      return safeData
    }

    if (lineBy) {
      // Group data by lineBy field
      const grouped = safeData.reduce((acc, d) => {
        const key = typeof lineBy === "function" ? lineBy(d) : d[lineBy]
        if (!acc[key]) {
          const lineObj: Record<string, any> = { [lineDataAccessor]: [] }
          // Add the grouping field
          if (typeof lineBy === "string") {
            lineObj[lineBy] = key
          }
          acc[key] = lineObj
        }
        acc[key][lineDataAccessor].push(d)
        return acc
      }, {} as Record<string, Record<string, any>>)

      return Object.values(grouped)
    }

    // Single line - wrap in line object
    return [{ [lineDataAccessor]: safeData }]
  }, [safeData, lineBy, lineDataAccessor, isLineObjectFormat])

  // Create color scale if colorBy is specified
  const colorScale = useColorScale(safeData, colorBy, colorScheme)

  // Curve function from module-level map
  const curveFunction = CURVE_MAP[curve] || curveLinear

  // Line style function
  const lineStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {
        strokeWidth: lineWidth
      }

      // Apply color
      if (colorBy) {
        baseStyle.stroke = getColor(d, colorBy, colorScale)
      } else {
        baseStyle.stroke = DEFAULT_COLOR
      }

      // Apply fill for area chart
      if (fillArea) {
        baseStyle.fill = baseStyle.stroke
        baseStyle.fillOpacity = areaOpacity
      }

      return baseStyle
    }
  }, [colorBy, colorScale, lineWidth, fillArea, areaOpacity])

  // Point style function (if showPoints is true)
  const pointStyle = useMemo(() => {
    if (!showPoints) return undefined

    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {
        r: pointRadius,
        fillOpacity: 1
      }

      // Match line color
      if (colorBy) {
        baseStyle.fill = getColor(d.parentLine || d, colorBy, colorScale)
      } else {
        baseStyle.fill = DEFAULT_COLOR
      }

      return baseStyle
    }
  }, [showPoints, pointRadius, colorBy, colorScale])

  // Build axes configuration
  const axes = useMemo(() => {
    const axesConfig: Array<Record<string, unknown>> = []

    // Y axis (left)
    axesConfig.push({
      orient: "left",
      label: yLabel,
      tickFormat: yFormat,
      ...(showGrid && { tickLineGenerator: () => null })
    })

    // X axis (bottom)
    axesConfig.push({
      orient: "bottom",
      label: xLabel,
      tickFormat: xFormat,
      ...(showGrid && { tickLineGenerator: () => null })
    })

    return axesConfig
  }, [xLabel, yLabel, xFormat, yFormat, showGrid])

  // Determine line type
  const lineType = useMemo(() => {
    const lineTypeConfig: LineTypeSettings = {
      type: fillArea ? "area" : "line",
      interpolator: curveFunction
    }

    if (fillArea) {
      lineTypeConfig.simpleLine = false
    }

    return lineTypeConfig
  }, [fillArea, curveFunction])

  // Determine if we should show legend
  const shouldShowLegend = showLegend !== undefined ? showLegend : lineData.length > 1

  // Build legend if needed
  const legend = useMemo(() => {
    if (!shouldShowLegend || !colorBy) return undefined

    return createLegend({
      data: lineData,
      colorBy,
      colorScale,
      getColor
    })
  }, [shouldShowLegend, colorBy, lineData, colorScale])

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
    console.warn("LineChart: data prop is required and should not be empty")
    return null
  }

  // Build XYFrame props
  const xyFrameProps: XYFrameProps = {
    size: [width, height],
    lines: lineData,
    xAccessor,
    yAccessor,
    lineDataAccessor,
    lineType,
    lineStyle,
    axes: axes as any,
    hoverAnnotation: enableHover,
    margin,
    ...(showPoints && {
      showLinePoints: true,
      pointStyle
    }),
    ...(legend && { legend }),
    ...(className && { className }),
    ...(title && { title }),
    // Add tooltip support
    ...(tooltip && { tooltipContent: normalizeTooltip(tooltip) as Function }),
    // Allow frameProps to override defaults
    ...frameProps
  }

  return <XYFrame {...xyFrameProps} />
}
