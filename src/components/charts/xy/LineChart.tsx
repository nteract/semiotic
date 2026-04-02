"use client"
import * as React from "react"
import { useMemo, useCallback, useState, useEffect, forwardRef, useRef, useImperativeHandle } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps, StreamXYFrameHandle } from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { getColor } from "../shared/colorUtils"
import { useColorScale, useChartSelection, useChartLegendAndMargin, useChartMode, useLegendInteraction, DEFAULT_COLOR, getCrosshairProps } from "../shared/hooks"
import type { LegendInteractionMode } from "../shared/hooks"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { normalizeTooltip, MultiPointTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { buildDefaultTooltip, accessorName } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { SafeRender, warnMissingField, renderEmptyState, renderLoadingState } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import type { AnomalyConfig, ForecastConfig } from "../shared/statisticalOverlays"
import { buildForecastLazy, buildAnomalyAnnotationsLazy, createSegmentLineStyleLazy, SEGMENT_FIELD } from "../shared/statisticalOverlaysLazy"

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
  data?: TDatum[]

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
   * Fill area under the line. `true` fills all series, `string[]` lists series
   * names (matching lineBy/colorBy group key) that get area fill while others stay as lines.
   * @default false
   */
  fillArea?: boolean | string[]

  /**
   * Area opacity when fillArea is true
   * @default 0.3
   */
  areaOpacity?: number

  /**
   * Horizontal gradient for the line stroke. Color stops define a left-to-right gradient.
   * `{ colorStops: [{ offset: 0, color: "blue" }, { offset: 1, color: "red" }] }`
   */
  lineGradient?: { colorStops: Array<{ offset: number; color: string }> }

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
export const LineChart = forwardRef(
  function LineChart<TDatum extends Record<string, any> = Record<string, any>>(props: LineChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
  const frameRef = useRef<StreamXYFrameHandle>(null)

  useImperativeHandle(ref, () => ({
    push: (point) => frameRef.current?.push(point),
    pushMany: (points) => frameRef.current?.pushMany(points),
    clear: () => frameRef.current?.clear(),
    getData: () => frameRef.current?.getData() ?? []
  }))

  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showGrid: props.showGrid,
    enableHover: props.enableHover,
    showLegend: props.showLegend,
    title: props.title,
    description: props.description,
    summary: props.summary,
    accessibleTable: props.accessibleTable,
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
    colorScheme,
    curve = "linear",
    showPoints = false,
    pointRadius = 3,
    fillArea = false,
    areaOpacity = 0.3,
    lineWidth = 2,
    lineGradient,
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
    onClick,
    hoverHighlight,
    hoverRadius,
    chartId,
    loading,
    emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
    xScaleType,
    yScaleType,
    color
  } = props

  const width = resolved.width
  const height = resolved.height
  const enableHover = resolved.enableHover
  const showGrid = resolved.showGrid
  const showLegend = resolved.showLegend
  const title = resolved.title
  const description = resolved.description
  const summary = resolved.summary
  const accessibleTable = resolved.accessibleTable
  const xLabel = resolved.xLabel
  const yLabel = resolved.yLabel

  // ── Loading / empty states (computed early, returned after all hooks) ───
  const loadingEl = renderLoadingState(loading, width, height)
  const emptyEl = !loadingEl ? renderEmptyState(data, width, height, emptyContent) : null

  const safeData = data || []

  // ── Dev-mode warnings ─────────────────────────────────────────────────
  warnMissingField("LineChart", safeData, "xAccessor", xAccessor)
  warnMissingField("LineChart", safeData, "yAccessor", yAccessor)

  // ── Statistical overlay processing ────────────────────────────────────

  // Statistical overlays need a string accessor to read x/y values from data.
  // When the user provides a function accessor, we bake resolved values into
  // each datum under a synthetic field so the overlay pipeline + annotation
  // renderer can access them by string key.
  const xAccStr = typeof xAccessor === "string" ? xAccessor : "__semiotic_resolvedX"
  const yAccStr = typeof yAccessor === "string" ? yAccessor : "__semiotic_resolvedY"

  // Lazy-load statistical overlays — only fetches the module when forecast/anomaly props are used
  const [statisticalResult, setStatisticalResult] = useState<{
    processedData: Record<string, any>[]
    annotations: Record<string, any>[]
  } | null>(null)
  const [statisticalAnnotations, setStatisticalAnnotations] = useState<Record<string, any>[]>([])

  // When accessors are functions, bake resolved values into data for the overlay pipeline
  const overlayData = useMemo(() => {
    if (!forecast && !anomaly) return safeData as Record<string, any>[]
    const needsX = typeof xAccessor === "function"
    const needsY = typeof yAccessor === "function"
    if (!needsX && !needsY) return safeData as Record<string, any>[]
    return (safeData as Record<string, any>[]).map(d => {
      const copy = { ...d }
      if (needsX) copy.__semiotic_resolvedX = (xAccessor as (d: any) => any)(d)
      if (needsY) copy.__semiotic_resolvedY = (yAccessor as (d: any) => any)(d)
      return copy
    })
  }, [safeData, forecast, anomaly, xAccessor, yAccessor])

  // Track config identity to clear results only when config changes, not on every data update
  const prevForecastRef = useRef(forecast)
  const prevAnomalyRef = useRef(anomaly)

  useEffect(() => {
    if (!forecast && !anomaly) {
      // Clear stale overlays when forecast/anomaly props are removed
      if (prevForecastRef.current || prevAnomalyRef.current) {
        setStatisticalResult(null)
        setStatisticalAnnotations([])
        prevForecastRef.current = forecast
        prevAnomalyRef.current = anomaly
      }
      return
    }
    let cancelled = false
    // Only clear previous results when the forecast/anomaly CONFIG changes.
    // Data-only changes keep the previous result visible to avoid flicker
    // (e.g., streaming forecast sparklines updating every 150ms).
    const configChanged = forecast !== prevForecastRef.current || anomaly !== prevAnomalyRef.current
    prevForecastRef.current = forecast
    prevAnomalyRef.current = anomaly
    if (configChanged) {
      setStatisticalResult(null)
      setStatisticalAnnotations([])
    }
    if (forecast) {
      // When lineBy is a string, tell buildPrecomputed to do group-aware
      // boundary duplication so multi-metric data doesn't create stray lines
      const enrichedForecast = lineBy && typeof lineBy === "string" && typeof forecast === "object"
        ? { ...forecast, _groupBy: lineBy }
        : forecast
      buildForecastLazy(overlayData, xAccStr, yAccStr, enrichedForecast, anomaly).then(result => {
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
    }
    return () => { cancelled = true }
  }, [overlayData, forecast, anomaly, xAccStr, yAccStr])

  const effectiveData = statisticalResult ? statisticalResult.processedData : safeData

  // When both lineBy and forecast are present, we need a compound group that
  // splits lines by BOTH the user's grouping field AND the forecast segment.
  // This ensures training/observed/forecast segments become separate lines
  // (each with distinct dash patterns) while colorBy still maps to the metric.
  const COMPOUND_GROUP = "__compoundGroup"
  const needsCompoundGroup = !!(forecast && lineBy)
  const effectiveGroupAccessor = needsCompoundGroup
    ? COMPOUND_GROUP
    : forecast ? SEGMENT_FIELD : lineBy

  // Stamp compound group field onto data when both lineBy and forecast are active
  const compoundData = useMemo(() => {
    if (!needsCompoundGroup) return effectiveData
    const lineByAcc = typeof lineBy === "function" ? lineBy : (d: Record<string, any>) => d[lineBy as string]
    return (effectiveData as Record<string, any>[]).map(d => {
      const copy: Record<string, any> = { ...d }
      copy[COMPOUND_GROUP] = `${lineByAcc(d)}__${d[SEGMENT_FIELD] || "observed"}`
      return copy
    })
  }, [effectiveData, needsCompoundGroup, lineBy])

  // Use compoundData instead of effectiveData for downstream processing
  const chartData = needsCompoundGroup ? compoundData : effectiveData

  // ── Envelope-aware y extent ──────────────────────────────────────────
  // When forecast/anomaly has upper/lower bounds, the default y extent only
  // sees the value field.  Expand to include the envelope so it doesn't clip.
  const envelopeYExtent = useMemo(() => {
    if (!forecast) return undefined
    const upperAcc = (forecast as ForecastConfig).upperBounds
    const lowerAcc = (forecast as ForecastConfig).lowerBounds
    if (!upperAcc && !lowerAcc) return undefined

    const getUpper = typeof upperAcc === "function" ? upperAcc
      : typeof upperAcc === "string" ? (d: Record<string, any>) => d[upperAcc] as number
      : null
    const getLower = typeof lowerAcc === "function" ? lowerAcc
      : typeof lowerAcc === "string" ? (d: Record<string, any>) => d[lowerAcc] as number
      : null

    let min = Infinity
    let max = -Infinity
    const dataToScan = statisticalResult ? statisticalResult.processedData : safeData
    for (const d of dataToScan as Record<string, any>[]) {
      // Include the y value itself
      const yVal = typeof yAccessor === "function" ? (yAccessor as (d: any) => number)(d) : +(d[yAccessor as string])
      if (isFinite(yVal)) {
        if (yVal < min) min = yVal
        if (yVal > max) max = yVal
      }
      if (getUpper) {
        const u = getUpper(d)
        if (u != null && isFinite(u)) { if (u > max) max = u; if (u < min) min = u }
      }
      if (getLower) {
        const l = getLower(d)
        if (l != null && isFinite(l)) { if (l < min) min = l; if (l > max) max = l }
      }
    }
    if (!isFinite(min) || !isFinite(max)) return undefined
    return [min, max] as [number, number]
  }, [forecast, statisticalResult, safeData, yAccessor])

  // ── Selection hooks (always called, conditional logic inside) ──────────

  const { activeSelectionHook, hoverSelectionHook, customHoverBehavior, customClickBehavior, crosshairSourceId } = useChartSelection({
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    onObservation, onClick, chartType: "LineChart", chartId,
    hoverHighlight,
    colorByField: typeof colorBy === "string" ? colorBy : undefined,
  })

  // Linked crosshair config (x-position mode)
  const crosshairFrameProps = getCrosshairProps(linkedHover, crosshairSourceId)

  // ── Gap handling helper ──────────────────────────────────────────────
  const isGap = useCallback((d: Record<string, any>) => {
    const xVal = typeof xAccessor === "function" ? xAccessor(d) : d[xAccessor as string]
    const yVal = typeof yAccessor === "function" ? yAccessor(d) : d[yAccessor as string]
    return xVal == null || yVal == null || Number.isNaN(xVal) || Number.isNaN(yVal)
  }, [xAccessor, yAccessor])

  // ── Core chart logic ───────────────────────────────────────────────────

  // Check if data is in line objects format (has lineDataAccessor field)
  const isLineObjectFormat = chartData[0]?.[lineDataAccessor] !== undefined

  // Transform data to line format if needed
  const lineData = useMemo(() => {
    if (isLineObjectFormat) {
      // Data is already in line objects format
      return chartData
    }

    if (effectiveGroupAccessor) {
      // Group data by lineBy field (or segment field for forecast)
      const grouped = (chartData as Record<string, any>[]).reduce((acc, d) => {
        const key = typeof effectiveGroupAccessor === "function" ? effectiveGroupAccessor(d) : d[effectiveGroupAccessor]
        if (!acc[key]) {
          const lineObj: Record<string, any> = { [lineDataAccessor]: [] }
          // Add the grouping field
          if (typeof effectiveGroupAccessor === "string") {
            lineObj[effectiveGroupAccessor] = key
          }
          // When using compound grouping, also copy the segment and lineBy fields
          // onto the line object so createSegmentLineStyle and color resolution work
          if (needsCompoundGroup) {
            lineObj[SEGMENT_FIELD] = d[SEGMENT_FIELD]
            if (typeof lineBy === "string") lineObj[lineBy] = d[lineBy]
          }
          acc[key] = lineObj
        }
        acc[key][lineDataAccessor].push(d)
        return acc
      }, {} as Record<string, Record<string, any>>)

      return Object.values(grouped)
    }

    // Single line - wrap in line object
    return [{ [lineDataAccessor]: chartData }]
  }, [chartData, effectiveGroupAccessor, lineDataAccessor, isLineObjectFormat])

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

  // Merge hover highlight > legend selection > cross-chart selection
  const effectiveSelectionHook = useMemo(() => {
    if (hoverSelectionHook) return hoverSelectionHook
    if (legendState.legendSelectionHook) return legendState.legendSelectionHook
    return activeSelectionHook
  }, [hoverSelectionHook, legendState.legendSelectionHook, activeSelectionHook])

  // Line style function
  const baseLineStyle = useMemo(() => {
    // Second arg is the group key (series name), passed by PipelineStore.resolveLineStyle
    return (d: Record<string, any>, group?: string) => {
      const baseStyle: Record<string, string | number> = {
        strokeWidth: lineWidth
      }

      // When fillArea is a string[], only apply fill to matching series
      const shouldFill = fillArea === true
        || (Array.isArray(fillArea) && group != null && fillArea.includes(group))

      if (colorBy) {
        if (colorScale) {
          baseStyle.stroke = getColor(d, colorBy, colorScale)
          if (shouldFill) {
            baseStyle.fill = baseStyle.stroke
            baseStyle.fillOpacity = areaOpacity
          }
        }
      } else {
        baseStyle.stroke = color || DEFAULT_COLOR
        if (shouldFill) {
          baseStyle.fill = color || DEFAULT_COLOR
          baseStyle.fillOpacity = areaOpacity
        }
      }

      return baseStyle
    }
  }, [colorBy, colorScale, lineWidth, fillArea, areaOpacity, color])

  // Lazy-load segment-aware styling — only loads module when forecast is set
  const [segmentAwareStyle, setSegmentAwareStyle] = useState<((d: Record<string, any>) => Record<string, any>) | null>(null)
  useEffect(() => {
    if (!forecast) {
      setSegmentAwareStyle(null)
      return
    }
    let cancelled = false
    createSegmentLineStyleLazy(baseLineStyle, forecast).then(result => {
      if (!cancelled) setSegmentAwareStyle(() => result)
    }).catch(() => {
      if (!cancelled) setSegmentAwareStyle(null)
    })
    return () => { cancelled = true }
  }, [baseLineStyle, forecast])

  const effectiveLineStyle = segmentAwareStyle || baseLineStyle

  const lineStyle = useMemo(
    () => wrapStyleWithSelection(effectiveLineStyle, effectiveSelectionHook, selection),
    [effectiveLineStyle, effectiveSelectionHook, selection]
  )

  // Point style function (if showPoints is true)
  const pointStyle = useMemo(() => {
    if (!showPoints) return undefined

    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {
        r: pointRadius,
        fillOpacity: 1
      }

      // Match line color — skip fill when colorScale unavailable (push API)
      // so the frame's own color map can fill in
      if (colorBy) {
        if (colorScale) baseStyle.fill = getColor(d.parentLine || d, colorBy, colorScale)
      } else {
        baseStyle.fill = color || DEFAULT_COLOR
      }

      return baseStyle
    }
  }, [showPoints, pointRadius, colorBy, colorScale, color])

  // Determine chart type for StreamXYFrame
  const chartType = Array.isArray(fillArea) ? "mixed" as const : fillArea ? "area" as const : "line" as const

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

  // Validate data (computed here, guard deferred to after all hooks)
  // When data is in line objects format, validate against the coordinates
  // inside the first line object rather than the top-level line objects
  const validationData = isLineObjectFormat
    ? (effectiveData[0]?.[lineDataAccessor] || [])
    : data
  const validationError = validateArrayData({
    componentName: "LineChart",
    data: validationData,
    accessors: {
      xAccessor,
      yAccessor,
    },
  })

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
    return chartData
  }, [gapProcessedLineData, lineDataAccessor, isLineObjectFormat, effectiveGroupAccessor, chartData, hasGaps])

  // Build StreamXYFrame props
  const streamProps: StreamXYFrameProps = {
    chartType,
    ...(Array.isArray(fillArea) && { areaGroups: fillArea }),
    ...(lineGradient && { lineGradient }),
    ...(hoverRadius != null && { hoverRadius }),
    ...(data != null && { data: flattenedData }),
    xAccessor,
    yAccessor,
    xScaleType,
    yScaleType,
    ...(envelopeYExtent && { yExtent: envelopeYExtent }),
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
    ...(description && { description }),
    ...(summary && { summary }),
    ...(accessibleTable !== undefined && { accessibleTable }),
    ...(className && { className }),
    tooltipContent: tooltip === false
      ? () => null
      : tooltip === "multi"
        ? MultiPointTooltip()
        : (normalizeTooltip(tooltip) || defaultTooltipContent),
    ...(tooltip === "multi" && { tooltipMode: "multi" as const }),
    ...((linkedHover || onObservation || onClick || hoverHighlight) && { customHoverBehavior }),
    ...((onObservation || onClick || linkedHover) && { customClickBehavior }),
    ...(pointIdAccessor && { pointIdAccessor }),
    ...((annotations?.length || statisticalAnnotations.length || directLabelAnnotations.length) && {
      annotations: [...(annotations || []), ...statisticalAnnotations, ...directLabelAnnotations],
    }),
    ...crosshairFrameProps,
    ...frameProps
  }

  // ── Loading / empty / validation guards (deferred to after all hooks) ──
  if (loadingEl) return loadingEl
  if (emptyEl) return emptyEl
  if (validationError) return <ChartError componentName="LineChart" message={validationError} width={width} height={height} />

  return <SafeRender componentName="LineChart" width={width} height={height}><StreamXYFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Record<string, any> = Record<string, any>>(props: LineChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
LineChart.displayName = "LineChart"
