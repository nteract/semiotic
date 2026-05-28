// Conversation-arc telemetry — M1 (event vocabulary + store + ring buffer).
//
// Records the arc of an AI-assisted visualization session:
//
//   suggestion-shown → suggestion-chosen → audience-set →
//   chart-rendered → chart-edited → chart-replaced →
//   chart-exported | chart-abandoned
//
// The store is module-scoped and opt-in. Default import surface is a
// no-op: events recorded before `enableConversationArc()` return null
// and are not buffered. After `enable`, events are pushed into a
// bounded ring buffer (default 1000) and broadcast to subscribers.
// No network sinks at this milestone — those land in M3 alongside
// LocalStorageSink, IndexedDBSink, and a WebhookSink stub.

// ── Event Vocabulary ───────────────────────────────────────────────────

export type ConversationArcEventType =
  | "suggestion-shown"
  | "suggestion-chosen"
  | "audience-set"
  | "chart-rendered"
  | "chart-edited"
  | "chart-replaced"
  | "chart-exported"
  | "chart-abandoned"
  | "interrogation-asked"
  | "interrogation-answered"

interface ConversationArcEventBase {
  /** Discriminator for the event variant. */
  type: ConversationArcEventType
  /** `Date.now()` at the moment the event was recorded. Stamped by the store. */
  timestamp: number
  /** Stable ID for the enabled session — survives until `disableConversationArc()` or `reset()`. */
  sessionId: string
  /** Optional opaque correlation key that threads a single arc together. */
  arcId?: string
  /** Free-form bag for context the talk-track doesn't need a typed slot for. */
  meta?: Record<string, unknown>
}

export interface SuggestionShownEvent extends ConversationArcEventBase {
  type: "suggestion-shown"
  /**
   * Intent label fed into `suggestCharts` (e.g. "trend", "distribution").
   * Accepts a single intent or an array — mirrors `SuggestChartsOptions.intent`.
   */
  intent?: string | ReadonlyArray<string>
  /** Ranked component names in the order the suggester returned them. */
  components: string[]
  /** Top suggestion's composite score, if known. */
  topScore?: number
  /** Audience target active when the suggestion ran. */
  audience?: string
}

export interface SuggestionChosenEvent extends ConversationArcEventBase {
  type: "suggestion-chosen"
  component: string
  /** 1-based rank in the matching `suggestion-shown` event, if known. */
  rank?: number
  /** Who picked the suggestion: a human, an agent loop, or a default-fall-through. */
  source?: "user" | "agent" | "auto"
}

export interface AudienceSetEvent extends ConversationArcEventBase {
  type: "audience-set"
  audience: string
  previous?: string
}

export interface ChartRenderedEvent extends ConversationArcEventBase {
  type: "chart-rendered"
  component: string
  chartId?: string
}

export interface ChartEditedEvent extends ConversationArcEventBase {
  type: "chart-edited"
  component: string
  chartId?: string
  /** Names of props that changed in this edit. */
  changedProps?: string[]
}

export interface ChartReplacedEvent extends ConversationArcEventBase {
  type: "chart-replaced"
  from: string
  to: string
  /** Why the swap happened — `"repair"`, `"variant"`, `"user-rejected"`, etc. */
  reason?: string
}

export interface ChartExportedEvent extends ConversationArcEventBase {
  type: "chart-exported"
  component: string
  /** What was exported: `"jsx"`, `"svg"`, `"png"`, `"json"`, `"url"`, etc. */
  format: string
}

export interface ChartAbandonedEvent extends ConversationArcEventBase {
  type: "chart-abandoned"
  component?: string
  reason?: string
}

export interface InterrogationAskedEvent extends ConversationArcEventBase {
  type: "interrogation-asked"
  /** Chart the question was directed at, if known. */
  component?: string
  /** Free-form question text, truncated to a reasonable length by the caller. */
  query: string
  /** Optional payload size hint (e.g. summary token count) for diagnostics. */
  contextSize?: number
}

export interface InterrogationAnsweredEvent extends ConversationArcEventBase {
  type: "interrogation-answered"
  /** Chart the answer was directed at, if known. */
  component?: string
  /** Free-form answer text, truncated by the caller. */
  answer?: string
  /** Number of annotations the response attached, if known. */
  annotationCount?: number
  /** Round-trip latency in ms from ask to answer, when the caller knows it. */
  latencyMs?: number
  /** Set when the response was an error rather than a successful answer. */
  error?: boolean
}

export type ConversationArcEvent =
  | SuggestionShownEvent
  | SuggestionChosenEvent
  | AudienceSetEvent
  | ChartRenderedEvent
  | ChartEditedEvent
  | ChartReplacedEvent
  | ChartExportedEvent
  | ChartAbandonedEvent
  | InterrogationAskedEvent
  | InterrogationAnsweredEvent

