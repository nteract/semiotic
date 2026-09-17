import type {
  StreamChartCapability,
  StreamIntentScorer,
  StreamSchema,
  StreamSuggestion,
} from "./streamingTypes"
import type { ChartFamily, ChartRubric } from "./chartCapabilityTypes"
import { expandComposedIntentScores, type IntentId } from "./intents"
import {
  applyAudienceBias,
  effectiveFamiliarity,
  stretchFamiliarityCeiling,
  type AudienceProfile,
} from "./audienceProfile"
import { streamThroughputBand } from "./streamSchema"
import { RealtimeLineChartCapability } from "../charts/realtime/RealtimeLineChart.capability"
import { RealtimeHistogramCapability } from "../charts/realtime/RealtimeHistogram.capability"
import { RealtimeSwarmChartCapability } from "../charts/realtime/RealtimeSwarmChart.capability"
import { RealtimeWaterfallChartCapability } from "../charts/realtime/RealtimeWaterfallChart.capability"
import { RealtimeHeatmapCapability } from "../charts/realtime/RealtimeHeatmap.capability"
import { TemporalHistogramCapability } from "../charts/realtime/TemporalHistogram.capability"
import { BarChartStreamCapability } from "../charts/ordinal/BarChart.streamCapability"
import { GroupedBarChartStreamCapability } from "../charts/ordinal/GroupedBarChart.streamCapability"
import { StackedBarChartStreamCapability } from "../charts/ordinal/StackedBarChart.streamCapability"
import { PieChartStreamCapability } from "../charts/ordinal/PieChart.streamCapability"
import { DonutChartStreamCapability } from "../charts/ordinal/DonutChart.streamCapability"
import { BigNumberStreamCapability } from "../charts/value/BigNumber.streamCapability"
import { GaugeChartStreamCapability } from "../charts/value/GaugeChart.streamCapability"

const BUILT_IN_STREAM_CAPABILITIES: ReadonlyArray<StreamChartCapability> = [
  RealtimeLineChartCapability,
  RealtimeHistogramCapability,
  RealtimeSwarmChartCapability,
  RealtimeWaterfallChartCapability,
  RealtimeHeatmapCapability,
  TemporalHistogramCapability,
  BarChartStreamCapability,
  GroupedBarChartStreamCapability,
  StackedBarChartStreamCapability,
  PieChartStreamCapability,
  DonutChartStreamCapability,
  BigNumberStreamCapability,
  GaugeChartStreamCapability,
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
  const band = streamThroughputBand(schema)
  if (band) reasons.push(`tuned for ${band} throughput`)
  return reasons
}

export interface RejectedStreamCapability {
  component: string
  family: ChartFamily
  importPath: string
  /** Human-readable reason this chart can't render this schema. */
  reason: string
}

export interface StreamStretchSuggestion {
  suggestion: StreamSuggestion
  replacing?: string
  rationale: string
  familiarity: number
  /** Set by `suggestStreamDashboard` to bind the stretch to a schema. */
  schemaIndex?: number
}

export interface SuggestStreamChartsResult {
  suggestions: StreamSuggestion[]
  excluded: ReadonlyArray<RejectedStreamCapability>
  stretchSuggestions: StreamStretchSuggestion[]
}

export interface SuggestStreamChartsOptions {
  intent?: IntentId | IntentId[]
  allow?: ReadonlyArray<string>
  deny?: ReadonlyArray<string>
  maxResults?: number
  minScore?: number
  capabilities?: ReadonlyArray<StreamChartCapability>
  audience?: AudienceProfile
  maxStretchResults?: number
}

