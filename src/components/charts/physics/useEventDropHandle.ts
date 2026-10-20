import { useEffect, useImperativeHandle, useRef } from "react"
import type { Ref, RefObject } from "react"
import type { PhysicsFrameHandle } from "./physicsHocHandle"
import type {
  StreamPhysicsFrameHandle,
  StreamPhysicsFrameProps
} from "../../stream/physics/StreamPhysicsTypes"
import type { EventDropProjectionMetadata } from "./eventDropPhysics"
import { readEventDropOccupancy } from "./eventDropPhysics"
import type { EventDropLedgerRow } from "./eventDropLedger"
import { eventDropSourceStats } from "./eventDropSources"
import type { OnObservationCallback } from "../../store/ObservationStore"

export interface EventDropClock {
  /** Elapsed simulation time in the chart's timeUnit. */
  simTime: number
  eventTimeFrontier: number
  watermark: number
  timeScale: number
  paused: boolean
}

export interface EventDropChartHandle extends PhysicsFrameHandle {
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
  ref: Ref<PhysicsFrameHandle>,
  dataRef: RefObject<PhysicsFrameHandle | null>,
  frameRef: RefObject<StreamPhysicsFrameHandle | null>,
  metadata: EventDropProjectionMetadata | undefined,
  props: EventDropReadoutProps & {
    onObservation?: OnObservationCallback
    timeScale?: number
    frameProps?: Pick<StreamPhysicsFrameProps, "onTick" | "clock">
  }
): StreamPhysicsFrameProps["onTick"] {
  const latest = useRef({ metadata, props })
  latest.current = { metadata, props }
  const lastTick = useRef(-Infinity)
  const getLedger = () =>
    (latest.current.metadata?.ledger ?? []).map((row) => ({
      ...row,
      bySource: Object.fromEntries(
        Object.entries(row.bySource).map(([id, count]) => [id, { ...count }])
      )
    }))
  const getClock = (): EventDropClock => {
    const state = frameRef.current?.getStore().runtimeState()
    const metadata = latest.current.metadata
    return {
      simTime:
        (state?.elapsedSeconds ?? 0) * (metadata?.timeUnit === "ms" ? 1000 : 1),
      eventTimeFrontier: metadata?.eventTimeFrontier ?? 0,
      watermark: metadata?.watermarkValue ?? -Infinity,
      timeScale:
        (state?.timeScale ?? 1) * (latest.current.props.timeScale ?? 1),
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
    getLedger,
    getWatermark: () => latest.current.metadata?.watermarkValue ?? -Infinity,
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
            timeScale: value / (latest.current.props.timeScale ?? 1)
          }
        })
      }
    },
    getSourceStats: (id) => {
      const snapshot = frameRef.current?.snapshot()
      const belongs = (body: { datum?: unknown }) =>
        (body.datum as { source?: string })?.source === id
      const metadata = latest.current.metadata
      return {
        ...eventDropSourceStats(getLedger(), id),
        inFlight:
          (snapshot?.queue.filter(belongs).length ?? 0) +
          (snapshot && metadata
            ? readEventDropOccupancy(
                metadata,
                snapshot.world.bodies.filter(belongs)
              ).inFlight
            : 0)
      }
    }
  }))
  const emitted = useRef(new Set<string>())
  const previous = useRef(-Infinity)
  const ledgerTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const props = latest.current.props
    if (!metadata) return
    let lifecycle = false
    for (const event of metadata.lifecycleEvents ?? []) {
      if (
        event.type !== "physics-window-open" &&
        event.type !== "physics-window-close"
      )
        continue
      const key = `${event.type}:${event.windowId}`
      if (emitted.current.has(key)) continue
      emitted.current.add(key)
      lifecycle = true
      const observation = frameRef.current?.getStore().recordObservation(event)
      if (observation) props.onObservation?.(observation)
    }
    if (metadata.watermarkValue > previous.current) {
      const before = previous.current
      previous.current = metadata.watermarkValue
      props.onWatermarkChange?.(metadata.watermarkValue, before)
      const observation = frameRef.current?.getStore().recordObservation({
        type: "physics-watermark-advance",
        from: before,
        to: metadata.watermarkValue,
        cause: "external"
      })
      if (observation) props.onObservation?.(observation)
    }
    if (lifecycle) {
      if (ledgerTimer.current) clearTimeout(ledgerTimer.current)
      ledgerTimer.current = null
      props.onLedgerChange?.(getLedger())
    } else if (!ledgerTimer.current)
      ledgerTimer.current = setTimeout(() => {
        ledgerTimer.current = null
        latest.current.props.onLedgerChange?.(getLedger())
      }, 500)
  }, [metadata, frameRef])
  useEffect(
    () => () => {
      if (ledgerTimer.current) clearTimeout(ledgerTimer.current)
    },
    []
  )
  if (!props.onClockTick) return props.frameProps?.onTick
  return (result, controls) => {
    latest.current.props.frameProps?.onTick?.(result, controls)
    const now = latest.current.props.frameProps?.clock?.() ?? performance.now()
    if (
      now - lastTick.current <
      Math.max(100, latest.current.props.clockTickMs ?? 100)
    )
      return
    lastTick.current = now
    latest.current.props.onClockTick?.(getClock())
  }
}
