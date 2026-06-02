"use client"

// React hook surface for the conversation-arc store.
//
// The underlying store at `./conversationArc` is module-scoped and
// runtime-agnostic (used by `useChartSuggestions` and
// `useChartInterrogation` instrumentation, plus any non-React sink).
// This hook is the consumer-facing way to participate in a session
// from React: subscribe, read the live event stream, and record new
// events through a stable callback.

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react"
import {
  disableConversationArc,
  enableConversationArc,
  getConversationArcStore,
  subscribeToConversationArcChange,
  type ConversationArcEvent,
  type ConversationArcEventInput,
  type ConversationArcEventType,
  type EnableConversationArcOptions,
} from "./conversationArc"

// ── Summary shape ────────────────────────────────────────────────────

/**
 * Talk-friendly summary of an arc. Computed from the current buffer
 * each time it's read. `summarizeArc` is exported separately for
 * server-side or batch use.
 */
export interface ConversationArcSummary {
  /** Total events buffered. */
  total: number
  /** Per-type counts. Missing types implicitly zero. */
  byType: Partial<Record<ConversationArcEventType, number>>
  /** Component names referenced across the buffer (deduplicated). */
  componentsSeen: string[]
  /** Audience labels referenced across the buffer (most recent last). */
  audiencesSeen: string[]
  /** Latest event's `arcId`, if any. */
  latestArcId?: string
  /** Timestamp of the first event (epoch ms), or `null` if empty. */
  startedAt: number | null
  /** Timestamp of the most recent event (epoch ms), or `null` if empty. */
  lastAt: number | null
  /** Wall-clock duration covered by the buffer in ms, or `0` if empty. */
  durationMs: number
}

const EMPTY_SUMMARY: ConversationArcSummary = {
  total: 0,
  byType: {},
  componentsSeen: [],
  audiencesSeen: [],
  startedAt: null,
  lastAt: null,
  durationMs: 0,
}

/**
 * Reduce an event array to the talk-friendly `ConversationArcSummary`.
 *
 * Pure function — no `Date.now()` calls, no I/O. Safe to use on
 * the server, in batch jobs, or against a replayed arc fixture.
 *
 * Walks the events once, so cost scales with buffer size; the default
 * 1000-event capacity makes this trivially fast in practice.
 */
export function summarizeArc(
  events: ReadonlyArray<ConversationArcEvent>
): ConversationArcSummary {
  if (events.length === 0) return EMPTY_SUMMARY

  const byType: Partial<Record<ConversationArcEventType, number>> = {}
  const components = new Set<string>()
  const audiences: string[] = []
  let latestArcId: string | undefined

  for (const event of events) {
    byType[event.type] = (byType[event.type] ?? 0) + 1
    if (event.arcId) latestArcId = event.arcId
    // Pull component-like fields off whichever variants carry them.
    const variantComponent =
      "component" in event && typeof event.component === "string"
        ? event.component
        : undefined
    if (variantComponent) components.add(variantComponent)
    if ("from" in event && typeof event.from === "string") components.add(event.from)
    if ("to" in event && typeof event.to === "string") components.add(event.to)
    if ("components" in event && Array.isArray(event.components)) {
      for (const c of event.components) {
        if (typeof c === "string") components.add(c)
      }
    }
    if (event.type === "audience-set" && typeof event.audience === "string") {
      audiences.push(event.audience)
    }
  }

  const startedAt = events[0].timestamp
  const lastAt = events[events.length - 1].timestamp

  return {
    total: events.length,
    byType,
    componentsSeen: Array.from(components),
    audiencesSeen: audiences,
    latestArcId,
    startedAt,
    lastAt,
    durationMs: Math.max(0, lastAt - startedAt),
  }
}

// ── Hook ─────────────────────────────────────────────────────────────

/**
 * Options for {@link useConversationArc}. Mirrors the underlying
 * `enableConversationArc` options, plus a `disableOnUnmount` escape
 * hatch for consumers that own the entire arc lifecycle.
 */
