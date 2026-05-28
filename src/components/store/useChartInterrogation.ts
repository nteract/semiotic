"use client"
import { useCallback, useMemo, useRef, useState } from "react"
import { getConversationArcStore } from "../ai/conversationArc"

// Truncate long strings before they land in the arc ring buffer.
// LLM responses can be kilobytes; multiply by 1000 events of capacity
// and the buffer grows fast. Clamping the recorded payload keeps the
// buffer reasonable while still leaving enough context for replay
// fixtures and analytics readouts. Slightly under the visible cap so
// the ellipsis doesn't replace meaningful tail content.
const MAX_ARC_QUERY_LENGTH = 500
const MAX_ARC_ANSWER_LENGTH = 2000
function truncateForArc(text: string | undefined, max: number): string | undefined {
  if (text == null) return text
  if (text.length <= max) return text
  return text.slice(0, max - 1) + "…"
}
import type { Datum } from "../charts/shared/datumTypes"
import { summarizeData, type DataSummary } from "../data/DataSummarizer"
import { profileData } from "../ai/profileData"
import { suggestCharts } from "../ai/suggestCharts"
import type { ChartDataProfile, Suggestion } from "../ai/chartCapabilityTypes"
import type { IntentId } from "../ai/intents"

/**
 * Identifies a single point of interest on the chart — typically the datum
 * the user is currently hovering, clicked, or otherwise focused on. When
 * provided, the LLM gets the explicit signal that the user is asking
 * "about *this specific point*" rather than the chart at large.
 */
export interface InterrogationFocus {
  /** The row the user is focused on. */
  datum: Datum
  /** Pixel x coordinate, when known. Useful for anchoring response annotations. */
  x?: number
  /** Pixel y coordinate, when known. */
  y?: number
  /** Optional source label — "hover" / "click" / "selection". Surfaces in the LLM prompt. */
  source?: "hover" | "click" | "selection" | "manual"
}

export interface InterrogationContext {
  /** The data extracted from the chart (or whatever caller passed in). */
  data: ReadonlyArray<Datum>
  /** Statistical summary, ready to send to an LLM. */
  summary: DataSummary
  /** Shape profile — present when `includeProfile` or `includeSuggestions` is enabled. */
  profile?: ChartDataProfile
  /** Heuristic chart suggestions — present when `includeSuggestions` is enabled. */
  suggestions?: ReadonlyArray<Suggestion>
  /** Optional caller-supplied chart component name (e.g. "LineChart"). */
  componentName?: string
  /** Optional caller-supplied chart props (accessor names, scales, etc.). */
  props?: Record<string, unknown>
  /**
   * The current focused datum — what the user is interactively pointing at.
   * Lets the LLM tailor responses to a specific point ("why is *this* one
   * higher than the rest?") and to anchor visual responses (callouts,
   * comments) back at the same coordinates.
   */
  focus?: InterrogationFocus
}

export interface InterrogationResult {
  /** Natural-language answer to display to the user. */
  answer: string
  /** Optional Semiotic annotations to overlay on the chart. */
  annotations?: ReadonlyArray<Datum>
}

export type InterrogationQuery = (
  query: string,
  context: InterrogationContext
) => Promise<InterrogationResult>

export interface InterrogationMessage {
  role: "user" | "assistant"
  text: string
}

