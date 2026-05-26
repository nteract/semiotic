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

export interface IntentDescriptor {
  id: IntentId
  label: string
  description: string
  /** Soft hint of which chart family typically serves this intent. */
  familyHint?: "time-series" | "categorical" | "distribution" | "relationship" | "flow" | "network" | "hierarchy" | "geo"
}

const BUILT_IN_INTENTS: IntentDescriptor[] = [
  {
    id: "trend",
    label: "Trend over time",
    description: "How a single metric changes over an ordered sequence (typically time).",
    familyHint: "time-series",
  },
  {
    id: "compare-series",
    label: "Compare series",
    description: "Compare multiple measured series across a shared x domain.",
    familyHint: "time-series",
  },
  {
    id: "compare-categories",
    label: "Compare categories",
    description: "Compare a single measure across discrete categories.",
    familyHint: "categorical",
  },
  {
    id: "rank",
    label: "Rank",
    description: "Show category ordering by a measure (largest to smallest).",
    familyHint: "categorical",
  },
  {
    id: "part-to-whole",
    label: "Part to whole",
    description: "Show how individual categories share a total.",
    familyHint: "categorical",
  },
  {
    id: "distribution",
    label: "Distribution",
    description: "Show the shape, spread, and central tendency of a numeric variable.",
    familyHint: "distribution",
  },
  {
    id: "correlation",
    label: "Correlation",
    description: "Show the relationship between two (or more) numeric variables.",
    familyHint: "relationship",
  },
  {
    id: "flow",
    label: "Flow",
    description: "Show movement, transitions, or transfers between states.",
    familyHint: "flow",
  },
  {
    id: "hierarchy",
    label: "Hierarchy",
    description: "Show parent/child structure or nested totals.",
    familyHint: "hierarchy",
  },
  {
    id: "geo",
    label: "Geography",
    description: "Show values bound to geographic locations or regions.",
    familyHint: "geo",
  },
  {
    id: "outlier-detection",
    label: "Outlier detection",
    description: "Surface individual data points that diverge from the rest.",
    familyHint: "distribution",
  },
  {
    id: "composition-over-time",
    label: "Composition over time",
    description: "Show how the share of categories changes across an ordered sequence.",
    familyHint: "time-series",
  },
  {
    id: "change-detection",
    label: "Change detection",
    description: "Surface where or when a metric shifted meaningfully.",
    familyHint: "time-series",
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

/** Sentinel set used by capability authors to opt out of an intent without misspelling. */
export const BUILT_IN_INTENT_IDS: ReadonlySet<BuiltInIntentId> = new Set(
  BUILT_IN_INTENTS.map((intent) => intent.id)
) as ReadonlySet<BuiltInIntentId>
