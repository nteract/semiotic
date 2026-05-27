// Variant discovery — M1 (interface design).
//
// "Where's the learning?" is the second-most-likely Q&A landing zone
// for the talk. The defensible answer is a documented API surface for
// proposing and evaluating chart variants, with the actual discovery
// model deferred to future milestones.
//
// This module ships the type contract plus stub implementations that
// callers can wire end-to-end today. The heuristic implementation
// lands in M2 (`proposeVariant` walks the existing variant registry
// + simple transformations). The MCP tool wrapping lands in M3.
// The `registerVariantDiscovery` plug point for external models
// lands in M4. See `docs/strategy/variant-discovery.md` for the
// full sequencing.

import type {
  ChartCapability,
  ChartDataProfile,
  ChartRubric,
  ChartVariant,
} from "./chartCapabilityTypes"
import type { IntentId } from "./intents"
import type { AudienceProfile } from "./audienceProfile"

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
  intent?: IntentId
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
 * Signature for a scoring function. The default scorer (lands in
 * M3) composes the capability's `fits()` gate, rubric deltas, and
 * audience bias. External scorers may add their own novelty/risk
 * computations.
 */
export type EvaluateVariantProposalFn = (
  proposal: VariantProposal,
  profile: ChartDataProfile,
  audience?: AudienceProfile
) => VariantScore

// ── Stubs ─────────────────────────────────────────────────────────────

/**
 * M1 stub. Returns an empty proposal array — callers wiring through
 * the interface get the shape right today and pick up real proposals
 * once the heuristic implementation lands in M2.
 *
 * Wrapping callers should treat an empty return as "nothing to
 * surface" rather than an error.
 */
export const proposeVariant: ProposeVariantFn = (_component, _capability, _context) => {
  return []
}

/**
 * M1 stub. Returns a neutral baseline score so consumers can wire
 * the evaluation pipeline before the real scorer arrives in M3.
 *
 * The shape is real; the numbers are placeholders. Code that mixes
 * baseline scores into ranked output should treat `fit = 0` as "no
 * signal" rather than "rejected."
 */
export const evaluateVariantProposal: EvaluateVariantProposalFn = (proposal, _profile, _audience) => {
  return {
    proposalId: proposal.id,
    fit: 0,
    novelty: 0,
    risk: 0,
    reasons: [
      "Variant discovery M1: scoring not implemented. See docs/strategy/variant-discovery.md.",
    ],
  }
}

// ── Plug point for external discovery models (M4) ─────────────────────

const discoveryFns = new Set<ProposeVariantFn>()

/**
 * Register a discovery function. Returns an unregister callback.
 *
 * The engine (lands in M3) invokes every registered function and
 * deduplicates by `VariantProposal.id`. External ML-driven proposers
 * plug in here without API change.
 *
 * Built-in heuristic discovery (M2) is *not* registered through this
 * surface — it lives in `proposeVariant` directly. This registry is
 * the extension surface for consumers and future model integrations.
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
