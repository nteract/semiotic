import { useCallback, useEffect, useImperativeHandle, useRef } from "react"
import type { Ref, RefObject } from "react"
import type { PhysicsFrameHandle } from "./physicsHocHandle"
import type {
  StreamPhysicsFrameHandle,
  StreamPhysicsFrameProps
} from "../../stream/physics/StreamPhysicsTypes"
import type { PhysicsPipelineSnapshot } from "../../stream/physics/PhysicsPipelineTypes"
import type { EventDropProjectionMetadata } from "./eventDropPhysics"
import { readEventDropOccupancy } from "./eventDropPhysics"
import type { EventDropLedgerRow } from "./eventDropLedger"
import { eventDropSourceStats } from "./eventDropSources"
import type { OnObservationCallback } from "../../store/ObservationStore"
import { usePhysicsObservationDispatcher } from "../../stream/physics/physicsFrameObservations"

export interface EventDropClock {
  /** Elapsed simulation time in the chart's timeUnit. */
  simTime: number
  eventTimeFrontier: number
  watermark: number
  timeScale: number
  paused: boolean
}

export interface EventDropChartHandle extends PhysicsFrameHandle {
  snapshot: () => PhysicsPipelineSnapshot | null
  restore: (snapshot: PhysicsPipelineSnapshot) => void
  getStore: () => ReturnType<StreamPhysicsFrameHandle["getStore"]> | null
  getLedger: () => EventDropLedgerRow[]
  getWatermark: () => number
  getClock: () => EventDropClock
  setTimeScale: (scale: number) => void
  getSourceStats: (id: string) => {
    emitted: number
    accepted: number
    late: number
    inFlight: number
  }
}

export interface EventDropReadoutProps {
  onLedgerChange?: (ledger: EventDropLedgerRow[]) => void
  onWatermarkChange?: (value: number, previous: number) => void
  onClockTick?: (clock: EventDropClock) => void
  /** Minimum milliseconds between HUD notifications; defaults to 100. */
  clockTickMs?: number
}