/**
 * Input shape accepted by `record()`: the event variant without the
 * stamped fields (`timestamp` and `sessionId`). Callers may still
 * provide them to backfill historical events.
 *
 * Implemented as a distributive conditional so each member of the
 * discriminated union keeps its variant-specific payload (e.g.
 * `SuggestionShownEvent.components`). A non-distributive
 * `Omit<ConversationArcEvent, ...>` collapses to the union's common
 * fields and rejects every variant-specific key.
 */
export type ConversationArcEventInput = ConversationArcEvent extends infer E
  ? E extends ConversationArcEvent
    ? Omit<E, "timestamp" | "sessionId"> & Partial<Pick<E, "timestamp" | "sessionId">>
    : never
  : never

export type ConversationArcListener = (event: ConversationArcEvent) => void

// ── Store ─────────────────────────────────────────────────────────────

export interface ConversationArcStore {
  readonly enabled: boolean
  readonly sessionId: string | null
  readonly capacity: number
  /**
   * Records an event. Returns the stamped event on success, or `null`
   * if the store is disabled. Stamps `timestamp` and `sessionId` if
   * the caller didn't.
   */
  record(input: ConversationArcEventInput): ConversationArcEvent | null
  /** Returns the current buffer (newest last) and clears it. */
  flush(): ConversationArcEvent[]
  /** Returns a snapshot of the current buffer without clearing. */
  getEvents(): ConversationArcEvent[]
  /**
   * Subscribe to new events. Returns an unsubscribe function.
   *
   * Subscriptions persist across enable/disable transitions — a
   * subscriber registered before `enableConversationArc()` still
   * receives events once recording starts. Cleared by `reset()`.
   */
  subscribe(listener: ConversationArcListener): () => void
  /** Empties the buffer without disabling the store. */
  clear(): void
  /** Disables the store and drops the buffer + subscribers. */
  reset(): void
}

export interface EnableConversationArcOptions {
  /** Maximum events retained in the ring buffer. Defaults to 1000. */
  capacity?: number
  /** Override the generated session ID. Useful for cross-tab correlation. */
  sessionId?: string
}

let store: ConversationArcStoreInternal | null = null

// Subscriptions live at module scope, outside the per-session store,
// so a subscriber registered before `enableConversationArc()` (e.g. a
// React effect that runs at mount before the user clicks "enable") is
// still attached once recording starts. Cleared by `reset()`; never
// touched by `disable()` since buffered events stay correlatable and
// re-enable should resume notifying.
const listeners = new Set<ConversationArcListener>()

// `useSyncExternalStore` requires `getSnapshot()` to return a stable
// reference until something actually changes. The in-memory buffer is
// mutated in place on `record()`, so we cache an immutable snapshot
// next to the buffer and invalidate it on every push / clear / reset.
// Returning a `slice()` from the public `getEvents()` API still gives
// callers an array they can mutate without disturbing the buffer.
let cachedSnapshot: ConversationArcEvent[] = []
let snapshotDirty = false

function refreshSnapshotIfNeeded(): ConversationArcEvent[] {
  if (!snapshotDirty) return cachedSnapshot
  cachedSnapshot = store ? store.buffer.slice() : []
  snapshotDirty = false
  return cachedSnapshot
}

function invalidateSnapshot(): void {
  snapshotDirty = true
}

// Change-notification subscribers — distinct from event listeners so
// the `(event: ConversationArcEvent) => void` contract stays clean
// for sinks. React's `useSyncExternalStore` needs notification for
// every state mutation (including `clear`, `flush`, `reset`, and
// `enable`), not just newly-recorded events.
const changeSubscribers = new Set<() => void>()

function notifyChange(): void {
  for (const fn of changeSubscribers) {
    try {
      fn()
    } catch (err) {
      if (typeof console !== "undefined") {
        console.warn("[conversationArc] change subscriber threw:", err)
      }
    }
  }
}

/**
 * Subscribe to *any* state mutation in the conversation-arc store —
 * including `clear`, `flush`, `reset`, and `enable`, in addition to
 * recorded events. Intended for React hooks that need to re-render
 * on snapshot changes; event sinks should use `subscribe()` instead.
 *
 * Returns an unsubscribe callback.
 */
export function subscribeToConversationArcChange(listener: () => void): () => void {
  changeSubscribers.add(listener)
  return () => {
    changeSubscribers.delete(listener)
  }
}

/**
 * Record an audience-set event. Convenience wrapper around `record`
 * for the common pattern: "the user picked a new audience profile
 * and I want to put that in the arc."
 *
 * `previous` is optional but recommended — it lets downstream
 * analytics see the transition rather than just the new state. Pass
 * `null` when there was no prior audience.
 *
 * Returns the stamped event, or `null` if recording is disabled.
 *
 * ```ts
 * import { recordAudienceChange } from "semiotic/ai"
 *
 * function AudiencePicker({ value, onChange }) {
 *   return (
 *     <select value={value} onChange={(e) => {
 *       const next = e.target.value
 *       recordAudienceChange(next, value)
 *       onChange(next)
 *     }} />
 *   )
 * }
 * ```
 */
