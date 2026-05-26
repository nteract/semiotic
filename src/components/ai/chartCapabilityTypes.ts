import type { Datum } from "../charts/shared/datumTypes"
import type { DataSummary } from "../data/DataSummarizer"
import type { IntentId } from "./intents"

/**
 * Chart family — high-level taxonomy used for filtering and intent matching.
 */
export type ChartFamily =
  | "time-series"
  | "categorical"
  | "distribution"
  | "relationship"
  | "flow"
  | "network"
  | "hierarchy"
  | "geo"
  | "realtime"
  | "custom"

/**
 * Where a chart is imported from. Used by generators to emit correct import paths.
 */
export type ChartImportPath =
  | "semiotic/xy"
  | "semiotic/ordinal"
  | "semiotic/network"
  | "semiotic/geo"
  | "semiotic/realtime"
  | "semiotic/ai"
  | "semiotic"

/**
 * Familiarity/accuracy/precision rubric (1-5 each).
 * Familiarity = how well-known the chart is to a general audience.
 * Accuracy    = how faithfully it represents the underlying data.
 * Precision   = how readable individual values are.
 */
export interface ChartRubric {
  familiarity: number
  accuracy: number
  precision: number
}

/**
 * The kind of value a field holds, used for axis fitness.
 */
export type FieldKind = "numeric" | "categorical" | "date" | "boolean" | "unknown"

/**
 * A candidate field for a given role (x, y, series, etc.), with a quality score.
 */
export interface FieldCandidate {
  field: string
  kind: FieldKind
  /** 0..1 — how good this field is for the role being considered. */
  quality: number
  /** Field-level stats for downstream scorers. */
  distinctCount?: number
  /** True if the field's values are strictly increasing in row order. */
  monotonic?: boolean
}

/**
 * Profile of a dataset for chart-fitness scoring. Extends DataSummary with
 * shape inference (axis candidates, structure detection, primary roles).
 */
export interface ChartDataProfile extends DataSummary {
  /** Original rows (read-only); used by capabilities to compute their own stats. */
  data: ReadonlyArray<Datum>
  /** Candidate fields per role, sorted best-first. */
  candidates: {
    x: FieldCandidate[]
    y: FieldCandidate[]
    size: FieldCandidate[]
    category: FieldCandidate[]
    series: FieldCandidate[]
    time: FieldCandidate[]
  }
  /** Best-guess primary assignment per role (the top candidate, if any). */
  primary: {
    x?: string
    y?: string
    size?: string
    category?: string
    series?: string
    time?: string
  }
  /** Distinct count of the primary category field, if any. */
  categoryCount?: number
  /** Distinct count of the primary series field, if any. */
  seriesCount?: number
  /** Distinct count of the primary x field, if any. */
  uniqueXCount?: number
  /** True when some x value appears in more than one row (suggests aggregation). */
  hasRepeatedX: boolean
  /** True when the primary x candidate is monotonic. */
  monotonicX: boolean
  /** True when there is at least one date-typed candidate. */
  hasTimeAxis: boolean
  /**
   * How the primary x role was inferred. Capabilities can use this to detect
   * the "scatter fallback" case (x picked only because there were 2+ numerics,
   * not because the field is genuinely an x-axis) and decline to recommend
   * themselves for trend-shaped intents.
   *
   * • "time"   — explicit date/time field
   * • "named"  — numeric whose name matches an x-pattern (month, year, index, …)
   * • "scatter"— filled in via the two-numeric scatter fallback; weak signal
   * • "none"   — no x role inferred
   */
  xProvenance: "time" | "named" | "scatter" | "none"
  /** Source dataset looks like a hierarchy (had a `children` array at root). */
  hasHierarchy: boolean
  /** Source dataset looks like a node/edge graph. */
  hasNetwork: boolean
  /** Source dataset looks like GeoJSON (FeatureCollection). */
  hasGeo: boolean
  /** Extracted network payload when hasNetwork is true. */
  network?: { nodes: ReadonlyArray<Datum>; edges: ReadonlyArray<Datum> }
  /** Extracted hierarchy root when hasHierarchy is true. */
  hierarchy?: Datum
  /** Extracted GeoJSON FeatureCollection when hasGeo is true. */
  geo?: { features: ReadonlyArray<Datum>; points?: ReadonlyArray<Datum>; flows?: ReadonlyArray<Datum> }
}

