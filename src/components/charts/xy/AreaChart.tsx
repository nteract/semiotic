import * as React from "react"
import { useMemo } from "react"
import * as d3Curve from "d3-shape"
import XYFrame from "../../XYFrame"
import type { XYFrameProps } from "../../types/xyTypes"
import { getColor, createColorScale } from "../shared/colorUtils"
import type { BaseChartProps, AxisConfig, Accessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"

/**
 * AreaChart component props
 */
export interface AreaChartProps extends BaseChartProps, AxisConfig {
  /**
   * Array of data points, grouped by category.
   * @example
   * ```ts
   * // Multiple areas with grouping
   * [{x: 1, y: 10, category: 'A'}, {x: 2, y: 20, category: 'A'}, {x: 1, y: 15, category: 'B'}]
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
   * Field name or function to group data into multiple areas
   * @example
   * ```ts
   * areaBy="category"  // Group by category field
   * areaBy={d => d.group}  // Use function
   * ```
   */
  areaBy?: Accessor<string>

  /**
   * Field name in area objects that contains coordinate arrays
   * Used when data is in area objects format
   * @default "coordinates"
   */
  lineDataAccessor?: string

  /**
   * Field name or function to determine area color
   * @example
   * ```ts
   * colorBy="category"
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
   * @default "monotoneX"
   */
  curve?: "linear" | "monotoneX" | "monotoneY" | "step" | "stepAfter" | "stepBefore" | "basis" | "cardinal" | "catmullRom"

  /**
   * Stack areas on top of each other
   * @default false
   */
  stacked?: boolean

  /**
   * Normalize stacked areas to 100%
   * Only applies when stacked is true
   * @default false
   */
  normalize?: boolean

  /**
   * Area opacity
   * @default 0.7
   */
  areaOpacity?: number

  /**
   * Show line on top of area
   * @default true
   */
  showLine?: boolean

  /**
   * Line stroke width when showLine is true
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
   * Show legend for multiple areas
   * @default true (when multiple areas)
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
 * AreaChart - Visualize quantities over continuous intervals with filled areas
 *
 * A simplified wrapper around XYFrame for creating area charts. Perfect for
 * showing cumulative trends, compositions, and comparisons over time.
 *
 * @example
 * ```tsx
 * // Simple area chart
 * <AreaChart
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
 * // Stacked area chart
 * <AreaChart
 *   data={[
 *     {x: 1, y: 10, category: 'A'},
 *     {x: 2, y: 20, category: 'A'},
 *     {x: 1, y: 15, category: 'B'},
 *     {x: 2, y: 25, category: 'B'}
 *   ]}
 *   areaBy="category"
 *   colorBy="category"
 *   stacked={true}
 *   xLabel="Time"
 *   yLabel="Value"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Normalized (100%) stacked area
 * <AreaChart
 *   data={data}
 *   areaBy="category"
 *   colorBy="category"
 *   stacked={true}
 *   normalize={true}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Advanced: Override XYFrame props
 * <AreaChart
 *   data={data}
 *   frameProps={{
 *     lineType: { type: "stackedarea", sort: (a, b) => b.value - a.value }
 *   }}
 * />
 * ```
 *
 * @remarks
 * This component wraps {@link XYFrame} with sensible defaults for area charts.
 * For more advanced features like custom marks, annotations, or complex interactions,
 * use XYFrame directly.
 *
 * **Breadcrumb to advanced usage:**
 * - Use the `frameProps` prop to pass any XYFrame prop
 * - See XYFrame documentation: https://semiotic.nteract.io/guides/xy-frame
 * - All XYFrame props are available via `frameProps`
 *
 * @param props - AreaChart configuration
 * @returns Rendered area chart
 */
export function AreaChart(props: AreaChartProps) {
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
    areaBy,
    lineDataAccessor = "coordinates",
    colorBy,
    colorScheme = "category10",
    curve = "monotoneX",
    stacked = false,
    normalize = false,
    areaOpacity = 0.7,
    showLine = true,
    lineWidth = 2,
    enableHover = true,
    showGrid = false,
    showLegend,
    tooltip,
    frameProps = {}
  } = props

  // Validate data
  if (!data || data.length === 0) {
    console.warn("AreaChart: data prop is required and should not be empty")
    return null
  }

  // Check if data is in area objects format (has lineDataAccessor field)
  const isAreaObjectFormat = data[0]?.[lineDataAccessor] !== undefined

  // Transform data to line/area format if needed
  const areaData = useMemo(() => {
    if (isAreaObjectFormat) {
      // Data is already in area objects format
      return data
    }

    if (areaBy) {
      // Group data by areaBy field
      const grouped = data.reduce((acc, d) => {
        const key = typeof areaBy === "function" ? areaBy(d) : d[areaBy]
        if (!acc[key]) {
          const areaObj: any = { [lineDataAccessor]: [] }
          // Add the grouping field
          if (typeof areaBy === "string") {
            areaObj[areaBy] = key
          }
          acc[key] = areaObj
        }
        acc[key][lineDataAccessor].push(d)
        return acc
      }, {} as Record<string, any>)

      return Object.values(grouped)
    }

    // Single area - wrap in area object
    return [{ [lineDataAccessor]: data }]
  }, [data, areaBy, lineDataAccessor, isAreaObjectFormat])

  // Create color scale if colorBy is specified
  const colorScale = useMemo(() => {
    if (!colorBy || typeof colorBy === "function") {
      return undefined
    }

    const scheme = Array.isArray(colorScheme) ? colorScheme : colorScheme
    return createColorScale(areaData, colorBy as string, scheme)
  }, [areaData, colorBy, colorScheme])

  // Area/line style function
  const lineStyle = useMemo(() => {
    return (d: any, i: number) => {
      const baseStyle: any = {}

      // Apply color
      const color = colorBy ? getColor(d, colorBy, colorScale) : "#007bff"

      baseStyle.fill = color
      baseStyle.fillOpacity = areaOpacity

      if (showLine) {
        baseStyle.stroke = color
        baseStyle.strokeWidth = lineWidth
      } else {
        baseStyle.stroke = "none"
      }

      return baseStyle
    }
  }, [colorBy, colorScale, areaOpacity, showLine, lineWidth])

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

    return curveMap[curve] || d3Curve.curveMonotoneX
  }, [curve])

  // Determine line type
  const lineType = useMemo(() => {
    const type: any = {
      interpolator: curveFunction
    }

    if (stacked) {
      type.type = normalize ? "stackedpercent-area" : "stackedarea"
    } else {
      type.type = "area"
    }

    return type
  }, [stacked, normalize, curveFunction])

  // Determine if we should show legend
  const shouldShowLegend = showLegend !== undefined ? showLegend : areaData.length > 1

  // Build legend if needed
  const legend = useMemo(() => {
    if (!shouldShowLegend || !colorBy) return undefined

    return {
      legendGroups: areaData.map((d, i) => {
        const label = typeof colorBy === "function"
          ? colorBy(d)
          : d[colorBy as string] || `Area ${i + 1}`

        const color = getColor(d, colorBy, colorScale)

        return {
          styleFn: () => ({ fill: color, stroke: color }),
          label,
          color
        }
      })
    }
  }, [shouldShowLegend, colorBy, areaData, colorScale])

  // Build XYFrame props
  const xyFrameProps: XYFrameProps = {
    size: [width, height],
    lines: areaData,
    xAccessor,
    yAccessor,
    lineDataAccessor,
    lineType,
    lineStyle,
    axes,
    hoverAnnotation: enableHover,
    margin,
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
export default AreaChart
