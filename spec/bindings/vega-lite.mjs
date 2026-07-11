/**
 * IDID-over-Vega-Lite binding — standalone reference implementation.
 *
 * Zero dependencies, zero Semiotic imports. This is the proof that the IDID
 * portability spec (../README.md, ../v0.1/*.schema.json) is implementable in
 * any stack: it carries the three IDID primitives — chart capability, audience
 * profile, and provenanced/lifecycled annotations — on an ordinary Vega-Lite
 * spec, so the spec and its meaning travel together.
 *
 * Copy this file into your codebase and use it directly; it does not depend on
 * Semiotic and never will. Semiotic ships a TypeScript equivalent
 * (`semiotic/experimental`) that produces byte-compatible output, so a spec
 * enriched here is read correctly there and vice versa.
 *
 * Convention (see ../README.md):
 *   - capability + audience ride under `usermeta.idid.{capability,audience}`
 *   - annotations ride verbatim under `usermeta.idid.annotations`, with
 *     best-effort `rule`/`text` courtesy marks appended so a plain Vega-Lite
 *     renderer still draws something.
 */

export const IDID_SPEC_VERSION = "0.1"
const ANNOTATION_LAYER_ROLE = "annotation-layer"

/** Read the IDID metadata block off a Vega-Lite spec, or undefined. */
export function readIdid(spec) {
  return spec && spec.usermeta ? spec.usermeta.idid : undefined
}

/**
 * Attach a chart capability and/or an audience profile under `usermeta.idid`.
 * Returns a new spec; the input is not mutated.
 */
export function attachIdid(spec, { capability, audience } = {}) {
  const idid = { ...readIdid(spec), specVersion: IDID_SPEC_VERSION }
  if (capability) idid.capability = capability
  if (audience) idid.audience = audience
  return { ...spec, usermeta: { ...(spec && spec.usermeta), idid } }
}

/**
 * Carry provenanced/lifecycled annotations on the spec. They are stored
 * verbatim under `usermeta.idid.annotations`; any annotation with a
 * representable shape also emits a best-effort mark in an appended layer.
 * Returns a new spec; the input is not mutated.
 */
export function attachIdidAnnotations(spec, annotations = []) {
  const idid = { ...readIdid(spec), specVersion: IDID_SPEC_VERSION, annotations: [...annotations] }

  const courtesy = annotations.map(annotationToMark).filter(Boolean)
  if (courtesy.length === 0) {
    return { ...spec, usermeta: { ...(spec && spec.usermeta), idid } }
  }

  const baseLayers = Array.isArray(spec && spec.layer) ? spec.layer : [viewOf(spec)]
  const { mark, encoding, data, transform, usermeta, ...top } = spec || {}
  return {
    ...top,
    usermeta: { ...(spec && spec.usermeta), idid },
    layer: [...baseLayers, ...courtesy],
  }
}

/** Read provenanced annotations back off a Vega-Lite spec. */
export function readIdidAnnotations(spec) {
  const idid = readIdid(spec)
  return idid && Array.isArray(idid.annotations) ? idid.annotations : []
}

/**
 * Extract the inputs an IDID-aware host routes through a chart-suggestion
 * engine. Library-neutral: pass the result to whatever ranker you use
 * (Semiotic's `suggestCharts`, your own heuristic, an LLM call). Returns null
 * when the spec carries no IDID metadata.
 */
export function suggestionInputFromSpec(spec) {
  const idid = readIdid(spec)
  if (!idid) return null
  return { capability: idid.capability, audience: idid.audience }
}

// ── helpers ──────────────────────────────────────────────────────────────────

/** The view-level fields of a single-view spec, for use as a layer entry. */
function viewOf(spec) {
  const out = {}
  if (!spec) return out
  if (spec.mark) out.mark = spec.mark
  if (spec.encoding) out.encoding = spec.encoding
  if (spec.data) out.data = spec.data
  if (spec.transform) out.transform = spec.transform
  return out
}

/** Best-effort Vega-Lite mark for a representable annotation, else null. */
function annotationToMark(annotation) {
  const tag = { usermeta: { idid: { role: ANNOTATION_LAYER_ROLE } } }
  switch (annotation && annotation.type) {
    case "y-threshold":
      return { mark: "rule", encoding: { y: { datum: annotation.value } }, ...tag }
    case "x-threshold":
      return { mark: "rule", encoding: { x: { datum: annotation.value } }, ...tag }
    case "callout":
    case "label":
    case "text":
      return typeof annotation.label === "string"
        ? { mark: { type: "text", text: annotation.label }, ...tag }
        : null
    default:
      return null
  }
}
