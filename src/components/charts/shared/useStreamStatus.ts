/**
 * useStreamStatus — observe ingest activity on a push-API chart and
 * expose a reactive `status` enum + `lastPushTime` timestamp.
 *
 * Any HOC with a ref-based push API (`ref.current.push`,
 * `ref.current.pushMany`) can opt in. The hook wraps the ref so
 * push/pushMany calls record their timestamp; a polling timer
 * transitions `status` between `"active"` and `"stale"` based on
 * the configured threshold.
 *
 * This is the user-facing analogue of the frame-internal
 * `useStalenessCheck` — `useStreamStatus` doesn't touch frame
 * internals, doesn't require the chart to support a particular
 * staleness prop, and works uniformly across realtime and
 * non-realtime push HOCs.
 *
 * @example
 * ```tsx
 * function LiveDashboard() {
 *   const { ref, status, lastPushTime } = useStreamStatus<RealtimeFrameHandle>({
 *     staleThresholdMs: 5000,
 *   })
 *
 *   useEffect(() => {
 *     const id = setInterval(() => {
 *       ref.current?.push({ time: Date.now(), value: Math.random() * 100 })
 *     }, 1000)
 *     return () => clearInterval(id)
 *   }, [])
 *
 *   return (
 *     <>
 *       <StatusBadge status={status} />
 *       <RealtimeLineChart ref={ref} xAccessor="time" yAccessor="value" />
 *     </>
 *   )
 * }
 * ```
 */
"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Datum } from "./datumTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"

// Marker on a handle we've already wrapped — prevents double-wrap
// when React 18 StrictMode re-runs effects, or any flow that
// reassigns the same handle to `wrappedRef.current`. Module-scoped
// (plain `Symbol()`, not `Symbol.for`) so duplicate-bundled copies
// of Semiotic on the same page each carry their own marker rather
// than colliding through the global symbol registry.
const WRAPPED_BY_STREAM_STATUS = Symbol("semiotic.useStreamStatus.wrapped")

/**
 * Status enum exposed by the hook.
 *
 * - `"idle"` — no pushes have happened yet since mount.
 * - `"active"` — at least one push has happened within the
 *   threshold window.
 * - `"stale"` — pushes have stopped or slowed; last push is older
 *   than `staleThresholdMs`.
 */
export type StreamStatus = "idle" | "active" | "stale"

export interface StreamStatusOptions {
  /** Time in ms since the last push before status flips to `"stale"`.
   *  @default 5000 */
  staleThresholdMs?: number
  /** Polling interval for status transitions. Smaller = more
   *  responsive but higher cost. @default 1000 */
  pollIntervalMs?: number
}

export interface StreamStatusResult<THandle extends RealtimeFrameHandle = RealtimeFrameHandle> {
  /** Ref to pass to the chart's `ref` prop. The hook intercepts
   *  push/pushMany calls on this ref so it can timestamp them. */
  ref: React.MutableRefObject<THandle | null>
  /** Current status. Re-renders the consumer on transition. */
  status: StreamStatus
  /** Timestamp (from `performance.now()`) of the most recent push,
   *  or null when no push has happened yet. */
  lastPushTime: number | null
}

/**
 * Track ingest activity on a push-API chart and expose status.
 */
