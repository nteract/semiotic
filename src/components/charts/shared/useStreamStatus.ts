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

  // Underlying frame ref the chart actually receives. The hook's
  // public ref proxies into a wrapped object that intercepts
  // push/pushMany. `current` on the public ref is set by React's
  // ref-forwarding to the frame's handle.
  const frameRef = useRef<THandle | null>(null)
  const lastPushRef = useRef<number | null>(null)
  const [status, setStatus] = useState<StreamStatus>("idle")
  const [lastPushTime, setLastPushTime] = useState<number | null>(null)

  // Wrapped ref exposed to the caller. Setting `current` on this
  // ref records the assignment for React's ref-forwarding and then
  // wraps the frame's push/pushMany so each call records its
  // timestamp.
  const wrappedRef = useMemo(() => {
    const obj = { _frame: null as THandle | null } as { _frame: THandle | null }
    return {
      get current(): THandle | null {
        return obj._frame
      },
      set current(handle: THandle | null) {
        obj._frame = handle
        frameRef.current = handle
        if (!handle) return
        // Wrap push / pushMany in place so the caller's
        // `ref.current.push(...)` records the timestamp before
        // delegating to the real implementation.
        const origPush = handle.push.bind(handle)
        const origPushMany = handle.pushMany.bind(handle)
        ;(handle as any).push = (d: Datum) => {
          markPushed()
          return origPush(d)
        }
        ;(handle as any).pushMany = (ds: Datum[]) => {
          if (ds && ds.length > 0) markPushed()
          return origPushMany(ds)
        }
      },
    } as React.MutableRefObject<THandle | null>
  }, [])

  const markPushed = useCallback(() => {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now()
    lastPushRef.current = now
    setLastPushTime(now)
    // Transition straight to active; the poll timer downgrades to
    // stale once the threshold elapses.
    setStatus((prev) => (prev === "active" ? prev : "active"))
  }, [])

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
