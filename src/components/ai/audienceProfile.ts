import type { ChartRubric } from "./chartCapabilityTypes"
import type { AccessibilityAuditResult } from "../charts/shared/auditAccessibility"

/**
 * The channel an audience receives a chart through. Orthogonal to familiarity:
 * a reader can be highly familiar with a chart type yet unable to *receive* it
 * in their channel (an 8-slice pie is familiar but illegible to a screen
 * reader). Defaults to `"visual"` when unset — no receivability bias applied.
 *
 *   • `visual`        — sighted reader; the historical default, no bias.
 *   • `screen-reader` — non-visual; meaning must survive the data table / nav tree.
 *   • `sonified`      — audio; density and ordering matter more than color.
 *   • `agent`         — an LLM reading via the grounding payload; same non-visual
 *                       "is the meaning recoverable without pixels?" question.
 */
export type ReceptionModality = "visual" | "screen-reader" | "sonified" | "agent"

/**
 * A serializable description of who's reading the charts and what the
 * organization is trying to grow.
 *
 * Semiotic does not measure familiarity — it consumes measurements. Orgs
 * produce an AudienceProfile through whatever channel makes sense (surveys,
 * telemetry, manager judgment, training records) and pass it to the
 * suggestion APIs. The library applies the bias and returns rankings that
 * reflect the audience instead of a generic data-literate baseline.
 */
export interface AudienceProfile {
  /**
   * Display name. Surfaced in suggestion `reasons[]` when a target fires so
   * users can see whose policy is influencing the ranking.
   */
  name?: string
  /**
   * Per-chart familiarity override (1..5). Replaces the descriptor's
   * `rubric.familiarity`. Charts not listed fall back to the descriptor.
   *
   * @example
   * familiarity: { BarChart: 5, LineChart: 5, PieChart: 4, BoxPlot: 2 }
   */
  familiarity?: Partial<Record<string, number>>
  /**
   * Adoption targets — which charts the org is trying to grow or reduce.
   * The engine applies a meaningful score bias (±1..3 depending on weight)
   * so growth targets win close calls and decrease targets fall back unless
   * they're the only fit.
   *
   * @example
   * targets: {
   *   PieChart: { direction: "decrease", weight: 1 },
   *   BoxPlot:  { direction: "increase", weight: 2,
   *               reason: "we want the team reading distributions, not means" }
   * }
   */
  targets?: Partial<Record<string, AudienceTarget>>
  /**
   * Controls visibility of stretch picks (unfamiliar-but-relevant charts).
   *   0 — never surface stretches; familiar-only rankings
   *   1 — surface in a separate `stretchSuggestions` list (default when audience set)
   *   2 — same as 1 but lowers the familiarity threshold (≤4) for what counts as stretch,
   *       widening the menu
   */
  exposureLevel?: 0 | 1 | 2
  /**
   * The channel this audience receives charts through. When set to a non-visual
   * modality, `suggestCharts` runs the accessibility audit on each candidate and
   * `applyAudienceBias` down-ranks charts whose meaning doesn't survive that
   * channel (and surfaces the receivability findings as caveats). Unset /
   * `"visual"` keeps the historical behavior — familiarity and targets only.
   * See {@link receivabilityBias}.
   */
  receptionModality?: ReceptionModality
}

export interface AudienceTarget {
  direction: "increase" | "decrease"
  /** 1..3 — controls bias magnitude. Default 1. */
  weight?: number
  /** Human-readable rationale. Surfaces in suggestion.reasons when the target fires. */
  reason?: string
}

export interface AudienceBiasResult {
  /** Composite score after audience adjustments. Unclamped — can range outside 0..5. */
  score: number
  /** Effective rubric for the chart after audience overrides. */
  rubric: ChartRubric
  /** Reason string to append to the suggestion when a target fired. */
  appliedReason?: string
  /** Reason string to append when a receivability penalty fired (non-visual modality). */
  receivabilityReason?: string
}

export interface ReceivabilitySignal {
  /** Score delta (≤ 0) — the receivability penalty for this channel. */
  delta: number
  /** One-line reason, present only when a penalty applied. */
  reason?: string
  /**
   * Caveat messages for the findings that drove the penalty — the receivability
   * slice of the audit, ready to merge into a suggestion's `caveats[]` alongside
   * the perceptual ones (so both channels read from the same array).
   */
  caveats: string[]
}

const FAMILIARITY_WEIGHT = 0.5
const TARGET_WEIGHT = 1.0

// Audit heuristics whose status materially decides whether a chart's meaning
// survives a non-visual channel. A deliberate subset of the audit: heuristics
// that fire uniformly (e.g. "features described", fixable at the container
// layer) are excluded so the bias *differentiates* charts rather than penalizing
// every candidate equally.
const RECEIVABILITY_HEURISTICS: ReadonlySet<string> = new Set([
  "perceivable.content-only-visual",
  "perceivable.color-alone",
  "assistive.data-density",
  "assistive.human-readable-numbers",
  "assistive.skippable-navigation",
  "compromising.table",
  "compromising.navigable-structure",
])

const MODALITY_LABEL: Record<Exclude<ReceptionModality, "visual">, string> = {
  "screen-reader": "a screen reader",
  sonified: "sonification",
  agent: "an AI reader",
}

