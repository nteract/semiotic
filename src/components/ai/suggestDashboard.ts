import type { Datum } from "../charts/shared/datumTypes"
import { profileData } from "./profileData"
import { suggestCharts } from "./suggestCharts"
import { suggestStretchCharts, type StretchSuggestion } from "./suggestStretchCharts"
import type { ChartDataProfile, Suggestion } from "./chartCapabilityTypes"
import type { IntentId } from "./intents"
import type { AudienceProfile } from "./audienceProfile"

/**
 * One panel in a generated dashboard. Pairs a chart suggestion with the
 * intent that motivated it — consumers render the suggestion and label it
 * with the intent so readers know *why* that panel exists.
 */
export interface DashboardPanel {
  /** The intent this panel covers. */
  intent: IntentId
  /** The chart picked for that intent. */
  suggestion: Suggestion
}

export interface DashboardSuggestion {
  /** Ordered panels, each covering a distinct intent. */
  panels: DashboardPanel[]
  /** Intents the engine actually filled. */
  intentsCovered: IntentId[]
  /** Intents the engine couldn't fill from this data. */
  intentsMissing: IntentId[]
  /**
   * Stretch panels — unfamiliar-but-fitting charts the audience could grow
   * into. Empty when no `audience` is provided or `exposureLevel` is 0.
   * Render alongside the main panels in a distinct surface so users see
   * them as opt-in literacy growth, not silent defaults.
   */
  stretchPanels: StretchSuggestion[]
  /** The shape profile (computed once, reused for every panel). */
  profile: ChartDataProfile
}

export interface SuggestDashboardOptions {
  /**
   * Intents to attempt. When omitted, the engine picks a sensible default set
   * based on the data shape (e.g. if `hasTimeAxis`, include "trend"; if
   * `categoryCount`, include "rank" and "part-to-whole").
   */
  intents?: ReadonlyArray<IntentId>
  /** Maximum number of panels. Default 6. */
  maxPanels?: number
  /**
   * When true (default), prefer not to repeat the same chart family across
   * panels — produces a more varied dashboard. Set false to allow duplicates.
   */
  diversifyByFamily?: boolean
  /** Allow only these component names. */
  allow?: ReadonlyArray<string>
  /** Exclude these component names. */
  deny?: ReadonlyArray<string>
  /** Optional pre-built profile (avoids recomputation). */
  profile?: ChartDataProfile
  /** Non-tabular payload — forwarded to profileData. */
  rawInput?: unknown
  /**
   * Audience profile — applies familiarity overrides and adoption-target bias
   * to every panel's ranking. When set with `exposureLevel >= 1`, the dashboard
   * additionally returns `stretchPanels` showing unfamiliar-but-fitting charts.
   */
  audience?: AudienceProfile
  /** Max stretch panels (default min(maxPanels, 3)). */
  maxStretchPanels?: number
}

/**
 * Choose a default intent set based on data shape. The intuition: a good
 * dashboard answers "what's here?" through several lenses, but those lenses
 * only make sense if the data actually supports them.
 */
function defaultIntents(profile: ChartDataProfile): IntentId[] {
  const intents: IntentId[] = []

  if (profile.hasTimeAxis) {
    intents.push("trend")
    if (profile.seriesCount && profile.seriesCount >= 2) {
      intents.push("compare-series", "composition-over-time")
    }
    intents.push("change-detection")
  }

  if (profile.categoryCount) {
    intents.push("rank", "compare-categories", "part-to-whole")
  }

  // Distribution applies whenever we have a primary numeric y and enough rows.
  if (profile.primary.y && profile.rowCount >= 10) {
    intents.push("distribution")
  }

  // Correlation if there are 2+ numerics
  const numericFieldCount = Object.values(profile.fields).filter(
    (f) => f.type === "numeric",
  ).length
  if (numericFieldCount >= 2) {
    intents.push("correlation", "outlier-detection")
  }

  if (profile.hasHierarchy) intents.push("hierarchy")
  if (profile.hasNetwork) intents.push("flow")
  if (profile.hasGeo) intents.push("geo")

  // Dedup while preserving order
  return Array.from(new Set(intents))
}