export function recordAudienceChange(
  audience: string,
  previous?: string | null,
  extra?: { arcId?: string; meta?: Record<string, unknown> }
): ConversationArcEvent | null {
  return facade.record({
    type: "audience-set",
    audience,
    previous: previous ?? undefined,
    ...extra,
  })
}

interface ConversationArcStoreInternal {
  enabled: boolean
  sessionId: string
  capacity: number
  buffer: ConversationArcEvent[]
}

function newSessionId(): string {
  // A short, opaque, sortable-ish ID. No crypto dependency — the talk
  // doesn't need RFC4122 UUIDs, and avoiding `crypto` keeps the bundle
  // and the SSR story clean.
  const t = Date.now().toString(36)
  const r = Math.random().toString(36).slice(2, 8)
  return `arc-${t}-${r}`
}

function ensureStore(): ConversationArcStoreInternal | null {
  return store
}

/**
 * Opt in to conversation-arc telemetry. Safe to call multiple times —
 * subsequent calls reuse the existing session unless `sessionId` is
 * explicitly provided.
 */
export function enableConversationArc(
  options: EnableConversationArcOptions = {}
): ConversationArcStore {
  const capacity = options.capacity ?? 1000
  if (!Number.isFinite(capacity) || capacity <= 0) {
    throw new RangeError(
      `enableConversationArc: capacity must be a positive number, got ${String(capacity)}`
    )
  }
  if (!store) {
    store = {
      enabled: true,
      sessionId: options.sessionId ?? newSessionId(),
      capacity,
      buffer: [],
    }
    invalidateSnapshot()
  } else {
    store.enabled = true
    if (options.sessionId) store.sessionId = options.sessionId
    if (options.capacity != null) {
      store.capacity = capacity
      // Honor a capacity shrink: drop the oldest events.
      while (store.buffer.length > store.capacity) store.buffer.shift()
      invalidateSnapshot()
    }
  }
  notifyChange()
  return facade
}

/** Turn the store off without dropping the buffered events. */
export function disableConversationArc(): void {
  if (store) {
    store.enabled = false
    notifyChange()
  }
}

/**
 * Always returns a store façade. Methods are safe to call when
 * disabled — `record()` returns null, `getEvents()`/`flush()` return
 * empty arrays, `subscribe()` returns a no-op unsubscriber.
 */
export function getConversationArcStore(): ConversationArcStore {
  return facade
}

const facade: ConversationArcStore = {
  get enabled() {
    return store?.enabled ?? false
  },
  get sessionId() {
    // Expose the session ID whenever a session exists — even after
    // `disableConversationArc()`. Buffered events still belong to that
    // session and the same ID is reused on re-enable. `null` is reserved
    // for the never-enabled / `reset()` state.
    return store?.sessionId ?? null
  },
  get capacity() {
    return store?.capacity ?? 0
  },
  record(input) {
    const s = ensureStore()
    if (!s || !s.enabled) return null
    const event = {
      ...input,
      timestamp: input.timestamp ?? Date.now(),
      sessionId: input.sessionId ?? s.sessionId,
    } as ConversationArcEvent
    s.buffer.push(event)
    while (s.buffer.length > s.capacity) s.buffer.shift()
    invalidateSnapshot()
    notifyChange()
    for (const listener of listeners) {
      try {
        listener(event)
      } catch (err) {
        // Subscriber errors must never break recording. They're a
        // sink concern and surface through console.warn.
        if (typeof console !== "undefined") {
          console.warn("[conversationArc] subscriber threw:", err)
        }
      }
    }
    return event
  },
  flush() {
    const s = ensureStore()
    if (!s) return []
    const out = s.buffer
    s.buffer = []
    invalidateSnapshot()
    notifyChange()
    return out
  },
  getEvents() {
    // Return the cached snapshot so consecutive calls between events
    // return a referentially stable array — required by
    // `useSyncExternalStore` (in `useConversationArc`) and useful for
    // any memoization layer above.
    return refreshSnapshotIfNeeded()
  },
  subscribe(listener) {
    // Subscriptions persist across enable/disable transitions — see
    // the module-scope `listeners` Set above for the rationale.
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  clear() {
    const s = ensureStore()
    if (s) {
      s.buffer = []
      invalidateSnapshot()
      notifyChange()
    }
  },
  reset() {
    listeners.clear()
    cachedSnapshot = []
    snapshotDirty = false
    if (!store) {
      // Still fire the change notification so a hook subscribed
      // before enable sees the empty state.
      notifyChange()
      changeSubscribers.clear()
      return
    }
    store.buffer = []
    store.enabled = false
    store = null
    notifyChange()
    changeSubscribers.clear()
  },
}
