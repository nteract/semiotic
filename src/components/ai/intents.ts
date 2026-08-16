/**
 * Canonical intent taxonomy for chart suggestion / interrogation.
 *
 * An "intent" is what the user is trying to *see* in the data. Charts declare how
 * well they serve each intent in their capability descriptor. The suggestion engine
 * filters and ranks by intent.
 *
 * The taxonomy is fixed but extensible: consumers can call `registerIntent` to add
 * domain-specific intents at runtime. The IntentId type stays union-of-known so
 * built-in code remains type-safe; registered intents are addressable as plain strings.
 */

export type BuiltInIntentId =
  | "trend"
  | "compare-series"
  | "compare-categories"
  | "rank"
  | "part-to-whole"
  | "distribution"
  | "correlation"
  | "flow"
  | "hierarchy"
  | "geo"
  | "outlier-detection"
  | "composition-over-time"
  | "change-detection"

/**
 * Any intent — built-in or user-registered. Custom intents are plain strings.
 */
export type IntentId = BuiltInIntentId | (string & {})

export type IntentFieldKind = "numeric" | "categorical" | "date" | "boolean" | "unknown"

/**
 * Declarative, JSON-safe signals used by `inferIntent(..., { mode: "schema" })`.
 * Field names are matched as normalized whole tokens, never substrings. The
 * default `minimumFieldMatches` is two (or one when only one signal exists),
 * which keeps a single generic column name from becoming an intent by accident.
 */
export interface IntentSignals {
  fieldNames?: ReadonlyArray<string>
  minimumFieldMatches?: number
  dataShape?: {
    minNumericFields?: number
    minCategoricalFields?: number
    minDateFields?: number
    minBooleanFields?: number
    /** Schema-mode confidence for a matching shape (default 3). */
    confidence?: number
  }
}

export interface IntentDescriptor {
  id: IntentId
  label: string
  description: string
  /** Soft hint of which chart family typically serves this intent. */
  familyHint?: "time-series" | "categorical" | "distribution" | "relationship" | "flow" | "network" | "hierarchy" | "geo"
  /**
   * Existing intents whose capability scores should be blended when this
   * intent is requested. This lets a registered intent rank immediately,
   * without modifying every capability descriptor.
   */
  composes?: ReadonlyArray<IntentId>
  /** Optional non-negative weights keyed by the ids in `composes` (default 1). */
  weights?: Readonly<Partial<Record<IntentId, number>>>
  /** Opt-in field-name and data-shape inference signals. */
  signals?: IntentSignals
}

const fields = (names: string): string[] => names.split(" ")

const BUILT_IN_INTENTS: IntentDescriptor[] = [
  {
    id: "trend",
    label: "Trend over time",
    description: "How a single metric changes over an ordered sequence (typically time).",
    familyHint: "time-series",
    signals: {
      fieldNames: fields("date time timestamp year month quarter period"),
      minimumFieldMatches: 1,
      dataShape: { minNumericFields: 1, minDateFields: 1, confidence: 3.5 },
    },
  },
  {
    id: "compare-series",
    label: "Compare series",
    description: "Compare multiple measured series across a shared x domain.",
    familyHint: "time-series",
    signals: {
      fieldNames: fields("series cohort segment group"),
      minimumFieldMatches: 1,
    },
  },
  {
    id: "compare-categories",
    label: "Compare categories",
    description: "Compare a single measure across discrete categories.",
    familyHint: "categorical",
    signals: {
      fieldNames: fields("category product class type"),
      minimumFieldMatches: 1,
      dataShape: { minNumericFields: 1, minCategoricalFields: 1, confidence: 3 },
    },
  },
  {
    id: "rank",
    label: "Rank",
    description: "Show category ordering by a measure (largest to smallest).",
    familyHint: "categorical",
    signals: {
      fieldNames: fields("rank ranking position order"),
      minimumFieldMatches: 1,
    },
  },
  {
    id: "part-to-whole",
    label: "Part to whole",
    description: "Show how individual categories share a total.",
    familyHint: "categorical",
    signals: {
      fieldNames: fields("share percentage percent portion total"),
      minimumFieldMatches: 1,
    },
  },
  {
    id: "distribution",
    label: "Distribution",
    description: "Show the shape, spread, and central tendency of a numeric variable.",
    familyHint: "distribution",
    signals: {
      fieldNames: fields("frequency bin bucket percentile quantile"),
      minimumFieldMatches: 1,
    },
  },
  {
    id: "correlation",
    label: "Correlation",
    description: "Show the relationship between two (or more) numeric variables.",
    familyHint: "relationship",
    signals: {
      dataShape: { minNumericFields: 2, confidence: 3 },
    },
  },
  {
    id: "flow",
    label: "Flow",
    description: "Show movement, transitions, or transfers between states.",
    familyHint: "flow",
    signals: {
      fieldNames: fields("source target origin destination stage phase step"),
      minimumFieldMatches: 2,
    },
  },
  {
    id: "hierarchy",
    label: "Hierarchy",
    description: "Show parent/child structure or nested totals.",
    familyHint: "hierarchy",
    signals: {
      fieldNames: fields("parent child level depth path"),
      minimumFieldMatches: 2,
    },
  },
  {
    id: "geo",
    label: "Geography",
    description: "Show values bound to geographic locations or regions.",
    familyHint: "geo",
    signals: {
      fieldNames: fields("latitude longitude country state region city postal zip"),
      minimumFieldMatches: 1,
    },
  },
  {
    id: "outlier-detection",
    label: "Outlier detection",
    description: "Surface individual data points that diverge from the rest.",
    familyHint: "distribution",
    signals: {
      fieldNames: fields("anomaly outlier zscore deviation"),
      minimumFieldMatches: 1,
    },
  },
  {
    id: "composition-over-time",
    label: "Composition over time",
    description: "Show how the share of categories changes across an ordered sequence.",
    familyHint: "time-series",
    signals: {
      fieldNames: fields("share percentage percent date time period"),
      minimumFieldMatches: 2,
      dataShape: {
        minNumericFields: 1,
        minCategoricalFields: 1,
        minDateFields: 1,
        confidence: 3.5,
      },
    },
  },
  {
    id: "change-detection",
    label: "Change detection",
    description: "Surface where or when a metric shifted meaningfully.",
    familyHint: "time-series",
    signals: {
      fieldNames: fields("delta change before after variance"),
      minimumFieldMatches: 1,
    },
  },
]

