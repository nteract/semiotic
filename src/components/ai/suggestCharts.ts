import type { Datum } from "../charts/shared/datumTypes"
import { profileData, type ProfileDataOptions } from "./profileData"
import type {
  ChartCapability,
  ChartDataProfile,
  ChartRubric,
  ChartVariant,
  IntentScorer,
  Suggestion,
} from "./chartCapabilityTypes"
import type { IntentId } from "./intents"
import { getCapabilities } from "./chartCapabilities"
import { applyAudienceBias, type AudienceProfile } from "./audienceProfile"

function score(scorer: IntentScorer | undefined, profile: ChartDataProfile): number {
  if (scorer === undefined) return 0
  const raw = typeof scorer === "function" ? scorer(profile) : scorer
  if (!Number.isFinite(raw)) return 0
  return Math.max(0, Math.min(5, raw))
}

function clampRubric(r: ChartRubric): ChartRubric {
  const clamp = (n: number) => Math.max(1, Math.min(5, Math.round(n)))
  return { familiarity: clamp(r.familiarity), accuracy: clamp(r.accuracy), precision: clamp(r.precision) }
}

function applyVariantToScores(
  baseScores: Partial<Record<IntentId, number>>,
  variant: ChartVariant | undefined
): Partial<Record<IntentId, number>> {
  if (!variant?.intentDeltas) return baseScores
  const out: Partial<Record<IntentId, number>> = { ...baseScores }
  for (const [intent, delta] of Object.entries(variant.intentDeltas) as Array<[IntentId, number]>) {
    const current = out[intent] ?? 0
    out[intent] = Math.max(0, Math.min(5, current + delta))
  }
  return out
}

function applyVariantToRubric(rubric: ChartRubric, variant: ChartVariant | undefined): ChartRubric {
  if (!variant?.rubricDeltas) return rubric
  return clampRubric({
    familiarity: rubric.familiarity + (variant.rubricDeltas.familiarity ?? 0),
    accuracy: rubric.accuracy + (variant.rubricDeltas.accuracy ?? 0),
    precision: rubric.precision + (variant.rubricDeltas.precision ?? 0),
  })
}

function buildReasons(
  capability: ChartCapability,
  profile: ChartDataProfile,
  intentScores: Partial<Record<IntentId, number>>,
  rankingIntents: IntentId[]
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
  if (profile.primary.x && profile.primary.y) {
    reasons.push(`x = ${profile.primary.x}, y = ${profile.primary.y}`)
  }
  if (profile.seriesCount && profile.seriesCount > 1) {
    reasons.push(`${profile.seriesCount} series detected on field "${profile.primary.series ?? "series"}"`)
  }
  return reasons
}

function compositeScore(
  intentScores: Partial<Record<IntentId, number>>,
  rankingIntents: IntentId[]
): number {
  if (rankingIntents.length === 0) {
    // No intent specified — use mean of non-zero scores across all intents
    const nonZero = Object.values(intentScores).filter((n): n is number => typeof n === "number" && n > 0)
    if (nonZero.length === 0) return 0
    return nonZero.reduce((a, b) => a + b, 0) / nonZero.length
  }
  // Average the requested intents
  let sum = 0
  for (const intent of rankingIntents) sum += intentScores[intent] ?? 0
  return sum / rankingIntents.length
}

export interface SuggestChartsOptions extends ProfileDataOptions {
  /** Ranking intent(s). When omitted, suggestions are ranked by mean intent score. */
  intent?: IntentId | IntentId[]
  /** Restrict to these component names. */
  allow?: ReadonlyArray<string>
  /** Exclude these component names. */
  deny?: ReadonlyArray<string>
  /** Maximum suggestions to return (default 10). */
  maxResults?: number
  /** Include variant-level suggestions (default true). */
  includeVariants?: boolean
  /** Filter out suggestions with a composite score below this (default 0 — keep all). */
  minScore?: number
  /** Provide a pre-built profile instead of re-deriving from data. */
  profile?: ChartDataProfile
  /** Override the registry. Defaults to the global capability registry. */
  capabilities?: ReadonlyArray<ChartCapability>
  /**
   * Audience profile — overrides chart familiarity and applies adoption-target
   * bias to the ranking. See `audienceProfile.ts`.
   */
  audience?: AudienceProfile
}

/**
 * Suggest charts for a dataset, ranked by intent suitability.
 *
 * Heuristic-only — does not call an LLM. Designed to be cheap enough to run on every
 * keystroke in a UI, and to feed structured context to an LLM when one is available.
 */
