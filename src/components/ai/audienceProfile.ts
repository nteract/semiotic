import type { ChartRubric } from "./chartCapabilityTypes"

/**
 * A serializable description of who's reading the charts and what the
 * organization is trying to grow.
 *
 * Semiotic does not measure familiarity — it consumes measurements. Orgs
 * produce an AudienceProfile through whatever channel makes sense (surveys,
 * telemetry, manager judgment, training records) and pass it to the
 * suggestion APIs. The library applies the bias and returns rankings that
 * reflect the audience instead of a generic data-literate baseline.
 *
 * Strategy memo: docs/strategy/audience-profiles.md
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
}

const FAMILIARITY_WEIGHT = 0.5
const TARGET_WEIGHT = 1.0

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
 */
export function applyAudienceBias(
  baseScore: number,
  baseRubric: ChartRubric,
  component: string,
  audience: AudienceProfile | undefined,
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

  return {
    score: baseScore + delta,
    rubric: { ...baseRubric, familiarity },
    appliedReason,
  }
}

/**
 * Resolve the effective familiarity for a chart under an audience. Used by
 * the stretch surface to decide whether a chart qualifies as "unfamiliar."
 */
export function effectiveFamiliarity(
  component: string,
  defaultFamiliarity: number,
  audience: AudienceProfile | undefined,
): number {
  if (!audience) return defaultFamiliarity
  return audience.familiarity?.[component] ?? defaultFamiliarity
}

/**
 * Familiarity threshold for what counts as a "stretch" pick under this audience.
 * Tighter for exposureLevel 1, wider for 2. Returns the highest familiarity a
 * chart can have and still appear in the stretch surface.
 */
export function stretchFamiliarityCeiling(audience: AudienceProfile | undefined): number {
  if (!audience) return 3
  if (audience.exposureLevel === 2) return 4
  return 3
}
