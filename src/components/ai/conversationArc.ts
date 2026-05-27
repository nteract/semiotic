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
  /** Intent label fed into `suggestCharts` (e.g. "trend", "distribution"). */
  intent?: string
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

export type ConversationArcEvent =
  | SuggestionShownEvent
  | SuggestionChosenEvent
  | AudienceSetEvent
  | ChartRenderedEvent
  | ChartEditedEvent
  | ChartReplacedEvent
  | ChartExportedEvent
  | ChartAbandonedEvent

/**
 * Input shape accepted by `record()`: the event variant without the
 * stamped fields (`timestamp` and `sessionId`). Callers may still
 * provide them to backfill historical events.
 */
export type ConversationArcEventInput =
  & Omit<ConversationArcEvent, "timestamp" | "sessionId">
  & Partial<Pick<ConversationArcEvent, "timestamp" | "sessionId">>

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
  /** Subscribe to new events. Returns an unsubscribe function. */
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

interface ConversationArcStoreInternal {
  enabled: boolean
  sessionId: string
  capacity: number
  buffer: ConversationArcEvent[]
  listeners: Set<ConversationArcListener>
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
      listeners: new Set(),
    }
  } else {
    store.enabled = true
    if (options.sessionId) store.sessionId = options.sessionId
    if (options.capacity != null) {
      store.capacity = capacity
      // Honor a capacity shrink: drop the oldest events.
      while (store.buffer.length > store.capacity) store.buffer.shift()
    }
  }
  return facade
}

/** Turn the store off without dropping the buffered events. */
export function disableConversationArc(): void {
  if (store) store.enabled = false
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
    return store?.enabled ? store.sessionId : null
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
    for (const listener of s.listeners) {
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
    return out
  },
  getEvents() {
    const s = ensureStore()
    return s ? s.buffer.slice() : []
  },
  subscribe(listener) {
    const s = ensureStore()
    if (!s) return () => {}
    s.listeners.add(listener)
    return () => {
      s.listeners.delete(listener)
    }
  },
  clear() {
    const s = ensureStore()
    if (s) s.buffer = []
  },
  reset() {
    if (!store) return
    store.listeners.clear()
    store.buffer = []
    store.enabled = false
    store = null
  },
}
