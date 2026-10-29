import type { ChartDataProfile } from "./chartCapabilityTypes"
import type { IntentId } from "./intents"

/** Intents to rank by, each with its share of the composite score. */
export type IntentWeights = ReadonlyArray<readonly [IntentId, number]>

/** Equal weights for intents the caller asked for. */
export function requestedIntentWeights(intents: ReadonlyArray<IntentId>): IntentWeights {
  return intents.map((intent) => [intent, 1] as const)
}

/**
 * Weighted mean of intent scores. Without weights it falls back to the mean
 * of the non-zero scores, which is only used for data shapes no default
 * weighting covers.
 */
export function weightedIntentScore(
  intentScores: Partial<Record<IntentId, number>>,
  weights: IntentWeights,
): number {
  if (weights.length === 0) {
    const nonZero = Object.values(intentScores).filter(
      (n): n is number => typeof n === "number" && n > 0,
    )
    return nonZero.length ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0
  }
  let sum = 0
  let total = 0
  for (const [intent, weight] of weights) {
    sum += (intentScores[intent] ?? 0) * weight
    total += weight
  }
  return total > 0 ? sum / total : 0
}

/**
 * Intent weights for a caller who names no intent, read off the profile: a
 * measure over a time (or named sequential) axis is first a trend,
 * categories are first a ranking, and two plain measures are first a
 * correlation. A plain mean over every intent would instead favour charts
 * that are middling at many intents — or strong at one niche intent — over
 * the one that fits the common case. Graph, hierarchy, and geographic
 * profiles return no weights and keep that mean.
 */
export function defaultProfileIntentWeights(profile: ChartDataProfile): IntentWeights {
  if (profile.hasNetwork || profile.hasHierarchy || profile.hasGeo) return []
  const { x, y, category, series } = profile.primary
  if (!y) return []
  const weights: Array<[IntentId, number]> = []
  if (x && (profile.xProvenance === "time" || profile.xProvenance === "named")) {
    weights.push(["trend", 3], ["change-detection", 1], ["distribution", 1], ["outlier-detection", 1])
    if (series) weights.push(["compare-series", 2])
    if (category && category !== series) weights.push(["compare-categories", 0.5])
  } else if (category) {
    // Ten or more rows per category are raw observations (the threshold
    // BarChart uses): their spread is the story, not one total per category.
    const perCategory = profile.categoryCount ? profile.rowCount / profile.categoryCount : 1
    if (perCategory >= 10) {
      weights.push(["distribution", 3], ["compare-categories", 2], ["outlier-detection", 1], ["rank", 0.5])
    } else {
      weights.push(["rank", 2], ["compare-categories", 2], ["part-to-whole", 1], ["distribution", 0.5])
    }
  } else if (x) {
    weights.push(["correlation", 3], ["outlier-detection", 1], ["distribution", 1])
  }
  return weights
}
