import type { ChartRubric } from "./chartCapabilityTypes"
import type { IntentId } from "./intents"

/**
 * Streaming chart selection has a different shape than static. We don't have
 * rows yet — we have a *schema*: which fields will arrive, what types, plus
 * environment hints (throughput, retention).
 *
 * Rather than overloading `profileData` (which is row-statistics-centric) we
 * model streams as a parallel API. The two share the intent vocabulary —
 * "trend" still means trend — but the suitability logic is its own thing.
 */

export type StreamFieldKind = "numeric" | "categorical" | "date" | "boolean"

export interface StreamFieldSchema {
  name: string
  kind: StreamFieldKind
  /** Optional role hint — overrides the engine's inference. */
  role?: "x" | "y" | "value" | "category" | "series" | "size"
}

/**
 * Schema describing what a stream emits. No data, just shape + environment hints.
 */
export interface StreamSchema {
  fields: ReadonlyArray<StreamFieldSchema>
  /**
   * Hint about expected event rate. Affects chart selection — heatmaps and
   * waterfalls amortize high-throughput streams better than line charts do.
   *   • "low"    — < 1 event/sec, line/area charts read well
   *   • "medium" — ~1-100 events/sec
   *   • "high"   — > 100 events/sec, prefer aggregating visualizations
   */
  throughput?: "low" | "medium" | "high"
  /**
   * Hint about how long events are kept in view.
   *   • "windowed"   — only recent events visible (default)
   *   • "cumulative" — all events accumulate
   */
  retention?: "windowed" | "cumulative"
}

/**
 * Stream capability descriptor — parallel to ChartCapability but operates on
 * a schema. No `fits(profile)`; instead `fits(schema)` returns null/reason.
 */
export interface StreamChartCapability {
  component: string
  importPath: "semiotic/realtime"
  rubric: ChartRubric
  fits: (schema: StreamSchema) => null | string
  intentScores: Partial<Record<IntentId, StreamIntentScorer>>
  caveats?: (schema: StreamSchema) => ReadonlyArray<string>
  buildProps: (schema: StreamSchema) => Record<string, unknown>
}

export type StreamIntentScorer =
  | number
  | ((schema: StreamSchema) => number)

export interface StreamSuggestion {
  component: string
  family: "realtime"
  importPath: "semiotic/realtime"
  score: number
  intentScores: Partial<Record<IntentId, number>>
  rubric: ChartRubric
  reasons: ReadonlyArray<string>
  caveats: ReadonlyArray<string>
  /** Props ready to spread into the matching realtime chart. */
  props: Record<string, unknown>
}
