/**
 * Experimental entry point for temporary adapters and unstable previews.
 *
 * Anything imported from "semiotic/experimental" is intentionally outside
 * Semiotic's stable public API. Exports may be renamed, moved, or removed
 * without a deprecation window and are excluded from stable API-surface and
 * bundle-size gates.
 */

// PR-preview surface for the GoFish collaboration. The adapter is intentionally
// named `unstable-gofish-displaylist-adapter`; it is available here so GoFish
// can test against Semiotic's custom chart pipeline without promoting the API
// to the normal recipe catalog. It consumes GoFish's *DisplayList* render IR —
// the baked, viewport-locked output of `toDisplayList({ w, h })`.
export {
  EXPERIMENTAL_GOFISH_ADAPTER_NAME,
  unstable_fromGofishIR
} from "./recipes/gofishIR"
export type {
  GofishDisplayListDocument as UnstableGofishDisplayListDocument,
  GofishDisplayItem as UnstableGofishDisplayItem,
  GofishChartConfig as UnstableGofishChartConfig,
  FromGofishIROptions as UnstableFromGofishIROptions
} from "./recipes/gofishIR"
export {
  gofishIRExamples as unstable_gofishIRExamples,
  flowerIR as unstable_gofishFlowerIR,
  treemapIR as unstable_gofishTreemapIR,
  bottleIR as unstable_gofishBottleIR,
  bobaIR as unstable_gofishBobaIR,
  pythonIR as unstable_gofishPythonIR
} from "./recipes/gofishIRExamples"
export type { GofishIRExample as UnstableGofishIRExample } from "./recipes/gofishIRExamples"

// ── IDID portability spec (v0.1) ────────────────────────────────────────────
// The library-neutral schema surface that carries the IDID primitives —
// chart capability, audience profile, annotation provenance/lifecycle — into
// other ecosystems. Canonical schemas live in /spec/v0.1. Staged behind
// `unstable_` while the runtime surface is proven against real consumers; the
// JSON Schemas themselves are the stable artifact. `toVegaLite` graduates to
// `semiotic/data` alongside `fromVegaLite` once it clears the bundle-size gate.
export {
  IDID_SPEC_VERSION,
  BUILTIN_INTENT_IDS as unstable_BUILTIN_INTENT_IDS,
  validatePortableCapability as unstable_validatePortableCapability,
  validatePortableAudienceProfile as unstable_validatePortableAudienceProfile,
  validatePortableAnnotation as unstable_validatePortableAnnotation,
  toVegaLite as unstable_toVegaLite,
  attachIDID as unstable_attachIDID,
  readIDID as unstable_readIDID,
  attachIDIDAnnotations as unstable_attachIDIDAnnotations,
  readIDIDAnnotations as unstable_readIDIDAnnotations
} from "./data/portability"
// Observable Plot → ChartConfig adapter (§5.1). A sibling to the stable
// `fromVegaLite`, staged behind `unstable_` while the imperative-JS → declarative
// translation is proven against real Plot specs (D5). Promotes to `semiotic/data`
// once it clears a fixture suite + a real consumer.
export { fromObservablePlot as unstable_fromObservablePlot } from "./data/fromObservablePlot"
// Mermaid → layered graph adapter (§5.4). Parses graph/flowchart text and
// computes a longest-path layering (a flowchart is a DAG, not a force graph —
// D7), ready for the lineageDagLayout recipe. Staged behind `unstable_` (D5);
// the parser is a small dedicated one, never a Mermaid runtime dependency (D2).
export { fromMermaid as unstable_fromMermaid } from "./data/fromMermaid"
export type {
  MermaidResult as UnstableMermaidResult,
  MermaidNode as UnstableMermaidNode,
  MermaidEdge as UnstableMermaidEdge,
  MermaidDirection as UnstableMermaidDirection,
  MermaidNodeShape as UnstableMermaidNodeShape
} from "./data/fromMermaid"
export type {
  ObservablePlotSpec as UnstableObservablePlotSpec,
  ObservablePlotMark as UnstableObservablePlotMark,
  ObservablePlotMarkOptions as UnstableObservablePlotMarkOptions,
  ObservablePlotScale as UnstableObservablePlotScale,
  ObservablePlotChannel as UnstableObservablePlotChannel
} from "./data/fromObservablePlot"

export type {
  BuiltInIntentId as UnstableBuiltInIntentId,
  PortableIntentId as UnstablePortableIntentId,
  PortableChartRubric as UnstablePortableChartRubric,
  PortableChartVariant as UnstablePortableChartVariant,
  PortableMobileInteractionCapability as UnstablePortableMobileInteractionCapability,
  PortableMobileLabelCapability as UnstablePortableMobileLabelCapability,
  PortableMobileCustomCapability as UnstablePortableMobileCustomCapability,
  PortableMobileCapability as UnstablePortableMobileCapability,
  PortableChartCapability as UnstablePortableChartCapability,
  PortableReceptionModality as UnstablePortableReceptionModality,
  PortableAudienceTarget as UnstablePortableAudienceTarget,
  PortableAudienceProfile as UnstablePortableAudienceProfile,
  PortableAnnotationProvenance as UnstablePortableAnnotationProvenance,
  PortableAnnotationLifecycle as UnstablePortableAnnotationLifecycle,
  PortableAnnotated as UnstablePortableAnnotated,
  ValidationResult as UnstablePortabilityValidationResult,
  IDIDVegaLiteMeta as UnstableIDIDVegaLiteMeta
} from "./data/portability"