/**
 * Translate an accessibility audit into a receivability penalty for a non-visual
 * channel. Pure. `fail` findings on receivability-critical heuristics weigh most;
 * `warn` findings weigh less; `manual`/`pass`/`not-applicable` never penalize
 * (we don't punish what we can't prove). Penalty is clamped to a −3 floor so it
 * reorders rankings without overriding data-shape correctness.
 *
 * ```ts
 * const audit = auditAccessibility("PieChart", props)
 * const { delta, reason } = receivabilityBias(audit, "screen-reader")
 * ```
 */
export function receivabilityBias(
  audit: AccessibilityAuditResult,
  modality: ReceptionModality,
): ReceivabilitySignal {
  if (modality === "visual") return { delta: 0, caveats: [] }
  let delta = 0
  const flagged: string[] = []
  const caveats: string[] = []
  for (const f of audit.findings) {
    if (!RECEIVABILITY_HEURISTICS.has(f.id)) continue
    let penalty = 0
    if (f.status === "fail") penalty = f.critical ? 1.2 : 0.8
    else if (f.status === "warn") penalty = 0.4
    if (penalty > 0) {
      delta -= penalty
      flagged.push(f.heuristic.charAt(0).toLowerCase() + f.heuristic.slice(1))
      caveats.push(f.message)
    }
  }
  if (flagged.length === 0) return { delta: 0, caveats: [] }
  return {
    delta: Math.max(-3, delta),
    reason: `Harder to receive via ${MODALITY_LABEL[modality]}: ${flagged.slice(0, 3).join("; ")}`,
    caveats,
  }
}

/**
 * Apply an AudienceProfile's bias to a chart's composite score and rubric.
 * Pure function — used by both `suggestCharts` and `suggestStretchCharts`.
 *
 * Two terms compose additively:
 *   • Familiarity bias: (audienceFamiliarity − 3) × 0.5
 *     — Range ±1.0. At familiarity 5 we add 1.0; at 1 we subtract 1.0.
 *   • Target bias: ±1.0 × weight
 *     — Range ±3.0 for weight=3. Strong enough to reorder rankings,
 *       not so strong that it overrides chart correctness for the data shape.
 *
 * Score is left unclamped so internal sorting reflects the magnitude of bias.
 *
 * A third term — *receivability* — composes in when the audience declares a
 * non-visual `receptionModality` and the caller passes a precomputed
 * {@link ReceivabilitySignal} (from {@link receivabilityBias}). Familiarity and
 * receivability are different axes: a chart can be familiar yet unreceivable in
 * the target channel, and this folds that signal into the same score the
 * recommender ranks by. The caller computes the signal once and reuses it for
 * the suggestion's caveats too, so the audit is scanned a single time per
 * candidate.
 */
export function applyAudienceBias(
  baseScore: number,
  baseRubric: ChartRubric,
  component: string,
  audience: AudienceProfile | undefined,
  receivability?: ReceivabilitySignal,
): AudienceBiasResult {
  if (!audience) return { score: baseScore, rubric: baseRubric }

  const audienceFamiliarity = audience.familiarity?.[component]
  const familiarity = audienceFamiliarity ?? baseRubric.familiarity
  const target = audience.targets?.[component]

  let delta = 0
  if (audienceFamiliarity !== undefined) {
    delta += (audienceFamiliarity - 3) * FAMILIARITY_WEIGHT
  }
  let appliedReason: string | undefined
  if (target) {
    const weight = Math.max(1, Math.min(3, target.weight ?? 1))
    const sign = target.direction === "increase" ? 1 : -1
    delta += sign * TARGET_WEIGHT * weight
    if (target.reason) {
      appliedReason = `${audience.name ? `${audience.name}: ` : ""}${target.reason}`
    } else {
      appliedReason = `${audience.name ? `${audience.name} ` : ""}target: ${target.direction} ${component}`
    }
  }

  // Receivability: fold the precomputed signal for the audience's channel.
  // The `modality` guard keeps a visual audience penalty-free even if a caller
  // passes a non-zero signal.
  let receivabilityReason: string | undefined
  const modality = audience.receptionModality
  if (receivability && modality && modality !== "visual") {
    delta += receivability.delta
    receivabilityReason = receivability.reason
  }

  return {
    score: baseScore + delta,
    rubric: { ...baseRubric, familiarity },
    appliedReason,
    receivabilityReason,
  }
}

/**
 * Resolve the effective familiarity for a chart under an audience. Used by
 * the stretch surface to decide whether a chart qualifies as "unfamiliar."
 */
export function effectiveFamiliarity(
  component: string,
  defaultFamiliarity: number,
  audience: AudienceProfile | undefined
): number {
  if (!audience) return defaultFamiliarity
  return audience.familiarity?.[component] ?? defaultFamiliarity
}

/**
 * Familiarity threshold for what counts as a "stretch" pick under this audience.
 * Tighter for exposureLevel 1, wider for 2. Returns the highest familiarity a
 * chart can have and still appear in the stretch surface.
 */
export function stretchFamiliarityCeiling(
  audience: AudienceProfile | undefined
): number {
  if (!audience) return 3
  if (audience.exposureLevel === 2) return 4
  return 3
}