/**
 * Generate a dashboard: a set of complementary chart panels, each
 * answering a distinct analytical intent on the same dataset.
 *
 * The contract: every panel has a stated `intent` and a suggestion that
 * fits that intent. The engine diversifies by chart family by default to
 * avoid "every panel is a bar chart" outcomes. Intents that can't be
 * filled from the data (e.g. "geo" on row data with no lat/lon) are
 * reported in `intentsMissing` so consumers can show "no fit for geo
 * here" rather than silently dropping them.
 *
 * Heuristic only — no LLM call. The result is suitable for direct
 * rendering (each panel's `suggestion.props` is spreadable into the
 * matching chart) or for piping to an LLM as composition context.
 *
 * @example
 * const { panels } = suggestDashboard(data)
 * return (
 *   <Grid>
 *     {panels.map(({ intent, suggestion }) => (
 *       <Panel key={intent} title={intent}>
 *         <DynamicChart component={suggestion.component} props={suggestion.props} />
 *       </Panel>
 *     ))}
 *   </Grid>
 * )
 */
export function suggestDashboard(
  data: ReadonlyArray<Datum> | null | undefined,
  options: SuggestDashboardOptions = {},
): DashboardSuggestion {
  const profile = options.profile ?? profileData(data ?? [], { rawInput: options.rawInput })
  const maxPanels = options.maxPanels ?? 6
  const diversify = options.diversifyByFamily !== false
  const intents = options.intents ?? defaultIntents(profile)

  const panels: DashboardPanel[] = []
  const intentsCovered: IntentId[] = []
  const intentsMissing: IntentId[] = []
  const usedFamilies = new Set<string>()
  // Track (component, variantKey) so the same chart never appears twice
  const usedKeys = new Set<string>()

  for (const intent of intents) {
    if (panels.length >= maxPanels) {
      intentsMissing.push(intent)
      continue
    }

    // Get a fresh ranked list for this intent. We re-rank rather than
    // cherry-picking from a single suggestion set because intent-specific
    // ranking is the whole point. The minScore floor ensures we don't
    // recommend "the technically least-bad fit" when *nothing* actually
    // serves the intent (e.g. "geo" on row data with no lat/lon).
    const candidates = suggestCharts(data, {
      profile,
      intent,
      allow: options.allow,
      deny: options.deny,
      maxResults: 20,
      includeVariants: true,
      minScore: 1.5,
      audience: options.audience,
    })

    // Find the highest-ranked candidate not already used (component+variant),
    // and (when diversifying) whose family isn't already in the dashboard.
    let pick: Suggestion | undefined
    for (const candidate of candidates) {
      const key = `${candidate.component}/${candidate.variant?.key ?? "base"}`
      if (usedKeys.has(key)) continue
      if (diversify && usedFamilies.has(candidate.family)) continue
      pick = candidate
      break
    }

    // Fallback: if diversification eliminated all candidates, accept a
    // family repeat rather than skipping the intent.
    if (!pick && diversify) {
      for (const candidate of candidates) {
        const key = `${candidate.component}/${candidate.variant?.key ?? "base"}`
        if (usedKeys.has(key)) continue
        pick = candidate
        break
      }
    }

    if (pick) {
      panels.push({ intent, suggestion: pick })
      intentsCovered.push(intent)
      usedFamilies.add(pick.family)
      usedKeys.add(`${pick.component}/${pick.variant?.key ?? "base"}`)
    } else {
      intentsMissing.push(intent)
    }
  }

  // Stretch panels are populated when an audience is provided and exposure is enabled.
  // Excludes anything already in the main dashboard so the stretch rail genuinely
  // shows growth opportunities, not duplicates of the familiar picks.
  const stretchPanels: StretchSuggestion[] =
    options.audience && (options.audience.exposureLevel ?? 1) > 0
      ? suggestStretchCharts(data, {
          profile,
          audience: options.audience,
          deny: Array.from(usedKeys).map((k) => k.split("/")[0]),
          maxResults: options.maxStretchPanels ?? Math.min(3, maxPanels),
        })
      : []

  return { panels, intentsCovered, intentsMissing, stretchPanels, profile }
}
