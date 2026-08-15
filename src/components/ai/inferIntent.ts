import {
  listIntents,
  type IntentFieldKind,
  type IntentId,
  type BuiltInIntentId
} from "./intents"

/**
 * Pure-heuristic mapping from a natural-language query to a canonical intent.
 *
 * Designed for chat-style interrogation surfaces (vizmart's Shopkeeper, any
 * "ask the chart" UI) where the user types in their own words and the
 * suggestion engine needs an intent to rank by. Built on regex patterns —
 * fast, zero-dependency, offline. Returns the single best-matching intent
 * or `null` if nothing clearly applies.
 *
 * Consumers who want a richer mapping (handling negation, multi-intent
 * queries, domain jargon) should layer their own LLM call on top of this
 * heuristic — it's a good cheap default, not a replacement.
 */

interface IntentPattern {
  intent: BuiltInIntentId
  /** Patterns that should match the query (case-insensitive). Any match wins. */
  patterns: RegExp[]
  /** Weight when multiple intents match — higher wins ties. */
  weight: number
}

const PATTERNS: IntentPattern[] = [
  {
    intent: "outlier-detection",
    weight: 4,
    patterns: [
      /\b(outlier|outliers|anomal|anomaly|anomalies|extreme|extremes|unusual|stands? out|sticks? out|odd one)\b/i,
      /\b(peak|peaks|highest|lowest|biggest spike|spike|min|max|maximum|minimum)\b/i,
    ],
  },
  {
    intent: "trend",
    weight: 4,
    patterns: [
      /\b(trend|trends|trending|trajectory|over time|across time|growth|decline|rising|falling|increasing|decreasing)\b/i,
      /\b(history|historical|evolved|evolution|change over)\b/i,
    ],
  },
  {
    intent: "change-detection",
    weight: 3,
    patterns: [
      /\b(when did|what changed|shift|shifted|breakpoint|inflection|turning point|sudden|abrupt)\b/i,
    ],
  },
  {
    intent: "rank",
    weight: 4,
    patterns: [
      /\b(rank|ranking|ranked|biggest|smallest|largest|order by|sorted|best|worst|leaderboard)\b/i,
      /\btop\s+(\d+|sellers?|performers?|picks?|results?|categories|items?)\b/i,
      /\bbottom\s+(\d+|results?|items?)\b/i,
      /\b(who has the most|which.*most|which.*highest|which.*lowest)\b/i,
    ],
  },
  {
    intent: "part-to-whole",
    weight: 4,
    patterns: [
      /\b(share|shares|composition|portion|portions|fraction|percentage of|percent of|breakdown|make up|made up of|slice|slices)\b/i,
      /\b(part of|part to whole|piece of the pie|how much of)\b/i,
    ],
  },
  {
    intent: "composition-over-time",
    weight: 5, // outranks plain "trend" + "part-to-whole" when both appear
    patterns: [
      /\b(composition.*time|share.*over time|share.*across|how.*mix.*changed|stacked.*time)\b/i,
      /\b(over time.*share|over time.*composition|over time.*breakdown)\b/i,
    ],
  },
  {
    intent: "distribution",
    weight: 4,
    patterns: [
      /\b(distribution|distributions|spread|variance|variation|histogram|skew|skewed|range of|how.*spread|shape of|bell curve)\b/i,
      /\b(typical value|typical range|where do most|mode|median)\b/i,
    ],
  },
  {
    intent: "correlation",
    weight: 4,
    patterns: [
      /\b(correl|correlation|relationship|related to|connected to|associated|connection between|relate to)\b/i,
      /\b(\w+ vs\.? \w+|\w+ versus \w+|\w+ against \w+|scatter)\b/i,
    ],
  },
  {
    intent: "compare-series",
    weight: 3,
    patterns: [
      /\b(compare.*series|compare.*groups|compare.*cohorts|side by side|group.*vs|series.*vs)\b/i,
      /\b(how do.*compare|each group|each series|each cohort)\b/i,
    ],
  },
  {
    intent: "compare-categories",
    weight: 3,
    patterns: [
      /\b(compare.*categor|category.*compar|which is bigger|how does.*compare|differences? between)\b/i,
    ],
  },
  {
    intent: "flow",
    weight: 4,
    patterns: [
      /\b(flow|flows|transition|transitions|movement|moved from|funnel|conversion|drop[- ]off|sankey|chord)\b/i,
      /\b(from.*to|source.*target|path|journey|pipeline)\b/i,
    ],
  },
  {
    intent: "hierarchy",
    weight: 4,
    patterns: [
      /\b(hierarchy|hierarchical|tree|nested|parent.*child|subcategory|sub-?categor|drill down|drilldown|breakdown by level)\b/i,
    ],
  },
  {
    intent: "geo",
    weight: 5, // geographic mentions are almost always intent-defining
    patterns: [
      // Strong: explicitly geographic vocabulary that's unambiguous
      /\b(geographic|geography|geospatial|map|maps|country|countries|cities|latitude|longitude|spatial|cartogr|choropleth)\b/i,
      // Medium: "city" alone, "state" only when clearly a place
      /\b(city|us state|each state|the states)\b/i,
      // "across" + place noun is a strong geo signal (regions get caught here)
      /\bacross\s+(countries|states|regions|cities|the world|the country)\b/i,
    ],
  },
]

