"use client"
import * as React from "react"
import { useMemo, useCallback } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps } from "../../stream/types"
import { getColor } from "../shared/colorUtils"
import { useColorScale, DEFAULT_COLOR } from "../shared/hooks"
import { createLegend } from "../shared/legendUtils"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import ChartError from "../shared/ChartError"
import { validateArrayData } from "../shared/validateChartData"
import { normalizeLinkedHover, wrapStyleWithSelection } from "../shared/selectionUtils"
import { useSelection } from "../../store/useSelection"
import { useLinkedHover } from "../../store/useSelection"

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
  frameProps?: Partial<Omit<StreamXYFrameProps, "chartType" | "data" | "size">>
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
    frameProps = {},
    selection,
    linkedHover
  } = props

  const safeData = data || []

  // ── Selection hooks (always called, conditional logic inside) ──────────

  const hoverConfig = normalizeLinkedHover(linkedHover, colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [])

  const selectionHook = useSelection({
    name: selection?.name || "__unused__",
    fields: []
  })

  const linkedHoverHook = useLinkedHover({
    name: hoverConfig?.name || "hover",
    fields: hoverConfig?.fields || []
  })

  // Only use the hooks when the corresponding props are provided
  const activeSelectionHook = selection ? { isActive: selectionHook.isActive, predicate: selectionHook.predicate } : null

  // ── Core chart logic ───────────────────────────────────────────────────

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

  // Line style function
  const baseLineStyle = useMemo(() => {
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

  const lineStyle = useMemo(
    () => wrapStyleWithSelection(baseLineStyle, activeSelectionHook, selection),
    [baseLineStyle, activeSelectionHook, selection]
  )

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

  // Determine chart type for StreamXYFrame
  const chartType = fillArea ? "area" as const : "line" as const

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

  // ── Hover behavior ─────────────────────────────────────────────────────

  const customHoverBehavior = useCallback(
    (d: Record<string, any> | null) => {
      if (linkedHover) {
        linkedHoverHook.onHover(d)
      }
    },
    [linkedHover, linkedHoverHook]
  )

  // Validate data (after all hooks)
  const error = validateArrayData({
    componentName: "LineChart",
    data: safeData,
    accessors: {
      xAccessor,
      yAccessor,
    },
  })
  if (error) return <ChartError componentName="LineChart" message={error} width={width} height={height} />

  // Flatten line data into a single array for StreamXYFrame
  const flattenedData = useMemo(() => {
    if (isLineObjectFormat || lineBy) {
      // Already grouped into line objects — flatten coordinates out
      return lineData.flatMap((line: Record<string, any>) => {
        const coords = line[lineDataAccessor] || []
        // Carry grouping field onto each datum
        if (lineBy && typeof lineBy === "string") {
          return coords.map((c: Record<string, any>) => ({ ...c, [lineBy]: line[lineBy] }))
        }
        return coords
      })
    }
    return safeData
  }, [lineData, lineDataAccessor, isLineObjectFormat, lineBy, safeData])

  // Build StreamXYFrame props
  const streamProps: StreamXYFrameProps = {
    chartType,
    data: flattenedData,
    xAccessor,
    yAccessor,
    groupAccessor: lineBy || undefined,
    curve,
    lineStyle,
    ...(showPoints && { pointStyle }),
    size: [width, height],
    margin,
    showAxes: true,
    xLabel,
    yLabel,
    xFormat,
    yFormat,
    enableHover,
    showGrid,
    ...(legend && { legend }),
    ...(title && { title }),
    ...(className && { className }),
    ...(tooltip && { tooltipContent: normalizeTooltip(tooltip) as any }),
    ...(linkedHover && { customHoverBehavior }),
    ...frameProps
  }

  return <StreamXYFrame {...streamProps} />
}
LineChart.displayName = "LineChart"