export interface UseChartInterrogationOptions {
  /** Data backing the chart. Use whatever shape the chart consumes (rows, nodes, etc.). */
  data: ReadonlyArray<Datum> | null | undefined
  /** Async handler — typically calls your LLM with the query + summary. */
  onQuery: InterrogationQuery
  /** Annotations to seed the merged set (e.g. existing chart annotations). */
  initialAnnotations?: ReadonlyArray<Datum>
  /** Optional context passed through to onQuery for richer prompts. */
  componentName?: string
  /** Optional context passed through to onQuery. */
  props?: Record<string, unknown>
  /**
   * Include the shape `profile` in the interrogation context. Required to let an LLM
   * reason about candidate axes, distinct counts, hierarchy/network/geo detection, etc.
   */
  includeProfile?: boolean
  /**
   * Include heuristic chart `suggestions` in the interrogation context. Implies `includeProfile`.
   * Lets an LLM answer "would another chart show this better?" without re-deriving rules.
   */
  includeSuggestions?: boolean
  /** When `includeSuggestions` is true, rank by this intent. */
  suggestionsIntent?: IntentId | IntentId[]
  /** When `includeSuggestions` is true, cap the suggestion list. Default 5. */
  suggestionsMax?: number
  /**
   * The point on the chart the user is currently focused on. Forwarded to
   * onQuery so an LLM can answer "about this specific datum" rather than
   * "about the chart in general." Typically wired from a chart's
   * `onObservation` callback or the convenience `useChartFocus` hook.
   */
  focus?: InterrogationFocus | null
}

export interface UseChartInterrogationResult {
  /** Ask a question. Updates history, annotations, loading, and error. */
  ask: (query: string) => Promise<void>
  /**
   * Append an AI-initiated message to the transcript without a user query.
   *
   * Use for proactive narration — a streaming watcher that detected an
   * anomaly, a background analysis that surfaced an insight, an LLM that
   * decided to volunteer information mid-session. Synchronous; no `onQuery`
   * call. Annotations merge into the chart's `annotations` array like
   * any other AI response.
   *
   * @example
   * announce({
   *   text: "Spike detected at 14:32 — 3.2σ above rolling mean.",
   *   annotations: [{ type: "callout", ts: now, value: 850, note: "Slow query?" }],
   * })
   */
  announce: (message: { text: string; annotations?: ReadonlyArray<Datum> }) => void
  /** Conversation history, oldest first. */
  history: ReadonlyArray<InterrogationMessage>
  /** Statistical summary of the data — memoized, safe to pass to a prompt. */
  summary: DataSummary
  /** Merged annotations: initial + latest AI response. Pass to the chart's `annotations` prop. */
  annotations: ReadonlyArray<Datum>
  /** True while onQuery is in flight. */
  loading: boolean
  /** Last error from onQuery, if any. */
  error: Error | null
  /** Clear history, AI annotations, and error. */
  reset: () => void
}

/**
 * Headless interrogation hook — a sibling to `useChartObserver`.
 *
 * Generates an LLM-friendly statistical summary of your chart's data, runs queries through
 * a caller-supplied `onQuery`, and merges any annotations the response returns so the chart
 * can highlight what the model is talking about.
 *
 * The hook owns no UI. Render whatever input/transcript surface fits your product.
 *
 * @example
 * const { ask, history, annotations, loading } = useChartInterrogation({
 *   data,
 *   onQuery: async (q, ctx) => {
 *     const res = await fetch("/api/chat", { method: "POST", body: JSON.stringify({ q, summary: ctx.summary }) })
 *     return res.json()
 *   },
 * })
 *
 * <LineChart data={data} annotations={annotations} ... />
 */
