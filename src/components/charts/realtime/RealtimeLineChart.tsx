import * as React from "react"
import {
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useState,
  useEffect,
  useMemo
} from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import { registerXYPlugin } from "../../stream/xyPlugins/registry"
import { lineXYPlugin } from "../../stream/xyPlugins/linePlugin"
import type {
  LineStyle,
  HoverData,
  StreamXYFrameHandle
} from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import {
  useChartLegendAndMargin,
  useChartSelection,
  useLegendInteraction
} from "../shared/hooks"
import { buildDefaultRealtimeTooltip } from "./defaultRealtimeTooltip"
import {
  renderLoadingState,
  renderEmptyState
} from "../shared/withChartWrapper"
import { resolveRealtimeWindowSize } from "./resolveWindowSize"
import type { Datum } from "../shared/datumTypes"
import { RealtimeAccumulator, AGG_SERIES } from "./RealtimeAccumulator"
import type { ReorderBuffer } from "../../realtime/ReorderBuffer"
import {
  type AggregateConfig,
  type AggregatedRealtimeDatum,
  hasBand,
  AGG_TIME,
  AGG_VALUE,
  AGG_LOWER,
  AGG_UPPER
} from "./aggregate"
import { type EventTimeConfig, createReorderBuffer } from "./eventTime"
import { buildCustomBehaviorProps } from "../shared/streamPropsHelpers"
import {
  MultiPointTooltip,
  resolveMultiCapableTooltip
} from "../../Tooltip/Tooltip"
import type { LegendValue } from "../../types/legendTypes"
import {
  type RealtimeLineChartHandle,
  type RealtimeLineChartProps
} from "./RealtimeLineChart.types"

import {
  buildRealtimeFrameChromeProps,
  readRealtimeNumber,
  useRealtimeChartMode,
  useRealtimeSelectionStyle
} from "./realtimeChartRuntime"
import { mergeShapeStyle } from "../shared/mergeShapeStyle"
import {
  composeStyleRules,
  makeXYRuleContext
} from "../shared/styleRules"

export type { RealtimeLineChartHandle, RealtimeLineChartProps }

