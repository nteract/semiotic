"use client"
import type { Datum } from "../shared/datumTypes"
import * as React from "react"
import { useMemo, useCallback, useState, useEffect, forwardRef, useRef } from "react"
import { filterSparseArray } from "../shared/sparseArray"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps, StreamXYFrameHandle } from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { getColor } from "../shared/colorUtils"
import { useChartMode, DEFAULT_COLOR } from "../shared/hooks"
import type { LegendInteractionMode } from "../shared/hooks"
import { mergeShapeStyle } from "../shared/mergeShapeStyle"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { normalizeTooltip, MultiPointTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { buildDefaultTooltip, accessorName } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { SafeRender, warnMissingField } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import { useChartSetup } from "../shared/useChartSetup"
import { useFrameImperativeHandle } from "../shared/useFrameImperativeHandle"
import type { AnomalyConfig, ForecastConfig } from "../shared/statisticalOverlays"
import { buildForecastLazy, buildAnomalyAnnotationsLazy, createSegmentLineStyleLazy, SEGMENT_FIELD } from "../shared/statisticalOverlaysLazy"

/**
 * LineChart component props
 */
export interface LineChartProps<TDatum extends Datum = Datum> extends BaseChartProps, AxisConfig {
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
  xScaleType?: "linear" | "log" | "time"

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
  annotations?: Datum[]

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
   * Fixed x domain `[min, max]`. Either bound may be `undefined` to leave
   * that side data-derived.
   */
  xExtent?: [number | undefined, number | undefined] | [number]

  /**
   * Fixed y domain `[min, max]`. Either bound may be `undefined` to leave
   * that side data-derived. Wins over the auto-computed envelope extent
   * when forecast bounds are present, so explicit user intent stays
   * authoritative.
   */
  yExtent?: [number | undefined, number | undefined] | [number]

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
  function LineChart<TDatum extends Datum = Datum>(props: LineChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
  const frameRef = useRef<StreamXYFrameHandle>(null)

  useFrameImperativeHandle(ref, { variant: "xy", frameRef })

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
    xExtent,
    yExtent,
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
    color,
    stroke,
    strokeWidth: topLevelStrokeWidth,
    opacity,
  } = props

  const { width, height, enableHover, showGrid, showLegend, title, description, summary, accessibleTable, xLabel, yLabel } = resolved

  // `useMemo`'d sparse-array filter — drops `null`/non-object entries
  // that data loaders commonly emit. Identity-preserving when nothing
  // is dropped so downstream memo deps still cache-hit.
  const safeData = useMemo(() => filterSparseArray(data), [data])

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
    processedData: Datum[]
    annotations: Datum[]
  } | null>(null)
  const [statisticalAnnotations, setStatisticalAnnotations] = useState<Datum[]>([])

  // When accessors are functions, bake resolved values into data for the overlay pipeline
  const overlayData = useMemo(() => {
    if (!forecast && !anomaly) return safeData as Datum[]
    const needsX = typeof xAccessor === "function"
    const needsY = typeof yAccessor === "function"
    if (!needsX && !needsY) return safeData as Datum[]
    return (safeData as Datum[]).map(d => {
      const copy = { ...d }
      if (needsX) copy.__semiotic_resolvedX = (xAccessor as (d: Datum) => any)(d)
      if (needsY) copy.__semiotic_resolvedY = (yAccessor as (d: Datum) => any)(d)
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
    const lineByAcc = typeof lineBy === "function" ? lineBy : (d: Datum) => d[lineBy as string]
    return (effectiveData as Datum[]).map(d => {
      const copy: Datum = { ...d }
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
      : typeof upperAcc === "string" ? (d: Datum) => d[upperAcc] as number
      : null
    const getLower = typeof lowerAcc === "function" ? lowerAcc
      : typeof lowerAcc === "string" ? (d: Datum) => d[lowerAcc] as number
      : null

    let min = Infinity
    let max = -Infinity
    const dataToScan = statisticalResult ? statisticalResult.processedData : safeData
    for (const d of dataToScan as Datum[]) {
      // Include the y value itself
      const yVal = typeof yAccessor === "function" ? (yAccessor as (d: Datum) => number)(d) : +(d[yAccessor as string])
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

  // ── Gap handling helper ──────────────────────────────────────────────
  const isGap = useCallback((d: Datum) => {
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
      const grouped = (chartData as Datum[]).reduce((acc, d) => {
        const key = typeof effectiveGroupAccessor === "function" ? effectiveGroupAccessor(d) : d[effectiveGroupAccessor]
        if (!acc[key]) {
          const lineObj: Datum = { [lineDataAccessor]: [] }
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
      }, {} as Record<string, Datum>)

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
      const result: Datum[] = []
      for (const line of lineData) {
        const coords: Datum[] = line[lineDataAccessor] || []
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
      const result: Datum[] = []
      for (const line of lineData) {
        const coords: Datum[] = line[lineDataAccessor] || []
        let segment: Datum[] = []
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
      const result: Datum[] = []
      for (const line of lineData) {
        const coords: Datum[] = line[lineDataAccessor] || []
        const processed: Datum[] = []
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

  // ── Direct-label pre-computation (texts only, no colors) ──────────────
  // Splitting label texts from full annotations lets the margin estimate
  // run before useChartSetup (which needs `marginDefaults`), while the
  // fully-styled annotations (with color from setup.colorScale) are
  // assembled after setup. The texts depend only on accessors and shape,
  // not on the color scale.
  const directLabelConfig = typeof directLabel === "object" ? directLabel : {}
  const directLabelPosition = directLabelConfig.position || "end"
  const directLabelFontSize = directLabelConfig.fontSize || 11

  const directLabelLabelTexts = useMemo(() => {
    if (!directLabel || !colorBy) return []
    const colorAcc = typeof colorBy === "function" ? colorBy : (d: Datum) => d[colorBy as string]
    const seen = new Set<string>()
    for (const line of gapProcessedLineData) {
      const coords: Datum[] = line[lineDataAccessor] || []
      if (coords.length === 0) continue
      const endpoint = directLabelPosition === "end" ? coords[coords.length - 1] : coords[0]
      // Coalesce nullish but keep falsy-but-valid values like 0 or false —
      // a categorical chart with numeric category values must still get a
      // direct label and have its margin estimated.
      const raw = colorAcc(endpoint) ?? colorAcc(line)
      if (raw == null) continue
      const label = String(raw)
      if (label !== "") seen.add(label)
    }
    return Array.from(seen)
  }, [directLabel, colorBy, gapProcessedLineData, lineDataAccessor, directLabelPosition])

  const directLabelMarginDefaults = useMemo(() => {
    if (!directLabel) return resolved.marginDefaults
    const maxLabelWidth = directLabelLabelTexts.reduce((max, label) => {
      return Math.max(max, label.length * (directLabelFontSize * 0.6))
    }, 0)
    const extra = maxLabelWidth + 10
    const side = directLabelPosition === "end" ? "right" : "left"
    return {
      ...resolved.marginDefaults,
      [side]: Math.max(resolved.marginDefaults[side] || 0, extra),
    }
  }, [directLabel, directLabelLabelTexts, directLabelFontSize, directLabelPosition, resolved.marginDefaults])

  // Suppress legend when directLabel is active (unless explicitly overridden)
  const effectiveShowLegend = directLabel && showLegend === undefined ? false : showLegend

  // ── Shared setup (color, legend, selection, margin, loading/empty) ────
  // Owns: useColorScale, useChartSelection, useLegendInteraction, the
  // hover/legend/selection precedence merge, useChartLegendAndMargin
  // (which calls `useLinkedChartCategories` for cross-chart legend
  // coordination), useResolvedSelection, getCrosshairProps,
  // renderEmptyState/loadingState, and the push-mode legend
  // synthesis path.
  const setup = useChartSetup({
    data: effectiveData as Datum[],
    rawData: data,
    colorBy,
    colorScheme,
    legendInteraction,
    legendPosition: legendPositionProp,
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    unwrapData: false,
    onObservation,
    onClick,
    hoverHighlight,
    chartType: "LineChart",
    chartId,
    showLegend: effectiveShowLegend,
    userMargin,
    marginDefaults: directLabelMarginDefaults,
    loading,
    emptyContent,
    width,
    height,
  })

  // Aliases so the rest of the file reads naturally — the existing render
  // logic was written against locally-named bindings.
  const colorScale = setup.colorScale
  const effectiveSelectionHook = setup.effectiveSelectionHook
  const resolvedSelection = setup.resolvedSelection
  const customHoverBehavior = setup.customHoverBehavior
  const customClickBehavior = setup.customClickBehavior
  const crosshairFrameProps = setup.crosshairProps

  // Line style function
  const baseLineStyle = useMemo(() => {
    // Second arg is the group key (series name), passed by PipelineStore.resolveLineStyle
    return (d: Datum, group?: string) => {
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
  const [segmentAwareStyle, setSegmentAwareStyle] = useState<((d: Datum) => Datum) | null>(null)
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

  // Overlay top-level primitive props (stroke / strokeWidth / opacity) last.
  // Note: `lineWidth` is a LineChart-specific alias for strokeWidth that
  // predates Phase B. When both are set, the top-level `strokeWidth` wins
  // via mergeShapeStyle — consistent with "top-level primitive > chart-
  // specific" precedence.
  const lineStyleWithPrimitives = useMemo(
    () => mergeShapeStyle(effectiveLineStyle, { stroke, strokeWidth: topLevelStrokeWidth, opacity }),
    [effectiveLineStyle, stroke, topLevelStrokeWidth, opacity]
  )

  const lineStyle = useMemo(
    () => wrapStyleWithSelection(lineStyleWithPrimitives, effectiveSelectionHook, resolvedSelection),
    [lineStyleWithPrimitives, effectiveSelectionHook, resolvedSelection]
  )

  // Point style function (if showPoints is true)
  const pointStyle = useMemo(() => {
    if (!showPoints) return undefined

    return (d: Datum) => {
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

  // Direct labeling — generate full annotations at line endpoints. The
  // text-only pre-pass (`directLabelLabelTexts`) ran earlier so the margin
  // estimate could feed into useChartSetup; this pass adds the colors
  // from the resolved color scale.
  const directLabelAnnotations = useMemo(() => {
    if (!directLabel || !colorBy) return []
    const xAcc = typeof xAccessor === "function" ? xAccessor : (d: Datum) => d[xAccessor as string]
    const yAcc = typeof yAccessor === "function" ? yAccessor : (d: Datum) => d[yAccessor as string]
    const colorAcc = typeof colorBy === "function" ? colorBy : (d: Datum) => d[colorBy as string]

    // Get the endpoint of each line (by group). Mirror the null-aware
    // logic in `directLabelLabelTexts` so a `0`/`false` category value
    // still gets an annotation rather than being silently dropped.
    const groupEndpoints = new Map<string, Datum>()
    for (const line of gapProcessedLineData) {
      const coords: Datum[] = line[lineDataAccessor] || []
      if (coords.length === 0) continue
      const endpoint = directLabelPosition === "end" ? coords[coords.length - 1] : coords[0]
      const raw = colorAcc(endpoint) ?? colorAcc(line)
      if (raw == null) continue
      const label = String(raw)
      if (label !== "" && !groupEndpoints.has(label)) {
        groupEndpoints.set(label, endpoint)
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

  // `useChartSetup` now synthesizes the push-mode legend (using the
  // same provider → scheme → theme → STREAMING_PALETTE precedence the
  // marks resolve through), reserves margin for it, and registers the
  // live category domain with the parent `LinkedCharts` via
  // `useChartLegendAndMargin` → `useLinkedChartCategories`. LineChart no
  // longer layers a separate `useStreamingLegend` call on top — setup
  // owns the full legend pipeline for both bounded and push modes.
  const effectiveMargin = setup.margin

  // Default tooltip showing all configured fields. `xFormat`/`yFormat`
  // cascade from the HOC so the tooltip values read the same way as the axis.
  const groupField = lineBy || colorBy
  const defaultTooltipContent = useMemo(() => buildDefaultTooltip([
    { label: xLabel || accessorName(xAccessor), accessor: xAccessor, role: "x", format: xFormat },
    { label: yLabel || accessorName(yAccessor), accessor: yAccessor, role: "y", format: yFormat },
    ...(groupField ? [{ label: accessorName(groupField), accessor: groupField, role: "group" as const }] : []),
  ]), [xAccessor, yAccessor, xLabel, yLabel, groupField, xFormat, yFormat])

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
      return gapProcessedLineData.flatMap((line: Datum) => {
        const coords = line[lineDataAccessor] || []
        if (effectiveGroupAccessor && typeof effectiveGroupAccessor === "string") {
          return coords.map((c: Datum) => ({ ...c, [effectiveGroupAccessor]: line[effectiveGroupAccessor] }))
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
    // Explicit user yExtent wins over the auto-computed envelope; the
    // envelope only fills in when the user hasn't pinned the domain.
    ...(xExtent && { xExtent }),
    ...(yExtent ? { yExtent } : envelopeYExtent ? { yExtent: envelopeYExtent } : {}),
    groupAccessor: gapStrategy === "break" && hasGaps ? "_gapSegment" : effectiveGroupAccessor || undefined,
    curve,
    lineStyle,
    ...(showPoints && { pointStyle }),
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: effectiveMargin,
    showAxes: resolved.showAxes,
    xLabel,
    yLabel,
    xFormat,
    yFormat,
    enableHover,
    showGrid,
    // `setup.legendBehaviorProps` carries the legend slot, legend
    // interaction handlers, and the push-mode category-domain props
    // (`legendCategoryAccessor` + `onCategoriesChange`) the frame uses
    // to feed `setup.activeCategories`. Spreading it as a single block
    // replaces the previous `useStreamingLegend.categoryDomainProps`
    // wiring.
    ...setup.legendBehaviorProps,
    ...(title && { title }),
    ...(description && { description }),
    ...(summary && { summary }),
    ...(accessibleTable !== undefined && { accessibleTable }),
    ...(className && { className }),
    ...(props.animate != null && { animate: props.animate }),
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
  if (setup.earlyReturn) return setup.earlyReturn
  if (validationError) return <ChartError componentName="LineChart" message={validationError} width={width} height={height} />

  return <SafeRender componentName="LineChart" width={width} height={height}><StreamXYFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Datum = Datum>(props: LineChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
LineChart.displayName = "LineChart"
