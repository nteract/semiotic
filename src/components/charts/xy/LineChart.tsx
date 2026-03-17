"use client"
import * as React from "react"
import { useMemo, useCallback, useState, useEffect } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps } from "../../stream/types"
import { getColor } from "../shared/colorUtils"
import { useColorScale, useChartSelection, useChartLegendAndMargin, useChartMode, useLegendInteraction, DEFAULT_COLOR } from "../shared/hooks"
import type { LegendInteractionMode } from "../shared/hooks"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { buildDefaultTooltip, accessorName } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { SafeRender, warnMissingField, renderEmptyState, renderLoadingState } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import type { AnomalyConfig, ForecastConfig } from "../shared/statisticalOverlays"
import { SEGMENT_FIELD } from "../shared/statisticalOverlays"
import { buildForecastLazy, buildAnomalyAnnotationsLazy, createSegmentLineStyleLazy } from "../shared/statisticalOverlaysLazy"

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
   * Scale type for the x-axis
   * @default "linear"
   */
  xScaleType?: "linear" | "log"

  /**
   * Scale type for the y-axis
   * @default "linear"
   */
  yScaleType?: "linear" | "log"

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
   * Legend interaction mode.
   * - "highlight": hover dims non-hovered categories to 30% opacity
   * - "isolate": click toggles category visibility with checkmark indicators
   * - "none": static legend (default)
   */
  legendInteraction?: LegendInteractionMode

  /**
   * Legend position relative to the chart area
   * @default "right"
   */
  legendPosition?: "right" | "left" | "top" | "bottom"

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
   * Place category labels directly at line endpoints instead of using a separate legend.
   * When true, auto-hides the legend (override with `showLegend: true`).
   * Pass an object for fine-grained control.
   */
  directLabel?: boolean | {
    /** Where to place labels relative to the line. @default "end" */
    position?: "end" | "start"
    /** Font size for labels. @default 11 */
    fontSize?: number
  }

  /**
   * How to handle null/undefined/NaN values in the data.
   * - "break": break the line at gaps (default)
   * - "interpolate": connect across gaps (skip missing points)
   * - "zero": drop to zero at gap boundaries
   */
  gapStrategy?: "break" | "interpolate" | "zero"

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
    directLabel,
    gapStrategy = "break",
    anomaly,
    forecast,
    frameProps = {},
    selection,
    linkedHover,
    onObservation,
    chartId,
    loading,
    emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
    xScaleType,
    yScaleType
  } = props

  const width = resolved.width
  const height = resolved.height
  const enableHover = resolved.enableHover
  const showGrid = resolved.showGrid
  const showLegend = resolved.showLegend
  const title = resolved.title
  const xLabel = resolved.xLabel
  const yLabel = resolved.yLabel

  // ── Loading / empty states ──────────────────────────────────────────────
  const loadingEl = renderLoadingState(loading, width, height)
  if (loadingEl) return loadingEl
  const emptyEl = renderEmptyState(data, width, height, emptyContent)
  if (emptyEl) return emptyEl

  const safeData = data || []

  // ── Dev-mode warnings ─────────────────────────────────────────────────
  warnMissingField("LineChart", safeData, "xAccessor", xAccessor)
  warnMissingField("LineChart", safeData, "yAccessor", yAccessor)

  // ── Statistical overlay processing ────────────────────────────────────

  const xAccStr = typeof xAccessor === "string" ? xAccessor : "x"
  const yAccStr = typeof yAccessor === "string" ? yAccessor : "y"

  // Lazy-load statistical overlays — only fetches the module when forecast/anomaly props are used
  const [statisticalResult, setStatisticalResult] = useState<{
    processedData: Record<string, any>[]
    annotations: Record<string, any>[]
  } | null>(null)
  const [statisticalAnnotations, setStatisticalAnnotations] = useState<Record<string, any>[]>([])

  useEffect(() => {
    let cancelled = false
    if (forecast) {
      buildForecastLazy(safeData as Record<string, any>[], xAccStr, yAccStr, forecast, anomaly).then(result => {
        if (!cancelled) {
          setStatisticalResult(result)
          setStatisticalAnnotations(result.annotations)
        }
      }).catch(() => {
        if (!cancelled) {
          setStatisticalResult(null)
          setStatisticalAnnotations([])
        }
      })
    } else if (anomaly) {
      buildAnomalyAnnotationsLazy(anomaly).then(result => {
        if (!cancelled) {
          setStatisticalResult(null)
          setStatisticalAnnotations(result)
        }
      }).catch(() => {
        if (!cancelled) {
          setStatisticalAnnotations([])
        }
      })
    } else {
      setStatisticalResult(null)
      setStatisticalAnnotations([])
    }
    return () => { cancelled = true }
  }, [safeData, forecast, anomaly, xAccStr, yAccStr])

  const effectiveData = statisticalResult ? statisticalResult.processedData : safeData
  const effectiveGroupAccessor = forecast && !lineBy ? SEGMENT_FIELD : lineBy

  // ── Selection hooks (always called, conditional logic inside) ──────────

  const { activeSelectionHook, customHoverBehavior } = useChartSelection({
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    onObservation, chartType: "LineChart", chartId
  })

  // ── Gap handling helper ──────────────────────────────────────────────
  const isGap = useCallback((d: Record<string, any>) => {
    const xVal = typeof xAccessor === "function" ? xAccessor(d) : d[xAccessor as string]
    const yVal = typeof yAccessor === "function" ? yAccessor(d) : d[yAccessor as string]
    return xVal == null || yVal == null || Number.isNaN(xVal) || Number.isNaN(yVal)
  }, [xAccessor, yAccessor])

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

  // Apply gap strategy to line data
  //
  // "break" splits each line into separate segment objects with unique group
  //   keys so the Frame renders them as independent lines (with gaps between).
  // "interpolate" filters out null points so the line connects across gaps.
  //   Filtering must happen here because the pipeline accessor coerces null→0.
  // "zero" replaces null y-values with 0 so the line drops to the baseline.
  //
  // hasGaps tracks whether any null/NaN values were found, so we only switch
  // the group accessor to _gapSegment when gaps actually exist (avoids
  // interfering with forecast segmentation or normal grouping).
  const { gapProcessedLineData, hasGaps } = useMemo(() => {
    if (gapStrategy === "interpolate") {
      // Filter out gap points from each line's coordinates so the line
      // connects directly from the last valid point to the next valid one.
      // We can't rely on SceneGraph filtering because resolveAccessor uses
      // unary + which converts null→0 before SceneGraph ever sees it.
      let found = false
      const result: Record<string, any>[] = []
      for (const line of lineData) {
        const coords: Record<string, any>[] = line[lineDataAccessor] || []
        const filtered = coords.filter(d => {
          if (isGap(d)) { found = true; return false }
          return true
        })
        if (filtered.length > 0) {
          result.push({ ...line, [lineDataAccessor]: filtered })
        }
      }
      return { gapProcessedLineData: result, hasGaps: found }
    }

    if (gapStrategy === "break") {
      // Split each line into segments at gap boundaries. Each segment gets
      // a unique _gapSegment key injected into its coordinates so that when
      // the data is flattened and re-grouped by the Frame, segments stay separate.
      let found = false
      const result: Record<string, any>[] = []
      for (const line of lineData) {
        const coords: Record<string, any>[] = line[lineDataAccessor] || []
        let segment: Record<string, any>[] = []
        let segIdx = 0
        const groupVal = effectiveGroupAccessor && typeof effectiveGroupAccessor === "string"
          ? line[effectiveGroupAccessor]
          : undefined

        for (const d of coords) {
          if (isGap(d)) {
            found = true
            if (segment.length > 0) {
              result.push({ ...line, [lineDataAccessor]: segment })
              segment = []
              segIdx++
            }
          } else {
            const segKey = groupVal != null ? `${groupVal}__seg${segIdx}` : `__seg${segIdx}`
            segment.push({ ...d, _gapSegment: segKey })
          }
        }
        if (segment.length > 0) {
          result.push({ ...line, [lineDataAccessor]: segment })
        }
      }
      return { gapProcessedLineData: result, hasGaps: found }
    }

    if (gapStrategy === "zero") {
      // Replace null y-values with 0 so the line drops to the baseline
      let found = false
      const yField = typeof yAccessor === "string" ? yAccessor : "y"
      const result: Record<string, any>[] = []
      for (const line of lineData) {
        const coords: Record<string, any>[] = line[lineDataAccessor] || []
        const processed: Record<string, any>[] = []
        for (const d of coords) {
          if (isGap(d)) {
            found = true
            processed.push({ ...d, [yField]: 0 })
          } else {
            processed.push(d)
          }
        }
        result.push({ ...line, [lineDataAccessor]: processed })
      }
      return { gapProcessedLineData: result, hasGaps: found }
    }

    return { gapProcessedLineData: lineData, hasGaps: false }
  }, [lineData, gapStrategy, lineDataAccessor, isGap, effectiveGroupAccessor, yAccessor])

  // Create color scale if colorBy is specified
  const colorScale = useColorScale(effectiveData as Record<string, any>[], colorBy, colorScheme)

  // Legend interaction
  const allCategories = useMemo(() => {
    if (!colorBy) return []
    const vals = new Set<string>()
    for (const d of effectiveData as Record<string, any>[]) {
      const v = typeof colorBy === "function" ? colorBy(d) : d[colorBy as string]
      if (v != null) vals.add(String(v))
    }
    return Array.from(vals)
  }, [effectiveData, colorBy])

  const legendState = useLegendInteraction(legendInteraction, colorBy, allCategories)

  // Merge legend selection with cross-chart selection
  const effectiveSelectionHook = useMemo(() => {
    if (legendState.legendSelectionHook) return legendState.legendSelectionHook
    return activeSelectionHook
  }, [legendState.legendSelectionHook, activeSelectionHook])

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

  // Lazy-load segment-aware styling — only loads module when forecast is set
  const [segmentAwareStyle, setSegmentAwareStyle] = useState<(d: Record<string, any>) => Record<string, any>>(
    () => baseLineStyle
  )
  useEffect(() => {
    let cancelled = false
    if (forecast) {
      createSegmentLineStyleLazy(baseLineStyle, forecast).then(result => {
        if (!cancelled) setSegmentAwareStyle(() => result)
      })
    } else {
      setSegmentAwareStyle(() => baseLineStyle)
    }
    return () => { cancelled = true }
  }, [baseLineStyle, forecast])

  const lineStyle = useMemo(
    () => wrapStyleWithSelection(segmentAwareStyle, effectiveSelectionHook, selection),
    [segmentAwareStyle, effectiveSelectionHook, selection]
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

  // Direct labeling — generate annotations at line endpoints
  const directLabelConfig = typeof directLabel === "object" ? directLabel : {}
  const directLabelPosition = directLabelConfig.position || "end"
  const directLabelFontSize = directLabelConfig.fontSize || 11

  const directLabelAnnotations = useMemo(() => {
    if (!directLabel || !colorBy) return []
    const xAcc = typeof xAccessor === "function" ? xAccessor : (d: Record<string, any>) => d[xAccessor as string]
    const yAcc = typeof yAccessor === "function" ? yAccessor : (d: Record<string, any>) => d[yAccessor as string]
    const colorAcc = typeof colorBy === "function" ? colorBy : (d: Record<string, any>) => d[colorBy as string]

    // Get the endpoint of each line (by group)
    const groupEndpoints = new Map<string, Record<string, any>>()
    for (const line of gapProcessedLineData) {
      const coords: Record<string, any>[] = line[lineDataAccessor] || []
      if (coords.length === 0) continue
      const endpoint = directLabelPosition === "end" ? coords[coords.length - 1] : coords[0]
      const label = colorAcc(endpoint) ?? colorAcc(line) ?? ""
      if (label && !groupEndpoints.has(String(label))) {
        groupEndpoints.set(String(label), endpoint)
      }
    }

    // Build text annotations at endpoints with simple collision avoidance
    const labels = Array.from(groupEndpoints.entries())
      .map(([label, d]) => ({
        type: "text" as const,
        label,
        [typeof xAccessor === "string" ? xAccessor : "x"]: xAcc(d),
        [typeof yAccessor === "string" ? yAccessor : "y"]: yAcc(d),
        dx: directLabelPosition === "end" ? 6 : -6,
        dy: 0,
        color: colorScale ? colorScale(label) : DEFAULT_COLOR,
        fontSize: directLabelFontSize,
      }))

    // Simple vertical collision avoidance: offset labels that are too close
    labels.sort((a, b) => {
      const yField = typeof yAccessor === "string" ? yAccessor : "y"
      return (a[yField] as number) - (b[yField] as number)
    })
    for (let i = 1; i < labels.length; i++) {
      const yField = typeof yAccessor === "string" ? yAccessor : "y"
      const prev = labels[i - 1]
      const curr = labels[i]
      const prevY = prev[yField] as number + prev.dy
      const currY = curr[yField] as number + curr.dy
      if (Math.abs(currY - prevY) < directLabelFontSize + 2) {
        curr.dy += directLabelFontSize + 2
      }
    }

    return labels
  }, [directLabel, colorBy, colorScale, gapProcessedLineData, lineDataAccessor, xAccessor, yAccessor, directLabelPosition, directLabelFontSize])

  // Suppress legend when directLabel is active (unless explicitly overridden)
  const effectiveShowLegend = directLabel && showLegend === undefined ? false : showLegend

  // Legend + margin — add extra right/left margin for direct labels
  const directLabelMarginDefaults = useMemo(() => {
    if (!directLabel) return resolved.marginDefaults
    // Estimate the widest label to calculate needed margin
    const maxLabelWidth = directLabelAnnotations.reduce((max, a) => {
      const est = (a.label?.length || 0) * (directLabelFontSize * 0.6)
      return Math.max(max, est)
    }, 0)
    const extra = maxLabelWidth + 10
    const side = directLabelPosition === "end" ? "right" : "left"
    return {
      ...resolved.marginDefaults,
      [side]: Math.max(resolved.marginDefaults[side] || 0, extra),
    }
  }, [directLabel, directLabelAnnotations, directLabelFontSize, directLabelPosition, resolved.marginDefaults])

  const { legend, margin, legendPosition } = useChartLegendAndMargin({
    data: gapProcessedLineData,
    colorBy,
    colorScale,
    showLegend: effectiveShowLegend,
    legendPosition: legendPositionProp,
    userMargin,
    defaults: directLabelMarginDefaults,
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

  // Flatten line data into a single array for StreamXYFrame.
  // When gapStrategy is "break" or "interpolate", we always flatten from
  // gapProcessedLineData (which has segments split or gaps filtered).
  const flattenedData = useMemo(() => {
    const needsFlatten = isLineObjectFormat || effectiveGroupAccessor || hasGaps

    if (needsFlatten) {
      return gapProcessedLineData.flatMap((line: Record<string, any>) => {
        const coords = line[lineDataAccessor] || []
        if (effectiveGroupAccessor && typeof effectiveGroupAccessor === "string") {
          return coords.map((c: Record<string, any>) => ({ ...c, [effectiveGroupAccessor]: line[effectiveGroupAccessor] }))
        }
        return coords
      })
    }
    return effectiveData
  }, [gapProcessedLineData, lineDataAccessor, isLineObjectFormat, effectiveGroupAccessor, effectiveData, hasGaps])

  // Build StreamXYFrame props
  const streamProps: StreamXYFrameProps = {
    chartType,
    data: flattenedData,
    xAccessor,
    yAccessor,
    xScaleType,
    yScaleType,
    groupAccessor: gapStrategy === "break" && hasGaps ? "_gapSegment" : effectiveGroupAccessor || undefined,
    curve,
    lineStyle,
    ...(showPoints && { pointStyle }),
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin,
    showAxes: resolved.showAxes,
    xLabel,
    yLabel,
    xFormat,
    yFormat,
    enableHover,
    showGrid,
    ...(legend && { legend, legendPosition }),
    ...(legendInteraction && legendInteraction !== "none" && {
      legendHoverBehavior: legendState.onLegendHover,
      legendClickBehavior: legendState.onLegendClick,
      legendHighlightedCategory: legendState.highlightedCategory,
      legendIsolatedCategories: legendState.isolatedCategories,
    }),
    ...(title && { title }),
    ...(className && { className }),
    tooltipContent: normalizeTooltip(tooltip) || defaultTooltipContent,
    ...((linkedHover || onObservation) && { customHoverBehavior }),
    ...(pointIdAccessor && { pointIdAccessor }),
    ...((annotations?.length || statisticalAnnotations.length || directLabelAnnotations.length) && {
      annotations: [...(annotations || []), ...statisticalAnnotations, ...directLabelAnnotations],
    }),
    ...frameProps
  }

  return <SafeRender componentName="LineChart" width={width} height={height}><StreamXYFrame {...streamProps} /></SafeRender>
}
LineChart.displayName = "LineChart"
