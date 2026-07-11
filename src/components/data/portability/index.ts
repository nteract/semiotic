/**
 * IDID portability spec — runtime surface (v0.1, experimental).
 *
 * Library-neutral types, dependency-free validators, an outbound Vega-Lite
 * translator, and the IDID-over-Vega-Lite binding. The canonical published
 * artifact is the JSON Schema set in `/spec/v0.1`.
 *
 * Exposed via `semiotic/experimental` behind the `unstable_` prefix while the
 * surface is proven against real consumers.
 */
export {
  IDID_SPEC_VERSION,
  BUILTIN_INTENT_IDS,
  validatePortableCapability,
  validatePortableAudienceProfile,
  validatePortableAnnotation,
} from "./spec"
export type {
  BuiltInIntentId,
  PortableIntentId,
  PortableChartRubric,
  PortableChartVariant,
  PortableMobileInteractionCapability,
  PortableMobileLabelCapability,
  PortableMobileCustomCapability,
  PortableMobileCapability,
  PortableChartCapability,
  PortableReceptionModality,
  PortableAudienceTarget,
  PortableAudienceProfile,
  PortableAnnotationActorKind,
  PortableAnnotationSource,
  PortableAnnotationBasis,
  PortableAnnotationProvenance,
  PortableAnnotationFreshness,
  PortableAnnotationStatus,
  PortableAnnotationAnchor,
  PortableAnnotationLifecycle,
  PortableAnnotated,
  ValidationResult,
} from "./spec"
export {
  toVegaLite,
  toVegaLiteResult,
  attachIDID,
  readIDID,
  attachIDIDAnnotations,
  readIDIDAnnotations,
} from "./vegaLite"
export type {
  IDIDVegaLiteMeta,
  ToVegaLiteOptions,
  VegaLiteExportResult,
} from "./vegaLite"
export {
  fromVegaLiteResult,
  unwrapIDIDEnrichedVegaLiteSpec,
} from "../fromVegaLite"
export type {
  FromVegaLiteOptions,
  VegaLiteImportResult,
} from "../fromVegaLite"
export type {
  PortabilityStatus,
  PortabilityDiagnosticSeverity,
  PortabilityDiagnostic,
  PortabilityLoss,
  PortabilityProvenance,
  PortabilityResult,
  PortabilityImportResult,
  PortabilityExportResult,
} from "./result"
