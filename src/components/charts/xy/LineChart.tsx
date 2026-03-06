"use client"
import * as React from "react"
import { useMemo } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps } from "../../stream/types"
import { getColor } from "../shared/colorUtils"
import { useColorScale, useChartSelection, useChartLegendAndMargin, useChartMode, DEFAULT_COLOR } from "../shared/hooks"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { buildDefaultTooltip, accessorName } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import type { AnomalyConfig, ForecastConfig } from "../shared/statisticalOverlays"
import { SEGMENT_FIELD, buildAnomalyAnnotations, buildForecast, createSegmentLineStyle } from "../shared/statisticalOverlays"

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

  /** Accessor for unique point IDs, used by point-anchored annotations (when showPoints is true) */
  pointIdAccessor?: ChartAccessor<TDatum, string>

  /**
   * Annotation objects to render on the chart
   */
  annotations?: Record<string, any>[]

  /**
   * Anomaly detection configuration. Highlights outlier points and shows
   * a shaded band representing the expected range (mean +/- threshold * stddev).
   */
  anomaly?: AnomalyConfig

  /**
   * Forecast configuration. Splits the line into training (dashed),
   * observed (solid), and forecast (dotted) segments. Shows a confidence
   * envelope around the extrapolated forecast region.
   */
  forecast?: ForecastConfig

  /**
   * Additional StreamXYFrame props for advanced customization
   * For full control, consider using StreamXYFrame directly
   * @see https://semiotic.nteract.io/guides/xy-frame
   */
  frameProps?: Partial<Omit<StreamXYFrameProps, "chartType" | "data" | "size">>
}

/**
 * LineChart - Visualize trends and time series data with lines
 *
 * A simplified wrapper around StreamXYFrame for creating line charts. Perfect for
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
 * // Advanced: Override StreamXYFrame props
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
 * This component wraps {@link StreamXYFrame} with sensible defaults for line charts.
 * For more advanced features like custom marks, annotations, or complex interactions,
 * use StreamXYFrame directly.
 *
 * **Breadcrumb to advanced usage:**
 * - Use the `frameProps` prop to pass any StreamXYFrame prop
 * - See StreamXYFrame documentation: https://semiotic.nteract.io/guides/xy-frame
 * - All StreamXYFrame props are available via `frameProps`
 *
 * @param props - LineChart configuration
 * @returns Rendered line chart
 */
