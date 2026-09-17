import type { ChartFamily, ChartRubric } from "./chartCapabilityTypes"
import type { IntentId } from "./intents"

/**
 * Streaming chart selection has a different shape than static. We don't have
 * rows yet — we have a *schema*: which fields will arrive, what types, plus
 * environment hints (throughput, retention, changelog shape).
 *
 * Rather than overloading `profileData` (which is row-statistics-centric) we
 * model streams as a parallel API. The two share the intent vocabulary —
 * "trend" still means trend — but the suitability logic is its own thing.
 */

export type StreamFieldKind = "numeric" | "categorical" | "date" | "boolean"

export type StreamFieldRole =
  | "x"
  | "y"
  | "value"
  | "category"
  | "series"
  | "size"
  | "key"

/**
 * Changelog semantics for a stream. First-class so capabilities can reason
 * about identity without encoding "keyed" as `role: "category"` plus
 * `retention: "cumulative"`.
 *
 *   • `"append"`     — append-only event stream (default)
 *   • `"keyed"`      — keyed table / changelog (insert, update, retract)
 *   • `"aggregate"`  — single-row aggregate (one current value)
 */
export type StreamShape = "append" | "keyed" | "aggregate"

/**
 * Event-rate hint. A number is rows per second; capabilities convert it to
 * a band with {@link streamThroughputBand}. String bands keep the original
 * qualitative API:
 *   • "low"    — < 1 event/sec
 *   • "medium" — ~1-100 events/sec
 *   • "high"   — > 100 events/sec
 */
export type StreamThroughput = "low" | "medium" | "high" | number

export type StreamThroughputBand = "low" | "medium" | "high"

export interface StreamThroughputThresholds {
  /** Inclusive lower bound for "medium", default 1. */
  medium?: number
  /** Inclusive lower bound for "high", default 100. */
  high?: number
}

export interface StreamFieldSchema {
  name: string
  kind: StreamFieldKind
  /** Optional role hint — overrides the engine's inference. */
  role?: StreamFieldRole
}

/**
 * Schema describing what a stream emits. No data, just shape + environment hints.
 */
export interface StreamSchema {
  fields: ReadonlyArray<StreamFieldSchema>
  /**
   * Hint about expected event rate. Affects chart selection — heatmaps and
   * waterfalls amortize high-throughput streams better than line charts do.
   * A number is rows per second; string bands are qualitative.
   */
  throughput?: StreamThroughput
  /**
   * Hint about how long events are kept in view.
   *   • "windowed"   — only recent events visible (default)
   *   • "cumulative" — all events accumulate
   */
  retention?: "windowed" | "cumulative"
  /**
   * Changelog semantics. When omitted, inferred from `keyFields` /
   * `role: "key"` (keyed) and otherwise treated as append-only.
   */
  shape?: StreamShape
  /**
   * Identity columns for keyed tables. Unioned with fields whose role is
   * `"key"` by {@link streamKeyFields}.
   */
  keyFields?: ReadonlyArray<string>
}

/**
 * Stream capability descriptor — parallel to ChartCapability but operates on
 * a schema. No `fits(profile)`; instead `fits(schema)` returns null/reason.
 */
export interface StreamChartCapability {
  component: string
  /**
   * Import specifier for generated code. Built-ins use family subpaths
   * (`semiotic/realtime`, `semiotic/ordinal`, `semiotic/value`); wrappers
   * may declare any string (e.g. `"@iris/charts"`).
   */
  importPath: string
  family: ChartFamily
  /** True when this chart consumes an event stream and has no static render proof. */
  requiresLiveData?: boolean
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
  family: ChartFamily
  importPath: string
  /** Whether the recommendation must receive live event data rather than a bounded array. */
  requiresLiveData?: boolean
  score: number
  intentScores: Partial<Record<IntentId, number>>
  rubric: ChartRubric
  reasons: ReadonlyArray<string>
  caveats: ReadonlyArray<string>
  /** Props ready to spread into the matching chart. */
  props: Record<string, unknown>
}