const intentRegistry = new Map<IntentId, IntentDescriptor>(
  BUILT_IN_INTENTS.map((intent) => [intent.id, intent])
)

/** Get an intent descriptor by id, or undefined if not registered. */
export function getIntent(id: IntentId): IntentDescriptor | undefined {
  return intentRegistry.get(id)
}

/** All currently-registered intents (built-in + user-added). */
export function listIntents(): IntentDescriptor[] {
  return Array.from(intentRegistry.values())
}

/**
 * Register a custom intent at runtime. Idempotent — re-registering with the same id
 * replaces the descriptor.
 */
export function registerIntent(intent: IntentDescriptor): void {
  intentRegistry.set(intent.id, intent)
}

function resolveComposedScore(
  id: IntentId,
  scores: Readonly<Partial<Record<IntentId, number>>>,
  visiting: Set<IntentId>,
): number | undefined {
  const direct = scores[id]
  if (Number.isFinite(direct)) return direct

  const descriptor = intentRegistry.get(id)
  if (!descriptor?.composes?.length || visiting.has(id)) return undefined
  visiting.add(id)

  let weightedScore = 0
  let totalWeight = 0
  for (const child of descriptor.composes) {
    const weight = descriptor.weights?.[child] ?? 1
    if (!Number.isFinite(weight) || weight <= 0) continue
    const childScore = resolveComposedScore(child, scores, visiting) ?? 0
    weightedScore += childScore * weight
    totalWeight += weight
  }
  visiting.delete(id)
  return totalWeight > 0 ? weightedScore / totalWeight : undefined
}

/**
 * Materialize requested composed intent scores over a capability's existing
 * scores. Only requested ids are added: registering an intent cannot silently
 * change no-intent/default ranking by adding another value to its mean.
 */
export function expandComposedIntentScores(
  scores: Readonly<Partial<Record<IntentId, number>>>,
  requested: ReadonlyArray<IntentId>,
): Partial<Record<IntentId, number>> {
  const expanded: Partial<Record<IntentId, number>> = { ...scores }
  for (const intent of requested) {
    if (Number.isFinite(expanded[intent])) continue
    const composed = resolveComposedScore(intent, expanded, new Set())
    if (composed !== undefined) expanded[intent] = composed
  }
  return expanded
}

/** Sentinel set used by capability authors to opt out of an intent without misspelling. */
export const BUILT_IN_INTENT_IDS: ReadonlySet<BuiltInIntentId> = new Set(
  BUILT_IN_INTENTS.map((intent) => intent.id)
) as ReadonlySet<BuiltInIntentId>
