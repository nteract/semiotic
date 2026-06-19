// Graded (banded) staleness resolution.
//
// Binary staleness flips a chart from live to stale at a single
// `threshold`. Graded staleness instead dims progressively through the
// shared lifecycle bands — fresh → aging → stale → expired — as the
// wall-clock idle time crosses multiples of `threshold`, reusing
// `bandFromAge` so chart staleness, per-datum decay, and annotation
// freshness all run off one schedule.

import {
  bandFromAge,
  type LifecycleBand,
  type LifecycleBandThresholds,
} from "../realtime/lifecycleBands"
import type { StalenessConfig } from "./types"

/**
 * Default canvas alpha per band in graded mode. `fresh` is full; each
 * older band dims further. Override individually via
 * `staleness.graded.opacities`.
 */
export const DEFAULT_STALENESS_BAND_OPACITY: Record<LifecycleBand, number> = {
  fresh: 1,
  aging: 0.7,
  stale: 0.45,
  expired: 0.25,
}

export interface ResolvedStaleness {
  /** Canvas alpha to apply (1 = no dimming). */
  alpha: number
  /**
   * Classified band. In graded mode this is the `bandFromAge` result;
   * in binary mode it collapses to `"fresh"` or `"stale"`.
   */
  band: LifecycleBand
  /** Whether the chart should read as stale (drives the badge). */
  isStale: boolean
}

const FRESH: ResolvedStaleness = { alpha: 1, band: "fresh", isStale: false }

/**
 * Resolve the dimming + band for a given idle duration. Pure — the
 * render path computes idle from `now - lastIngestTime` each paint and
 * the staleness poll uses the same function to decide when to repaint.
 *
 * `idleMs` of 0 (no data yet) is treated as fresh.
 */
export function resolveStaleness(
  staleness: StalenessConfig | undefined,
  idleMs: number
): ResolvedStaleness {
  if (!staleness || !(idleMs > 0)) return FRESH
  // Clamp non-positive thresholds to the default so binary and graded modes
  // agree — `bandFromAge` treats a non-positive TTL as always-fresh, whereas
  // binary `idleMs > 0` would read as always-stale. Neither degenerate reading
  // is intended.
  const threshold =
    staleness.threshold != null && staleness.threshold > 0 ? staleness.threshold : 5000
  const graded = staleness.graded

  if (graded) {
    const opts = typeof graded === "object" ? graded : {}
    const band = bandFromAge(idleMs, threshold, opts.thresholds)
    const opacities = { ...DEFAULT_STALENESS_BAND_OPACITY, ...(opts.opacities ?? {}) }
    return { alpha: opacities[band], band, isStale: band !== "fresh" }
  }

  const stale = idleMs > threshold
  return stale
    ? { alpha: staleness.dimOpacity ?? 0.5, band: "stale", isStale: true }
    : FRESH
}

export type { LifecycleBand, LifecycleBandThresholds }