export function suggestCharts(
  data: ReadonlyArray<Datum> | null | undefined,
  options: SuggestChartsOptions = {}
): Suggestion[] {
  const profile = options.profile ?? profileData(data ?? [], { rawInput: options.rawInput, seriesField: options.seriesField })
  const capabilities = options.capabilities ?? getCapabilities()
  const rankingIntents: IntentId[] = options.intent
    ? Array.isArray(options.intent) ? options.intent : [options.intent]
    : []
  const includeVariants = options.includeVariants !== false
  const minScore = options.minScore ?? 0
  const maxResults = options.maxResults ?? 10

  const allow = options.allow ? new Set(options.allow) : null
  const deny = options.deny ? new Set(options.deny) : null

  const out: Suggestion[] = []

  for (const capability of capabilities) {
    if (allow && !allow.has(capability.component)) continue
    if (deny && deny.has(capability.component)) continue

    const fitReason = capability.fits(profile)
    if (fitReason !== null) continue

    // Base intent scores from the capability
    const baseScores: Partial<Record<IntentId, number>> = {}
    for (const [intent, scorer] of Object.entries(capability.intentScores) as Array<[IntentId, IntentScorer]>) {
      baseScores[intent] = score(scorer, profile)
    }

    const baseCaveats = capability.caveats ? Array.from(capability.caveats(profile)) : []
    const variants: ReadonlyArray<ChartVariant | undefined> =
      includeVariants && capability.variants && capability.variants.length > 0
        ? capability.variants
        : [undefined]

    for (const variant of variants) {
      const intentScores = applyVariantToScores(baseScores, variant)
      const baseComposite = compositeScore(intentScores, rankingIntents)
      const variantRubric = applyVariantToRubric(capability.rubric, variant)

      // Audience bias: overrides familiarity and shifts composite score
      // by ±familiarity + ±target. Strong enough to reorder rankings, not
      // strong enough to override fits-driven correctness.
      const biased = applyAudienceBias(
        baseComposite,
        variantRubric,
        capability.component,
        options.audience,
      )
      if (biased.score < minScore) continue

      const reasons = buildReasons(capability, profile, intentScores, rankingIntents)
      if (biased.appliedReason) reasons.push(biased.appliedReason)
      const caveats = [...baseCaveats, ...(variant?.caveats ?? [])]
      const props = capability.buildProps(profile, variant)

      out.push({
        component: capability.component,
        family: capability.family,
        importPath: capability.importPath,
        variant,
        score: biased.score,
        intentScores,
        rubric: biased.rubric,
        reasons,
        caveats,
        props,
      })
    }
  }

  // Sort: higher composite score first, then higher accuracy, then higher familiarity.
  out.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (b.rubric.accuracy !== a.rubric.accuracy) return b.rubric.accuracy - a.rubric.accuracy
    return b.rubric.familiarity - a.rubric.familiarity
  })

  return out.slice(0, maxResults)
}

/**
 * One rejected capability: a chart whose `fits()` returned a reason.
 * Surfaced by `explainCapabilityFit` for diagnostic panels and `--doctor` auto-fix.
 */
export interface RejectedCapability {
  component: string
  family: ChartCapability["family"]
  importPath: ChartCapability["importPath"]
  /** Human-readable reason this chart can't render this profile. */
  reason: string
}

export interface ExplainCapabilityFitResult {
  /** Capabilities that fit the profile — full ranked suggestion list. */
  fitting: Suggestion[]
  /** Capabilities that did not fit, with their rejection reasons. */
  rejected: RejectedCapability[]
  /** The profile that was evaluated against (provided or computed). */
  profile: ChartDataProfile
}

/**
 * Like `suggestCharts`, but also returns the capabilities that *didn't* fit
 * along with their rejection reasons. The single best primitive for:
 *   • "Why isn't there a pie chart option?" UI surfaces (vizmart V.4)
 *   • `--doctor` auto-fix loops that need to enumerate alternatives
 *   • Descriptor authoring — quickly see whose `fits()` is too strict
 *
 * Mirrors `suggestCharts` for the fitting side. Rejection enumeration walks
 * every registered capability whether it fits or not.
 */
export function explainCapabilityFit(
  data: ReadonlyArray<Datum> | null | undefined,
  options: SuggestChartsOptions = {}
): ExplainCapabilityFitResult {
  const profile = options.profile ?? profileData(data ?? [], { rawInput: options.rawInput, seriesField: options.seriesField })
  const capabilities = options.capabilities ?? getCapabilities()

  const allow = options.allow ? new Set(options.allow) : null
  const deny = options.deny ? new Set(options.deny) : null

  const rejected: RejectedCapability[] = []
  for (const capability of capabilities) {
    if (allow && !allow.has(capability.component)) continue
    if (deny && deny.has(capability.component)) continue
    const fitReason = capability.fits(profile)
    if (fitReason !== null) {
      rejected.push({
        component: capability.component,
        family: capability.family,
        importPath: capability.importPath,
        reason: fitReason,
      })
    }
  }

  const fitting = suggestCharts(data, { ...options, profile })

  return { fitting, rejected, profile }
}

/**
 * Score a specific (component, variant) pair against a dataset and (optionally) an intent.
 * Useful for evaluating a chart a user already chose: "is this a good fit for what they want?"
 */
export function scoreChart(
  component: string,
  data: ReadonlyArray<Datum> | null | undefined,
  options: { intent?: IntentId | IntentId[]; variantKey?: string; profile?: ChartDataProfile } = {}
): Suggestion | { reason: string } {
  const capabilities = getCapabilities()
  const capability = capabilities.find((c) => c.component === component)
  if (!capability) return { reason: `No capability registered for "${component}"` }
  const profile = options.profile ?? profileData(data ?? [])
  const fit = capability.fits(profile)
  if (fit !== null) return { reason: fit }

  const variant = options.variantKey
    ? capability.variants?.find((v) => v.key === options.variantKey)
    : undefined

  const intents: IntentId[] = options.intent
    ? Array.isArray(options.intent) ? options.intent : [options.intent]
    : []

  const baseScores: Partial<Record<IntentId, number>> = {}
  for (const [intent, scorer] of Object.entries(capability.intentScores) as Array<[IntentId, IntentScorer]>) {
    baseScores[intent] = score(scorer, profile)
  }
  const intentScores = applyVariantToScores(baseScores, variant)
  const composite = compositeScore(intentScores, intents)
  const rubric = applyVariantToRubric(capability.rubric, variant)
  const reasons = buildReasons(capability, profile, intentScores, intents)
  const caveats = [
    ...(capability.caveats ? capability.caveats(profile) : []),
    ...(variant?.caveats ?? []),
  ]

  return {
    component: capability.component,
    family: capability.family,
    importPath: capability.importPath,
    variant,
    score: composite,
    intentScores,
    rubric,
    reasons,
    caveats,
    props: capability.buildProps(profile, variant),
  }
}