export function LineChart<TDatum extends Record<string, any> = Record<string, any>>(props: LineChartProps<TDatum>) {
  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showGrid: props.showGrid,
    enableHover: props.enableHover,
    showLegend: props.showLegend,
    title: props.title,
    xLabel: props.xLabel,
    yLabel: props.yLabel,
  })

  const {
    data,
    margin: userMargin,
    className,
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
    tooltip,
    pointIdAccessor,
    annotations,
    anomaly,
    forecast,
    frameProps = {},
    selection,
    linkedHover,
    onObservation,
    chartId
  } = props

  const width = resolved.width
  const height = resolved.height
  const enableHover = resolved.enableHover
  const showGrid = resolved.showGrid
  const showLegend = resolved.showLegend
  const title = resolved.title
  const xLabel = resolved.xLabel
  const yLabel = resolved.yLabel

  const safeData = data || []

  // ── Statistical overlay processing ────────────────────────────────────

  const xAccStr = typeof xAccessor === "string" ? xAccessor : "x"
  const yAccStr = typeof yAccessor === "string" ? yAccessor : "y"

  const statisticalResult = useMemo(() => {
    if (forecast) {
      return buildForecast(safeData as Record<string, any>[], xAccStr, yAccStr, forecast, anomaly)
    }
    return null
  }, [safeData, forecast, anomaly, xAccStr, yAccStr])

  const statisticalAnnotations = useMemo(() => {
    if (statisticalResult) return statisticalResult.annotations
    if (anomaly) return buildAnomalyAnnotations(anomaly)
    return []
  }, [statisticalResult, anomaly])

  const effectiveData = statisticalResult ? statisticalResult.processedData : safeData
  const effectiveGroupAccessor = forecast && !lineBy ? SEGMENT_FIELD : lineBy

  // ── Selection hooks (always called, conditional logic inside) ──────────

  const { activeSelectionHook, customHoverBehavior } = useChartSelection({
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    onObservation, chartType: "LineChart", chartId
  })

  // ── Core chart logic ───────────────────────────────────────────────────

  // Check if data is in line objects format (has lineDataAccessor field)
  const isLineObjectFormat = effectiveData[0]?.[lineDataAccessor] !== undefined

  // Transform data to line format if needed
  const lineData = useMemo(() => {
    if (isLineObjectFormat) {
      // Data is already in line objects format
      return effectiveData
    }

    if (effectiveGroupAccessor) {
      // Group data by lineBy field (or segment field for forecast)
      const grouped = (effectiveData as Record<string, any>[]).reduce((acc, d) => {
        const key = typeof effectiveGroupAccessor === "function" ? effectiveGroupAccessor(d) : d[effectiveGroupAccessor]
        if (!acc[key]) {
          const lineObj: Record<string, any> = { [lineDataAccessor]: [] }
          // Add the grouping field
          if (typeof effectiveGroupAccessor === "string") {
            lineObj[effectiveGroupAccessor] = key
          }
          acc[key] = lineObj
        }
        acc[key][lineDataAccessor].push(d)
        return acc
      }, {} as Record<string, Record<string, any>>)

      return Object.values(grouped)
    }

    // Single line - wrap in line object
    return [{ [lineDataAccessor]: effectiveData }]
  }, [effectiveData, effectiveGroupAccessor, lineDataAccessor, isLineObjectFormat])

  // Create color scale if colorBy is specified
  const colorScale = useColorScale(effectiveData as any[], colorBy, colorScheme)

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

  const segmentAwareStyle = useMemo(
    () => forecast ? createSegmentLineStyle(baseLineStyle, forecast) : baseLineStyle,
    [baseLineStyle, forecast]
  )

  const lineStyle = useMemo(
    () => wrapStyleWithSelection(segmentAwareStyle, activeSelectionHook, selection),
    [segmentAwareStyle, activeSelectionHook, selection]
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

  // Legend + margin
  const { legend, margin } = useChartLegendAndMargin({
    data: lineData,
    colorBy,
    colorScale,
    showLegend,
    userMargin,
    defaults: resolved.marginDefaults,
  })

  // Default tooltip showing all configured fields
  const groupField = lineBy || colorBy
  const defaultTooltipContent = useMemo(() => buildDefaultTooltip([
    { label: xLabel || accessorName(xAccessor), accessor: xAccessor, role: "x" },
    { label: yLabel || accessorName(yAccessor), accessor: yAccessor, role: "y" },
    ...(groupField ? [{ label: accessorName(groupField), accessor: groupField, role: "group" as const }] : []),
  ]), [xAccessor, yAccessor, xLabel, yLabel, groupField])

  // Validate data (after all hooks)
  // When data is in line objects format, validate against the coordinates
  // inside the first line object rather than the top-level line objects
  const validationData = isLineObjectFormat
    ? (effectiveData[0]?.[lineDataAccessor] || [])
    : safeData
  const error = validateArrayData({
    componentName: "LineChart",
    data: validationData,
    accessors: {
      xAccessor,
      yAccessor,
    },
  })
  if (error) return <ChartError componentName="LineChart" message={error} width={width} height={height} />

  // Flatten line data into a single array for StreamXYFrame
  const flattenedData = useMemo(() => {
    if (isLineObjectFormat || effectiveGroupAccessor) {
      // Already grouped into line objects — flatten coordinates out
      return lineData.flatMap((line: Record<string, any>) => {
        const coords = line[lineDataAccessor] || []
        // Carry grouping field onto each datum
        if (effectiveGroupAccessor && typeof effectiveGroupAccessor === "string") {
          return coords.map((c: Record<string, any>) => ({ ...c, [effectiveGroupAccessor]: line[effectiveGroupAccessor] }))
        }
        return coords
      })
    }
    return effectiveData
  }, [lineData, lineDataAccessor, isLineObjectFormat, effectiveGroupAccessor, effectiveData])

  // Build StreamXYFrame props
  const streamProps: StreamXYFrameProps = {
    chartType,
    data: flattenedData,
    xAccessor,
    yAccessor,
    groupAccessor: effectiveGroupAccessor || undefined,
    curve,
    lineStyle,
    ...(showPoints && { pointStyle }),
    size: [width, height],
    margin,
    showAxes: resolved.showAxes,
    xLabel,
    yLabel,
    xFormat,
    yFormat,
    enableHover,
    showGrid,
    ...(legend && { legend }),
    ...(title && { title }),
    ...(className && { className }),
    tooltipContent: (tooltip ? normalizeTooltip(tooltip) : defaultTooltipContent) as any,
    ...((linkedHover || onObservation) && { customHoverBehavior }),
    ...(pointIdAccessor && { pointIdAccessor }),
    ...((annotations?.length || statisticalAnnotations.length) && {
      annotations: [...(annotations || []), ...statisticalAnnotations],
    }),
    ...frameProps
  }

  return <StreamXYFrame {...streamProps} />
}
LineChart.displayName = "LineChart"