export interface InferIntentResult {
  intent: IntentId
  /** 1..5 score for ranking ties. Higher = stronger match. */
  confidence: number
  /** Other plausible intents, sorted by confidence. */
  alternates: ReadonlyArray<{ intent: IntentId; confidence: number }>
  /** Which inference channel supported the winning intent. */
  source: "prose" | "field-name" | "data-shape" | "combined"
}

export interface InferIntentField {
  name: string
  /** Common schema aliases such as `number`, `integer`, and `datetime` are normalized. */
  kind?: IntentFieldKind | (string & {})
  /** Optional schema role; retained for forward-compatible registered schemas. */
  role?: string
}

export interface InferIntentOptions {
  /**
   * `prose` preserves the original natural-language behavior. `schema` uses
   * only field-name/data-shape signals. `combined` considers both channels.
   */
  mode?: "prose" | "schema" | "combined"
  /** Schema fields. Strings are shorthand for `{ name }`. */
  fields?: ReadonlyArray<string | InferIntentField>
  /** Minimum winning score. Schema inference defaults to 3 to limit weak guesses. */
  minimumConfidence?: number
}

type AccumulatedMatch = [confidence: number, sourceMask: number]

const PROSE_SOURCE = 1
const FIELD_SOURCE = 2
const SHAPE_SOURCE = 4

function addMatch(
  matches: Map<IntentId, AccumulatedMatch>,
  intent: IntentId,
  confidence: number,
  source: number,
): void {
  if (!Number.isFinite(confidence)) return
  const bounded = Math.max(0, Math.min(5, confidence))
  const existing = matches.get(intent)
  if (!existing) {
    matches.set(intent, [bounded, source])
    return
  }
  existing[0] = Math.max(existing[0], bounded)
  existing[1] |= source
}

function normalizeKind(kind: string | undefined): IntentFieldKind {
  const value = kind?.trim().toLowerCase() ?? ""
  if (/^(num|int|float|double|decimal)/.test(value)) return "numeric"
  if (/^(cat|string|enum|nominal|ordinal)/.test(value)) return "categorical"
  if (/^(date|time|temp)/.test(value)) return "date"
  if (/^bool/.test(value)) return "boolean"
  return "unknown"
}

function normalizedFieldTokens(value: string): string[] {
  const words = value
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
  return words.flatMap((word) => [
    word,
    word.length > 4 && word.endsWith("ies")
      ? `${word.slice(0, -3)}y`
      : word.length > 3 && word.endsWith("s") && !word.endsWith("ss")
        ? word.slice(0, -1)
        : word
  ])
}

