import * as React from "react"
import { useRef, useImperativeHandle, forwardRef, useCallback, useState, useEffect } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type {
  ArrowOfTime,
  WindowMode,
  LineStyle,
  HoverAnnotationConfig,
  HoverData,
  AnnotationContext,
  StreamXYFrameHandle,
  DecayConfig,
  PulseConfig,
  StalenessConfig,
  TransitionConfig
} from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { ReactNode } from "react"
import { useChartSelection, useChartMode } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import type { ChartMode, ChartAccessor, SelectionConfig } from "../shared/types"
import type { OnObservationCallback } from "../../store/ObservationStore"
import { buildDefaultRealtimeTooltip } from "./defaultRealtimeTooltip"
import { renderLoadingState, renderEmptyState } from "../shared/withChartWrapper"
import { resolveRealtimeWindowSize } from "./resolveWindowSize"
import type { Datum } from "../shared/datumTypes"
import type { AutoPlaceAnnotations } from "../../recipes/annotationLayout"
import type { WindowAccumulator } from "../../realtime/WindowAccumulator"
import type { ReorderBuffer } from "../../realtime/ReorderBuffer"
import {
  type AggregateConfig,
  createAccumulator,
  aggregatedRows,
  hasBand,
  AGG_TIME,
  AGG_VALUE,
  AGG_LOWER,
  AGG_UPPER,
} from "./aggregate"
import { type EventTimeConfig, createReorderBuffer } from "./eventTime"

