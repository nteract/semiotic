/**
 * useEncodingDomain — track the numeric `[min, max]` domain of a
 * data-driven encoding (size, opacity, color intensity) across both
 * bounded and push-mode data.
 *
 * **Bounded mode** (`isPushMode: false`) — derive `[min, max]` from
 * the `data` array each render. Identical to inline
 * `Math.min(...sizes), Math.max(...sizes)` patterns the consuming
 * HOCs used to duplicate.
 *
 * **Push mode** (`isPushMode: true`) — bounded `data` is unavailable
 * because the chart's data prop is omitted; the user pushes through
 * a ref. The hook maintains a running `[min, max]` in a ref plus a
 * version counter, and the HOC calls `trackPushed(items)` from its
 * ref override before forwarding the push to the frame. `reset()`
 * clears the running domain (paired with a `clear()` override).
 *
 * Extracted from BubbleChart's `sizeBy` domain tracking. The
 * surface is intentionally generic — any per-datum numeric encoding
 * accessor can drive it. Scatterplot uses it for `sizeBy` too;
 * future charts with opacity/color-intensity encodings can adopt
 * the same hook.
 */
"use client"
import { useCallback, useMemo, useRef, useState } from "react"
import type { Datum } from "./datumTypes"
import type { Accessor } from "./types"

export interface EncodingDomainOptions<TDatum extends Datum = Datum> {
  /** Encoding accessor (string field name or function). */
  accessor: Accessor<number> | undefined
  /** Bounded chart data. Ignored when `isPushMode` is true. */
  data: TDatum[]
  /** When true, the hook tracks pushed values via the returned
   *  `trackPushed` helper instead of reading `data`. */
  isPushMode: boolean
}

export interface EncodingDomainResult<TDatum extends Datum = Datum> {
  /** `[min, max]` tuple over seen values. Undefined when no data has
   *  been seen yet (push mode initial state, or bounded mode with
   *  empty data + no accessor). */
  domain: [number, number] | undefined
  /** Walk `items` and update the running domain. Bumps the version
   *  counter when any min/max actually moves. No-op in bounded mode
   *  — the hook reads from `data` directly there. */
  trackPushed: (items: TDatum[]) => void
  /** Reset the running domain to empty. Paired with the HOC's
   *  `clear()` override. No-op in bounded mode. */
  reset: () => void
}

/**
 * Track a numeric encoding's `[min, max]` domain across bounded and
 * push data sources.
 *
 * @example
 * ```tsx
 * // BubbleChart-style usage:
 * const { domain: sizeDomain, trackPushed, reset } = useEncodingDomain({
 *   accessor: sizeBy,
 *   data: safeData,
 *   isPushMode: data === undefined,
 * })
 *
 * useFrameImperativeHandle(ref, {
 *   variant: "xy", frameRef,
 *   overrides: {
 *     push: (d) => { trackPushed([d]); frameRef.current?.push(d) },
 *     pushMany: (ds) => { trackPushed(ds); frameRef.current?.pushMany(ds) },
 *     clear: () => { reset(); frameRef.current?.clear() },
 *   },
 * })
 * ```
 */
export function useEncodingDomain<TDatum extends Datum = Datum>(
  options: EncodingDomainOptions<TDatum>,
): EncodingDomainResult<TDatum> {
  const { accessor, data, isPushMode } = options

  const streamingDomainRef = useRef<[number, number] | null>(null)
  const [streamingVersion, setStreamingVersion] = useState(0)

  const trackPushed = useCallback((items: TDatum[]) => {
    if (!isPushMode || !accessor) return
    let changed = false
    for (const d of items) {
      const raw = typeof accessor === "function"
        ? (accessor as (d: TDatum) => number)(d)
        : (d as Datum)[accessor as string]
      if (raw == null) continue
      // String-field accessors can return numeric strings ("5"). Coerce
      // before storing so the domain never contains strings — downstream
      // math (`d3-scale`, getSize) would happily multiply "5" * 1 but
      // tests and other consumers expect numbers.
      const n = typeof raw === "number" ? raw : Number(raw)
      if (!Number.isFinite(n)) continue
      if (!streamingDomainRef.current) {
        streamingDomainRef.current = [n, n]
        changed = true
      } else {
        if (n < streamingDomainRef.current[0]) { streamingDomainRef.current[0] = n; changed = true }
        if (n > streamingDomainRef.current[1]) { streamingDomainRef.current[1] = n; changed = true }
      }
    }
    if (changed) setStreamingVersion((v) => v + 1)
  }, [isPushMode, accessor])

  const reset = useCallback(() => {
    if (!isPushMode) return
    streamingDomainRef.current = null
    setStreamingVersion((v) => v + 1)
  }, [isPushMode])

  const domain = useMemo<[number, number] | undefined>(() => {
    if (isPushMode) {
      // Touch version so memo refreshes when ref mutates.
      void streamingVersion
      return streamingDomainRef.current ?? undefined
    }
    if (!accessor || data.length === 0) return undefined
    const get = typeof accessor === "function"
      ? (accessor as (d: TDatum) => number)
      : (d: TDatum) => (d as Datum)[accessor as string] as number
    let min = Infinity
    let max = -Infinity
    for (const d of data) {
      const raw = get(d)
      if (raw == null) continue
      // Coerce before comparing — same reason as `trackPushed` above.
      const v = typeof raw === "number" ? raw : Number(raw)
      if (!Number.isFinite(v)) continue
      if (v < min) min = v
      if (v > max) max = v
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return undefined
    return [min, max]
  }, [data, accessor, isPushMode, streamingVersion])

  return { domain, trackPushed, reset }
}
