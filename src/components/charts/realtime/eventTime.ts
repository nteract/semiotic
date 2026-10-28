// HOC-layer glue for event-time ingestion on realtime XY charts.
//
// Turns an `eventTime={…}` prop into a `ReorderBuffer` that the chart
// interposes on its push API: pushed events are buffered for a bounded
// lateness/grace window and released to the frame in event-time order,
// so a jittery or merged multi-source stream draws a monotone line
// instead of a zigzag. Late events are dropped or kept per policy and
// surfaced via `onObservation` ("late-data"). Default-off.

import { ReorderBuffer, type LatePolicy } from "../../realtime/ReorderBuffer"
import { parseWindowDuration } from "../../realtime/parseWindowDuration"
import type { Datum } from "../shared/datumTypes"

/**
 * Opt-in event-time ingestion for realtime XY charts. Reorders pushed
 * events within a bounded grace window so out-of-order arrivals render
 * in event-time order, at the cost of delaying display by `lateness`.
 * RealtimeLineChart's chart-specific handle exposes `flush()` to release
 * the final grace-window tail at an asserted end-of-stream boundary. A live
 * config or time-accessor change drains the prior tail before the new policy
 * begins, rather than abandoning buffered events. `idleAdvance` opts into wall-time
 * progression on a 250ms timer, releasing quiet tails. `maxFutureSkew` rejects
 * timestamps beyond Date.now() + skew before they can move the watermark.
 */
export interface EventTimeConfig {
  /**
   * Grace window — ms or a duration string (`"2s"`, `"500ms"`). Events
   * whose time is older than `watermark − lateness` are late.
   */
  lateness: number | string
  /**
   * What to do with a late event:
   * - `"drop"` (default): discard it (still counted + surfaced).
   * - `"keep"`: release it immediately, out of order (still counted).
   */
  latePolicy?: LatePolicy
  /** Reject events this far ahead of Date.now(), without poisoning the watermark. */
  maxFutureSkew?: number | string
  /** Release the quiet tail using elapsed wall time. Default false. */
  idleAdvance?: boolean
}

/**
 * Build a `ReorderBuffer` from a config and a time accessor, parsing the
 * lateness duration. Returns `null` when the lateness is unparseable so
 * the caller can fall back to plain (in-order) ingestion.
 */
export function createReorderBuffer(
  config: EventTimeConfig,
  getTime: (d: Datum) => number
): ReorderBuffer<Datum> | null {
  const lateness = config.lateness === 0 ? 0 : parseWindowDuration(config.lateness)
  const skew = config.maxFutureSkew == null ? undefined : config.maxFutureSkew === 0 ? 0 : parseWindowDuration(config.maxFutureSkew)
  if (lateness == null || skew === null) {
    if (process.env.NODE_ENV !== "production") console.warn("[Semiotic] Invalid eventTime duration; use milliseconds or strings such as '1m 30s'.")
    return null
  }
  return new ReorderBuffer<Datum>({
    lateness,
    maxFutureSkew: skew,
    getTime,
    latePolicy: config.latePolicy ?? "drop",
  })
}
