import type { Datum } from "../charts/shared/datumTypes"
import { getCapability } from "./chartCapabilities"
import { profileData } from "./profileData"
import { suggestCharts } from "./suggestCharts"
import type { ChartDataProfile, Suggestion } from "./chartCapabilityTypes"
import type { IntentId } from "./intents"

/**
 * Repair result when the chosen chart fits the data — nothing to fix.
 */
export interface RepairOkResult {
  status: "ok"
  component: string
  /** The same data profile that was evaluated. */
  profile: ChartDataProfile
}

/**
 * Repair result when the chosen chart doesn't fit. Carries the diagnostic
 * reason from the capability's `fits()` plus ranked alternatives that *do*
 * fit, with their reasons surfaced for caller narration.
 */
export interface RepairAlternativeResult {
  status: "alternative"
  /** The component the caller asked about. */
  component: string
  /** Why it doesn't fit. */
  reason: string
  /** Whether the caller intended one of the alternatives anyway. */
  alternatives: Suggestion[]
  profile: ChartDataProfile
}

/**
 * Repair result when no capability is registered for the asked component.
 */
export interface RepairUnknownResult {
  status: "unknown"
  component: string
  /** Closest matches by family/intent — best effort. */
  alternatives: Suggestion[]
  profile: ChartDataProfile
}

export type RepairResult = RepairOkResult | RepairAlternativeResult | RepairUnknownResult

export interface RepairOptions {
  /** Caller's intent — informs ranking of alternatives when the chart doesn't fit. */
  intent?: IntentId | IntentId[]
  /** Non-tabular payload (network/hierarchy/GeoJSON). Forwarded to profileData. */
  rawInput?: unknown
  /** Limit number of alternatives returned (default 3). */
  maxAlternatives?: number
  /** Pre-computed profile, avoids recomputation. */
  profile?: ChartDataProfile
}

/**
 * Validate that a chart component is a sensible choice for a dataset, and
 * if not, propose alternatives that *do* fit — ranked by the caller's
 * intent if provided.
 *
 * This is the "auto-fix" surface for `--doctor` and agent retry loops.
 * Given a chart + data, returns either:
 *
 *   - { status: "ok", component }                — the chart fits, ship it
 *   - { status: "alternative", reason, alternatives } — the chart doesn't
 *       fit; here are charts that do, ranked by intent if specified
 *   - { status: "unknown", alternatives }        — we don't have a
 *       capability for that component name; here are sensible defaults
 *
 * The contract: a caller can always render `alternatives[0]` and get
 * something useful. The `reason` field is suitable for verbatim display
 * to the user.
 *
 * @example
 * repairChartConfig("PieChart", productData, { intent: "rank" })
 *   // → { status: "alternative",
 *   //     reason: "9 slices is too many for a pie chart",
 *   //     alternatives: [BarChart, DotPlot, ...] }
 */
export function repairChartConfig(
  component: string,
  data: ReadonlyArray<Datum> | null | undefined,
  options: RepairOptions = {},
): RepairResult {
  const profile = options.profile ?? profileData(data ?? [], { rawInput: options.rawInput })
  const capability = getCapability(component)
  const maxAlternatives = options.maxAlternatives ?? 3

  if (!capability) {
    // Unknown component — return top suggestions as best-effort fallbacks
    const alternatives = suggestCharts(data, {
      profile,
      intent: options.intent,
      maxResults: maxAlternatives,
      includeVariants: false,
    })
    return { status: "unknown", component, alternatives, profile }
  }

  const fitReason = capability.fits(profile)
  if (fitReason === null) {
    return { status: "ok", component, profile }
  }

  const alternatives = suggestCharts(data, {
    profile,
    intent: options.intent,
    maxResults: maxAlternatives,
    deny: [component], // don't recommend the one that already failed
    includeVariants: false,
  })

  return {
    status: "alternative",
    component,
    reason: fitReason,
    alternatives,
    profile,
  }
}
