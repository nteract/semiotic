import type {
  StreamChartCapability,
  StreamIntentScorer,
  StreamSchema,
  StreamSuggestion,
} from "./streamingTypes"
import type { ChartFamily, ChartRubric } from "./chartCapabilityTypes"
import type { IntentId } from "./intents"
import { expandComposedIntentScores } from "./intentRegistry"
import {
  requestedIntentWeights,
  weightedIntentScore,
  type IntentWeights,
} from "./intentWeights"
import {
  applyAudienceBias,
  effectiveFamiliarity,
  stretchFamiliarityCeiling,
  type AudienceProfile,
} from "./audienceProfile"
import {
  hasCategoryField,
  hasTimeField,
  isSingleValueStream,
  normalizeStreamSchema,
  pickMeasureFields,
  pickSplitField,
} from "./streamSchema"
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
import { ScatterplotStreamCapability } from "../charts/xy/Scatterplot.streamCapability"

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
  ScatterplotStreamCapability,
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

/**
 * Intent weights for a caller who names no intent, read off the schema: a
 * measure over time is first a trend, categories without time are first a
 * ranking, and a single value is shown against its range. A plain mean
 * over every intent would instead favour charts that are middling at many
 * intents over the one that fits the common case.
 */
function defaultStreamIntentWeights(schema: StreamSchema): IntentWeights {
  if (isSingleValueStream(schema)) return [["part-to-whole", 1]]
  const weights: Array<[IntentId, number]> = []
  const measures = pickMeasureFields(schema).length
  const category = hasCategoryField(schema)
  if (hasTimeField(schema)) {
    weights.push(["trend", 3], ["change-detection", 1])
    if (measures > 0) weights.push(["distribution", 1], ["outlier-detection", 1])
    if (pickSplitField(schema)) {
      weights.push([measures > 0 ? "compare-series" : "composition-over-time", 2])
    }
    if (category) weights.push(["compare-categories", 0.5])
  } else if (category) {
    weights.push(["rank", 2], ["compare-categories", 2], ["part-to-whole", 1])
  }
  if (measures >= 2) weights.push(["correlation", hasTimeField(schema) ? 1 : 1.5])
  return weights
}

const BINDING_LABELS: ReadonlyArray<readonly [string, string]> = [
  ["timeAccessor", "time"],
  ["xAccessor", "x"],
  ["yAccessor", "y"],
  ["valueAccessor", "value"],
  ["categoryAccessor", "category"],
  ["seriesAccessor", "series"],
  ["groupBy", "group"],
  ["stackBy", "stack"],
  ["colorBy", "color"],
]

function describeBindings(props: Record<string, unknown>): string | undefined {
  const parts: string[] = []
  for (const [prop, label] of BINDING_LABELS) {
    const value = props[prop]
    if (typeof value !== "string") continue
    if (prop === "colorBy" && (value === props.groupBy || value === props.stackBy)) continue
    parts.push(`${label} = ${value}`)
  }
  return parts.length > 0 ? parts.join(", ") : undefined
}

/**
 * When several unroled categorical fields compete, the engine binds them
 * by field order. Say so on the suggestions that used that order.
 */
function fieldOrderNote(
  schema: StreamSchema,
  props: Record<string, unknown>,
): string | undefined {
  const candidates = schema.fields
    .filter((field) => (field.kind === "categorical" || field.kind === "boolean") && field.role == null)
    .map((field) => field.name)
  const bound = candidates.filter((name) =>
    BINDING_LABELS.some(([prop]) => props[prop] === name),
  )
  if (bound.length === 0 || bound.length === candidates.length) return undefined
  return `${bound.map((name) => `"${name}"`).join(" and ")} picked from ${candidates.map((name) => `"${name}"`).join(", ")} by field order — set role "category" or "series" to choose`
}

