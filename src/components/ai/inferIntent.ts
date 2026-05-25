import type { IntentId, BuiltInIntentId } from "./intents"

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
export function inferIntent(query: string): InferIntentResult | null {
  if (typeof query !== "string" || query.trim().length === 0) return null

  const matches = new Map<IntentId, number>()
  for (const pattern of PATTERNS) {
    for (const re of pattern.patterns) {
      if (re.test(query)) {
        const existing = matches.get(pattern.intent) ?? 0
        // First match contributes full weight; subsequent matches of the
        // same intent add diminishing weight (capped at 5).
        const next = Math.min(5, existing === 0 ? pattern.weight : existing + 0.5)
        matches.set(pattern.intent, next)
        break // one match per intent is enough — multiple regex hits within an intent shouldn't dominate
      }
    }
  }

  if (matches.size === 0) return null

  const sorted = Array.from(matches.entries())
    .map(([intent, confidence]) => ({ intent, confidence }))
    .sort((a, b) => b.confidence - a.confidence)

  const [top, ...alternates] = sorted
  return { intent: top.intent, confidence: top.confidence, alternates }
}