export function useChartInterrogation(
  options: UseChartInterrogationOptions
): UseChartInterrogationResult {
  const {
    data,
    onQuery,
    initialAnnotations,
    componentName,
    props,
    includeProfile,
    includeSuggestions,
    suggestionsIntent,
    suggestionsMax,
    focus,
  } = options

  const [history, setHistory] = useState<InterrogationMessage[]>([])
  const [aiAnnotations, setAiAnnotations] = useState<ReadonlyArray<Datum>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const summary = useMemo(() => summarizeData(data ?? []), [data])

  const wantsProfile = includeProfile || includeSuggestions
  const profile = useMemo(
    () => (wantsProfile ? profileData(data ?? []) : undefined),
    [wantsProfile, data]
  )
  const suggestions = useMemo(
    () =>
      includeSuggestions && profile
        ? suggestCharts(data, {
            profile,
            intent: suggestionsIntent,
            maxResults: suggestionsMax ?? 5,
          })
        : undefined,
    [includeSuggestions, profile, data, suggestionsIntent, suggestionsMax]
  )

  // Latest callback ref so ask() always sees the current onQuery without re-creating itself.
  const onQueryRef = useRef(onQuery)
  onQueryRef.current = onQuery
  const componentNameRef = useRef(componentName)
  componentNameRef.current = componentName
  const propsRef = useRef(props)
  propsRef.current = props
  const dataRef = useRef(data)
  dataRef.current = data
  const summaryRef = useRef(summary)
  summaryRef.current = summary
  const profileRef = useRef(profile)
  profileRef.current = profile
  const suggestionsRef = useRef(suggestions)
  suggestionsRef.current = suggestions
  const focusRef = useRef(focus)
  focusRef.current = focus

  const ask = useCallback(async (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    setHistory((prev) => [...prev, { role: "user", text: trimmed }])
    // Conversation-arc instrumentation. The store is opt-in (default
    // no-op) so this is zero-overhead until `enableConversationArc()`
    // is called by the consumer. Latency is computed from
    // `performance.now()` so it tracks elapsed wall-clock between ask
    // and answer regardless of any tab-throttling on Date.now.
    const askedAt = typeof performance !== "undefined" ? performance.now() : Date.now()
    getConversationArcStore().record({
      type: "interrogation-asked",
      component: componentNameRef.current,
      query: truncateForArc(trimmed, MAX_ARC_QUERY_LENGTH)!,
    })
    try {
      const result = await onQueryRef.current(trimmed, {
        data: (dataRef.current ?? []) as ReadonlyArray<Datum>,
        summary: summaryRef.current,
        profile: profileRef.current,
        suggestions: suggestionsRef.current,
        componentName: componentNameRef.current,
        props: propsRef.current,
        focus: focusRef.current ?? undefined,
      })
      setHistory((prev) => [...prev, { role: "assistant", text: result.answer }])
      if (result.annotations) setAiAnnotations(result.annotations)
      const answeredAt = typeof performance !== "undefined" ? performance.now() : Date.now()
      getConversationArcStore().record({
        type: "interrogation-answered",
        component: componentNameRef.current,
        answer: truncateForArc(result.answer, MAX_ARC_ANSWER_LENGTH),
        annotationCount: result.annotations?.length,
        // Clamp to ≥0 in case the Date.now() fallback was used and
        // the system clock moved backwards between ask and answer.
        latencyMs: Math.max(0, Math.round(answeredAt - askedAt)),
      })
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      setHistory((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, I couldn't process that query." },
      ])
      const answeredAt = typeof performance !== "undefined" ? performance.now() : Date.now()
      getConversationArcStore().record({
        type: "interrogation-answered",
        component: componentNameRef.current,
        error: true,
        latencyMs: Math.max(0, Math.round(answeredAt - askedAt)),
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const announce = useCallback(
    ({ text, annotations: newAnnotations }: { text: string; annotations?: ReadonlyArray<Datum> }) => {
      const trimmed = text.trim()
      if (!trimmed) return
      setHistory((prev) => [...prev, { role: "assistant", text: trimmed }])
      if (newAnnotations && newAnnotations.length > 0) {
        // Merge — proactive announcements should ADD to the existing AI annotation
        // set, not replace it the way a fresh user question does. A live watcher
        // calling announce() repeatedly should accumulate notes on the chart.
        setAiAnnotations((prev) => [...prev, ...newAnnotations])
      }
    },
    [],
  )

  const reset = useCallback(() => {
    setHistory([])
    setAiAnnotations([])
    setError(null)
  }, [])

  const annotations = useMemo(() => {
    const initial = initialAnnotations ?? []
    if (initial.length === 0) return aiAnnotations
    if (aiAnnotations.length === 0) return initial
    return [...initial, ...aiAnnotations]
  }, [initialAnnotations, aiAnnotations])

  return { ask, announce, history, summary, annotations, loading, error, reset }
}