function buildReasons(
  intentScores: Partial<Record<IntentId, number>>,
  weights: IntentWeights,
  props: Record<string, unknown>,
  orderNote: string | undefined,
  capabilityReasons: ReadonlyArray<string>,
): string[] {
  const reasons: string[] = []
  const top = weights
    .map(([intent]) => ({ intent, score: intentScores[intent] ?? 0 }))
    .filter((entry) => entry.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
  for (const { intent, score } of top) {
    reasons.push(`Strong fit for ${intent} (${score}/5)`)
  }
  const bindings = describeBindings(props)
  if (bindings) reasons.push(bindings)
  if (orderNote) reasons.push(orderNote)
  reasons.push(...capabilityReasons)
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
  /**
   * Intents the ranking used: the requested ones, or the defaults inferred
   * from the schema when none were passed.
   * Optional for compatibility with stored results; always returned by
   * `suggestStreamCharts`.
   */
  rankingIntents?: IntentId[]
  /**
   * Problems found in the schema — unknown keys, invalid kinds or hints,
   * duplicate fields. Repairable ones (kind aliases) were applied before
   * ranking; the rest were ignored.
   * Optional for compatibility with stored results; always returned by
   * `suggestStreamCharts`.
   */
  warnings?: string[]
}

export interface SuggestStreamChartsOptions {
  /**
   * Ranking intent(s). When omitted, intents are weighted from the schema
   * (a measure over time ranks as a trend first; see `rankingIntents`).
   */
  intent?: IntentId | IntentId[]
  allow?: ReadonlyArray<string>
  deny?: ReadonlyArray<string>
  maxResults?: number
  /**
   * Drop suggestions scoring below this. When omitted, charts that score 0
   * for the ranking intents are dropped; pass `0` to keep them.
   */
  minScore?: number
  capabilities?: ReadonlyArray<StreamChartCapability>
  audience?: AudienceProfile
  maxStretchResults?: number
}

function rankStreamSuggestions(
  schema: StreamSchema,
  options: SuggestStreamChartsOptions,
): {
  suggestions: StreamSuggestion[]
  excluded: RejectedStreamCapability[]
  rankingIntents: IntentId[]
} {
  const capabilities = options.capabilities ?? getStreamCapabilities()
  const requested: IntentId[] = options.intent
    ? Array.isArray(options.intent) ? options.intent : [options.intent]
    : []
  const weights: IntentWeights =
    requested.length > 0
      ? requestedIntentWeights(requested)
      : defaultStreamIntentWeights(schema)
  const rankingIntents = weights.map(([intent]) => intent)
  const keepScore = (score: number) =>
    options.minScore === undefined ? score > 0 : score >= options.minScore
  const maxResults = options.maxResults ?? 10

  const allow = options.allow ? new Set(options.allow) : null
  const deny = options.deny ? new Set(options.deny) : null

  const out: StreamSuggestion[] = []
  const excluded: RejectedStreamCapability[] = []

  for (const capability of capabilities) {
    const family = capability.family ?? "realtime"
    const fitReason = capability.fits(schema)
    if (fitReason !== null) {
      excluded.push({
        component: capability.component,
        family,
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

    const baseComposite = weightedIntentScore(intentScores, weights)
    const rubric: ChartRubric = { ...capability.rubric }
    const biased = applyAudienceBias(
      baseComposite,
      rubric,
      capability.component,
      options.audience,
    )
    if (!keepScore(biased.score)) continue

    const caveats = capability.caveats ? Array.from(capability.caveats(schema)) : []
    const props = capability.buildProps(schema)
    const reasons = buildReasons(
      intentScores,
      weights,
      props,
      fieldOrderNote(schema, props),
      capability.reasons ? capability.reasons(schema) : [],
    )
    if (biased.appliedReason) reasons.push(biased.appliedReason)

    out.push({
      component: capability.component,
      family,
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

  return { suggestions: out.slice(0, maxResults), excluded, rankingIntents }
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
  if (maxResults <= 0) return []

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
 * Returns `{ suggestions, excluded, stretchSuggestions, rankingIntents,
 * warnings }`. `excluded` lists every registered capability whose `fits()`
 * rejected the schema so a suggestion panel can say why a chart is
 * missing; `warnings` reports schema problems (unknown keys, invalid kinds).
 * Without an `intent`, ranking weights intents from the schema. Pass
 * `audience` to apply familiarity/target bias and (when
 * `exposureLevel !== 0`) fill `stretchSuggestions`.
 *
 * @example
 * const { suggestions } = suggestStreamCharts({
 *   fields: [
 *     { name: "ts", kind: "date" },
 *     { name: "latency_ms", kind: "numeric", additive: false },
 *     { name: "endpoint", kind: "categorical", cardinality: 6 },
 *   ],
 *   throughput: 400,
 *   retention: "windowed",
 * }, { intent: "trend" })
 * // → suggestions[0] is RealtimeLineChart with
 * //   aggregate: { size: "1s", stat: "mean" } and seriesAccessor: "endpoint"
 */
export function suggestStreamCharts(
  schema: StreamSchema,
  options: SuggestStreamChartsOptions = {},
): SuggestStreamChartsResult & { rankingIntents: IntentId[]; warnings: string[] } {
  const normalized = normalizeStreamSchema(schema)
  const { suggestions, excluded, rankingIntents } = rankStreamSuggestions(
    normalized.schema,
    options,
  )
  const stretchSuggestions = buildStreamStretchSuggestions(
    normalized.schema,
    options,
    suggestions,
  )
  return {
    suggestions,
    excluded,
    stretchSuggestions,
    rankingIntents,
    warnings: normalized.warnings,
  }
}

/** Why one capability was or was not suggested for a schema. */
export interface StreamCapabilityExplanation {
  component: string
  /**
   * `suggested`: ranked (see `rank`). `excluded`: `fits()` rejected the
   * schema. `filtered`: it fits, but allow/deny, `minScore`, or
   * `maxResults` removed it. `unknown`: no capability has this name.
   */
  status: "suggested" | "excluded" | "filtered" | "unknown"
  /** 1-based position among the suggestions when `status` is "suggested". */
  rank?: number
  reason: string
  /** The ranked suggestion, or the unfiltered one when `status` is "filtered". */
  suggestion?: StreamSuggestion
  warnings: string[]
}

/**
 * Explain stream chart fit. With a component name, returns why that chart
 * was suggested, excluded, or filtered out; without one, returns the same
 * result as `suggestStreamCharts`, for panels that list `excluded`.
 */
export function explainStreamCapabilityFit(
  schema: StreamSchema,
  options?: SuggestStreamChartsOptions,
): ReturnType<typeof suggestStreamCharts>
export function explainStreamCapabilityFit(
  schema: StreamSchema,
  component: string,
  options?: SuggestStreamChartsOptions,
): StreamCapabilityExplanation
export function explainStreamCapabilityFit(
  schema: StreamSchema,
  componentOrOptions: string | SuggestStreamChartsOptions = {},
  maybeOptions: SuggestStreamChartsOptions = {},
): ReturnType<typeof suggestStreamCharts> | StreamCapabilityExplanation {
  if (typeof componentOrOptions !== "string") {
    return suggestStreamCharts(schema, componentOrOptions)
  }
  const component = componentOrOptions
  const options = maybeOptions
  const result = suggestStreamCharts(schema, options)
  const { warnings } = result
  const index = result.suggestions.findIndex((s) => s.component === component)
  if (index >= 0) {
    const suggestion = result.suggestions[index]
    return {
      component,
      status: "suggested",
      rank: index + 1,
      reason: `ranked ${index + 1} of ${result.suggestions.length} with score ${suggestion.score.toFixed(2)}/5 for ${result.rankingIntents.join(", ")}`,
      suggestion,
      warnings,
    }
  }
  const miss = result.excluded.find((e) => e.component === component)
  if (miss) return { component, status: "excluded", reason: miss.reason, warnings }
  const capabilities = options.capabilities ?? getStreamCapabilities()
  if (!capabilities.some((c) => c.component === component)) {
    return {
      component,
      status: "unknown",
      reason: `no stream capability is registered as "${component}"`,
      warnings,
    }
  }
  const unfiltered = suggestStreamCharts(schema, {
    ...options,
    allow: [component],
    deny: undefined,
    minScore: 0,
    maxResults: 1,
  }).suggestions[0]
  let reason: string
  if (options.deny?.includes(component)) reason = "listed in options.deny"
  else if (options.allow && !options.allow.includes(component)) reason = "not listed in options.allow"
  else if (
    unfiltered &&
    (options.minScore === undefined ? unfiltered.score <= 0 : unfiltered.score < options.minScore)
  ) {
    reason = `scored ${unfiltered.score.toFixed(2)}/5 for ${result.rankingIntents.join(", ")}, ${options.minScore === undefined ? "and zero scores are dropped" : `below minScore ${options.minScore}`}`
  } else {
    reason = `scored ${unfiltered?.score.toFixed(2) ?? "0.00"}/5 but ranked below maxResults (${options.maxResults ?? 10})`
  }
  return { component, status: "filtered", reason, suggestion: unfiltered, warnings }
}