/**
 * An intent scorer is either a static 0..5 score or a function evaluated against the profile.
 */
export type IntentScorer =
  | number
  | ((profile: ChartDataProfile) => number)

/**
 * Variant — a configuration of the chart that meaningfully changes what it's good for.
 *
 * Variants compose into suggestions. The `intentDeltas` are additive against the
 * base capability's intent scores (clamped to 0..5 by the engine).
 */
export interface ChartVariant {
  key: string
  label: string
  description?: string
  /** Props to merge into the base chart props. */
  props: Record<string, unknown>
  /** Style/role tags (used by consumers like vizmart for filtering). */
  tags?: ReadonlyArray<string>
  /** Per-intent additive score deltas (e.g. {"trend": +1, "outlier-detection": -2}). */
  intentDeltas?: Partial<Record<IntentId, number>>
  /** Rubric deltas — usually small, e.g. smoothing trades precision for familiarity. */
  rubricDeltas?: Partial<ChartRubric>
  /** Caveats specific to this variant — surfaced in suggestion.caveats. */
  caveats?: ReadonlyArray<string>
}

/**
 * Result of a capability's `fits()` gate. `null` means the chart fits. A string
 * is the human-readable reason it doesn't, used for diagnostics and reasoning.
 */
export type FitResult = null | string

/**
 * The capability descriptor each chart ships alongside itself.
 *
 * Charts that declare a capability participate in `suggestCharts`, `useChartSuggestions`,
 * and the `interrogateChart` MCP tool's recommendation surface.
 */
export interface ChartCapability {
  component: string
  family: ChartFamily
  importPath: ChartImportPath
  /** Base rubric, before variant/profile adjustments. */
  rubric: ChartRubric
  /**
   * Hard requirements gate. Return null if the chart can render this profile,
   * or a human-readable string explaining why not (e.g. "no numeric y candidate").
   */
  fits: (profile: ChartDataProfile) => FitResult
  /**
   * Per-intent suitability score (0..5). Missing intents default to 0.
   * Values may be functions for profile-aware scoring.
   */
  intentScores: Partial<Record<IntentId, IntentScorer>>
  /**
   * Variants — different settings that change what the chart is useful for.
   * Suggestion engine emits one suggestion per (capability × variant) pair.
   * If empty, the engine still emits a base suggestion.
   */
  variants?: ReadonlyArray<ChartVariant>
  /** Caveats independent of variants (e.g. "log scale skipped for negative values"). */
  caveats?: (profile: ChartDataProfile) => ReadonlyArray<string>
  /**
   * Build the props you'd pass to this chart for this dataset. Should produce
   * a runnable config (accessor names, etc.) so consumers can `<Component {...props}>`.
   */
  buildProps: (profile: ChartDataProfile, variant?: ChartVariant) => Record<string, unknown>
}

/**
 * One suggestion produced by `suggestCharts`. Consumers render this as a card,
 * pass it to an LLM for re-ranking, or hand the props straight to the chart.
 */
export interface Suggestion {
  component: string
  family: ChartFamily
  importPath: ChartImportPath
  variant?: ChartVariant
  /** Composite score for the ranking intent(s), 0..5. */
  score: number
  /** Per-intent scores after variant deltas. */
  intentScores: Partial<Record<IntentId, number>>
  /** Rubric after variant/profile adjustments. */
  rubric: ChartRubric
  /** Narrative reasons this chart fits — suitable for tooltips or LLM context. */
  reasons: ReadonlyArray<string>
  /** Gotchas / things to be careful about. */
  caveats: ReadonlyArray<string>
  /** Ready-to-spread props. */
  props: Record<string, unknown>
}
