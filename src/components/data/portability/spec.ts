/**
 * The IDID portability spec — runtime surface (v0.1).
 *
 * The canonical, published artifact is the set of JSON Schemas in `/spec/v0.1`.
 * This module is the reference implementation's *runtime companion*: portable
 * TypeScript types that mirror those schemas, plus small dependency-free
 * structural validators for hosts that don't want to pull in a full JSON-schema
 * engine (per spec doctrine: zero new core dependencies).
 *
 * The schemas are library-neutral — none of these types import from a chart
 * family. Keeping them pure is what lets the ideas travel into ecosystems that
 * have no concept of a Semiotic chart.
 *
 * Field/type fidelity with the published JSON Schemas is enforced by
 * `portability.test.ts` (the round-trip gate), so the two cannot drift.
 */

/** The spec version this build targets. Matches the `/spec/v0.1` directory. */
export const IDID_SPEC_VERSION = "0.1"

/** The 13 built-in communicative intents. Hosts may register more (open string). */
export const BUILTIN_INTENT_IDS = [
  "trend",
  "compare-series",
  "compare-categories",
  "rank",
  "part-to-whole",
  "distribution",
  "correlation",
  "flow",
  "hierarchy",
  "geo",
  "outlier-detection",
  "composition-over-time",
  "change-detection",
] as const

export type BuiltInIntentId = (typeof BUILTIN_INTENT_IDS)[number]
/** Any intent id — built-in or host-registered. */
export type PortableIntentId = BuiltInIntentId | (string & {})

// ── Chart Capability ───────────────────────────────────────────────────────

export interface PortableChartRubric {
  /** How well-known the chart is to a general audience (1–5). */
  familiarity: number
  /** How faithfully it represents the underlying data (1–5). */
  accuracy: number
  /** How readable individual values are (1–5). */
  precision: number
}

export interface PortableChartVariant {
  key: string
  label: string
  description?: string
  intentDeltas?: Partial<Record<PortableIntentId, number>>
  rubricDeltas?: Partial<PortableChartRubric>
  caveats?: ReadonlyArray<string>
  tags?: ReadonlyArray<string>
  /** Implementation-specific props; opaque to the spec. */
  props?: Record<string, unknown>
}

export interface PortableMobileInteractionCapability {
  primary?: string
  alternatives?: ReadonlyArray<string>
  hoverFallback?: string
  targetSize?: number
}

export interface PortableMobileLabelCapability {
  strategy?: string
  minFontSize?: number
}

export interface PortableMobileCustomCapability {
  dataBearingSceneNodes?: boolean
  stableIds?: boolean
  navigationGranularity?: string
}

export interface PortableMobileCapability {
  strategy?: string
  responsive?: boolean
  supportsResponsiveLayout?: boolean
  breakpoints?: ReadonlyArray<number>
  minViewportWidth?: number
  maxMarks?: number
  maxAnnotations?: number
  minimumHitTarget?: number
  summary?: boolean | string
  interaction?: PortableMobileInteractionCapability
  labels?: PortableMobileLabelCapability
  custom?: PortableMobileCustomCapability
}

export interface PortableChartCapability {
  /** Stable chart name (e.g. "BarChart"). */
  component: string
  /** Coarse family — open string ("xy" | "ordinal" | "network" | …). */
  family?: string
  /** Where the implementing library exposes the chart (advisory). */
  importPath?: string
  rubric: PortableChartRubric
  /** Per-intent suitability, 0–5. Missing intents default to 0. */
  intentScores?: Partial<Record<PortableIntentId, number>>
  variants?: ReadonlyArray<PortableChartVariant>
  /** Static, audience-independent caveats. */
  caveats?: ReadonlyArray<string>
  /** Phone-specific design contract for mobile audits and responsive adapters. */
  mobile?: PortableMobileCapability
  tags?: ReadonlyArray<string>
}

// ── Audience Profile ─────────────────────────────────────────────────────────

export type PortableReceptionModality = "visual" | "screen-reader" | "sonified" | "agent"

export interface PortableAudienceTarget {
  direction: "increase" | "decrease"
  /** 1–3; default 1. */
  weight?: number
  reason?: string
}

export interface PortableAudienceProfile {
  name?: string
  /** Per-chart familiarity override, 1–5, keyed by component. */
  familiarity?: Record<string, number>
  /** Adoption targets keyed by component. */
  targets?: Record<string, PortableAudienceTarget>
  exposureLevel?: 0 | 1 | 2
  receptionModality?: PortableReceptionModality
}

// ── Annotation Provenance & Lifecycle ──────────────────────────────────────