/** Read a numeric time/value off a datum via accessor, with a field-name fallback. */
function readNum<TDatum extends Datum>(
  datum: TDatum,
  accessor: ChartAccessor<TDatum, number> | undefined,
  fallback: string
): number | null {
  const raw: unknown =
    typeof accessor === "function" ? accessor(datum) : datum[(accessor ?? fallback) as keyof TDatum]
  if (raw == null) return null
  if (raw instanceof Date) return raw.getTime()
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

export interface RealtimeLineChartProps<TDatum extends Datum = Datum> {
  /** Display mode: "primary" (full chrome), "context" (compact), "sparkline" (inline) */
  mode?: ChartMode
  /** Chart dimensions as [width, height] */
  size?: [number, number]
  /** Chart width (alternative to size) */
  width?: number
  /** Chart height (alternative to size) */
  height?: number
  /** Chart margins */
  margin?: { top?: number; right?: number; bottom?: number; left?: number }
  /** CSS class name */
  className?: string
  onObservation?: OnObservationCallback
  chartId?: string
  /** Direction time flows */
  arrowOfTime?: ArrowOfTime
  /** Data retention strategy */
  windowMode?: WindowMode
  /** Ring buffer capacity */
  windowSize?: number
  /** Controlled data array */
  data?: Datum[]
  /** Time value accessor */
  timeAccessor?: ChartAccessor<TDatum, number>
  /** Value accessor */
  valueAccessor?: ChartAccessor<TDatum, number>
  /** Fixed time domain */
  timeExtent?: [number, number]
  /** Fixed value domain */
  valueExtent?: [number, number]
  /** Extent padding factor */
  extentPadding?: number
  /** Line color */
  stroke?: string
  /** Line width */
  strokeWidth?: number
  /** Dash pattern (e.g. "4,2") */
  strokeDasharray?: string
  /** Uniform line opacity (0–1). Pairs with `stroke` / `strokeWidth` for the designer-facing primitive vocabulary. */
  opacity?: number
  /** Show canvas-drawn axes */
  showAxes?: boolean
  /** Background fill color */
  background?: string
  /** Enable hover interaction */
  enableHover?: boolean | HoverAnnotationConfig
  /** Custom tooltip renderer */
  tooltipContent?: (d: HoverData) => ReactNode
  /** Callback on hover */
  onHover?: (d: HoverData | null) => void
  /** Annotation objects */
  annotations?: Datum[]
  /** Opt into automatic placement for note-like annotations without manual offsets. */
  autoPlaceAnnotations?: AutoPlaceAnnotations
  /** SVG annotation render function */
  svgAnnotationRules?: (annotation: Datum, index: number, context: AnnotationContext) => ReactNode
  /** Custom formatter for time axis ticks */
  tickFormatTime?: (value: number) => string
  /** Custom formatter for value axis ticks */
  tickFormatValue?: (value: number) => string
  /** Custom tooltip renderer (alias for tooltipContent) */
  tooltip?: (d: HoverData) => ReactNode
  /** Configurable opacity decay for older data */
  decay?: DecayConfig
  /** Flash effect on newly inserted data */
  pulse?: PulseConfig
  /** Frame-level data liveness indicator */
  staleness?: StalenessConfig
  /** Smooth position interpolation on data change */
  transition?: TransitionConfig
  /** Enable linked hover selection events for cross-chart highlighting */
  linkedHover?: boolean | string | { name?: string; fields: string[] }
  /** Consume a named selection — dims unselected elements */
  selection?: SelectionConfig
  /** Show a loading skeleton placeholder */
  loading?: boolean
  /** Custom content rendered in place of the default skeleton while `loading` is true. */
  loadingContent?: React.ReactNode | false
  /** Custom content to render when data is empty. Set to `false` to disable empty state. */
  emptyContent?: ReactNode | false
  /** Visual emphasis level for dashboard hierarchy. "primary" spans two columns in ChartGrid. */
  emphasis?: "primary" | "secondary"
  /** Show a legend */
  showLegend?: boolean
  /** Legend position */
  legendPosition?: LegendPosition
  /** Legend interaction mode */
  legendInteraction?: LegendInteractionMode
  /** ID accessor for remove()/update() on the push API */
  pointIdAccessor?: string | ((d: Datum) => string)
  /**
   * Opt-in windowed aggregation over event-time. When set, pushed
   * events are reduced into tumbling/hopping/session windows and the
   * chart draws one mark per window (mean/sum/min/max/count) plus an
   * optional ±σ or min–max band — render cost scales with the number of
   * visible windows, not the arrival rate. This is the **aggregation
   * window**, distinct from `windowMode`'s RingBuffer eviction.
   */
  aggregate?: AggregateConfig
  /**
   * Opt-in event-time ingestion. Buffers pushed events for a bounded
   * lateness/grace window and releases them to the chart in event-time
   * order, so out-of-order or merged multi-source streams render
   * monotonically instead of zigzagging. Late events (older than
   * `watermark − lateness`) are dropped or kept per policy and surfaced
   * via `onObservation` as `"late-data"`. Default-off; when unset the
   * push path is byte-for-byte unchanged.
   */
  eventTime?: EventTimeConfig
}

/**
 * RealtimeLineChart - Simplified wrapper for streaming line charts.
 *
 * Wraps StreamXYFrame with `chartType="line"` and `runtimeMode="streaming"`,
 * exposing stroke/strokeWidth as top-level props instead of requiring a `lineStyle` object.
 *
 * @example
 * ```tsx
 * // Single streaming series — push each datum, the chart slides
 * const ref = useRef<RealtimeFrameHandle>(null)
 * useEffect(() => {
 *   const id = setInterval(() => ref.current?.push({ time: Date.now(), value: Math.random() }), 100)
 *   return () => clearInterval(id)
 * }, [])
 * return (
 *   <RealtimeLineChart
 *     ref={ref}
 *     stroke="#007bff"
 *     strokeWidth={2}
 *     windowSize={200}
 *     enableHover
 *   />
 * )
 * ```
 *
 * @example
 * ```tsx
 * // Decay + pulse — older points fade, newly-pushed points flash
 * <RealtimeLineChart
 *   ref={ref}
 *   timeAccessor="t"
 *   valueAccessor="v"
 *   stroke="#0b5fff"
 *   strokeWidth={2}
 *   decay={{ type: "linear" }}
 *   pulse={{ type: "fade", durationMs: 400 }}
 *   windowSize={500}
 * />
 * ```
 */
export const RealtimeLineChart = forwardRef(
  function RealtimeLineChart<TDatum extends Datum = Datum>(props: RealtimeLineChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
    const resolved = useChartMode(props.mode, {
      width: props.size?.[0] ?? props.width,
      height: props.size?.[1] ?? props.height,
      enableHover: props.enableHover != null ? !!props.enableHover : undefined,
    })

    const {
      size,
      margin: userMargin,
      className,
      arrowOfTime = "right",
      windowMode = "sliding",
      windowSize: windowSizeProp,
      data,
      timeAccessor,
      valueAccessor,
      timeExtent,
      valueExtent,
      extentPadding,
      stroke = "#007bff",
      strokeWidth = 2,
      strokeDasharray,
      opacity,
      background,
      tooltipContent,
      tooltip,
      onHover,
      annotations,
      autoPlaceAnnotations,
      svgAnnotationRules,
      tickFormatTime,
      tickFormatValue,
      decay,
      pulse,
      staleness,
      transition,
      linkedHover,
      selection,
      onObservation,
      chartId,
      loading,
      loadingContent,
      emptyContent,
      emphasis,
      legendPosition: legendPositionProp,
      aggregate,
      eventTime,
    } = props

    const showAxes = resolved.showAxes
    const enableHover = resolved.enableHover
    const margin = userMargin ?? resolved.marginDefaults
    const resolvedSize: [number, number] = size ?? [resolved.width, resolved.height]
    // Accessor-aware default tooltip — reads data-space `time` /
    // `value` fields off `hover.data` so the user sees real values
    // out of the box. See `buildDefaultRealtimeTooltip` for shape.
    const resolvedTooltip =
      tooltipContent ?? tooltip ?? buildDefaultRealtimeTooltip({ timeAccessor, valueAccessor })

    const frameRef = useRef<StreamXYFrameHandle>(null)

    // ── Linked hover via shared hook ──
    const { customHoverBehavior: linkedHoverBehavior } = useChartSelection({
      selection, linkedHover, unwrapData: true,
      onObservation, chartType: "RealtimeLineChart", chartId
    })

    const combinedHoverBehavior = useCallback(
      (d: HoverData | null) => {
        if (onHover) onHover(d)
        linkedHoverBehavior(d)
      },
      [onHover, linkedHoverBehavior]
    )

    // ── Windowed aggregation (opt-in) ──────────────────────────────────────
    // When `aggregate` is set the HOC owns a WindowAccumulator and feeds the
    // frame a controlled, bounded array of per-window rows instead of the raw
    // stream. Refs keep the imperative handle referentially stable while still
    // reaching live config/accessors.
    const aggEnabled = aggregate != null
    const [aggRows, setAggRows] = useState<Datum[]>([])
    const accRef = useRef<WindowAccumulator | null>(null)
    const aggConfigRef = useRef<AggregateConfig | undefined>(aggregate)
    aggConfigRef.current = aggregate
    const aggEnabledRef = useRef(aggEnabled)
    aggEnabledRef.current = aggEnabled
    const aggRowsRef = useRef<Datum[]>(aggRows)
    aggRowsRef.current = aggRows
    const accessorsRef = useRef({ timeAccessor, valueAccessor })
    accessorsRef.current = { timeAccessor, valueAccessor }

    // Identity key for the structural config — rebuilding the accumulator is
    // only required when the windowing itself changes (not stat/band/sigma,
    // which are re-derived on emit).
    const aggKey = aggEnabled
      ? [aggregate!.window ?? "tumbling", aggregate!.size, aggregate!.hop ?? "",
         aggregate!.gap ?? "", aggregate!.retain ?? ""].join("|")
      : ""

    // (Re)build the accumulator and seed it from any initial `data` array.
    useEffect(() => {
      if (!aggEnabled) {
        accRef.current = null
        return
      }
      const cfg = aggConfigRef.current!
      const acc = createAccumulator({ ...cfg, retain: cfg.retain ?? windowSizeProp })
      accRef.current = acc
      if (acc && data) {
        const { timeAccessor: ta, valueAccessor: va } = accessorsRef.current
        for (const d of data) {
          const t = readNum(d, ta, "time")
          const v = readNum(d, va, "value")
          if (t != null && v != null) acc.push(t, v)
        }
      }
      setAggRows(acc ? aggregatedRows(acc, cfg) : [])
    }, [aggKey, aggEnabled, data, windowSizeProp])

    // Re-emit (without rebuilding) when only the readout config changes.
    useEffect(() => {
      if (aggEnabled && accRef.current) {
        setAggRows(aggregatedRows(accRef.current, aggConfigRef.current!))
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [aggregate?.stat, aggregate?.band, aggregate?.sigma])

    const ingestAgg = useCallback((points: Datum[]) => {
      const acc = accRef.current
      const cfg = aggConfigRef.current
      if (!acc || !cfg) return
      const { timeAccessor: ta, valueAccessor: va } = accessorsRef.current
      for (const p of points) {
        const t = readNum(p, ta, "time")
        const v = readNum(p, va, "value")
        if (t != null && v != null) acc.push(t, v)
      }
      setAggRows(aggregatedRows(acc, cfg))
    }, [])

    // ── Event-time ingestion (opt-in) ──────────────────────────────────────
    const eventTimeEnabled = eventTime != null
    const reorderRef = useRef<ReorderBuffer<Datum> | null>(null)
    const eventTimeRef = useRef<EventTimeConfig | undefined>(eventTime)
    eventTimeRef.current = eventTime
    const eventTimeEnabledRef = useRef(eventTimeEnabled)
    eventTimeEnabledRef.current = eventTimeEnabled
    const onObservationRef = useRef(onObservation)
    onObservationRef.current = onObservation
    const chartIdRef = useRef(chartId)
    chartIdRef.current = chartId

    const etKey = eventTimeEnabled
      ? `${eventTime!.lateness}|${eventTime!.latePolicy ?? "drop"}`
      : ""
    useEffect(() => {
      if (!eventTimeEnabled) {
        reorderRef.current = null
        return
      }
      const { timeAccessor: ta } = accessorsRef.current
      reorderRef.current = createReorderBuffer(
        eventTimeRef.current!,
        (d) => readNum(d, ta, "time") ?? NaN
      )
    }, [etKey, eventTimeEnabled])

    // Route released (in-order) events to the aggregator or the frame.
    const routeReleased = useCallback((points: Datum[]) => {
      if (points.length === 0) return
      if (aggEnabledRef.current) ingestAgg(points)
      else frameRef.current?.pushMany(points)
    }, [ingestAgg])

    // Unified ingest: reorder through the grace window (if enabled), emit
    // late-data observations, then route the released events.
    const ingestPoints = useCallback((points: Datum[]) => {
      const rb = reorderRef.current
      if (!eventTimeEnabledRef.current || !rb) {
        routeReleased(points)
        return
      }
      const released: Datum[] = []
      for (const p of points) {
        const res = rb.push(p)
        if (res.released.length) released.push(...res.released)
        if (res.late.length) {
          const cb = onObservationRef.current
          if (cb) {
            const { timeAccessor: ta } = accessorsRef.current
            const policy = eventTimeRef.current?.latePolicy ?? "drop"
            for (const lp of res.late) {
              cb({
                type: "late-data",
                datum: lp,
                eventTime: readNum(lp, ta, "time") ?? NaN,
                watermark: rb.watermark,
                policy,
                lateCount: rb.lateCount,
                timestamp: Date.now(),
                chartType: "RealtimeLineChart",
                chartId: chartIdRef.current,
              })
            }
          }
        }
      }
      routeReleased(released)
    }, [routeReleased])

    // `[ingestPoints]` so the handle tracks the stable ingest path.
    useImperativeHandle(ref, () => ({
      push: (point) => ingestPoints([point]),
      pushMany: (points) => ingestPoints(points),
      remove: (id) => (aggEnabledRef.current ? [] : frameRef.current?.remove(id) ?? []),
      update: (id, updater) =>
        aggEnabledRef.current ? [] : frameRef.current?.update(id, updater) ?? [],
      clear: () => {
        reorderRef.current?.clear()
        if (aggEnabledRef.current) {
          accRef.current?.clear()
          setAggRows([])
        } else {
          frameRef.current?.clear()
        }
      },
      getData: () => (aggEnabledRef.current ? aggRowsRef.current : frameRef.current?.getData() ?? []),
      getScales: () => frameRef.current?.getScales() ?? null
    }), [ingestPoints])

    // ── Loading / empty states (computed early, returned after all hooks) ───
    const loadingEl = renderLoadingState(loading, resolvedSize[0], resolvedSize[1], loadingContent)
    // In aggregate mode the chart is push-driven (data arrives via ref), so
    // skip the static empty state just as a plain streaming chart does.
    const emptyEl = !loadingEl
      ? renderEmptyState(aggEnabled ? undefined : data, resolvedSize[0], resolvedSize[1], emptyContent)
      : null

    const lineStyle: LineStyle = { stroke, strokeWidth, strokeDasharray }
    if (opacity != null) lineStyle.opacity = opacity

    const windowSize = resolveRealtimeWindowSize(windowSizeProp, data)

    const resolvedClassName = emphasis
      ? `${className || ""} semiotic-emphasis-${emphasis}`.trim()
      : className

    // ── Resolve frame inputs: aggregated rows replace the raw stream ────────
    const frameData = aggEnabled ? aggRows : data
    const frameTimeAccessor = aggEnabled ? AGG_TIME : timeAccessor
    const frameValueAccessor = aggEnabled ? AGG_VALUE : valueAccessor
    // Controlled aggregated data is re-passed whole each render — no eviction.
    const frameWindowMode = aggEnabled ? "growing" : windowMode
    const aggCapacity = aggregate?.retain ?? windowSizeProp ?? 600
    const frameWindowSize = aggEnabled ? Math.max(1, aggCapacity) : windowSize
    const frameBand =
      aggEnabled && aggregate && hasBand(aggregate)
        ? { y0Accessor: AGG_LOWER, y1Accessor: AGG_UPPER, perSeries: false }
        : undefined

    // ── Loading / empty guards (deferred to after all hooks) ───────────────
    if (loadingEl) return loadingEl
    if (emptyEl) return emptyEl

    return (
      <StreamXYFrame
        ref={frameRef}
        chartType="line"
        runtimeMode="streaming"
        size={resolvedSize}
        margin={margin}
        className={resolvedClassName}
        arrowOfTime={arrowOfTime}
        windowMode={frameWindowMode}
        windowSize={frameWindowSize}
        data={frameData}
        timeAccessor={frameTimeAccessor}
        valueAccessor={frameValueAccessor}
        xExtent={timeExtent}
        yExtent={valueExtent}
        extentPadding={extentPadding}
        band={frameBand}
        lineStyle={lineStyle}
        showAxes={showAxes}
        background={background}
        hoverAnnotation={enableHover}
        tooltipContent={resolvedTooltip}
        customHoverBehavior={combinedHoverBehavior}
        annotations={annotations}
        autoPlaceAnnotations={autoPlaceAnnotations}
        svgAnnotationRules={svgAnnotationRules}
        tickFormatTime={tickFormatTime}
        tickFormatValue={tickFormatValue}
        decay={decay}
        pulse={pulse}
        staleness={staleness}
        transition={transition}
        pointIdAccessor={props.pointIdAccessor}
        legendPosition={legendPositionProp}
      />
    )
  }
) as unknown as {
  <TDatum extends Datum = Datum>(props: RealtimeLineChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
RealtimeLineChart.displayName = "RealtimeLineChart"
