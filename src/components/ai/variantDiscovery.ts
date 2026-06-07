// Variant discovery — heuristic proposal + evaluation surface.
//
// API surface for proposing and evaluating chart variants beyond the
// hand-curated `capability.variants` registry. Heuristic, LLM-based,
// and model-driven proposers all plug in through one shape.
//
// The built-in proposer turns capability variants into explicit
// proposals, adds a few conservative heuristic transforms, and
// proposes same-intent cross-family alternatives. External model
// proposers still plug in through `registerVariantDiscovery`.

import type {
  ChartCapability,
  ChartDataProfile,
  ChartRubric,
  ChartVariant,
  IntentScorer,
} from "./chartCapabilityTypes"
import type { IntentId } from "./intents"
import { applyAudienceBias, type AudienceProfile } from "./audienceProfile"
import { getCapabilities, getCapability } from "./chartCapabilities"

// ── Proposal ──────────────────────────────────────────────────────────

/**
 * Where a proposal came from. Used by scoring + ranking to weight
 * trusted sources (manual hand-curated variants) above heuristic
 * suggestions and model-generated proposals that need verification.
 */
export type VariantProposalSource = "manual" | "heuristic" | "model"

/**
 * A "what if we tried this configuration?" candidate. Closely
 * related to `ChartVariant`, but with explicit provenance and an
 * optional `buildProps` so model-generated proposals can carry
 * their own prop-construction logic without registering a full
 * capability.
 *
 * The `id` is the durable identifier — the scoring side keys
 * results by it so consumers can correlate proposals across
 * propose/evaluate rounds.
 */
export interface VariantProposal {
  /** Stable identifier — `<component>:<key>` is the conventional shape. */
  id: string
  /** Component this proposal would render. */
  baseComponent: string
  /** Human-facing label, usually a registered variant label or generated heuristic label. */
  label?: string
  /**
   * Per-intent score deltas applied on top of the base capability's
   * `intentScores`. Use sparingly — over-large deltas are a sign the
   * proposal should be a separate chart, not a variant.
   */
  intentDeltas?: Partial<Record<IntentId, number>>
  /** Rubric deltas applied on top of the base capability's rubric. */
  rubricDeltas?: Partial<ChartRubric>
  /**
   * Build the props this proposal would pass to the component. When
   * omitted, the engine falls back to the capability's own
   * `buildProps(profile, variant)`. Model-generated proposals
   * typically provide their own.
   */
  buildProps?: (
    profile: ChartDataProfile,
    audience?: AudienceProfile
  ) => Record<string, unknown>
  /** Free-form natural-language rationale for the proposal. */
  rationale?: string
  /** Where the proposal originated. */
  source: VariantProposalSource
  /** Optional reference to a registered variant key when the proposal mirrors one. */
  variantKey?: string
  /** Optional tags consumers can filter on (mirrors `ChartVariant.tags`). */
  tags?: ReadonlyArray<string>
}

// ── Score ─────────────────────────────────────────────────────────────

/**
 * Why we'd reject a proposal: missing required field, conflicts with
 * data type, audience mismatch above threshold, etc. Surfaced through
 * `VariantScore.reasons`.
 */
export type VariantRejectionReason = string

/**
 * Result of evaluating a single proposal against a data profile and
 * (optionally) an audience. Composes with the existing
 * `suggestCharts` scoring vocabulary.
 */
export interface VariantScore {
  /** Echoes `VariantProposal.id`. */
  proposalId: string
  /**
   * How well this proposal matches the profile + audience, 0..5.
   * Drawn from the same 0..5 scale `suggestCharts` uses so consumers
   * can mix variant proposals into a unified ranked list.
   */
  fit: number
  /**
   * How surprising the proposal is relative to the obvious
   * recommendation, 0..1. Higher = more novel. The talk-track use
   * is "a discovery model proposed a Ridgeline where the audience
   * expected a BoxPlot."
   */
  novelty: number
  /**
   * Risk of misleading the audience, 0..1. Higher = more risky.
   * Drives the visual treatment (warning chip, expanded caveats).
   */
  risk: number
  /**
   * Narrative reasons assembled from the capability `fits()` gate,
   * rubric deltas, audience bias, and the discovery source. Suitable
   * for tooltips and LLM context.
   */
  reasons: ReadonlyArray<string>
}

export interface EvaluateVariantProposalOptions {
  /** Ranking intent(s). When omitted, fit uses the mean non-zero intent score. */
  intent?: IntentId | ReadonlyArray<IntentId>
  /** Component the user started from — used to estimate cross-family novelty. */
  baselineComponent?: string
}

// ── Function contracts ────────────────────────────────────────────────

