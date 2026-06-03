import * as React from "react"
import type { Datum } from "./datumTypes"

export type AnnotationEmphasis = "primary" | "secondary"

/** A rendered annotation node paired with the source annotation it came
 *  from, so hierarchy treatment can read metadata after the per-type rule has
 *  produced the node. */
export interface AnnotationRenderPair {
  node: React.ReactNode
  annotation: Datum
}

const EMPHASIS_RANK: Record<AnnotationEmphasis, number> = {
  secondary: 0,
  primary: 3,
}
const DEFAULT_EMPHASIS_RANK = 1
const INFERRED_EMPHASIS_RANK = 2

/** Opacity applied to a `secondary` annotation so primary notes read as
 *  the dominant layer (Rahman et al.'s "Hierarchy" consideration). */
const SECONDARY_EMPHASIS_OPACITY = 0.6
const SECONDARY_EMPHASIS_FONT_SIZE = "0.88em"

const INFERRED_MAX_OPACITY = 0.95
const INFERRED_MIN_OPACITY = 0.72
const INFERRED_OPACITY_STEP = 0.06

function explicitEmphasis(annotation: Datum): AnnotationEmphasis | null {
  return annotation?.emphasis === "primary" || annotation?.emphasis === "secondary"
    ? annotation.emphasis
    : null
}

function provenanceConfidence(annotation: Datum): number | null {
  const c = annotation?.provenance?.confidence
  return typeof c === "number" && Number.isFinite(c)
    ? Math.max(0, Math.min(1, c))
    : null
}

function inferredOpacity(readingOrder: number): number {
  return Math.max(
    INFERRED_MIN_OPACITY,
    INFERRED_MAX_OPACITY - readingOrder * INFERRED_OPACITY_STEP
  )
}

/**
 * Apply annotation hierarchy — Rahman et al.'s "Hierarchy" consideration,
 * reusing the same `emphasis` token charts already accept (`"primary"` /
 * `"secondary"`). A `secondary` annotation dims, shrinks note text through
 * inherited SVG font-size, and yields z-order; a `primary` one paints at full
 * weight and on top.
 *
 * If no explicit emphasis is declared, annotations with
 * `provenance.confidence` get an inferred reading order: confidence
 * descending, then authored array order. The visual output uses that order as
 * a subtle opacity gradient, with higher-confidence notes painted later.
 *
 * Type-agnostic: it wraps whatever the per-type rule produced, so all
 * annotation types get hierarchy without each rule knowing about it.
 *
 * Zero-overhead and structure-preserving when no annotation declares an
 * explicit emphasis or provenance confidence: the original nodes are returned
 * untouched (same keys, same order), so existing charts render identically.
 * Opacity composes multiplicatively with lifecycle freshness opacity.
 */
export function applyAnnotationEmphasis(
  pairs: ReadonlyArray<AnnotationRenderPair>
): React.ReactNode[] {
  const ranked = pairs.map((p, i) => ({
    p,
    i,
    emphasis: explicitEmphasis(p.annotation),
    confidence: provenanceConfidence(p.annotation),
    readingOrder: null as number | null,
    rank: DEFAULT_EMPHASIS_RANK,
  }))

  const anyHierarchySignal = ranked.some(
    (r) => r.emphasis != null || r.confidence != null
  )
  if (!anyHierarchySignal) return pairs.map((p) => p.node)

  const inferredReading = ranked
    .filter((r) => r.emphasis == null && r.confidence != null)
    .slice()
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0) || a.i - b.i)

  inferredReading.forEach((r, readingOrder) => {
    r.readingOrder = readingOrder
    // SVG paints later nodes on top. Reading order is high confidence first,
    // so invert it for paint order: low-confidence notes yield z-order.
    r.rank = INFERRED_EMPHASIS_RANK - readingOrder / Math.max(1, inferredReading.length)
  })

  for (const r of ranked) {
    if (r.emphasis) r.rank = EMPHASIS_RANK[r.emphasis]
  }

  return ranked
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((r) => {
      const { p, i, emphasis, readingOrder } = r
      if (emphasis !== "primary" && emphasis !== "secondary" && readingOrder == null) {
        return p.node
      }

      const isInferred = emphasis == null && readingOrder != null
      const className = isInferred
        ? "annotation-emphasis annotation-emphasis--inferred"
        : `annotation-emphasis annotation-emphasis--${emphasis}`

      return (
        <g
          key={`annotation-emphasis-${i}`}
          className={className}
          {...(emphasis === "secondary"
            ? {
                opacity: SECONDARY_EMPHASIS_OPACITY,
                fontSize: SECONDARY_EMPHASIS_FONT_SIZE,
              }
            : {})}
          {...(isInferred
            ? {
                opacity: inferredOpacity(readingOrder),
                "data-annotation-reading-order": readingOrder,
              }
            : {})}
        >
          {p.node}
        </g>
      )
    })
}
