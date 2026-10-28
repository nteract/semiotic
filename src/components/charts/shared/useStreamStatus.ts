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
 *       <RealtimeLineChart ref={ref} timeAccessor="time" valueAccessor="value" />
 *     </>
 *   )
 * }
 * ```
 */
"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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

export interface StreamStatusResult<
  THandle extends RealtimeFrameHandle = RealtimeFrameHandle
> {
  /** Ref to pass to the chart's `ref` prop. The hook intercepts
   *  push/pushMany calls on this ref so it can timestamp them. */
  ref: React.MutableRefObject<THandle | null>
  /** Current status. Re-renders the consumer on transition. */
  status: StreamStatus
  /** Timestamp (from `performance.now()`) of the most recent push, published
   *  on status transitions and at poll cadence; null before the first push. */
  lastPushTime: number | null
}

/**
 * Track ingest activity on a push-API chart and expose status.
 */
export function useStreamStatus<
  THandle extends RealtimeFrameHandle = RealtimeFrameHandle
>(options: StreamStatusOptions = {}): StreamStatusResult<THandle> {
  const { staleThresholdMs = 5000, pollIntervalMs = 1000 } = options

  const lastPushRef = useRef<number | null>(null)
  const [snapshot, setSnapshot] = useState({
    status: "idle" as StreamStatus,
    lastPushTime: null as number | null
  })
  const published = useRef(snapshot)
  const publish = useCallback((status: StreamStatus, lastPushTime: number) => {
    if (
      published.current.status === status &&
      published.current.lastPushTime === lastPushTime
    )
      return
    published.current = { status, lastPushTime }
    setSnapshot(published.current)
  }, [])
  const markPushed = useCallback(() => {
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now()
    lastPushRef.current = now
    if (published.current.status !== "active") publish("active", now)
  }, [publish])

  // Observe calls through a ref-owned view. Mutating the original handle cannot
  // intercept a Proxy's overriding get trap and fails for frozen handles.
  const wrappedRef = useMemo(() => {
    let source: THandle | null = null
    let view: THandle | null = null
    return {
      get current(): THandle | null {
        return view
      },
      set current(handle: THandle | null) {
        if (handle === source || handle === view) return
        source = handle
        if (!handle) {
          view = null
          return
        }
        const methods = new Map<PropertyKey, (...args: unknown[]) => unknown>()
        view = new Proxy({} as THandle, {
          get(_target, key) {
            const value = Reflect.get(handle, key, handle)
            if (typeof value !== "function") return value
            let method = methods.get(key)
            if (!method) {
              method = (...args) => {
                // Read overrides at call time; bind class methods to their
                // original instance, including methods with private fields.
                const current = Reflect.get(handle, key, handle)
                if (typeof current !== "function")
                  throw new TypeError(
                    `Stream handle ${String(key)} is no longer callable`
                  )
                const result = Reflect.apply(current, handle, args)
                if (
                  source === handle &&
                  (key === "push" ||
                    (key === "pushMany" &&
                      Array.isArray(args[0]) &&
                      args[0].length > 0))
                )
                  markPushed()
                return result
              }
              methods.set(key, method)
            }
            return method
          },
          has: (_target, key) => key in handle,
          ownKeys: () => Reflect.ownKeys(handle),
          getOwnPropertyDescriptor(_target, key) {
            const descriptor = Reflect.getOwnPropertyDescriptor(handle, key)
            return descriptor && { ...descriptor, configurable: true }
          },
          getPrototypeOf: () => Reflect.getPrototypeOf(handle),
          set: (_target, key, value) => Reflect.set(handle, key, value, handle)
        })
      }
    } as React.MutableRefObject<THandle | null>
  }, [markPushed])

  useEffect(
    () => () => {
      wrappedRef.current = null
    },
    [wrappedRef]
  )
  useEffect(() => {
    const id = setInterval(() => {
      const last = lastPushRef.current
      if (last == null) return
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now()
      publish(now - last > staleThresholdMs ? "stale" : "active", last)
    }, pollIntervalMs)
    return () => clearInterval(id)
  }, [staleThresholdMs, pollIntervalMs, publish])

  return { ref: wrappedRef, ...snapshot }
}
