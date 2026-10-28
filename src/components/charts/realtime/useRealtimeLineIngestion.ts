"use client"
import {
  useRef,
  useCallback,
  useState,
  useEffect,
  useLayoutEffect,
  useImperativeHandle
} from "react"
import type { Ref, RefObject } from "react"
import type { Datum } from "../shared/datumTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { StreamXYFrameHandle } from "../../stream/types"
import type {
  RealtimeLineChartProps,
  RealtimeLineChartHandle
} from "./RealtimeLineChart.types"
import { RealtimeAccumulator } from "./RealtimeAccumulator"
import type { ReorderBuffer } from "../../realtime/ReorderBuffer"
import type { AggregateConfig, AggregatedRealtimeDatum } from "./aggregate"
import { createReorderBuffer, type EventTimeConfig } from "./eventTime"
import { readRealtimeTime } from "./realtimeAccessors"

type IngestionOptions<TDatum extends Datum> = Pick<
  RealtimeLineChartProps<TDatum>,
  | "aggregate"
  | "eventTime"
  | "data"
  | "timeAccessor"
  | "valueAccessor"
  | "seriesAccessor"
  | "onObservation"
  | "chartId"
>

/** Owns bounded aggregate publication and optional event-time ingestion. */
export function useRealtimeLineIngestion<TDatum extends Datum>(
  ref: Ref<RealtimeFrameHandle<TDatum, Datum>>,
  frameRef: RefObject<StreamXYFrameHandle | null>,
  windowSize: number,
  {
    aggregate,
    eventTime,
    data,
    timeAccessor,
    valueAccessor,
    seriesAccessor,
    onObservation,
    chartId
  }: IngestionOptions<TDatum>
) {
  const aggEnabled = aggregate != null
  const [aggRows, setAggRows] = useState<AggregatedRealtimeDatum[]>([])
  const accRef = useRef<RealtimeAccumulator | null>(null)
  const aggConfigRef = useRef<AggregateConfig | undefined>(aggregate)
  const aggEnabledRef = useRef(aggEnabled)
  const aggRowsRef = useRef<AggregatedRealtimeDatum[]>(aggRows)
  const publishAggRows = useCallback((rows: AggregatedRealtimeDatum[]) => {
    // Imperative readers observe ingestion immediately, even while React
    // batches the corresponding render with other updates.
    aggRowsRef.current = rows
    setAggRows((previous) =>
      previous.length === rows.length &&
      rows.every((row, i) => row === previous[i])
        ? previous
        : rows
    )
  }, [])
  const accessorsRef = useRef({ timeAccessor, valueAccessor })
  const retentionRef = useRef(windowSize)
  useLayoutEffect(() => {
    aggConfigRef.current = aggregate
    aggEnabledRef.current = aggEnabled
    accessorsRef.current = { timeAccessor, valueAccessor }
    retentionRef.current = windowSize
  })
  const aggDirty = useRef(false)
  const aggFrame = useRef<number | null>(null)
  const cancelAggPublish = useCallback(() => {
    if (aggFrame.current != null) cancelAnimationFrame(aggFrame.current)
    aggFrame.current = null
  }, [])
  const readAggRows = useCallback(() => {
    if (aggDirty.current && accRef.current && aggConfigRef.current) {
      aggRowsRef.current = accRef.current.emit(aggConfigRef.current)
      aggDirty.current = false
    }
    return aggRowsRef.current
  }, [])
  const scheduleAggPublish = useCallback(() => {
    aggDirty.current = true
    if (aggFrame.current != null) return
    let fired = false
    const id = requestAnimationFrame(() => {
      fired = true
      aggFrame.current = null
      publishAggRows(readAggRows())
    })
    if (!fired) aggFrame.current = id
  }, [publishAggRows, readAggRows])
  useEffect(() => cancelAggPublish, [cancelAggPublish])

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
        aggregate!.percentiles?.length || aggregate!.stat?.startsWith("p")
          ? "quantiles"
          : "",
        aggregate!.distinct || aggregate!.stat === "distinct" ? "1" : "0"
      ].join("|")
    : ""

  // (Re)build the accumulator and seed it from any initial `data` array.
  useLayoutEffect(() => {
    cancelAggPublish()
    aggDirty.current = false
    if (!aggEnabled) {
      accRef.current = null
      return
    }
    const cfg = aggConfigRef.current!
    const acc = new RealtimeAccumulator(
      {
        ...cfg,
        retain: cfg.retain ?? (data != null ? Infinity : retentionRef.current)
      },
      seriesAccessor
    )
    accRef.current = acc
    if (data) {
      const { timeAccessor: ta, valueAccessor: va } = accessorsRef.current
      for (const d of data) {
        acc.push(d, ta, va)
      }
    }
    publishAggRows(acc.emit(cfg))
  }, [
    aggKey,
    aggEnabled,
    data,
    timeAccessor,
    valueAccessor,
    seriesAccessor,
    publishAggRows,
    cancelAggPublish
  ])

  useLayoutEffect(() => {
    if (aggEnabled && data == null && accRef.current) {
      accRef.current.setRetention(aggregate?.retain ?? windowSize)
      scheduleAggPublish()
    }
  }, [windowSize, data, aggEnabled, aggregate?.retain, scheduleAggPublish])

  // Re-emit (without rebuilding) when only the readout config changes.
  useLayoutEffect(() => {
    if (aggEnabled && accRef.current) {
      publishAggRows(accRef.current.emit(aggConfigRef.current!))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aggregate?.stat, aggregate?.band, aggregate?.sigma])

  const ingestAgg = useCallback(
    (points: Datum[]) => {
      const acc = accRef.current
      const cfg = aggConfigRef.current
      if (!acc || !cfg) return
      acc.setRetention(cfg.retain ?? retentionRef.current)
      const { timeAccessor: ta, valueAccessor: va } = accessorsRef.current
      for (const p of points) {
        acc.push(p, ta, va)
      }
      scheduleAggPublish()
    },
    [scheduleAggPublish]
  )

  // ── Event-time ingestion (opt-in) ──────────────────────────────────────
  const eventTimeEnabled = eventTime != null
  const reorderRef = useRef<ReorderBuffer<Datum> | null>(null)
  const eventTimeRef = useRef<EventTimeConfig | undefined>(eventTime)
  const eventTimeEnabledRef = useRef(eventTimeEnabled)
  const onObservationRef = useRef(onObservation)
  const chartIdRef = useRef(chartId)
  useLayoutEffect(() => {
    eventTimeRef.current = eventTime
    eventTimeEnabledRef.current = eventTimeEnabled
    onObservationRef.current = onObservation
    chartIdRef.current = chartId
  })
  const idleAt = useRef<number | null>(null)

  const etKey = eventTimeEnabled
    ? `${eventTime!.lateness}|${eventTime!.latePolicy ?? "drop"}|${eventTime!.maxFutureSkew ?? ""}`
    : ""

  // Route released (in-order) events to the aggregator or the frame.
  const routeReleased = useCallback(
    (points: Datum[]) => {
      if (points.length === 0) return
      if (aggEnabledRef.current) ingestAgg(points)
      else frameRef.current?.pushMany(points)
    },
    [ingestAgg, frameRef]
  )

  useLayoutEffect(() => {
    idleAt.current = null
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
    reorderRef.current = createReorderBuffer(eventTimeRef.current!, (d) =>
      Number(readRealtimeTime(d, eventAccessor, "time") ?? NaN)
    )
  }, [etKey, eventTimeEnabled, routeReleased, timeAccessor])

  // Unified ingest: reorder through the grace window (if enabled), emit
  // late-data observations, then route the released events.
  const ingestPoints = useCallback(
    (points: Datum[]) => {
      if (points.length === 0) return
      idleAt.current = performance.now()
      const rb = reorderRef.current
      if (!eventTimeEnabledRef.current || !rb) {
        routeReleased(points)
        return
      }
      const released: Datum[] = []
      for (const p of points) {
        const res = rb.push(p)
        if (
          res.future?.length &&
          process.env.NODE_ENV !== "production" &&
          rb.futureCount === 1
        ) {
          console.warn(
            "[Semiotic] Rejected future-dated event beyond eventTime.maxFutureSkew."
          )
        }
        for (const point of res.released) released.push(point)
        if (res.late.length) {
          const cb = onObservationRef.current
          if (cb) {
            const { timeAccessor: ta } = accessorsRef.current
            const policy = eventTimeRef.current?.latePolicy ?? "drop"
            for (const lp of res.late) {
              cb({
                type: "late-data",
                datum: lp,
                eventTime: Number(readRealtimeTime(lp, ta, "time") ?? NaN),
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

  useEffect(() => {
    if (!eventTime?.idleAdvance && !aggregate?.idleAdvance) return
    const timer = setInterval(() => {
      const previous = idleAt.current
      if (previous == null) return
      const now = performance.now()
      idleAt.current = now
      const elapsed = Math.max(0, now - previous)
      const rb = reorderRef.current
      if (eventTimeRef.current?.idleAdvance && rb)
        routeReleased(rb.advanceIdle(elapsed))
      if (aggConfigRef.current?.idleAdvance && accRef.current) {
        if (rb) accRef.current.advanceWatermark(rb.releaseWatermark)
        else accRef.current.advanceIdle(elapsed)
        scheduleAggPublish()
      }
    }, 250)
    return () => clearInterval(timer)
  }, [
    eventTime?.idleAdvance,
    aggregate?.idleAdvance,
    routeReleased,
    scheduleAggPublish
  ])

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
        idleAt.current = null
        cancelAggPublish()
        aggDirty.current = false
        reorderRef.current?.clear()
        if (aggEnabledRef.current) {
          accRef.current?.clear()
          publishAggRows([])
        } else {
          frameRef.current?.clear()
        }
      },
      getData: () =>
        aggEnabledRef.current
          ? readAggRows()
          : (frameRef.current?.getData() ?? []),
      getScales: () => frameRef.current?.getScales() ?? null
    }),
    [
      flushEventTime,
      ingestPoints,
      publishAggRows,
      readAggRows,
      cancelAggPublish,
      frameRef
    ]
  )

  return { aggEnabled, aggRows }
}
