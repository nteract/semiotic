import type { Datum } from "../charts/shared/datumTypes"
import type { DataSummary } from "../data/DataSummarizer"
import type { NumericContracts } from "../data/numericContracts"
import type { NumericFieldProfile } from "../data/auditData"
import type { IntentId } from "./intents"
import type { NormalizedProfileFieldRoles } from "./fieldRoles"
import type { SuggestionPropContract } from "./suggestionPropContracts"
import type { ChartRecipe, ChartRecipeFrameFamily, MobileDesignDefinition } from "./chartRecipes"
import type {
  ScaleFitFn,
  QualityFitFn,
  ScaleBand,
  CardinalityBand,
  EffectiveScale,
} from "./dataScaleProfile"

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
  | "value"
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
  | "semiotic/physics"
  | "semiotic/value"
  | "semiotic/ai"
  | "semiotic"

export type ChartCandidateKind = "built-in" | "recipe"

export interface WhyCustomExplanation {
  defaultAlternative?: string
  reason: string
  tradeoff?: string
}

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
  /** True when an explicit semantic or encoding role boosted this candidate. */
  hinted?: boolean
}

/**
 * Profile of a dataset for chart-fitness scoring. Extends DataSummary with
 * shape inference (axis candidates, structure detection, primary roles).
 */
export interface ChartDataProfile extends DataSummary {
  /** Original rows (read-only); used by capabilities to compute their own stats. */
  data: ReadonlyArray<Datum>
  /**
   * Per-field numeric health, including invalid/missing counts and extrema.
   * Unlike `fields`, categorical values assigned to a numeric role remain
   * visible here as `nonNumericCount` rather than being silently discarded.
   */
  numericFields?: Readonly<Record<string, NumericFieldProfile>>
  /** Normalized caller-supplied semantic/encoding roles keyed by field. */
  fieldRoles?: NormalizedProfileFieldRoles
  /** Identifier fields, also represented by the `identifier` field role. */
  identifiers?: ReadonlyArray<string>
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
  /**
   * How amenable the (x × series) grid is to stacking. Only populated when both
   * a primary x and series field exist. A stacked area/bar reads as bands only
   * when series share x columns; when most columns hold a single series, the
   * renderer zero-fills the gaps and every layer collapses into an isolated
   * triangular spike instead of a continuous band. Capabilities gate on this to
   * decline stacking on near-unique x (flat record lists, scatter-shaped data).
   */
  stackability?: {
    /** Mean distinct series present per x value. ~1 → spiky; ~seriesCount → dense. */
    seriesPerX: number
    /** Fraction of x columns where 2+ series coexist (where stacking is visible). */
    multiSeriesFraction: number
    /** Number of distinct x columns considered. */
    xColumns: number
  }
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
  /**
   * When set, suggestions use this component instead of `capability.component`
   * (e.g. PieChart's "donut" variant → DonutChart, which actually honors innerRadius).
   */
  component?: string
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
 * Capability-owned enforcement for quantitative fields emitted by buildProps.
 * The engine also recognizes conventional measure accessor names, while this
 * hook covers custom prop vocabularies and direct/computed value components.
 */
export interface ChartFieldPolicy {
  /** Field-valued buildProps keys that encode quantitative measures. */
  measureAccessorProps?: ReadonlyArray<string>
  /**
   * Resolve source fields for direct or computed measure props. This is needed
   * when buildProps emits a number rather than an accessor string.
   */
  measureFields?: (
    profile: ChartDataProfile,
    props: Readonly<Record<string, unknown>>,
    variant?: ChartVariant,
  ) => ReadonlyArray<string>
  /** Explicit escape hatch; omitted/false means identifiers are forbidden. */
  allowIdentifierMeasures?: boolean
}

/** The scene-derived evidence exposed to capability-owned semantic checks. */
export interface SemanticRenderEvidence {
  readonly component: string
  readonly frameType: "xy" | "ordinal" | "network" | "geo" | "physics" | "value"
  readonly empty: boolean
  readonly markCount: number
  readonly markCountByType: Readonly<Record<string, number>>
  readonly xDomain?: readonly [number, number]
  readonly yDomain?: readonly [number, number]
  readonly categories?: ReadonlyArray<string>
  readonly nodeCount?: number
  readonly edgeCount?: number
}

/**
 * A chart-specific semantic problem found after marks rendered. Errors mean
 * the encoding is degenerate for its stated purpose; warnings mean it remains
 * usable but materially weakened.
 */
export interface SemanticViabilityDiagnostic {
  readonly code: string
  readonly severity: "warning" | "error"
  readonly message: string
  readonly fix?: string
  /** Small aggregate values only; never copy source rows into evidence. */
  readonly metrics?: Readonly<Record<string, string | number | boolean>>
}

export type SemanticViabilityCallback = (
  props: Readonly<Datum>,
  evidence: SemanticRenderEvidence,
) => ReadonlyArray<SemanticViabilityDiagnostic>

/** Built-in, JSON-safe semantic rule kinds evaluated by static rendering. */
export interface SemanticViabilityRule {
  readonly kind: "rank-competition"
}

export type SemanticViabilityCheck = SemanticViabilityCallback | SemanticViabilityRule

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
  /** Human-facing name. `component` remains the stable lookup id. */
  displayName?: string
  /** Omitted descriptors are treated as built-ins for backward compatibility. */
  candidateKind?: ChartCandidateKind
  family: ChartFamily
  /** The frame/runtime substrate behind a registered recipe. */
  renderingFamily?: ChartRecipeFrameFamily
  importPath: ChartImportPath
  /** Base rubric, before variant/profile adjustments. */
  rubric: ChartRubric
  /**
   * JSON-safe Semiotic runtime declaration of the numeric assumptions this
   * chart makes about accessor-bound data. Consumed by `auditData` and
   * `diagnoseConfig`; not part of the library-neutral IDID v0.1 subset.
   */
  numericContracts?: NumericContracts
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
  /** Prop-envelope metadata copied onto every suggestion for generic renderers. */
  suggestionPropContract?: SuggestionPropContract
  /** Enforces identifier exclusions across capability-owned buildProps. */
  fieldPolicy?: ChartFieldPolicy
  /**
   * Optional post-render check for encodings that paint marks but cannot carry
   * their intended semantics (for example a bump chart with no rank competition).
   */
  semanticViability?: SemanticViabilityCheck
  /**
   * Variants — different settings that change what the chart is useful for.
   * Suggestion engine emits one suggestion per (capability × variant) pair.
   * If empty, the engine still emits a base suggestion.
   */
  variants?: ReadonlyArray<ChartVariant>
  /** Caveats that may inspect the active variant (e.g. "log scale skipped for negative values"). */
  caveats?: (profile: ChartDataProfile, variant?: ChartVariant) => ReadonlyArray<string>
  /**
   * Build the props you'd pass to this chart for this dataset. Should produce
   * a runnable config (accessor names, etc.) so consumers can `<Component {...props}>`.
   */
  buildProps: (profile: ChartDataProfile, variant?: ChartVariant) => Record<string, unknown>
  /**
   * Optional declaration of this chart's sweet spot under scale. Receives the
   * effective scale (declared `DataScaleProfile` merged with measured profile)
   * and returns a score delta plus optional caveats. Use `scaleHints(...)` from
   * `dataScaleProfile.ts` for the common declarative shape.
   *
   * When omitted, the engine assumes the chart is scale-agnostic and applies
   * no scale bias beyond what `intentScores` already encodes in `profile`.
   */
  scaleFit?: ScaleFitFn
  /**
   * Optional declaration of this chart's response to data quality (missingness,
   * outliers, type heterogeneity). Returns a score delta plus caveats. When
   * omitted, the engine applies a default heuristic that adds caveats for
   * low completeness on the primary y field.
   */
  qualityFit?: QualityFitFn
  /** Mobile design contract for custom recipes and advanced built-ins. */
  mobile?: MobileDesignDefinition
  /** Present only on recipe-derived capabilities. */
  recipe?: ChartRecipe
  /** Positive reception/design rationale appended to suggestion explanations. */
  positiveRationale?: ReadonlyArray<string>
  /** Why this candidate justifies leaving the built-in catalog. */
  whyCustom?: WhyCustomExplanation
}