function rankStreamSuggestions(
  schema: StreamSchema,
  options: SuggestStreamChartsOptions,
): { suggestions: StreamSuggestion[]; excluded: RejectedStreamCapability[] } {
  const capabilities = options.capabilities ?? getStreamCapabilities()
  const rankingIntents: IntentId[] = options.intent
    ? Array.isArray(options.intent) ? options.intent : [options.intent]
    : []
  const minScore = options.minScore ?? 0
  const maxResults = options.maxResults ?? 10

  const allow = options.allow ? new Set(options.allow) : null
  const deny = options.deny ? new Set(options.deny) : null

  const out: StreamSuggestion[] = []
  const excluded: RejectedStreamCapability[] = []

  for (const capability of capabilities) {
    const fitReason = capability.fits(schema)
    if (fitReason !== null) {
      excluded.push({
        component: capability.component,
        family: capability.family,
        importPath: capability.importPath,
        reason: fitReason,
      })
      continue
    }

    if (allow && !allow.has(capability.component)) continue
    if (deny && deny.has(capability.component)) continue

    const baseIntentScores: Partial<Record<IntentId, number>> = {}
    for (const [intent, scorer] of Object.entries(capability.intentScores) as Array<[IntentId, StreamIntentScorer]>) {
      baseIntentScores[intent] = scoreValue(scorer, schema)
    }
    const intentScores = expandComposedIntentScores(baseIntentScores, rankingIntents)

    const baseComposite = compositeScore(intentScores, rankingIntents)
    const rubric: ChartRubric = { ...capability.rubric }
    const biased = applyAudienceBias(
      baseComposite,
      rubric,
      capability.component,
      options.audience,
    )
    if (biased.score < minScore) continue

    const caveats = capability.caveats ? Array.from(capability.caveats(schema)) : []
    const reasons = buildReasons(schema, intentScores, rankingIntents)
    if (biased.appliedReason) reasons.push(biased.appliedReason)
    const props = capability.buildProps(schema)

    out.push({
      component: capability.component,
      family: capability.family,
      importPath: capability.importPath,
      requiresLiveData: capability.requiresLiveData === true,
      score: biased.score,
      intentScores,
      rubric: biased.rubric,
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

  return { suggestions: out.slice(0, maxResults), excluded }
}

function buildStreamStretchSuggestions(
  schema: StreamSchema,
  options: SuggestStreamChartsOptions,
  ranked: StreamSuggestion[],
): StreamStretchSuggestion[] {
  const audience = options.audience
  if (!audience) return []
  if ((audience.exposureLevel ?? 1) === 0) return []

  const capabilities = options.capabilities ?? getStreamCapabilities()
  const familiarityByComponent = new Map<string, number>()
  for (const capability of capabilities) {
    familiarityByComponent.set(
      capability.component,
      effectiveFamiliarity(capability.component, capability.rubric.familiarity, audience),
    )
  }

  const ceiling = stretchFamiliarityCeiling(audience)
  const scoreTolerance = 1.5
  const maxResults = options.maxStretchResults ?? 5

  const baseline = rankStreamSuggestions(schema, {
    ...options,
    audience: undefined,
    maxResults: 30,
    minScore: 1,
  }).suggestions

  const familiarPicks = baseline.filter(
    (s) => (familiarityByComponent.get(s.component) ?? s.rubric.familiarity) >= 4,
  )
  const topFamiliar = familiarPicks[0]
  const used = new Set(ranked.map((s) => s.component))

  const out: StreamStretchSuggestion[] = []
  for (const candidate of baseline) {
    if (used.has(candidate.component)) continue
    const familiarity = familiarityByComponent.get(candidate.component) ?? candidate.rubric.familiarity
    if (familiarity > ceiling) continue

    const isIncreaseTarget = audience.targets?.[candidate.component]?.direction === "increase"
    const withinTolerance = topFamiliar
      ? topFamiliar.score - candidate.score <= scoreTolerance
      : true
    if (!isIncreaseTarget && !withinTolerance) continue

    const target = audience.targets?.[candidate.component]
    const rationale =
      target?.reason ??
      (target?.direction === "increase"
        ? `${audience.name ?? "your audience"} is growing adoption of ${candidate.component}`
        : topFamiliar
          ? `${candidate.component} is on the stream, and within reach of ${topFamiliar.component} which you're already familiar with`
          : `${candidate.component} fits this stream and would expand your team's vocabulary`)

    out.push({
      suggestion: candidate,
      replacing: topFamiliar?.component,
      rationale,
      familiarity,
    })
    if (out.length >= maxResults) break
  }
  return out
}

/**
 * Suggest charts for a stream schema, ranked by intent.
 *
 * Parallel to `suggestCharts` but operates on a `StreamSchema` (fields +
 * throughput/retention/shape hints) rather than row data. Use for live
 * dashboards, monitoring views, anywhere events arrive over time rather
 * than as a bounded table.
 *
 * Returns `{ suggestions, excluded, stretchSuggestions }`. `excluded`
 * lists every registered capability whose `fits()` rejected the schema
 * so a suggestion panel can say why a chart is missing. Pass `audience`
 * to apply familiarity/target bias and (when `exposureLevel !== 0`) fill
 * `stretchSuggestions`.
 *
 * @example
 * const { suggestions } = suggestStreamCharts({
 *   fields: [
 *     { name: "ts", kind: "date" },
 *     { name: "latency_ms", kind: "numeric" },
 *     { name: "endpoint", kind: "categorical" },
 *   ],
 *   throughput: "high",
 *   retention: "windowed",
 * }, { intent: "trend" })
 * // → suggestions[0] is RealtimeHeatmap or RealtimeWaterfallChart
 */
export function suggestStreamCharts(
  schema: StreamSchema,
  options: SuggestStreamChartsOptions = {},
): SuggestStreamChartsResult {
  const { suggestions, excluded } = rankStreamSuggestions(schema, options)
  const stretchSuggestions = buildStreamStretchSuggestions(schema, options, suggestions)
  return { suggestions, excluded, stretchSuggestions }
}

/**
 * Like `suggestStreamCharts`, but named for diagnostic panels that care
 * about the excluded list. Same result object.
 */
export function explainStreamCapabilityFit(
  schema: StreamSchema,
  options: SuggestStreamChartsOptions = {},
): SuggestStreamChartsResult {
  return suggestStreamCharts(schema, options)
}
