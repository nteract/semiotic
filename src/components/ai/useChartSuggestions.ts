"use client"
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react"
import type { Datum } from "../charts/shared/datumTypes"
import { profileData, type ProfileDataOptions } from "./profileData"
import { suggestCharts, type SuggestChartsOptions } from "./suggestCharts"
import type { ChartDataProfile, Suggestion } from "./chartCapabilityTypes"
import {
  getConversationArcStore,
  subscribeToConversationArcChange,
} from "./conversationArc"

// Snapshot fn for the change subscription — `useSyncExternalStore`
// compares with `Object.is`, so same-value mutations (every record()
// while enabled, etc.) don't re-render the consumer. Only actual
// enable/disable flips do. Lives outside the hook so the function
// reference stays stable.
const subscribeArc = (onChange: () => void) => subscribeToConversationArcChange(onChange)
const getArcEnabled = () => getConversationArcStore().enabled
const getArcEnabledOnServer = () => false

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
  // Dedup happens in two layers:
  //   1. A per-instance signature ref catches stable-suggestions
  //      re-renders within one mounted hook.
  //   2. A peek at the store's most recent `suggestion-shown` event
  //      catches React StrictMode's mount → unmount → remount cycle
  //      (where the per-instance ref resets) plus cross-instance
  //      duplicates from a parent re-mounting children.
  // The signature also resets when recording is disabled, so a
  // mid-session enable correctly emits the current suggestions —
  // tracked via `useSyncExternalStore` so the effect re-runs when
  // the enabled flag flips.
  const arcEnabled = useSyncExternalStore(subscribeArc, getArcEnabled, getArcEnabledOnServer)
  const lastSignatureRef = useRef<string | null>(null)
  useEffect(() => {
    if (suggestions.length === 0) {
      lastSignatureRef.current = null
      return
    }
    if (!arcEnabled) {
      // Drop the signature so the next enable cycle re-emits the
      // current ranking. Otherwise a consumer that enables after
      // the suggester has already run sees no `suggestion-shown` at
      // all.
      lastSignatureRef.current = null
      return
    }
    const store = getConversationArcStore()

    const audienceTarget = audience?.name ?? (audience ? "custom" : undefined)
    const signature = `${intent ?? ""}|${audienceTarget ?? ""}|${suggestions.map((s) => s.component).join(",")}`
    if (signature === lastSignatureRef.current) return

    // Cross-instance dedup: if the most recent buffered
    // suggestion-shown event matches this signature, skip. Catches
    // StrictMode remounts and parent re-mounts that would otherwise
    // double-stamp the same ranking.
    const recent = store.getEvents()
    for (let i = recent.length - 1; i >= 0; i--) {
      const e = recent[i]
      if (e.type !== "suggestion-shown") continue
      const recentIntent = Array.isArray(e.intent) ? e.intent.join(",") : (e.intent ?? "")
      const recentSignature = `${recentIntent}|${e.audience ?? ""}|${e.components.join(",")}`
      if (recentSignature === signature) {
        lastSignatureRef.current = signature
        return
      }
      break // only check the most recent one
    }

    lastSignatureRef.current = signature
    store.record({
      type: "suggestion-shown",
      intent,
      components: suggestions.map((s) => s.component),
      topScore: suggestions[0]?.score,
      audience: audienceTarget,
    })
  }, [suggestions, intent, audience, arcEnabled])

  return { suggestions, profile }
}