registerXYPlugin(lineXYPlugin)

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
export const RealtimeLineChart = forwardRef(function RealtimeLineChart<
  TDatum extends Datum = Datum
>(
  props: RealtimeLineChartProps<TDatum>,
  ref: React.Ref<RealtimeFrameHandle<TDatum, Datum>>
) {
  const resolved = useRealtimeChartMode(props)

  const {
    size,
    margin: userMargin,
    className,
    arrowOfTime = "right",
    windowMode: windowModeProp,
    capacityMode,
    windowSize: windowSizeProp,
    capacity,
    seriesAccessor,
    data,
    timeAccessor,
    valueAccessor,
    timeExtent,
    valueExtent,
    extentPadding,
    stroke: strokeProp,
    strokeWidth: strokeWidthProp,
    strokeDasharray,
    opacity,
    cursor,
    styleRules,
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
    eventTime
  } = props

  const showAxes = resolved.showAxes
  const enableHover = resolved.enableHover
  const resolvedSize: [number, number] = size ?? [
    resolved.width,
    resolved.height
  ]
  const stroke = strokeProp ?? "#007bff"
  const strokeWidth = strokeWidthProp ?? 2
  const seriesLabel =
    typeof valueAccessor === "string" ? valueAccessor : "Value"
  const lineLegend = useMemo<LegendValue | undefined>(() => {
    if (!resolved.showLegend) return undefined
    return {
      legendGroups: [
        {
          label: "Series",
          type: "line",
          items: [{ label: seriesLabel, color: stroke }],
          styleFn: (item) => ({
            stroke: item.color || "var(--semiotic-primary, #007bff)",
            strokeWidth: strokeWidth ?? 2
          })
        }
      ]
    }
  }, [resolved.showLegend, seriesLabel, stroke, strokeWidth])
  const legendState = useLegendInteraction(
    props.legendInteraction,
    () => seriesLabel,
    [seriesLabel]
  )
  const { legend, margin, legendPosition } = useChartLegendAndMargin({
    data: [],
    colorBy: undefined,
    colorScale: undefined,
    showLegend: false,
    legendPosition: legendPositionProp,
    userMargin,
    defaults: resolved.marginDefaults,
    additionalLegend: lineLegend,
    chartWidth: resolvedSize[0],
    chartHeight: resolvedSize[1],
    axisChrome: { hasAxis: resolved.showAxes !== false }
  })
  // Accessor-aware default tooltip — reads data-space `time` /
  // `value` fields off `hover.data` so the user sees real values
  // out of the box. See `buildDefaultRealtimeTooltip` for shape.
  const defaultTooltipContent = buildDefaultRealtimeTooltip({
    timeAccessor,
    valueAccessor
  })
  const multiPointTooltip = MultiPointTooltip()
  const tooltipProps = resolveMultiCapableTooltip({
    tooltip,
    defaultTooltipContent,
    customFunctionContext: "hover",
    // RealtimeLineChart currently has one value channel. Give its otherwise
    // unnamed line a useful label while retaining the shared multi renderer.
    multiDefaultContent: (hover: Datum) =>
      multiPointTooltip({
        ...hover,
        allSeries: Array.isArray(hover.allSeries)
          ? hover.allSeries.map((hit: Record<string, unknown>) => ({
              ...hit,
              group:
                hit.group ||
                (typeof valueAccessor === "string" ? valueAccessor : "value")
            }))
          : hover.allSeries
      })
  })
  const resolvedTooltip = tooltipContent ?? tooltipProps.tooltipContent

  const frameRef = useRef<StreamXYFrameHandle>(null)

  // ── Linked hover via shared hook ──
  const {
    activeSelectionHook,
    customHoverBehavior: linkedHoverBehavior,
    customClickBehavior
  } = useChartSelection({
    selection,
    linkedHover,
    unwrapData: true,
    onObservation,
    chartType: "RealtimeLineChart",
    chartId,
    mobileInteraction: resolved.mobileInteraction
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
  const [aggRows, setAggRows] = useState<AggregatedRealtimeDatum[]>([])
  const accRef = useRef<RealtimeAccumulator | null>(null)
  const aggConfigRef = useRef<AggregateConfig | undefined>(aggregate)
  aggConfigRef.current = aggregate
  const aggEnabledRef = useRef(aggEnabled)
  aggEnabledRef.current = aggEnabled
  const aggRowsRef = useRef<AggregatedRealtimeDatum[]>(aggRows)
  aggRowsRef.current = aggRows
  const accessorsRef = useRef({ timeAccessor, valueAccessor })
  accessorsRef.current = { timeAccessor, valueAccessor }

  // Identity key for the structural config — rebuilding the accumulator is
  // only required when the windowing itself changes (not stat/band/sigma,
  // which are re-derived on emit). Percentiles and distinct own extra
  // per-bucket state, so they are structural too.
  const aggKey = aggEnabled
    ? [
        aggregate!.window ?? "tumbling",
        aggregate!.size,
        aggregate!.hop ?? "",
        aggregate!.gap ?? "",
        aggregate!.retain ?? "",
        (aggregate!.percentiles ?? []).join(","),
        aggregate!.distinct === true ? "1" : "0"
      ].join("|")
    : ""

  // (Re)build the accumulator and seed it from any initial `data` array.
  useEffect(() => {
    if (!aggEnabled) {
      accRef.current = null
      return
    }
    const cfg = aggConfigRef.current!
    // `retain` is the sole retention control for aggregate mode — leaving it
    // unset means unbounded windows, matching AggregateConfig's documented
    // default. (Deliberately not coupled to `windowSize`, which is the
    // ring-buffer eviction policy and does not apply to aggregated output.)
    const acc = new RealtimeAccumulator(cfg, seriesAccessor)
    accRef.current = acc
    if (data) {
      const { timeAccessor: ta, valueAccessor: va } = accessorsRef.current
      for (const d of data) {
        acc.push(d, ta, va)
      }
    }
    setAggRows(acc.emit(cfg))
  }, [aggKey, aggEnabled, data, timeAccessor, valueAccessor, seriesAccessor])

  // Re-emit (without rebuilding) when only the readout config changes.
  useEffect(() => {
    if (aggEnabled && accRef.current) {
      setAggRows(accRef.current.emit(aggConfigRef.current!))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aggregate?.stat, aggregate?.band, aggregate?.sigma])

  const ingestAgg = useCallback((points: Datum[]) => {
    const acc = accRef.current
    const cfg = aggConfigRef.current
    if (!acc || !cfg) return
    const { timeAccessor: ta, valueAccessor: va } = accessorsRef.current
    for (const p of points) {
      acc.push(p, ta, va)
    }
    setAggRows(acc.emit(cfg))
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

  // Route released (in-order) events to the aggregator or the frame.
  const routeReleased = useCallback(
    (points: Datum[]) => {
      if (points.length === 0) return
      if (aggEnabledRef.current) ingestAgg(points)
      else frameRef.current?.pushMany(points)
    },
    [ingestAgg]
  )

  useEffect(() => {
    // A live config/accessor transition is an asserted ordering boundary:
    // release the old grace-window tail before installing the new policy.
    // This runs only in the effect body, not cleanup, so unmount never queues
    // a frame push or aggregate state update.
    const previous = reorderRef.current
    if (previous) routeReleased(previous.flush())

    if (!eventTimeEnabled) {
      reorderRef.current = null
      return
    }
    // Capture the accessor used for this buffer. If it changes, the effect
    // above flushes held rows using their original event-time interpretation
    // before the replacement starts accepting rows under the new accessor.
    const eventAccessor = timeAccessor
    reorderRef.current = createReorderBuffer(
      eventTimeRef.current!,
      (d) => readRealtimeNumber(d, eventAccessor, "time") ?? NaN
    )
  }, [etKey, eventTimeEnabled, routeReleased, timeAccessor])

  // Unified ingest: reorder through the grace window (if enabled), emit
  // late-data observations, then route the released events.
  const ingestPoints = useCallback(
    (points: Datum[]) => {
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
                eventTime: readRealtimeNumber(lp, ta, "time") ?? NaN,
                watermark: rb.watermark,
                policy,
                lateCount: rb.lateCount,
                timestamp: Date.now(),
                chartType: "RealtimeLineChart",
                chartId: chartIdRef.current
              })
            }
          }
        }
      }
      routeReleased(released)
    },
    [routeReleased]
  )

  const flushEventTime = useCallback(() => {
    const rb = reorderRef.current
    if (!eventTimeEnabledRef.current || !rb) return
    routeReleased(rb.flush())
  }, [routeReleased])

  // Keep the public handle stable while tracking both live ingest paths.
  useImperativeHandle<
    RealtimeFrameHandle<TDatum, Datum>,
    RealtimeLineChartHandle<TDatum, Datum>
  >(
    ref,
    () => ({
      push: (point) => ingestPoints([point]),
      pushMany: (points) => ingestPoints(points),
      flush: flushEventTime,
      remove: (id) =>
        aggEnabledRef.current ? [] : (frameRef.current?.remove(id) ?? []),
      update: (id, updater) =>
        aggEnabledRef.current
          ? []
          : (frameRef.current?.update(id, updater) ?? []),
      clear: () => {
        reorderRef.current?.clear()
        if (aggEnabledRef.current) {
          accRef.current?.clear()
          setAggRows([])
        } else {
          frameRef.current?.clear()
        }
      },
      getData: () =>
        aggEnabledRef.current
          ? aggRowsRef.current
          : (frameRef.current?.getData() ?? []),
      getScales: () => frameRef.current?.getScales() ?? null
    }),
    [flushEventTime, ingestPoints]
  )

  // ── Loading / empty states (computed early, returned after all hooks) ───
  const loadingEl = renderLoadingState(
    loading,
    resolvedSize[0],
    resolvedSize[1],
    loadingContent
  )
  // In aggregate mode the chart is push-driven (data arrives via ref), so
  // skip the static empty state just as a plain streaming chart does.
  const emptyEl = !loadingEl
    ? renderEmptyState(
        aggEnabled ? undefined : data,
        resolvedSize[0],
        resolvedSize[1],
        emptyContent
      )
    : null

  const baseLineStyle = useMemo(
    () => () => ({ stroke: "#007bff", strokeWidth: 2 }) as LineStyle,
    []
  )
  const lineRuleContext = useMemo(
    () =>
      makeXYRuleContext(
        aggEnabled
          ? AGG_TIME
          : ((timeAccessor ?? "time") as string | ((d: Datum) => unknown)),
        aggEnabled
          ? AGG_VALUE
          : ((valueAccessor ?? "value") as string | ((d: Datum) => unknown))
      ),
    [aggEnabled, timeAccessor, valueAccessor]
  )
  const ruledLineStyle = useMemo(
    () => composeStyleRules(baseLineStyle, styleRules, lineRuleContext),
    [baseLineStyle, styleRules, lineRuleContext]
  )
  const lineStyleWithPrimitives = useMemo(() => {
    const primitiveStyle = mergeShapeStyle(ruledLineStyle, {
      stroke: strokeProp,
      strokeWidth: strokeWidthProp,
      opacity
    })
    return (datum: Datum) => ({
      ...primitiveStyle(datum),
      ...(strokeDasharray != null && { strokeDasharray }),
      ...(cursor != null && { cursor })
    })
  }, [ruledLineStyle, strokeProp, strokeWidthProp, opacity, strokeDasharray, cursor])
  const interactiveLineStyle = useRealtimeSelectionStyle(
    lineStyleWithPrimitives,
    [activeSelectionHook],
    selection
  )

  const windowMode = windowModeProp ?? capacityMode ?? "sliding"
  const windowSize = resolveRealtimeWindowSize(windowSizeProp, data, capacity)

  const resolvedClassName = emphasis
    ? `${className || ""} semiotic-emphasis-${emphasis}`.trim()
    : className

  // ── Resolve frame inputs: aggregated rows replace the raw stream ────────
  const frameData = aggEnabled ? aggRows : data
  const frameTimeAccessor = aggEnabled ? AGG_TIME : timeAccessor
  const frameValueAccessor = aggEnabled ? AGG_VALUE : valueAccessor
  // Controlled aggregated data is re-passed whole each render — no eviction.
  const frameWindowMode = aggEnabled ? "growing" : windowMode
  // Display capacity for the controlled aggregated rows — large enough to
  // hold every retained window (or the current row count when unbounded).
  const aggCapacity = aggregate?.retain ?? Math.max(aggRows.length, 600)
  const frameWindowSize = aggEnabled ? Math.max(1, aggCapacity) : windowSize
  const frameBand =
    aggEnabled && aggregate && hasBand(aggregate)
      ? { y0Accessor: AGG_LOWER, y1Accessor: AGG_UPPER, perSeries: seriesAccessor != null }
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
      maxDevicePixelRatio={props.maxDevicePixelRatio}
      margin={margin}
      className={resolvedClassName}
      {...buildRealtimeFrameChromeProps(
        resolved,
        legendState,
        props.legendInteraction
      )}
      arrowOfTime={arrowOfTime}
      windowMode={frameWindowMode}
      windowSize={frameWindowSize}
      data={frameData}
      timeAccessor={frameTimeAccessor}
      valueAccessor={frameValueAccessor}
      groupAccessor={aggEnabled && seriesAccessor != null ? AGG_SERIES : seriesAccessor}
      xExtent={timeExtent}
      yExtent={valueExtent}
      extentPadding={extentPadding}
      band={frameBand}
      lineStyle={interactiveLineStyle ?? lineStyleWithPrimitives}
      showAxes={showAxes}
      background={background}
      hoverAnnotation={enableHover}
      tooltipContent={resolvedTooltip}
      tooltipMode={tooltipProps.tooltipMode}
      {...buildCustomBehaviorProps({
        linkedHover,
        selection,
        onObservation,
        forceHoverBehavior: true,
        mobileInteraction: resolved.mobileInteraction,
        customHoverBehavior: combinedHoverBehavior as (d: Datum | null) => void,
        customClickBehavior
      })}
      annotations={annotations}
      legend={legend}
      legendPosition={legendPosition}
      autoPlaceAnnotations={autoPlaceAnnotations}
      svgAnnotationRules={svgAnnotationRules}
      tickFormatTime={tickFormatTime}
      tickFormatValue={tickFormatValue}
      decay={decay}
      pulse={pulse}
      staleness={staleness}
      transition={transition}
      pointIdAccessor={props.pointIdAccessor}
    />
  )
}) as unknown as {
  /** Compatibility overload for refs authored against the shared 3.x handle. */
  <TDatum extends Datum = Datum>(
    props: RealtimeLineChartProps<TDatum> &
      React.RefAttributes<RealtimeFrameHandle>
  ): React.ReactElement | null
  /** Aggregate mode accepts authored rows but materializes window summaries. */
  <TDatum extends Datum = Datum>(
    props: Omit<RealtimeLineChartProps<TDatum>, "aggregate"> & {
      aggregate: AggregateConfig
    } & React.RefAttributes<
        RealtimeLineChartHandle<TDatum, AggregatedRealtimeDatum>
      >
  ): React.ReactElement | null
  /** Typed non-aggregate refs retain the authored row and expose flush(). */
  <TDatum extends Datum = Datum>(
    props: Omit<RealtimeLineChartProps<TDatum>, "aggregate"> & {
      aggregate?: undefined
    } & React.RefAttributes<RealtimeLineChartHandle<TDatum>>
  ): React.ReactElement | null
  displayName?: string
}
RealtimeLineChart.displayName = "RealtimeLineChart"