function collectSchemaMatches(
  query: string,
  fieldsInput: InferIntentOptions["fields"],
  matches: Map<IntentId, AccumulatedMatch>,
): void {
  const source = fieldsInput?.length ? fieldsInput : query.trim().split(/\s+/)
  const fields = source.map((field) => (typeof field === "string" ? { name: field } : field))
  if (fields.length === 0) return

  const fieldTokens = new Set(fields.flatMap((field) => normalizedFieldTokens(field.name)))
  const kindCounts: Partial<Record<IntentFieldKind, number>> = {}
  for (const field of fields) {
    const kind = normalizeKind(field.kind)
    kindCounts[kind] = (kindCounts[kind] ?? 0) + 1
  }

  for (const descriptor of listIntents()) {
    const signals = descriptor.signals
    if (!signals) continue

    const names = signals.fieldNames ?? []
    if (names.length > 0) {
      const matchedNames = names.filter((signal) => {
        const signalTokens = normalizedFieldTokens(signal)
        return (
          signalTokens.length > 0 &&
          signalTokens.every((token) => fieldTokens.has(token))
        )
      }).length
      const defaultMinimum = Math.min(2, names.length)
      const minimum = Math.max(1, signals.minimumFieldMatches ?? defaultMinimum)
      if (matchedNames >= minimum) {
        addMatch(matches, descriptor.id, Math.min(5, 2.5 + matchedNames * 0.75), FIELD_SOURCE)
      }
    }

    const shape = signals.dataShape
    if (!shape) continue
    const requirements = Object.entries(shape).filter(([key]) => key.startsWith("min"))
    if (
      requirements.length > 0 &&
      requirements.every(([key, minimum]) => {
        const kind = key.slice(3, -6).toLowerCase() as IntentFieldKind
        return (kindCounts[kind] ?? 0) >= Number(minimum)
      })
    ) {
      addMatch(matches, descriptor.id, shape.confidence ?? 3, SHAPE_SOURCE)
    }
  }
}

/**
 * Map a natural-language query to a built-in intent. Returns `null` when no
 * pattern matches with meaningful confidence.
 *
 * @example
 * inferIntent("when did revenue peak?")
 *   // → { intent: "outlier-detection", confidence: 4, alternates: [] }
 * inferIntent("show me the trend over time")
 *   // → { intent: "trend", confidence: 4, alternates: [] }
 * inferIntent("hello")
 *   // → null
 */
export function inferIntent(query: string, options: InferIntentOptions = {}): InferIntentResult | null {
  if (typeof query !== "string") return null
  const mode = options.mode ?? "prose"
  if (!query.trim() && (mode === "prose" || !options.fields?.length)) {
    return null
  }

  const matches = new Map<IntentId, AccumulatedMatch>()
  if (mode === "prose" || mode === "combined") {
    for (const pattern of PATTERNS) {
      for (const re of pattern.patterns) {
        if (re.test(query)) {
          const existing = matches.get(pattern.intent)?.[0] ?? 0
          // First match contributes full weight; subsequent matches of the
          // same intent add diminishing weight (capped at 5).
          const next = Math.min(5, existing === 0 ? pattern.weight : existing + 0.5)
          addMatch(matches, pattern.intent, next, PROSE_SOURCE)
          break
        }
      }
    }
  }
  if (mode === "schema" || mode === "combined") {
    collectSchemaMatches(query, options.fields, matches)
  }

  if (matches.size === 0) return null

  const sorted = [...matches]
    .sort((a, b) => b[1][0] - a[1][0])

  const [top, ...alternates] = sorted
  if (top[1][0] < (options.minimumConfidence ?? 3)) return null
  const source = top[1][1]
  return {
    intent: top[0],
    confidence: top[1][0],
    alternates: alternates.map(([intent, [confidence]]) => ({
      intent,
      confidence,
    })),
    source:
      source === PROSE_SOURCE
        ? "prose"
        : source === FIELD_SOURCE
          ? "field-name"
          : source === SHAPE_SOURCE
            ? "data-shape"
            : "combined",
  }
}