export function useEventDropHandle(
  ref: Ref<EventDropChartHandle>,
  dataRef: RefObject<PhysicsFrameHandle | null>,
  frameRef: RefObject<StreamPhysicsFrameHandle | null>,
  metadata: EventDropProjectionMetadata | undefined,
  props: EventDropReadoutProps & {
    onObservation?: OnObservationCallback
    timeScale?: number
    frameProps?: Pick<
      StreamPhysicsFrameProps,
      "onTick" | "clock" | "onObservation"
    >
  }
): Pick<StreamPhysicsFrameProps, "onTick" | "onFrame"> {
  const latest = useRef({ metadata, props })
  latest.current = { metadata, props }
  const onObservationRef = useRef(props.onObservation)
  onObservationRef.current =
    props.onObservation ?? props.frameProps?.onObservation
  const dispatchObservation = usePhysicsObservationDispatcher(onObservationRef)
  const lastTick = useRef(-Infinity)
  const readMetadata = useCallback(
    () =>
      frameRef.current?.getStore().eventDropState()?.metadata ??
      latest.current.metadata,
    [frameRef]
  )
  const getLedger = useCallback(
    () =>
      (readMetadata()?.ledger ?? []).map((row) => ({
        ...row,
        bySource: Object.fromEntries(
          Object.entries(row.bySource).map(([id, count]) => [id, { ...count }])
        )
      })),
    [readMetadata]
  )
  const getClock = (): EventDropClock => {
    const state = frameRef.current?.getStore().runtimeState()
    const metadata = readMetadata()
    return {
      simTime:
        (state?.elapsedSeconds ?? 0) * (metadata?.timeUnit === "ms" ? 1000 : 1),
      eventTimeFrontier: metadata?.eventTimeFrontier ?? 0,
      watermark: metadata?.watermarkValue ?? -Infinity,
      timeScale:
        (state?.timeScale ?? 1) *
        (frameRef.current?.getStore().isEventDropLive()
          ? 1
          : (latest.current.props.timeScale ?? 1)),
      paused: state?.paused ?? false
    }
  }
  useImperativeHandle(ref, (): EventDropChartHandle => ({
    push: (row) => dataRef.current?.push(row),
    pushMany: (rows) => dataRef.current?.pushMany(rows),
    remove: (ids) => dataRef.current?.remove(ids) ?? [],
    update: (ids, updater) => dataRef.current?.update(ids, updater) ?? [],
    clear: () => {
      emitted.current.clear()
      previous.current = -Infinity
      dataRef.current?.clear()
    },
    getData: () => dataRef.current?.getData() ?? [],
    getScales: () => dataRef.current?.getScales?.() ?? null,
    getCustomLayout: () => dataRef.current?.getCustomLayout?.() ?? null,
    popBodies: (ids, options) => dataRef.current?.popBodies(ids, options) ?? [],
    getStore: () => frameRef.current?.getStore() ?? null,
    snapshot: () => frameRef.current?.snapshot() ?? null,
    restore: (snapshot) => {
      previous.current = snapshot.eventDrop?.ledger.value ?? -Infinity
      emitted.current.clear()
      deliveredLedger.current = undefined
      frameRef.current?.restore(snapshot)
    },
    getLedger,
    getWatermark: () => readMetadata()?.watermarkValue ?? -Infinity,
    getClock,
    setTimeScale: (value) => {
      if (!Number.isFinite(value) || value <= 0)
        throw new RangeError("timeScale must be finite and positive")
      const frame = frameRef.current
      if (frame) {
        const snapshot = frame.snapshot()
        frame.restore({
          ...snapshot,
          config: {
            ...snapshot.config,
            timeScale:
              value /
              (frame.getStore().isEventDropLive()
                ? 1
                : (latest.current.props.timeScale ?? 1))
          }
        })
      }
    },
    getSourceStats: (id) => {
      const snapshot = frameRef.current?.snapshot()
      const belongs = (body: { datum?: unknown }) =>
        (body.datum as { source?: string })?.source === id
      const totals = eventDropSourceStats(getLedger(), id)
      const queued = snapshot?.queue.filter(belongs).length ?? 0
      if (snapshot?.eventDrop) {
        // Admission remains pending even if the body budget evicts a traveller.
        const inFlight =
          queued +
          snapshot.eventDrop.pending.filter(({ spawn }) => belongs(spawn))
            .length
        return { ...totals, emitted: totals.emitted + inFlight, inFlight }
      }
      const metadata = readMetadata()
      const camera = frameRef.current?.getStore().viewTransform() ?? {
        x: 0,
        y: 0
      }
      return {
        ...totals,
        inFlight:
          queued +
          (snapshot && metadata
            ? readEventDropOccupancy(
                metadata,
                snapshot.world.bodies.filter(belongs).map((body) => ({
                  ...body,
                  x: body.x + camera.x,
                  y: body.y + camera.y
                }))
              ).inFlight
            : 0)
      }
    }
  }))
  const emitted = useRef(new Map<string, number>())
  const previous = useRef(-Infinity)
  const deliveredLedger = useRef<string | undefined>(undefined)
  const ledgerTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const props = latest.current.props
    const store = frameRef.current?.getStore()
    if (!metadata || !store) return
    let lifecycle = false
    const occurrences = new Map<string, number>()
    for (const event of metadata.lifecycleEvents ?? []) {
      // Watermark changes below describe the committed frontier. All other
      // transitions come from replayed history, including repeated idle/held
      // transitions with identical payloads.
      if (event.type === "physics-watermark-advance") continue
      const key =
        event.type === "physics-window-open" ||
        event.type === "physics-window-close"
          ? `${event.type}:${event.windowId}`
          : JSON.stringify(event)
      const occurrence = (occurrences.get(key) ?? 0) + 1
      occurrences.set(key, occurrence)
      if (occurrence <= (emitted.current.get(key) ?? 0)) continue
      emitted.current.set(key, occurrence)
      lifecycle = true
      dispatchObservation(store.recordLifecycleObservation(event))
    }
    if (metadata.watermarkValue > previous.current) {
      const before = previous.current
      previous.current = metadata.watermarkValue
      props.onWatermarkChange?.(metadata.watermarkValue, before)
      if (!store.isEventDropLive())
        dispatchObservation(
          store.recordLifecycleObservation({
            type: "physics-watermark-advance",
            from: before,
            to: metadata.watermarkValue,
            cause: "external"
          })
        )
    }
    const ledgerKey = JSON.stringify(metadata.ledger ?? [])
    if (!props.onLedgerChange || ledgerKey === deliveredLedger.current) {
      if (ledgerTimer.current) clearTimeout(ledgerTimer.current)
      ledgerTimer.current = null
      return
    }
    const deliverLedger = () => {
      ledgerTimer.current = null
      const callback = latest.current.props.onLedgerChange
      const ledger = getLedger()
      const key = JSON.stringify(ledger)
      if (!callback || key === deliveredLedger.current) return
      deliveredLedger.current = key
      callback(ledger)
    }
    if (lifecycle) {
      if (ledgerTimer.current) clearTimeout(ledgerTimer.current)
      deliverLedger()
    } else if (!ledgerTimer.current)
      ledgerTimer.current = setTimeout(deliverLedger, 500)
  }, [metadata, frameRef, dispatchObservation, getLedger])
  useEffect(
    () => () => {
      if (ledgerTimer.current) clearTimeout(ledgerTimer.current)
      ledgerTimer.current = null
    },
    []
  )
  return {
    onTick: props.frameProps?.onTick,
    onFrame: () => {
      if (!latest.current.props.onClockTick) return
      const now =
        latest.current.props.frameProps?.clock?.() ?? performance.now()
      if (
        now - lastTick.current <
        Math.max(100, latest.current.props.clockTickMs ?? 100)
      )
        return
      lastTick.current = now
      latest.current.props.onClockTick?.(getClock())
    }
  }
}