export function useStreamStatus<THandle extends RealtimeFrameHandle = RealtimeFrameHandle>(
  options: StreamStatusOptions = {},
): StreamStatusResult<THandle> {
  const { staleThresholdMs = 5000, pollIntervalMs = 1000 } = options

  const lastPushRef = useRef<number | null>(null)
  const [status, setStatus] = useState<StreamStatus>("idle")
  const [lastPushTime, setLastPushTime] = useState<number | null>(null)

  const markPushed = useCallback(() => {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now()
    lastPushRef.current = now
    setLastPushTime(now)
    // Transition straight to active; the poll timer downgrades to
    // stale once the threshold elapses.
    setStatus((prev) => (prev === "active" ? prev : "active"))
  }, [])

  // Wrapped ref exposed to the caller. Setting `current` on this
  // ref records the assignment for React's ref-forwarding and then
  // wraps the frame's push/pushMany so each call records its
  // timestamp.
  //
  // Wrap-once guard: React 18 StrictMode can reassign the same handle to
  // `current`. We tag the handle with a
  // private symbol on first wrap; subsequent assignments of the same
  // handle short-circuit. When a *new* handle arrives we also restore
  // the previous handle's originals (if we still have them) so leaked
  // handles don't keep our wrappers alive.
  const wrappedRef = useMemo(() => {
    const obj = {
      _frame: null as THandle | null,
      _origPush: null as ((d: Datum) => unknown) | null,
      _origPushMany: null as ((ds: Datum[]) => unknown) | null,
    }
    return {
      get current(): THandle | null {
        return obj._frame
      },
      set current(handle: THandle | null) {
        // Restore the previous handle's originals before we let go of it.
        // Also clear our wrap-once tag so a future re-assignment of the
        // same handle (e.g. handed to a different `useStreamStatus`
        // instance, or back to this one after a remount) re-wraps cleanly.
        const prev = obj._frame
        if (prev && prev !== handle && obj._origPush && obj._origPushMany) {
          ;(prev as { push: (d: Datum) => unknown }).push = obj._origPush
          ;(prev as { pushMany: (ds: Datum[]) => unknown }).pushMany = obj._origPushMany
          delete (prev as { [WRAPPED_BY_STREAM_STATUS]?: true })[WRAPPED_BY_STREAM_STATUS]
        }
        obj._frame = handle
        if (!handle) {
          obj._origPush = null
          obj._origPushMany = null
          return
        }
        // Wrap-once: if the same handle is being assigned a second time
        // (StrictMode double-effect, parent re-renders that re-pass the
        // same ref target), bail. Without this, `push` becomes
        // `markPushed(); markPushed(); origPush()` after the second wrap.
        const tagged = handle as THandle & { [WRAPPED_BY_STREAM_STATUS]?: true }
        if (tagged[WRAPPED_BY_STREAM_STATUS]) return
        tagged[WRAPPED_BY_STREAM_STATUS] = true
        // Wrap push / pushMany in place so the caller's
        // `ref.current.push(...)` records the timestamp before
        // delegating to the real implementation.
        //
        // Stash the *unbound* originals on `obj._origPush` so handle
        // swaps can restore the property to byte-identical reference
        // equality with the function the consumer passed in. We still
        // bind for the internal call site so `this` is preserved on
        // class-instance handles.
        const rawPush = handle.push
        const rawPushMany = handle.pushMany
        const boundPush = rawPush.bind(handle)
        const boundPushMany = rawPushMany.bind(handle)
        obj._origPush = rawPush as (d: Datum) => unknown
        obj._origPushMany = rawPushMany as (ds: Datum[]) => unknown
        ;(handle as { push: (d: Datum) => unknown }).push = (d: Datum) => {
          markPushed()
          return boundPush(d)
        }
        ;(handle as { pushMany: (ds: Datum[]) => unknown }).pushMany = (ds: Datum[]) => {
          if (ds && ds.length > 0) markPushed()
          return boundPushMany(ds)
        }
      },
    } as React.MutableRefObject<THandle | null>
  }, [markPushed])

  // Poll for staleness transitions. Cheap (one setInterval, one
  // ref read, one Math op per tick) and only runs while mounted.
  useEffect(() => {
    const id = setInterval(() => {
      const last = lastPushRef.current
      if (last == null) return
      const now = typeof performance !== "undefined" ? performance.now() : Date.now()
      const isStale = now - last > staleThresholdMs
      setStatus((prev) => {
        const next: StreamStatus = isStale ? "stale" : "active"
        return prev === next ? prev : next
      })
    }, pollIntervalMs)
    return () => clearInterval(id)
  }, [staleThresholdMs, pollIntervalMs])

  return { ref: wrappedRef, status, lastPushTime }
}