/**
 * Effective scale range tag on a suggestion. Lets callers group suggestions
 * by their scale sweet spot, detect threshold crossings as data grows, and
 * narrate why a recommendation changed.
 */
export interface SuggestionScaleRange {
  /** Band classification of the row count this suggestion was evaluated against. */
  band: ScaleBand
  /** Cardinality band, if known. */
  cardinalityBand?: CardinalityBand
  /** Effective row count the engine reasoned over (declared or measured). */
  rows: number
  /** Whether the row count came from a user-declared profile or the measured data. */
  rowsSource: "declared" | "measured"
}

/**
 * One suggestion produced by `suggestCharts`. Consumers render this as a card,
 * pass it to an LLM for re-ranking, or hand the props straight to the chart.
 */
export interface Suggestion {
  component: string
  displayName: string
  candidateKind: ChartCandidateKind
  recipeId?: string
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
  /**
   * Machine-readable rules for augmenting and rendering `props`. Present on
   * suggestions returned by current versions; optional for compatibility with
   * the original public suggestion shape.
   */
  propContract?: SuggestionPropContract
  whyCustom?: WhyCustomExplanation
  /**
   * Scale tag — present when scale/quality information is available, either
   * through declared `DataScaleProfile` or through the measured profile.
   * Surfaces what band this chart was scored at so consumers can group by
   * scale, detect threshold crossings, or narrate "the chart for now → at 10×."
   */
  scaleRange?: SuggestionScaleRange
}

/** A successful `scoreChart` result. `status` is optional on the shared
 * Suggestion shape so existing suggestion literals and consumers remain valid. */
export type ScoreChartSuggestion = Suggestion & { status?: "ok" }

/** A requested chart could not be scored against the supplied data. */
export interface ScoreChartRejected {
  status: "rejected"
  reason: string
}

/** Discriminated result returned by `scoreChart`. */
export type ScoreChartResult = ScoreChartSuggestion | ScoreChartRejected

/**
 * Multi-tier grouping of suggestions by scale band. Returned by
 * `suggestChartsGrouped()`.
 *
 * Each tier is a ranked list of suggestions whose `scaleRange.band` falls in
 * that tier. A single chart can appear in multiple tiers when its sweet-spot
 * range spans them — that's the "graduation of views" surface: the same data
 * gets a different chart depending on which scale you're optimizing for.
 */
export interface ScaledSuggestionGroups {
  tiny: Suggestion[]
  small: Suggestion[]
  medium: Suggestion[]
  large: Suggestion[]
  huge: Suggestion[]
  /** The effective scale view the engine reasoned over. */
  effective: EffectiveScale
}