/** Open string — recognized: human | agent | watcher | system. */
export type PortableAnnotationActorKind = "human" | "agent" | "watcher" | "system" | (string & {})
/** Open string — recognized: user | ai | agent | import | computed | system. */
export type PortableAnnotationSource = "user" | "ai" | "agent" | "import" | "computed" | "system" | (string & {})
/** Open string — recognized: human-note | statistical-test | rule | llm-inference | external-source | computed. */
export type PortableAnnotationBasis =
  | "human-note"
  | "statistical-test"
  | "rule"
  | "llm-inference"
  | "external-source"
  | "computed"
  | (string & {})

export interface PortableAnnotationProvenance {
  author?: string
  authorKind?: PortableAnnotationActorKind
  source?: PortableAnnotationSource
  basis?: PortableAnnotationBasis
  /** 0–1. */
  confidence?: number
  /** ISO 8601 timestamp. */
  createdAt?: string
  dataVersion?: string
  stableId?: string
}

/** Closed union. */
export type PortableAnnotationFreshness = "fresh" | "aging" | "stale" | "expired"
/** Closed union. */
export type PortableAnnotationStatus = "proposed" | "accepted" | "disputed" | "retracted"
/** Closed union. */
export type PortableAnnotationAnchor = "fixed" | "latest" | "sticky" | "semantic"

export interface PortableAnnotationLifecycle {
  freshness?: PortableAnnotationFreshness
  status?: PortableAnnotationStatus
  /** provenance.stableId of the annotation this one replaces. */
  supersedes?: string
  /** ISO 8601 duration string or milliseconds. */
  ttlHint?: string | number
  anchor?: PortableAnnotationAnchor
}

/** Any annotation may carry the two optional blocks. */
export type PortableAnnotated<T = Record<string, unknown>> = T & {
  provenance?: PortableAnnotationProvenance
  lifecycle?: PortableAnnotationLifecycle
}

// ── Validation ──────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

const FRESHNESS = new Set<string>(["fresh", "aging", "stale", "expired"])
const STATUS = new Set<string>(["proposed", "accepted", "disputed", "retracted"])
const ANCHOR = new Set<string>(["fixed", "latest", "sticky", "semantic"])
const MODALITY = new Set<string>(["visual", "screen-reader", "sonified", "agent"])

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function checkRubricAxis(errors: string[], path: string, v: unknown): void {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 1 || v > 5) {
    errors.push(`${path} must be a number in [1, 5]`)
  }
}

/**
 * Structurally validate a portable chart capability. Dependency-free; mirrors
 * the required/range constraints in chart-capability.schema.json. Not a full
 * JSON-Schema validation — for that, run the published schema through ajv.
 */
export function validatePortableCapability(value: unknown): ValidationResult {
  const errors: string[] = []
  if (!isPlainObject(value)) {
    return { valid: false, errors: ["capability must be an object"] }
  }
  if (typeof value.component !== "string" || value.component.length === 0) {
    errors.push("component is required and must be a non-empty string")
  }
  const rubric = value.rubric
  if (!isPlainObject(rubric)) {
    errors.push("rubric is required and must be an object")
  } else {
    checkRubricAxis(errors, "rubric.familiarity", rubric.familiarity)
    checkRubricAxis(errors, "rubric.accuracy", rubric.accuracy)
    checkRubricAxis(errors, "rubric.precision", rubric.precision)
  }
  if (value.intentScores !== undefined) {
    if (!isPlainObject(value.intentScores)) {
      errors.push("intentScores must be an object")
    } else {
      for (const [k, score] of Object.entries(value.intentScores)) {
        if (typeof score !== "number" || score < 0 || score > 5) {
          errors.push(`intentScores.${k} must be a number in [0, 5]`)
        }
      }
    }
  }
  if (value.variants !== undefined) {
    if (!Array.isArray(value.variants)) {
      errors.push("variants must be an array")
    } else {
      value.variants.forEach((variant, i) => {
        if (!isPlainObject(variant)) {
          errors.push(`variants[${i}] must be an object`)
          return
        }
        if (typeof variant.key !== "string") errors.push(`variants[${i}].key is required`)
        if (typeof variant.label !== "string") errors.push(`variants[${i}].label is required`)
      })
    }
  }
  if (value.mobile !== undefined) {
    if (!isPlainObject(value.mobile)) {
      errors.push("mobile must be an object")
    } else {
      const mobile = value.mobile
      for (const key of ["minViewportWidth", "maxMarks", "maxAnnotations", "minimumHitTarget"]) {
        const v = mobile[key]
        if (v !== undefined && (typeof v !== "number" || !Number.isFinite(v))) {
          errors.push(`mobile.${key} must be a number`)
        }
      }
      if (mobile.breakpoints !== undefined) {
        if (!Array.isArray(mobile.breakpoints)) {
          errors.push("mobile.breakpoints must be an array")
        } else {
          mobile.breakpoints.forEach((v, i) => {
            if (typeof v !== "number" || !Number.isFinite(v)) {
              errors.push(`mobile.breakpoints[${i}] must be a number`)
            }
          })
        }
      }
      if (mobile.interaction !== undefined && !isPlainObject(mobile.interaction)) {
        errors.push("mobile.interaction must be an object")
      }
      if (mobile.labels !== undefined && !isPlainObject(mobile.labels)) {
        errors.push("mobile.labels must be an object")
      }
      if (mobile.custom !== undefined && !isPlainObject(mobile.custom)) {
        errors.push("mobile.custom must be an object")
      }
    }
  }
  return { valid: errors.length === 0, errors }
}

