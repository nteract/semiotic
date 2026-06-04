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

/**
 * Reveal CSS for M3 progressive disclosure. Density-deferred notes are hidden
 * (opacity 0) until the chart they belong to is hovered or focused. The
 * selectors are scoped to each frame's stable wrapper class so a chart only
 * reveals its *own* deferred notes; `:focus-within` covers keyboard users who
 * focus the canvas (the canvas lives inside the wrapper). Style rules are
 * document-global regardless of where the `<style>` tag lands, so injecting it
 * inside the (pointer-events:none) overlay svg is fine. Identical across charts
 * — duplicate injections are harmless.
 */
export const ANNOTATION_DISCLOSURE_REVEAL_CSS =
  ".annotation-deferred{opacity:0;pointer-events:none;transition:opacity .12s ease}" +
  ".stream-xy-frame:hover .annotation-deferred," +
  ".stream-ordinal-frame:hover .annotation-deferred," +
  ".stream-network-frame:hover .annotation-deferred," +
  ".stream-geo-frame:hover .annotation-deferred," +
  ".stream-xy-frame:focus-within .annotation-deferred," +
  ".stream-ordinal-frame:focus-within .annotation-deferred," +
  ".stream-network-frame:focus-within .annotation-deferred," +
  ".stream-geo-frame:focus-within .annotation-deferred{opacity:1;pointer-events:auto}" +
  "@media (prefers-reduced-motion:reduce){.annotation-deferred{transition:none}}"

/**
 * Cohesion CSS for M5. `"layer"` presents annotations as a distinct editorial
 * layer — the annotation-color and an italic editorial face, overriding the
 * mark colors notes would otherwise inherit. `"blended"` is the default look
 * (notes keep their author/mark colors), so it needs no rule — only the class
 * hook. The `text` selector lets the rule win over per-element `fill`
 * attributes (CSS beats presentation attributes), recoloring note text.
 */
const COHESION_LAYER_CSS =
  ".annotation-cohesion--layer text," +
  ".annotation-cohesion--layer tspan{" +
  "fill:var(--semiotic-annotation-color,var(--semiotic-text-secondary,#666));" +
  "font-style:italic}"

function isDeferred(annotation: Datum): boolean {
  return annotation?._annotationDeferred === true
}

function cohesionMode(annotation: Datum): "blended" | "layer" | null {
  return annotation?.cohesion === "blended" || annotation?.cohesion === "layer"
    ? annotation.cohesion
    : null
}

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
  const anyDeferred = pairs.some((p) => isDeferred(p.annotation))
  const anyCohesion = pairs.some((p) => cohesionMode(p.annotation) != null)
  const anyLayerCohesion = pairs.some((p) => cohesionMode(p.annotation) === "layer")
  // Zero-overhead path: no hierarchy signal, nothing deferred, no cohesion mode.
  if (!anyHierarchySignal && !anyDeferred && !anyCohesion) return pairs.map((p) => p.node)

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

  const rendered = ranked
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((r) => {
      const { p, i, emphasis, readingOrder } = r
      const deferred = isDeferred(p.annotation)

      let node: React.ReactNode = p.node
      if (emphasis === "primary" || emphasis === "secondary" || readingOrder != null) {
        const isInferred = emphasis == null && readingOrder != null
        const className = isInferred
          ? "annotation-emphasis annotation-emphasis--inferred"
          : `annotation-emphasis annotation-emphasis--${emphasis}`

        node = (
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
      }

      // M5 cohesion: tag the note so it reads as part of the chart (`blended`,
      // the default look — class hook only) or as a distinct editorial layer
      // (`layer` — recolored italic via COHESION_LAYER_CSS).
      const cohesion = cohesionMode(p.annotation)
      if (cohesion) {
        node = (
          <g key={`annotation-cohesion-${i}`} className={`annotation-cohesion--${cohesion}`}>
            {node}
          </g>
        )
      }

      // M3 progressive disclosure: a density-deferred note is wrapped in a
      // hidden group revealed on chart hover/focus (see DISCLOSURE_REVEAL_CSS).
      if (deferred) {
        node = (
          <g
            key={`annotation-deferred-${i}`}
            className="annotation-deferred"
            data-annotation-disclosure="deferred"
          >
            {node}
          </g>
        )
      }

      return node
    })

  if (anyDeferred) {
    rendered.unshift(
      <style key="annotation-disclosure-style">{ANNOTATION_DISCLOSURE_REVEAL_CSS}</style>
    )
  }
  if (anyLayerCohesion) {
    rendered.unshift(
      <style key="annotation-cohesion-style">{COHESION_LAYER_CSS}</style>
    )
  }

  return rendered
}
