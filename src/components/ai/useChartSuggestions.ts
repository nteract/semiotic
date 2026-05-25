"use client"
import { useMemo } from "react"
import type { Datum } from "../charts/shared/datumTypes"
import { profileData, type ProfileDataOptions } from "./profileData"
import { suggestCharts, type SuggestChartsOptions } from "./suggestCharts"
import type { ChartDataProfile, Suggestion } from "./chartCapabilityTypes"

export interface UseChartSuggestionsOptions extends SuggestChartsOptions, ProfileDataOptions {}

export interface UseChartSuggestionsResult {
  suggestions: ReadonlyArray<Suggestion>
  profile: ChartDataProfile
}

/**
 * Memoized chart suggestion hook.
 *
 * Heuristic-only: this hook never calls an LLM. Pair with `useChartInterrogation`
 * to let an LLM re-rank or narrate the heuristic suggestions.
 *
 * @example
 * const { suggestions } = useChartSuggestions(data, { intent: "trend" })
 * const top = suggestions[0]
 * return <DynamicChart component={top.component} props={top.props} />
 */
export function useChartSuggestions(
  data: ReadonlyArray<Datum> | null | undefined,
  options: UseChartSuggestionsOptions = {}
): UseChartSuggestionsResult {
  const {
    intent, allow, deny, maxResults, includeVariants, minScore,
    rawInput, seriesField, capabilities, audience,
    profile: providedProfile,
  } = options

  const profile = useMemo(
    () => providedProfile ?? profileData(data ?? [], { rawInput, seriesField }),
    [providedProfile, data, rawInput, seriesField]
  )

  const suggestions = useMemo(
    () =>
      suggestCharts(data, {
        intent,
        allow,
        deny,
        maxResults,
        includeVariants,
        minScore,
        capabilities,
        audience,
        profile,
      }),
    [data, intent, allow, deny, maxResults, includeVariants, minScore, capabilities, audience, profile]
  )

  return { suggestions, profile }
}