/**
 * Context handed to a discovery function. Carries everything a
 * proposer needs to inspect the existing recommendation surface:
 * the dataset profile, the audience, the already-considered
 * variants, and the intent driving the recommendation.
 */
export interface VariantDiscoveryContext {
  profile: ChartDataProfile
  audience?: AudienceProfile
  intent?: IntentId | ReadonlyArray<IntentId>
  /**
   * Variants already attached to the base capability — proposers
   * should avoid re-emitting these unless they have meaningful
   * deltas a registered variant doesn't.
   */
  existingVariants?: ReadonlyArray<ChartVariant>
}

/**
 * Signature for a proposal generator. Implementations may be
 * heuristic, LLM-driven, or hand-coded. The engine collects
 * proposals from every registered discovery function and ranks
 * the union through `evaluateVariantProposal`.
 */
export type ProposeVariantFn = (
  component: string,
  capability: ChartCapability,
  context: VariantDiscoveryContext
) => ReadonlyArray<VariantProposal>

/**
 * Signature for a scoring function. The default scorer composes the
 * capability's `fits()` gate, rubric deltas, and audience bias. External
 * scorers may add their own novelty/risk computations.
 */
export type EvaluateVariantProposalFn = (
  proposal: VariantProposal,
  profile: ChartDataProfile,
  audience?: AudienceProfile,
  options?: EvaluateVariantProposalOptions
) => VariantScore

// ── Plug point for external discovery models ─────────────────────────

const discoveryFns = new Set<ProposeVariantFn>()

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, n))
}

function clampRubric(r: ChartRubric): ChartRubric {
  return {
    familiarity: Math.round(clamp(r.familiarity, 1, 5)),
    accuracy: Math.round(clamp(r.accuracy, 1, 5)),
    precision: Math.round(clamp(r.precision, 1, 5)),
  }
}

function scoreIntent(scorer: IntentScorer | undefined, profile: ChartDataProfile): number {
  if (scorer === undefined) return 0
  const raw = typeof scorer === "function" ? scorer(profile) : scorer
  return clamp(raw, 0, 5)
}

function normalizeIntents(intent?: IntentId | ReadonlyArray<IntentId>): IntentId[] {
  if (!intent) return []
  if (Array.isArray(intent)) return [...intent]
  return [intent as IntentId]
}

function intentScoresFor(
  capability: ChartCapability,
  profile: ChartDataProfile,
  deltas?: Partial<Record<IntentId, number>>
): Partial<Record<IntentId, number>> {
  const out: Partial<Record<IntentId, number>> = {}
  for (const [intent, scorer] of Object.entries(capability.intentScores) as Array<[IntentId, IntentScorer]>) {
    out[intent] = scoreIntent(scorer, profile)
  }
  if (deltas) {
    for (const [intent, delta] of Object.entries(deltas) as Array<[IntentId, number]>) {
      out[intent] = clamp((out[intent] ?? 0) + delta, 0, 5)
    }
  }
  return out
}

function compositeScore(
  intentScores: Partial<Record<IntentId, number>>,
  rankingIntents: ReadonlyArray<IntentId>
): number {
  if (rankingIntents.length > 0) {
    return rankingIntents.reduce((sum, intent) => sum + (intentScores[intent] ?? 0), 0) / rankingIntents.length
  }
  const nonZero = Object.values(intentScores).filter((n): n is number => typeof n === "number" && n > 0)
  return nonZero.length ? nonZero.reduce((sum, n) => sum + n, 0) / nonZero.length : 0
}

function applyRubricDeltas(
  rubric: ChartRubric,
  deltas?: Partial<ChartRubric>
): ChartRubric {
  if (!deltas) return rubric
  return clampRubric({
    familiarity: rubric.familiarity + (deltas.familiarity ?? 0),
    accuracy: rubric.accuracy + (deltas.accuracy ?? 0),
    precision: rubric.precision + (deltas.precision ?? 0),
  })
}

function proposalFromRegisteredVariant(
  capability: ChartCapability,
  variant: ChartVariant
): VariantProposal {
  return {
    id: `${capability.component}:${variant.key}`,
    baseComponent: capability.component,
    label: variant.label,
    intentDeltas: variant.intentDeltas,
    rubricDeltas: variant.rubricDeltas,
    buildProps: (profile) => capability.buildProps(profile, variant),
    rationale: variant.description ?? `Registered ${capability.component} variant: ${variant.label}.`,
    source: "manual",
    variantKey: variant.key,
    tags: variant.tags,
  }
}

function variantHasProp(
  variants: ReadonlyArray<ChartVariant>,
  key: string,
  value: unknown
): boolean {
  return variants.some((variant) => variant.props?.[key] === value)
}

