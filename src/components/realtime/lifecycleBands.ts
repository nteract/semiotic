// Temporal lifecycle bands — shared primitive.
//
// Semiotic ships three time-as-encoding systems that all answer "how
// does this thing look as it ages?":
//
//   • `DecayConfig` — continuous opacity ramp keyed on buffer position
//     (per-datum, in the streaming runtime)
//   • `StalenessConfig` — binary live/stale on wall-clock idle
//     (chart-wide, in the streaming runtime)
//   • Annotation lifecycle — 4 named bands on `createdAt` + `ttlHint`
//     (per-annotation, in `semiotic/ai`)
//
// `bandFromAge` is the small piece they can share: a pure classifier
// that maps an age + TTL into one of four named bands. Today it
// powers `annotationFreshnessFor` directly; future per-datum "banded
// decay" (instead of the continuous ramp) and a banded staleness mode
// (instead of binary live/stale) can opt in without each system
// inventing its own thresholds.

/**
 * Named lifecycle bands. Shared by the annotation freshness surface
 * today and available to other temporal-lifecycle policies that opt
 * into banded classification.
 */
export type LifecycleBand = "fresh" | "aging" | "stale" | "expired"

/**
 * Multipliers of `ttlMs` that mark the upper edge of each band. The
 * default schedule:
 *
 *   • `fresh`   — `age < 1.0 × ttl`
 *   • `aging`   — `age < 1.5 × ttl`
 *   • `stale`   — `age < 3.0 × ttl`
 *   • `expired` — `age ≥ 3.0 × ttl`
 *
 * Override individual thresholds; missing entries fall back to the
 * defaults. Setting a smaller value than the previous band's
 * threshold is allowed but produces an unreachable band.
 */
export interface LifecycleBandThresholds {
  /** Upper edge of the `fresh` band, as a multiple of `ttlMs`. Default `1.0`. */
  fresh?: number
  /** Upper edge of the `aging` band, as a multiple of `ttlMs`. Default `1.5`. */
  aging?: number
  /** Upper edge of the `stale` band, as a multiple of `ttlMs`. Default `3.0`. */
  stale?: number
}

export const DEFAULT_LIFECYCLE_THRESHOLDS: Required<LifecycleBandThresholds> = {
  fresh: 1.0,
  aging: 1.5,
  stale: 3.0,
}

/**
 * Classify an age into a named band given a TTL.
 *
 * Pure function. Negative `ageMs` (future-dated items) classifies as
 * `fresh`. Non-finite or non-positive `ttlMs` returns `fresh` rather
 * than diving by zero — callers that need stricter handling should
 * gate `ttlMs` before calling.
 */
export function bandFromAge(
  ageMs: number,
  ttlMs: number,
  thresholds: LifecycleBandThresholds = {}
): LifecycleBand {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) return "fresh"
  if (!Number.isFinite(ageMs) || ageMs < 0) return "fresh"

  const fresh = thresholds.fresh ?? DEFAULT_LIFECYCLE_THRESHOLDS.fresh
  const aging = thresholds.aging ?? DEFAULT_LIFECYCLE_THRESHOLDS.aging
  const stale = thresholds.stale ?? DEFAULT_LIFECYCLE_THRESHOLDS.stale

  if (ageMs < ttlMs * fresh) return "fresh"
  if (ageMs < ttlMs * aging) return "aging"
  if (ageMs < ttlMs * stale) return "stale"
  return "expired"
}
