import * as React from "react"
import { useMemo } from "react"
import * as d3Curve from "d3-shape"
import XYFrame from "../../XYFrame"
import type { XYFrameProps } from "../../types/xyTypes"
import { getColor, createColorScale } from "../shared/colorUtils"
import type { BaseChartProps, AxisConfig, Accessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"

/**
 * LineChart component props
 */
export interface LineChartProps extends BaseChartProps, AxisConfig {
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
  data: Array<Record<string, any>>

  /**
   * Field name or function to access x values
   * @default "x"
   */
  xAccessor?: Accessor<number>

  /**
   * Field name or function to access y values
   * @default "y"
   */
  yAccessor?: Accessor<number>

  /**
   * Field name or function to group data into multiple lines
   * @example
   * ```ts
   * lineBy="series"  // Group by series field
   * lineBy={d => d.category}  // Use function
   * ```
   */
  lineBy?: Accessor<string>

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
  colorBy?: Accessor<string>

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
export function LineChart(props: LineChartProps) {
  const {
    data,
    width = 600,
    height = 400,
    margin = { top: 50, bottom: 60, left: 70, right: 40 },
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

  // Validate data
  if (!data || data.length === 0) {
    console.warn("LineChart: data prop is required and should not be empty")
    return null
  }

  // Check if data is in line objects format (has lineDataAccessor field)
  const isLineObjectFormat = data[0]?.[lineDataAccessor] !== undefined

  // Transform data to line format if needed
  const lineData = useMemo(() => {
    if (isLineObjectFormat) {
      // Data is already in line objects format
      return data
    }

    if (lineBy) {
      // Group data by lineBy field
      const grouped = data.reduce((acc, d) => {
        const key = typeof lineBy === "function" ? lineBy(d) : d[lineBy]
        if (!acc[key]) {
          const lineObj: any = { [lineDataAccessor]: [] }
          // Add the grouping field
          if (typeof lineBy === "string") {
            lineObj[lineBy] = key
          }
          acc[key] = lineObj
        }
        acc[key][lineDataAccessor].push(d)
        return acc
      }, {} as Record<string, any>)

      return Object.values(grouped)
    }

    // Single line - wrap in line object
    return [{ [lineDataAccessor]: data }]
  }, [data, lineBy, lineDataAccessor, isLineObjectFormat])

  // Create color scale if colorBy is specified
  const colorScale = useMemo(() => {
    if (!colorBy || typeof colorBy === "function") {
      return undefined
    }

    const scheme = Array.isArray(colorScheme) ? colorScheme : colorScheme
    return createColorScale(lineData, colorBy as string, scheme)
  }, [lineData, colorBy, colorScheme])

  // Line style function
  const lineStyle = useMemo(() => {
    return (d: any, i: number) => {
      const baseStyle: any = {
        strokeWidth: lineWidth
      }

      // Apply color
      if (colorBy) {
        baseStyle.stroke = getColor(d, colorBy, colorScale)
      } else {
        baseStyle.stroke = "#007bff"
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

    return (d: any) => {
      const baseStyle: any = {
        r: pointRadius,
        fillOpacity: 1
      }

      // Match line color
      if (colorBy) {
        baseStyle.fill = getColor(d.parentLine || d, colorBy, colorScale)
      } else {
        baseStyle.fill = "#007bff"
      }

      return baseStyle
    }
  }, [showPoints, pointRadius, colorBy, colorScale])

  // Build axes configuration
  const axes = useMemo(() => {
    const axesConfig: any[] = []

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

  // Map curve names to d3 curve functions
  const curveFunction = useMemo(() => {
    const curveMap = {
      linear: d3Curve.curveLinear,
      monotoneX: d3Curve.curveMonotoneX,
      monotoneY: d3Curve.curveMonotoneY,
      step: d3Curve.curveStep,
      stepAfter: d3Curve.curveStepAfter,
      stepBefore: d3Curve.curveStepBefore,
      basis: d3Curve.curveBasis,
      cardinal: d3Curve.curveCardinal,
      catmullRom: d3Curve.curveCatmullRom
    }

    return curveMap[curve] || d3Curve.curveLinear
  }, [curve])

  // Determine line type
  const lineType = useMemo(() => {
    const type: any = {
      type: fillArea ? "area" : "line",
      interpolator: curveFunction
    }

    if (fillArea) {
      type.simpleLine = false
    }

    return type
  }, [fillArea, curveFunction])

  // Determine if we should show legend
  const shouldShowLegend = showLegend !== undefined ? showLegend : lineData.length > 1

  // Build legend if needed
  const legend = useMemo(() => {
    if (!shouldShowLegend || !colorBy) return undefined

    return {
      legendGroups: lineData.map((d, i) => {
        const label = typeof colorBy === "function"
          ? colorBy(d)
          : d[colorBy as string] || `Line ${i + 1}`

        const color = getColor(d, colorBy, colorScale)

        return {
          styleFn: () => ({ fill: color, stroke: color }),
          label,
          color
        }
      })
    }
  }, [shouldShowLegend, colorBy, lineData, colorScale])

  // Build XYFrame props
  const xyFrameProps: XYFrameProps = {
    size: [width, height],
    lines: lineData,
    xAccessor,
    yAccessor,
    lineDataAccessor,
    lineType,
    lineStyle,
    axes,
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
    ...(tooltip && { tooltipContent: normalizeTooltip(tooltip) }),
    // Allow frameProps to override defaults
    ...frameProps
  }

  return <XYFrame {...xyFrameProps} />
}

// Export default for convenience
export default LineChart