function builtInHeuristicProposals(
  component: string,
  capability: ChartCapability,
  context: VariantDiscoveryContext
): VariantProposal[] {
  const profile = context.profile
  const existingVariants = context.existingVariants ?? capability.variants ?? []
  const intents = normalizeIntents(context.intent)
  const proposals: VariantProposal[] = []

  for (const variant of existingVariants) {
    proposals.push(proposalFromRegisteredVariant(capability, variant))
  }

  const wantsRankOrCategory =
    intents.includes("rank") || intents.includes("compare-categories")

  if (
    capability.family === "categorical" &&
    !variantHasProp(existingVariants, "orientation", "horizontal") &&
    (wantsRankOrCategory || (profile.categoryCount ?? 0) >= 6)
  ) {
    proposals.push({
      id: `${component}:heuristic-horizontal`,
      baseComponent: component,
      label: "Horizontal ranked view",
      intentDeltas: { rank: 1, "compare-categories": 0.5 },
      rubricDeltas: { precision: 1 },
      buildProps: (p) => ({
        ...capability.buildProps(p),
        orientation: "horizontal",
        sort: "desc",
      }),
      rationale: "Horizontal orientation improves label legibility and rank scanning for categorical comparisons.",
      source: "heuristic",
      tags: ["horizontal", "ranked"],
    })
  }

  const hasNormalizeVariant =
    variantHasProp(existingVariants, "normalize", true) ||
    variantHasProp(existingVariants, "type", "percent") ||
    existingVariants.some((variant) => /normal|percent/i.test(`${variant.key} ${variant.label}`))

  if (
    /Stacked/.test(component) &&
    !hasNormalizeVariant &&
    (intents.includes("part-to-whole") || intents.includes("composition-over-time"))
  ) {
    proposals.push({
      id: `${component}:heuristic-normalized`,
      baseComponent: component,
      label: "Normalized composition",
      intentDeltas: { "part-to-whole": 1, "compare-categories": -0.5 },
      rubricDeltas: { precision: -1 },
      buildProps: (p) => ({
        ...capability.buildProps(p),
        normalize: true,
      }),
      rationale: "Normalization emphasizes proportional composition when absolute magnitude is secondary.",
      source: "heuristic",
      tags: ["normalized", "part-to-whole"],
    })
  }

  if (intents.length > 0) {
    const alternatives = getCapabilities()
      .filter((candidate) => candidate.component !== component)
      .filter((candidate) => candidate.fits(profile) === null)
      .map((candidate) => {
        const scores = intentScoresFor(candidate, profile)
        return {
          candidate,
          fit: compositeScore(scores, intents),
          scores,
        }
      })
      .filter((entry) => entry.fit >= 4)
      .sort((a, b) => {
        if (b.fit !== a.fit) return b.fit - a.fit
        if (b.candidate.rubric.accuracy !== a.candidate.rubric.accuracy) {
          return b.candidate.rubric.accuracy - a.candidate.rubric.accuracy
        }
        return b.candidate.rubric.familiarity - a.candidate.rubric.familiarity
      })
      .slice(0, 3)

    for (const { candidate, fit } of alternatives) {
      proposals.push({
        id: `${candidate.component}:heuristic-${intents.join("-")}`,
        baseComponent: candidate.component,
        label: `${candidate.component} alternative`,
        buildProps: (p) => candidate.buildProps(p),
        rationale: `${candidate.component} is a strong ${intents.join(" + ")} alternative (${fit.toFixed(1)}/5) for this data shape.`,
        source: "heuristic",
        tags: ["cross-family", candidate.family],
      })
    }
  }

  return proposals
}

function collectProposals(
  component: string,
  capability: ChartCapability,
  context: VariantDiscoveryContext
): VariantProposal[] {
  const seen = new Map<string, VariantProposal>()
  const addAll = (proposals: ReadonlyArray<VariantProposal>) => {
    for (const p of proposals) {
      if (!p || !p.id || !p.baseComponent) continue
      if (!seen.has(p.id)) seen.set(p.id, p)
    }
  }

  addAll(builtInHeuristicProposals(component, capability, context))

  for (const fn of discoveryFns) {
    let proposals: ReadonlyArray<VariantProposal> = []
    try {
      proposals = fn(component, capability, context) ?? []
    } catch (err) {
      if (typeof console !== "undefined") {
        console.warn("[variantDiscovery] proposer threw:", err)
      }
      continue
    }
    addAll(proposals)
  }

  return Array.from(seen.values())
}

// ── proposeVariant: dispatches through registered discovery fns ──────

