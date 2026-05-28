"use client"
import { useEffect, useMemo, useRef } from "react"
import type { Datum } from "../charts/shared/datumTypes"
import { profileData, type ProfileDataOptions } from "./profileData"
import { suggestCharts, type SuggestChartsOptions } from "./suggestCharts"
import type { ChartDataProfile, Suggestion } from "./chartCapabilityTypes"
import { getConversationArcStore } from "./conversationArc"

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

  // Auto-emit `suggestion-shown` events into the conversation-arc
  // store. The store is opt-in (default no-op), so this costs nothing
  // until a consumer calls `enableConversationArc()` — at which point
  // every recomputation of `useChartSuggestions` lands in the buffer.
  //
  // Dedup by the (component-list, intent, audience-target) signature
  // so React's strict-mode double-invocation doesn't double-stamp,
  // and a stable suggestions list across renders doesn't either.
  const lastSignatureRef = useRef<string | null>(null)
  useEffect(() => {
    if (suggestions.length === 0) {
      lastSignatureRef.current = null
      return
    }
    const audienceTarget = audience?.name ?? (audience ? "custom" : undefined)
    const signature = `${intent ?? ""}|${audienceTarget ?? ""}|${suggestions.map((s) => s.component).join(",")}`
    if (signature === lastSignatureRef.current) return
    lastSignatureRef.current = signature
    getConversationArcStore().record({
      type: "suggestion-shown",
      intent,
      components: suggestions.map((s) => s.component),
      topScore: suggestions[0]?.score,
      audience: audienceTarget,
    })
  }, [suggestions, intent, audience])

  return { suggestions, profile }
}