/** Structurally validate a portable audience profile. */
export function validatePortableAudienceProfile(value: unknown): ValidationResult {
  const errors: string[] = []
  if (!isPlainObject(value)) {
    return { valid: false, errors: ["audience profile must be an object"] }
  }
  if (value.familiarity !== undefined) {
    if (!isPlainObject(value.familiarity)) {
      errors.push("familiarity must be an object")
    } else {
      for (const [k, f] of Object.entries(value.familiarity)) {
        if (typeof f !== "number" || f < 1 || f > 5) {
          errors.push(`familiarity.${k} must be a number in [1, 5]`)
        }
      }
    }
  }
  if (value.targets !== undefined) {
    if (!isPlainObject(value.targets)) {
      errors.push("targets must be an object")
    } else {
      for (const [k, t] of Object.entries(value.targets)) {
        if (!isPlainObject(t) || (t.direction !== "increase" && t.direction !== "decrease")) {
          errors.push(`targets.${k}.direction must be "increase" or "decrease"`)
        } else if (t.weight !== undefined && (typeof t.weight !== "number" || t.weight < 1 || t.weight > 3)) {
          errors.push(`targets.${k}.weight must be a number in [1, 3]`)
        }
      }
    }
  }
  if (value.exposureLevel !== undefined && ![0, 1, 2].includes(value.exposureLevel as number)) {
    errors.push("exposureLevel must be 0, 1, or 2")
  }
  if (value.receptionModality !== undefined && !MODALITY.has(value.receptionModality as string)) {
    errors.push(`receptionModality must be one of ${[...MODALITY].join(", ")}`)
  }
  return { valid: errors.length === 0, errors }
}

/**
 * Structurally validate the provenance + lifecycle blocks on an annotation.
 * Validates only the two IDID blocks; the rest of the annotation (positional
 * fields, type, label) is the host's concern.
 */
export function validatePortableAnnotation(value: unknown): ValidationResult {
  const errors: string[] = []
  if (!isPlainObject(value)) {
    return { valid: false, errors: ["annotation must be an object"] }
  }
  const prov = value.provenance
  if (prov !== undefined) {
    if (!isPlainObject(prov)) {
      errors.push("provenance must be an object")
    } else {
      if (prov.confidence !== undefined && (typeof prov.confidence !== "number" || prov.confidence < 0 || prov.confidence > 1)) {
        errors.push("provenance.confidence must be a number in [0, 1]")
      }
      if (prov.createdAt !== undefined && (typeof prov.createdAt !== "string" || Number.isNaN(Date.parse(prov.createdAt)))) {
        errors.push("provenance.createdAt must be an ISO 8601 date-time string")
      }
    }
  }
  const life = value.lifecycle
  if (life !== undefined) {
    if (!isPlainObject(life)) {
      errors.push("lifecycle must be an object")
    } else {
      if (life.freshness !== undefined && !FRESHNESS.has(life.freshness as string)) {
        errors.push(`lifecycle.freshness must be one of ${[...FRESHNESS].join(", ")}`)
      }
      if (life.status !== undefined && !STATUS.has(life.status as string)) {
        errors.push(`lifecycle.status must be one of ${[...STATUS].join(", ")}`)
      }
      if (life.anchor !== undefined && !ANCHOR.has(life.anchor as string)) {
        errors.push(`lifecycle.anchor must be one of ${[...ANCHOR].join(", ")}`)
      }
      if (life.ttlHint !== undefined && typeof life.ttlHint !== "string" && typeof life.ttlHint !== "number") {
        errors.push("lifecycle.ttlHint must be an ISO 8601 duration string or a number of milliseconds")
      }
    }
  }
  return { valid: errors.length === 0, errors }
}
