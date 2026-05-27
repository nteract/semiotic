// Annotation provenance + lifecycle — M1 (types only).
//
// Anchored conversations need a defensible answer to "what about stale
// notes when the data changes?" The answer requires every annotation
// to carry provenance (who/where/when) and lifecycle (freshness, TTL,
// anchor strategy). This module defines the type surface only — the
// behavior (`computeAnnotationFreshness`, default visual treatment,
// stable-id re-resolution) lands in M2 and M3.
//
// All fields are optional. Existing annotation arrays keep working
// unchanged — the new blocks attach to whatever annotation shape the
// chart already accepts.

// ── Provenance ────────────────────────────────────────────────────────

/**
 * Where an annotation came from and how confident we should be in it.
 * Lives on `annotation.provenance`.
 */
export interface AnnotationProvenance {
  /** Display name for who created the annotation — a user, agent, or system. */
  author?: string
  /**
   * Origin category. Recognized values are not exhaustive; consumers
   * may extend with their own source labels.
   */
  source?: AnnotationSource
  /**
   * Confidence in the assertion, 0–1. `1` is a hand-placed user
   * annotation; LLM-suggested annotations typically land below 0.8.
   */
  confidence?: number
  /** ISO 8601 timestamp marking when the annotation was created. */
  createdAt?: string
  /**
   * Stable, opaque identifier that survives data refresh and chart
   * recreation. Used by the M3 anchor-resolution algorithm to
   * re-locate "the Q3 spike" after new data arrives.
   */
  stableId?: string
}

/**
 * Recognized provenance sources. Open string union — consumers may
 * pass any other label and it will be preserved.
 */
export type AnnotationSource =
  | "user"
  | "ai"
  | "agent"
  | "import"
  | "computed"
  | "system"
  | (string & {})

// ── Lifecycle ─────────────────────────────────────────────────────────

/**
 * How an annotation ages relative to the chart's current data extent.
 * Default visual treatment (defined in M2): `aging` dims, `stale`
 * draws a dashed border, `expired` is hidden unless
 * `showExpiredAnnotations` is on.
 */
export type AnnotationFreshness = "fresh" | "aging" | "stale" | "expired"

/**
 * How the annotation's anchor is resolved when data updates.
 *
 * - `fixed` — keeps the recorded coordinate verbatim.
 * - `latest` — re-pins to the most recent data point on each refresh.
 * - `sticky` — keeps its position until explicitly removed (same
 *   semantics as `RealtimeLineChart`'s `sticky` annotation anchor).
 * - `semantic` — re-resolves via `provenance.stable_id`, falling
 *   back to the recorded coordinate when the anchor can no longer
 *   be located. Implementation lands in M3.
 */
export type AnnotationAnchor = "fixed" | "latest" | "sticky" | "semantic"

/**
 * Lifecycle state for an annotation. Lives on `annotation.lifecycle`.
 */
export interface AnnotationLifecycle {
  /**
   * Current freshness band. When omitted, `computeAnnotationFreshness`
   * (M2) derives it from `ttlHint` and the data's current temporal
   * extent.
   */
  freshness?: AnnotationFreshness
  /**
   * How long this annotation should be considered fresh. Either an
   * ISO 8601 duration string (`"PT24H"`, `"P7D"`) or a number of
   * milliseconds. The freshness computation walks `fresh → aging
   * → stale → expired` as the chart's "now" advances past
   * `createdAt + ttlHint`.
   */
  ttlHint?: string | number
  /** Anchor resolution strategy. Defaults to `"fixed"` when omitted. */
  anchor?: AnnotationAnchor
}

// ── Authoring helpers ─────────────────────────────────────────────────

/**
 * Carries the new optional blocks onto whatever annotation type the
 * chart accepts. Use as `Annotated<typeof myAnnotation>` for explicit
 * typing, or call `withProvenance()` for inline authoring.
 */
export type Annotated<T> = T & {
  provenance?: AnnotationProvenance
  lifecycle?: AnnotationLifecycle
}

/**
 * Convenience builder — attaches provenance + lifecycle blocks to an
 * annotation without disturbing its existing fields. Returns a new
 * object; does not mutate. Pure function, safe to call in SSR.
 *
 * ```ts
 * withProvenance(
 *   { type: "y-threshold", value: 100, label: "SLA breach" },
 *   {
 *     provenance: { author: "alice", source: "user", createdAt: "2026-05-20T14:00:00Z" },
 *     lifecycle: { ttlHint: "P30D", anchor: "semantic" },
 *   }
 * )
 * ```
 */
export function withProvenance<T extends object>(
  annotation: T,
  blocks: {
    provenance?: AnnotationProvenance
    lifecycle?: AnnotationLifecycle
  }
): Annotated<T> {
  const next: Annotated<T> = { ...annotation }
  if (blocks.provenance) next.provenance = blocks.provenance
  if (blocks.lifecycle) next.lifecycle = blocks.lifecycle
  return next
}
