import type {
  StreamChartCapability,
  StreamIntentScorer,
  StreamSchema,
  StreamSuggestion,
} from "./streamingTypes"
import type { ChartRubric } from "./chartCapabilityTypes"
import type { IntentId } from "./intents"
import { RealtimeLineChartCapability } from "../charts/realtime/RealtimeLineChart.capability"
import { RealtimeHistogramCapability } from "../charts/realtime/RealtimeHistogram.capability"
import { RealtimeSwarmChartCapability } from "../charts/realtime/RealtimeSwarmChart.capability"
import { RealtimeWaterfallChartCapability } from "../charts/realtime/RealtimeWaterfallChart.capability"
import { RealtimeHeatmapCapability } from "../charts/realtime/RealtimeHeatmap.capability"
import { TemporalHistogramCapability } from "../charts/realtime/TemporalHistogram.capability"

const BUILT_IN_STREAM_CAPABILITIES: ReadonlyArray<StreamChartCapability> = [
  RealtimeLineChartCapability,
  RealtimeHistogramCapability,
  RealtimeSwarmChartCapability,
  RealtimeWaterfallChartCapability,
  RealtimeHeatmapCapability,
  TemporalHistogramCapability,
]

const userStreamCapabilities = new Map<string, StreamChartCapability>()

export function registerStreamChartCapability(capability: StreamChartCapability): void {
  userStreamCapabilities.set(capability.component, capability)
}

export function unregisterStreamChartCapability(component: string): void {
  userStreamCapabilities.delete(component)
}

export function getStreamCapabilities(): ReadonlyArray<StreamChartCapability> {
  if (userStreamCapabilities.size === 0) return BUILT_IN_STREAM_CAPABILITIES
  const merged = new Map<string, StreamChartCapability>()
  for (const c of BUILT_IN_STREAM_CAPABILITIES) merged.set(c.component, c)
  for (const [name, c] of userStreamCapabilities) merged.set(name, c)
  return Array.from(merged.values())
}

function scoreValue(scorer: StreamIntentScorer | undefined, schema: StreamSchema): number {
  if (scorer === undefined) return 0
  const raw = typeof scorer === "function" ? (scorer as (s: StreamSchema) => number)(schema) : scorer
  if (!Number.isFinite(raw)) return 0
  return Math.max(0, Math.min(5, raw))
}

function compositeScore(
  intentScores: Partial<Record<IntentId, number>>,
  rankingIntents: IntentId[],
): number {
  if (rankingIntents.length === 0) {
    const nonZero = Object.values(intentScores).filter((n): n is number => typeof n === "number" && n > 0)
    if (nonZero.length === 0) return 0
    return nonZero.reduce((a, b) => a + b, 0) / nonZero.length
  }
  let sum = 0
  for (const intent of rankingIntents) sum += intentScores[intent] ?? 0
  return sum / rankingIntents.length
}

function buildReasons(
  schema: StreamSchema,
  intentScores: Partial<Record<IntentId, number>>,
  rankingIntents: IntentId[],
): string[] {
  const reasons: string[] = []
  const top = rankingIntents
    .map((intent) => ({ intent, score: intentScores[intent] ?? 0 }))
    .filter((entry) => entry.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
  for (const { intent, score } of top) {
    reasons.push(`Strong fit for ${intent} (${score}/5)`)
  }
  if (schema.throughput) reasons.push(`tuned for ${schema.throughput} throughput`)
  return reasons
}

export interface SuggestStreamChartsOptions {
  intent?: IntentId | IntentId[]
  allow?: ReadonlyArray<string>
  deny?: ReadonlyArray<string>
  maxResults?: number
  minScore?: number
  capabilities?: ReadonlyArray<StreamChartCapability>
}

/**
 * Suggest realtime charts for a schema, ranked by intent.
 *
 * Parallel to `suggestCharts` but operates on a `StreamSchema` (fields +
 * throughput/retention hints) rather than row data. Use for live dashboards,
 * monitoring views, anywhere events arrive over time rather than as a bounded
 * table.
 *
 * @example
 * const suggestions = suggestStreamCharts({
 *   fields: [
 *     { name: "ts", kind: "date" },
 *     { name: "latency_ms", kind: "numeric" },
 *     { name: "endpoint", kind: "categorical" },
 *   ],
 *   throughput: "high",
 *   retention: "windowed",
 * }, { intent: "trend" })
 * // → [{ component: "RealtimeHeatmap", ... }, { component: "RealtimeWaterfallChart", ... }]
 */
export function suggestStreamCharts(
  schema: StreamSchema,
  options: SuggestStreamChartsOptions = {},
): StreamSuggestion[] {
  const capabilities = options.capabilities ?? getStreamCapabilities()
  const rankingIntents: IntentId[] = options.intent
    ? Array.isArray(options.intent) ? options.intent : [options.intent]
    : []
  const minScore = options.minScore ?? 0
  const maxResults = options.maxResults ?? 10

  const allow = options.allow ? new Set(options.allow) : null
  const deny = options.deny ? new Set(options.deny) : null

  const out: StreamSuggestion[] = []

  for (const capability of capabilities) {
    if (allow && !allow.has(capability.component)) continue
    if (deny && deny.has(capability.component)) continue

    const fitReason = capability.fits(schema)
    if (fitReason !== null) continue

    const intentScores: Partial<Record<IntentId, number>> = {}
    for (const [intent, scorer] of Object.entries(capability.intentScores) as Array<[IntentId, StreamIntentScorer]>) {
      intentScores[intent] = scoreValue(scorer, schema)
    }

    const composite = compositeScore(intentScores, rankingIntents)
    if (composite < minScore) continue

    const rubric: ChartRubric = { ...capability.rubric }
    const caveats = capability.caveats ? Array.from(capability.caveats(schema)) : []
    const reasons = buildReasons(schema, intentScores, rankingIntents)
    const props = capability.buildProps(schema)

    out.push({
      component: capability.component,
      family: "realtime",
      importPath: capability.importPath,
      score: composite,
      intentScores,
      rubric,
      reasons,
      caveats,
      props,
    })
  }

  out.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (b.rubric.accuracy !== a.rubric.accuracy) return b.rubric.accuracy - a.rubric.accuracy
    return b.rubric.familiarity - a.rubric.familiarity
  })

  return out.slice(0, maxResults)
}
