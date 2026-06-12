import type { Datum } from "../charts/shared/datumTypes"
import { profileData, type ProfileDataOptions } from "./profileData"
import type {
  ChartCapability,
  ChartDataProfile,
  ChartRubric,
  ChartVariant,
  IntentScorer,
  ScaledSuggestionGroups,
  Suggestion,
  SuggestionScaleRange,
} from "./chartCapabilityTypes"
import type { IntentId } from "./intents"
import { getCapabilities } from "./chartCapabilities"
import {
  applyAudienceBias,
  receivabilityBias,
  type AudienceProfile,
  type ReceptionModality,
} from "./audienceProfile"
import { auditAccessibility } from "../charts/shared/auditAccessibility"
import {
  applyScaleBias,
  computeEffectiveScale,
  type DataQualityProfile,
  type DataScaleProfile,
} from "./dataScaleProfile"

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
  /**
   * Forward-looking declaration of the dataset's scale (row count, cardinality,
   * field count, growth mode). When provided, the engine biases recommendations
   * toward charts that work at the declared scale rather than the sample size.
   * See `dataScaleProfile.ts`.
   */
  scale?: DataScaleProfile
  /**
   * Declaration of the dataset's quality (completeness, outliers, type
   * heterogeneity). Affects caveats and biases score modestly. See
   * `dataScaleProfile.ts`.
   */
  quality?: DataQualityProfile
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

  // Receivability: only audit candidates when the audience declares a
  // non-visual channel. Keeps the common (visual) path allocation-free and as
  // cheap as before — pay only when reception modality matters.
  const modality = options.audience?.receptionModality
  const wantReceivability = modality !== undefined && modality !== "visual"

  // Effective scale: merges declared DataScaleProfile with the measured profile.
  // Computed once per suggestCharts call. When no scale is declared, falls
  // back to whatever the profile measured — so the scaleRange tag always
  // attaches honestly.
  const effectiveScale = computeEffectiveScale(profile, options.scale)

  // Scaled profile: when the user declares a row count different from the
  // measured sample, fits() and intent scorers reason against the *declared*
  // row count. Structural facts (which fields exist, types, monotonicity) stay
  // measured because declared scale is about magnitude, not shape. This is
  // what lets GaugeChart fit when the user declares rows: "tiny" on a 5-row
  // sample, and what lets BarChart's "obsPerCategory > 10 → distribution
  // chart wins" rule fire at declared production scale rather than sample size.
  const scaledProfile =
    options.scale !== undefined && effectiveScale.rows !== profile.rowCount
      ? { ...profile, rowCount: effectiveScale.rows }
      : profile

  const out: Suggestion[] = []

  for (const capability of capabilities) {
    if (allow && !allow.has(capability.component)) continue
    if (deny && deny.has(capability.component)) continue

    const fitReason = capability.fits(scaledProfile)
    if (fitReason !== null) continue

    // Base intent scores from the capability
    const baseScores: Partial<Record<IntentId, number>> = {}
    for (const [intent, scorer] of Object.entries(capability.intentScores) as Array<[IntentId, IntentScorer]>) {
      baseScores[intent] = score(scorer, scaledProfile)
    }

    const baseCaveats = capability.caveats ? Array.from(capability.caveats(scaledProfile)) : []
    const variants: ReadonlyArray<ChartVariant | undefined> =
      includeVariants && capability.variants && capability.variants.length > 0
        ? capability.variants
        : [undefined]

    for (const variant of variants) {
      const intentScores = applyVariantToScores(baseScores, variant)
      const baseComposite = compositeScore(intentScores, rankingIntents)
      const variantRubric = applyVariantToRubric(capability.rubric, variant)
      const props = capability.buildProps(profile, variant)

      // Receivability (non-visual audiences only) — audit the candidate and
      // derive the signal ONCE here; it feeds both the score bias and the
      // receivability caveats, so the audit findings are scanned a single time.
      let receivability: ReturnType<typeof receivabilityBias> | undefined
      if (wantReceivability) {
        const audit = auditAccessibility(capability.component, props as Datum)
        receivability = receivabilityBias(audit, modality as ReceptionModality)
      }

      // Audience bias: overrides familiarity and shifts composite score
      // by ±familiarity + ±target (+ ±receivability when the signal is supplied).
      // Strong enough to reorder rankings, not strong enough to override
      // fits-driven correctness.
      const biased = applyAudienceBias(
        baseComposite,
        variantRubric,
        capability.component,
        options.audience,
        receivability,
      )

      // Scale + quality bias: composes additively on top of the audience-biased
      // score. A per-chart org preference can also *exclude* the chart entirely
      // when the effective row band falls outside the declared minBand/maxBand.
      const scaleBias = applyScaleBias(
        capability,
        scaledProfile,
        effectiveScale,
        options.scale,
        options.quality,
      )
      if (scaleBias.excluded) continue
      const finalScore = biased.score + scaleBias.delta
      if (finalScore < minScore) continue

      const reasons = buildReasons(capability, scaledProfile, intentScores, rankingIntents)
      if (biased.appliedReason) reasons.push(biased.appliedReason)
      if (biased.receivabilityReason) reasons.push(biased.receivabilityReason)
      for (const r of scaleBias.reasons) reasons.push(r)
      const caveats = [
        ...baseCaveats,
        ...(variant?.caveats ?? []),
        ...scaleBias.caveats,
        // Item 4: receivability caveats from the same audit that drove the
        // penalty, in the same array as the perceptual ones — one caveat
        // channel, not two. Capped so they don't drown the descriptor's.
        ...(receivability?.caveats.slice(0, 3) ?? []),
      ]

      const scaleRange: SuggestionScaleRange = {
        band: effectiveScale.rowBand,
        cardinalityBand: effectiveScale.cardinalityBand,
        rows: effectiveScale.rows,
        rowsSource: effectiveScale.rowsSource,
      }

      out.push({
        component: capability.component,
        family: capability.family,
        importPath: capability.importPath,
        variant,
        score: finalScore,
        intentScores,
        rubric: biased.rubric,
        reasons,
        caveats,
        props,
        scaleRange,
      })
    }
  }

  // Sort: higher composite score first, then higher accuracy, then higher familiarity.
  out.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (b.rubric.accuracy !== a.rubric.accuracy) return b.rubric.accuracy - a.rubric.accuracy
    return b.rubric.familiarity - a.rubric.familiarity
  })

  // Collapse identical-score variants of the same component. Several variants of
  // one chart that rank identically add no information and crowd diverse
  // components out of the top-N (e.g. three BarChart variants all at 4.00).
  // Keep the best-ranked entry per (component, score) — the sort already put the
  // strongest variant first; variants that score *differently* are preserved as
  // genuinely distinct recommendations.
  const seenComponentScore = new Set<string>()
  const deduped = out.filter((s) => {
    const key = `${s.component}:${s.score.toFixed(4)}`
    if (seenComponentScore.has(key)) return false
    seenComponentScore.add(key)
    return true
  })

  return deduped.slice(0, maxResults)
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

  // Mirror the scaled-profile path in suggestCharts so rejection reasons
  // reflect the declared scale's view of rowCount. Otherwise charts that fit
  // at declared scale would still appear in the rejected list with reasons
  // that reference the sample size, which contradicts the suggestion list.
  const effectiveScale = computeEffectiveScale(profile, options.scale)
  const scaledProfile =
    options.scale !== undefined && effectiveScale.rows !== profile.rowCount
      ? { ...profile, rowCount: effectiveScale.rows }
      : profile

  const rejected: RejectedCapability[] = []
  for (const capability of capabilities) {
    if (allow && !allow.has(capability.component)) continue
    if (deny && deny.has(capability.component)) continue
    const fitReason = capability.fits(scaledProfile)
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

/**
 * Return suggestions grouped by scale band. The "graduation of views" surface:
 * the same data + intent can produce different chart recommendations depending
 * on the row band you optimize for. Useful for narratives like
 * "now → at 10× → at 100×" or for picking the right chart for a sample vs the
 * production dataset.
 *
 * Behavior: runs `suggestCharts` five times (once per band — tiny/small/medium/
 * large/huge), pinning the row band on each pass while keeping all other
 * options stable. Each band returns its own ranked list. The same chart can
 * appear in multiple bands when its sweet spot spans them.
 *
 * The single `effective` value on the return is computed from the *original*
 * options (declared scale or measured profile), so callers can detect which
 * band the user's actual data lives in and highlight that tier.
 */
export function suggestChartsGrouped(
  data: ReadonlyArray<Datum> | null | undefined,
  options: SuggestChartsOptions & { maxPerBand?: number } = {}
): ScaledSuggestionGroups {
  const profile = options.profile ?? profileData(data ?? [], {
    rawInput: options.rawInput,
    seriesField: options.seriesField,
  })

  const effective = computeEffectiveScale(profile, options.scale)
  const maxPerBand = options.maxPerBand ?? options.maxResults ?? 5

  const bandList = ["tiny", "small", "medium", "large", "huge"] as const
  const groups: Partial<Record<typeof bandList[number], Suggestion[]>> = {}

  for (const band of bandList) {
    const scaleForBand: DataScaleProfile = {
      ...(options.scale ?? {}),
      rows: band,
    }
    groups[band] = suggestCharts(data, {
      ...options,
      profile,
      scale: scaleForBand,
      maxResults: maxPerBand,
    })
  }

  return {
    tiny: groups.tiny ?? [],
    small: groups.small ?? [],
    medium: groups.medium ?? [],
    large: groups.large ?? [],
    huge: groups.huge ?? [],
    effective,
  }
}