export interface UseConversationArcOptions extends EnableConversationArcOptions {
  /**
   * Auto-enable the arc store on mount. Defaults to `true` — the
   * common case is "I'm rendering the arc inspector / live dashboard,
   * I want recording on while I'm mounted." Set to `false` if you
   * want the hook to read but not flip the enable flag.
   */
  enableOnMount?: boolean
  /**
   * Auto-disable on unmount. Defaults to `false` — disabling on
   * unmount would cut off any other consumer that depends on
   * recording staying live (the audience picker, an inspector panel
   * in a sibling tree). Set to `true` if you own the whole session.
   */
  disableOnUnmount?: boolean
}

/**
 * Result returned from {@link useConversationArc}.
 */
export interface UseConversationArcResult {
  /** Live event buffer, refreshed on every recorded event. */
  /** Frozen snapshot of the live event buffer. Read-only; `.slice()` for a mutable copy. */
  history: ReadonlyArray<ConversationArcEvent>
  /** Reduced summary of the current buffer. Recomputed on each event. */
  summary: ConversationArcSummary
  /** `true` while the store is actively recording. */
  enabled: boolean
  /** Current session ID, or `null` before any `enable*` call. */
  sessionId: string | null
  /** Record an event — stable across renders. Returns the stamped event, or `null` if disabled. */
  record: (input: ConversationArcEventInput) => ConversationArcEvent | null
  /** Clear the buffered events without disabling the store. */
  clear: () => void
}

/**
 * React hook that participates in the conversation-arc session.
 *
 * Subscribes via `useSyncExternalStore` so re-renders are coordinated
 * with React's concurrent rendering (no tearing between the buffer
 * snapshot and the rendered tree). Auto-enables the store on mount
 * by default; the underlying store is module-scoped, so all hook
 * instances share the same buffer.
 *
 * ```tsx
 * const { history, summary, record } = useConversationArc()
 * // Later, in a click handler:
 * record({ type: "chart-exported", component: "LineChart", format: "jsx" })
 * ```
 */
export function useConversationArc(
  options: UseConversationArcOptions = {}
): UseConversationArcResult {
  const { enableOnMount = true, disableOnUnmount = false, capacity, sessionId } = options

  // Stable enable/disable on mount/unmount. The `capacity` /
  // `sessionId` only re-apply when their values change — otherwise
  // we'd churn through `enableConversationArc` on every render.
  useEffect(() => {
    if (enableOnMount) {
      enableConversationArc({ capacity, sessionId })
    }
    return () => {
      if (disableOnUnmount) disableConversationArc()
    }
  }, [enableOnMount, disableOnUnmount, capacity, sessionId])

  // `useSyncExternalStore` requires a stable snapshot reference until
  // a change occurs. The store caches `getEvents()` internally and
  // invalidates on every mutation (record/clear/flush/reset/enable),
  // and `subscribeToConversationArcChange` fires for ALL mutations
  // (not just newly-recorded events). That coordination is what
  // makes the React subscription tear-free across `record`, `clear`,
  // and `disable` calls.
  const subscribe = useCallback(
    (onChange: () => void) => subscribeToConversationArcChange(onChange),
    []
  )
  const getSnapshot = useCallback(() => getConversationArcStore().getEvents(), [])
  const history = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  // Track enabled/sessionId reactively. They flip on
  // enable/disable/reset, all of which go through `notifyChange`.
  const [enabled, setEnabled] = useState(() => getConversationArcStore().enabled)
  const [sessionIdState, setSessionIdState] = useState(() => getConversationArcStore().sessionId)
  useEffect(() => {
    // Re-sync after the enable effect above runs.
    setEnabled(getConversationArcStore().enabled)
    setSessionIdState(getConversationArcStore().sessionId)
    return subscribeToConversationArcChange(() => {
      const store = getConversationArcStore()
      setEnabled(store.enabled)
      setSessionIdState(store.sessionId)
    })
  }, [])

  const summary = useMemo(() => summarizeArc(history), [history])

  const record = useCallback(
    (input: ConversationArcEventInput) => getConversationArcStore().record(input),
    []
  )
  const clear = useCallback(() => getConversationArcStore().clear(), [])

  return { history, summary, enabled, sessionId: sessionIdState, record, clear }
}
