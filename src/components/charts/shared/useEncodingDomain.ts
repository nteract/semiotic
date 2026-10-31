/**
 * useEncodingDomain — track the numeric `[min, max]` domain of a
 * data-driven encoding (size, opacity, color intensity) across both
 * bounded and push-mode data.
 *
 * **Bounded mode** (`isPushMode: false`) — derive `[min, max]` from
 * the `data` array each render.
 *
 * **Push mode** (`isPushMode: true`) — bounded `data` is unavailable
 * because the chart's data prop is omitted; the user pushes through
 * a ref. The hook maintains a running `[min, max]` in a ref plus a
 * version counter, and the HOC calls `trackPushed(items)` from its
 * ref override before forwarding the push to the frame. `reset()`
 * clears the running domain (paired with a `clear()` override).
 *
 * The surface is generic so any per-datum numeric encoding
 * accessor can drive it. The size-encoding bridge shares the numeric
 * reader below and updates its tuple before frame ingestion; other
 * encodings can use this hook when React needs the updated domain.
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
  options: EncodingDomainOptions<TDatum>
): EncodingDomainResult<TDatum> {
  const { accessor, data, isPushMode } = options

  const streamingDomainRef = useRef<[number, number] | undefined>(undefined)
  const [, invalidateDomain] = useState(0)

  const trackPushed = useCallback(
    (items: TDatum[]) => {
      if (!isPushMode || !accessor) return
      const previous = streamingDomainRef.current
      const min = previous?.[0]
      const max = previous?.[1]
      const next = encodingDomain(items, accessor, previous)
      if (next && (next[0] !== min || next[1] !== max)) {
        streamingDomainRef.current = next
        invalidateDomain((version) => version + 1)
      }
    },
    [isPushMode, accessor]
  )

  const reset = useCallback(() => {
    if (!isPushMode) return
    streamingDomainRef.current = undefined
    invalidateDomain((version) => version + 1)
  }, [isPushMode])

  const boundedDomain = useMemo(
    () => (isPushMode ? undefined : encodingDomain(data, accessor)),
    [data, accessor, isPushMode]
  )
  return {
    domain: isPushMode ? streamingDomainRef.current : boundedDomain,
    trackPushed,
    reset
  }
}

/** Extend a domain in place using the same finite reads for either data mode. */
export function encodingDomain(
  rows: readonly Datum[],
  accessor: Accessor<number> | undefined,
  previous?: [number, number]
): [number, number] | undefined {
  if (!accessor) return undefined
  const domain: [number, number] = previous ?? [Infinity, -Infinity]
  for (const row of rows) {
    const raw = typeof accessor === "function" ? accessor(row) : row[accessor]
    if (raw == null) continue
    const value = typeof raw === "number" ? raw : Number(raw)
    if (!Number.isFinite(value)) continue
    if (value < domain[0]) domain[0] = value
    if (value > domain[1]) domain[1] = value
  }
  return Number.isFinite(domain[0]) && Number.isFinite(domain[1])
    ? domain
    : undefined
}