/**
 * Aggregates proposals from every registered discovery function.
 *
 * Each registered function is invoked with the same `(component,
 * capability, context)` tuple; their results are concatenated and
 * deduplicated by `VariantProposal.id` (first proposer wins). A
 * proposer that throws is isolated — the error surfaces through
 * `console.warn` and the remaining proposers still run.
 *
 * The built-in proposer first emits registered `capability.variants` as
 * manual proposals, then adds conservative heuristic transforms and
 * same-intent cross-family alternatives. Registered discovery functions
 * run after that and are deduplicated by `VariantProposal.id`.
 */
export const proposeVariant: ProposeVariantFn = (component, capability, context) => {
  return collectProposals(component, capability, context)
}

/**
 * Evaluate a proposal against the same ingredients the capability
 * recommender uses: fits gate, intent scores, rubric deltas, and audience
 * profile. `novelty` and `risk` are discovery-specific side channels.
 */
export const evaluateVariantProposal: EvaluateVariantProposalFn = (
  proposal,
  profile,
  audience,
  options = {}
) => {
  const capability = getCapability(proposal.baseComponent)
  if (!capability) {
    return {
      proposalId: proposal.id,
      fit: 0,
      novelty: 1,
      risk: 1,
      reasons: [`No capability registered for proposed component "${proposal.baseComponent}".`],
    }
  }

  const fitReason = capability.fits(profile)
  if (fitReason !== null) {
    return {
      proposalId: proposal.id,
      fit: 0,
      novelty: proposal.source === "manual" ? 0.2 : 0.7,
      risk: 1,
      reasons: [`Rejected: ${fitReason}`],
    }
  }

  const rankingIntents = normalizeIntents(options.intent)
  const intentScores = intentScoresFor(capability, profile, proposal.intentDeltas)
  const baseFit = compositeScore(intentScores, rankingIntents)
  const rubric = applyRubricDeltas(capability.rubric, proposal.rubricDeltas)
  const biased = applyAudienceBias(baseFit, rubric, proposal.baseComponent, audience)
  const fit = clamp(biased.score, 0, 5)

  let novelty = proposal.source === "manual" ? 0.15 : proposal.source === "heuristic" ? 0.45 : 0.75
  if (options.baselineComponent && options.baselineComponent !== proposal.baseComponent) novelty += 0.2
  if (!proposal.variantKey) novelty += 0.05
  novelty = clamp(novelty, 0, 1)

  let risk = proposal.source === "manual" ? 0.1 : proposal.source === "heuristic" ? 0.25 : 0.45
  if ((proposal.rubricDeltas?.accuracy ?? 0) < 0) risk += 0.15
  if ((proposal.rubricDeltas?.precision ?? 0) < 0) risk += 0.1
  if (rubric.accuracy <= 3) risk += 0.1
  if (fit < 3) risk += 0.2
  risk = clamp(risk, 0, 1)

  const reasons: string[] = []
  if (proposal.rationale) reasons.push(proposal.rationale)
  if (rankingIntents.length > 0) {
    const intentText = rankingIntents
      .map((intent) => `${intent}: ${(intentScores[intent] ?? 0).toFixed(1)}/5`)
      .join(", ")
    reasons.push(`Intent fit — ${intentText}.`)
  } else {
    reasons.push(`Mean non-zero intent fit ${baseFit.toFixed(1)}/5.`)
  }
  if (proposal.source !== "manual") reasons.push(`${proposal.source} proposal; verify against domain context.`)
  if (biased.appliedReason) reasons.push(biased.appliedReason)
  if (proposal.rubricDeltas && Object.values(proposal.rubricDeltas).some((delta) => (delta ?? 0) < 0)) {
    reasons.push("Rubric tradeoff: improves one reading mode while reducing precision or accuracy.")
  }

  return {
    proposalId: proposal.id,
    fit,
    novelty,
    risk,
    reasons,
  }
}

/**
 * Register a discovery function. Returns an unregister callback.
 *
 * `proposeVariant` invokes every registered function and deduplicates
 * by `VariantProposal.id`. External ML-driven proposers plug in here
 * without API change.
 *
 * Built-in heuristic discovery lives in `proposeVariant` directly. This
 * registry is the extension surface for consumers and model integrations.
 */
export function registerVariantDiscovery(fn: ProposeVariantFn): () => void {
  discoveryFns.add(fn)
  return () => {
    discoveryFns.delete(fn)
  }
}

/**
 * Snapshot the registered discovery functions. Primarily for testing
 * and for the engine implementation to iterate registered proposers.
 */
export function getRegisteredVariantDiscovery(): ReadonlyArray<ProposeVariantFn> {
  return Array.from(discoveryFns)
}

/**
 * Drop every registered discovery function. Exposed for tests and
 * for consumers who need to swap discovery models between sessions.
 */
export function clearVariantDiscovery(): void {
  discoveryFns.clear()
}
