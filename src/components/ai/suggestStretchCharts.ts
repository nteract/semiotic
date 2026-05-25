import type { Datum } from "../charts/shared/datumTypes"
import { profileData } from "./profileData"
import { suggestCharts } from "./suggestCharts"
import { getCapabilities } from "./chartCapabilities"
import type { ChartDataProfile, Suggestion } from "./chartCapabilityTypes"
import type { IntentId } from "./intents"
import { effectiveFamiliarity, stretchFamiliarityCeiling, type AudienceProfile } from "./audienceProfile"

/**
 * A "stretch pick" — an unfamiliar-but-fitting chart paired with the
 * familiar chart it could substitute for. Pairing makes the literacy
 * suggestion concrete: "instead of BarChart, try BoxPlot here, because…"
 */
export interface StretchSuggestion {
  /** The unfamiliar chart we're suggesting as growth. */
  suggestion: Suggestion
  /**
   * The familiar chart this stretch could replace for the same intent.
   * Undefined when the stretch is recommended on its own merits (e.g. a
   * direct "increase" target with no obvious familiar counterpart).
   */
  replacing?: string
  /** Human-readable rationale, suitable for verbatim display. */
  rationale: string
  /** Audience familiarity for this chart — the number that made it qualify as a stretch. */
  familiarity: number
}

export interface SuggestStretchChartsOptions {
  /** Intent(s) to rank by. When omitted, charts are picked by data fit alone. */
  intent?: IntentId | IntentId[]
  /** Required — without an audience profile, the concept of "stretch" doesn't apply. */
  audience?: AudienceProfile
  /** Restrict to these component names. */
  allow?: ReadonlyArray<string>
  /** Exclude these component names. */
  deny?: ReadonlyArray<string>
  /** Max stretch picks to return (default 5). */
  maxResults?: number
  /** Pre-built profile. */
  profile?: ChartDataProfile
  /** Non-tabular payload — forwarded to profileData. */
  rawInput?: unknown
  /**
   * Only return stretches within this score distance of the top familiar pick
   * (default 1.5). Tighter values keep the suggestions plausible; wider values
   * expose more variety.
   */
  scoreTolerance?: number
}

interface PairCandidate {
  stretch: Suggestion
  familiar?: Suggestion
}

/**
 * Find pairs (familiar, stretch) where the stretch chart fits the data,
 * has audience familiarity at or below the stretch ceiling, and either:
 *   • is an `increase` target for this audience, OR
 *   • scores within `scoreTolerance` of a familiar alternative for the
 *     same intent.
 *
 * Each pair is returned as a StretchSuggestion with `replacing` (the
 * familiar chart it could substitute for) and a rationale string.
 *
 * Heuristic only. Use `audience` with care — without target signals, every
 * audience-unfamiliar chart becomes a candidate, which can drown the
 * surface in dubious recommendations.
 */
export function suggestStretchCharts(
  data: ReadonlyArray<Datum> | null | undefined,
  options: SuggestStretchChartsOptions = {},
): StretchSuggestion[] {
  const audience = options.audience
  if (!audience) return []

  const profile = options.profile ?? profileData(data ?? [], { rawInput: options.rawInput })
  const ceiling = stretchFamiliarityCeiling(audience)
  const scoreTolerance = options.scoreTolerance ?? 1.5
  const maxResults = options.maxResults ?? 5

  // Build a map of effective familiarity per registered component
  const capabilities = getCapabilities()
  const familiarityByComponent = new Map<string, number>()
  for (const c of capabilities) {
    familiarityByComponent.set(c.component, effectiveFamiliarity(c.component, c.rubric.familiarity, audience))
  }

  // Run a familiar-only pass (no audience bias) so we have a baseline ranking
  // to compare stretches against — otherwise we'd compare biased scores to
  // biased scores and the comparison is degenerate.
  const baseline = suggestCharts(data, {
    profile,
    intent: options.intent,
    maxResults: 30,
    includeVariants: true,
    minScore: 1.0,
    allow: options.allow,
    deny: options.deny,
  })

  // Bucket baseline by intent so we can find a familiar counterpart per stretch.
  // For multi-intent or no-intent cases, just take the top-scoring familiar pick.
  const familiarPicks = baseline.filter(
    (s) => (familiarityByComponent.get(s.component) ?? s.rubric.familiarity) >= 4,
  )
  const topFamiliar = familiarPicks[0]
  const topFamiliarByComponent = new Map<string, Suggestion>()
  for (const s of familiarPicks) {
    if (!topFamiliarByComponent.has(s.component)) topFamiliarByComponent.set(s.component, s)
  }

  // Identify stretches: charts that fit, with audience familiarity ≤ ceiling.
  const stretchCandidates: PairCandidate[] = []
  for (const candidate of baseline) {
    const familiarity = familiarityByComponent.get(candidate.component) ?? candidate.rubric.familiarity
    if (familiarity > ceiling) continue

    const isIncreaseTarget = audience.targets?.[candidate.component]?.direction === "increase"
    const withinTolerance = topFamiliar
      ? topFamiliar.score - candidate.score <= scoreTolerance
      : true

    if (!isIncreaseTarget && !withinTolerance) continue

    stretchCandidates.push({ stretch: candidate, familiar: topFamiliar })
  }

  // Dedupe by component+variant
  const seen = new Set<string>()
  const out: StretchSuggestion[] = []
  for (const { stretch, familiar } of stretchCandidates) {
    const key = `${stretch.component}/${stretch.variant?.key ?? "base"}`
    if (seen.has(key)) continue
    seen.add(key)

    const familiarity = familiarityByComponent.get(stretch.component) ?? stretch.rubric.familiarity
    const target = audience.targets?.[stretch.component]
    const rationale =
      target?.reason ??
      (target?.direction === "increase"
        ? `${audience.name ?? "your audience"} is growing adoption of ${stretch.component}`
        : familiar
          ? `${stretch.component} is on the data, and within reach of ${familiar.component} which you're already familiar with`
          : `${stretch.component} fits this data and would expand your team's vocabulary`)

    out.push({
      suggestion: stretch,
      replacing: familiar?.component,
      rationale,
      familiarity,
    })
    if (out.length >= maxResults) break
  }

  return out
}
