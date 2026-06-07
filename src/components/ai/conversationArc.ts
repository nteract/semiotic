// Conversation-arc telemetry — event vocabulary + store + ring buffer +
// opt-in persistence sinks.
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
// bounded ring buffer (default 1000), broadcast to subscribers, and
// written to registered sinks. Sinks are opt-in and are never touched
// while recording is disabled.

// ── Event Vocabulary ───────────────────────────────────────────────────

import type { AnnotationStatus } from "./annotationProvenance"

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
  | "nav-node-focused"
  | "nav-branch-expanded"
  | "annotation-status-changed"

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
  /**
   * Question text. The `useChartInterrogation` instrumentation
   * truncates to ~500 chars before recording so the ring buffer
   * stays bounded; callers stamping their own events should do the
   * same.
   */
  query: string
  /** Optional payload size hint (e.g. summary token count) for diagnostics. */
  contextSize?: number
}

export interface InterrogationAnsweredEvent extends ConversationArcEventBase {
  type: "interrogation-answered"
  /** Chart the answer was directed at, if known. */
  component?: string
  /**
   * Answer text. The `useChartInterrogation` instrumentation
   * truncates to ~2000 chars before recording so multi-kilobyte LLM
   * responses don't bloat the ring buffer. Callers stamping their
   * own events should follow the same convention.
   */
  answer?: string
  /** Number of annotations the response attached, if known. */
  annotationCount?: number
  /**
   * Round-trip latency in ms from ask to answer, clamped to ≥ 0.
   * The instrumentation measures via `performance.now()` when
   * available; the `Date.now()` fallback can produce negative
   * deltas under clock changes, hence the clamp.
   */
  latencyMs?: number
  /** Set when the response was an error rather than a successful answer. */
  error?: boolean
}

/**
 * A reader focused a node in an `AccessibleNavTree` (keyboard or click). The
 * first *reception*-side behavioral signal in the arc — which structural nodes
 * a non-visual (or AI) reader actually visits, the dependent measure visualization-
 * literacy studies usually lack. Emitted only on genuine tree interaction, not
 * when the active node is driven externally (canvas → tree sync).
 */
export interface NavNodeFocusedEvent extends ConversationArcEventBase {
  type: "nav-node-focused"
  /** `chartId` of the chart the tree describes, when correlated. */
  chartId?: string
  /** Tree node id that gained focus. */
  nodeId: string
  /** Node role: `"chart" | "axis" | "series" | "datum"`. */
  role: string
  /** 1-based depth (aria-level). */
  level: number
  /** The node's announced label (the emitter truncates to ~200 chars). */
  label?: string
}

/** A reader expanded or collapsed a branch in an `AccessibleNavTree`. */
export interface NavBranchExpandedEvent extends ConversationArcEventBase {
  type: "nav-branch-expanded"
  /** `chartId` of the chart the tree describes, when correlated. */
  chartId?: string
  /** Tree node id that was toggled. */
  nodeId: string
  /** Node role of the toggled branch. */
  role: string
  /** 1-based depth (aria-level). */
  level: number
  /** `true` on expand, `false` on collapse. */
  expanded: boolean
}

/**
 * An annotation's editorial status transitioned (M7). The accept / dispute /
 * retract / propose flow is what turns an annotation into the durable,
 * observable node of the conversation arc (IDID §13.4): the note is the unit
 * the arc is *about*, not chart chrome.
 *
 * `fromStatus`/`toStatus` are deliberately not named `from`/`to` — `summarizeArc`
 * reads `from`/`to` as chart-component names (the `chart-replaced` shape), so a
 * status value there would pollute `componentsSeen`.
 */
export interface AnnotationStatusChangedEvent extends ConversationArcEventBase {
  type: "annotation-status-changed"
  /** `provenance.stableId` of the annotation whose status changed, when known. */
  annotationId?: string
  /** Previous editorial status, if known. */
  fromStatus?: AnnotationStatus
  /** New editorial status. */
  toStatus: AnnotationStatus
  /** `chartId` of the chart carrying the annotation, when correlated. */
  chartId?: string
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
  | NavNodeFocusedEvent
  | NavBranchExpandedEvent
  | AnnotationStatusChangedEvent

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

export interface ConversationArcSink {
  /**
   * Persist a newly-recorded event. Called only after the store is enabled and
   * the event is accepted into the ring buffer.
   */
  record?(event: ConversationArcEvent): void | Promise<void>
  /**
   * Optional hook for consumers that treat `flush()` as an export boundary.
   * The in-memory buffer is still cleared by the store after this call.
   */
  flush?(events: ReadonlyArray<ConversationArcEvent>): void | Promise<void>
  /** Clear durable state owned by this sink. */
  clear?(): void | Promise<void>
  /** Load previously persisted events for replay / hydration. */
  load?(): ReadonlyArray<ConversationArcEvent> | Promise<ReadonlyArray<ConversationArcEvent>>
}

export interface ConversationArcStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface LocalStorageConversationArcSinkOptions {
  /** Storage key. Defaults to `semiotic:conversation-arc`. */
  key?: string
  /** Test hook or alternate Storage implementation. Defaults to `window.localStorage`. */
  storage?: ConversationArcStorageLike
  /** Maximum events retained in storage. Defaults to 1000. */
  maxEvents?: number
}

export interface IndexedDBConversationArcSinkOptions {
  /** Database name. Defaults to `semiotic-conversation-arc`. */
  dbName?: string
  /** Object store name. Defaults to `events`. */
  storeName?: string
  /** Test hook or alternate IndexedDB factory. Defaults to `globalThis.indexedDB`. */
  indexedDB?: IDBFactory
  /** Maximum events retained in the object store. Defaults to 1000. */
  maxEvents?: number
}

export type ConversationArcWebhookFetch = (
  input: string,
  init?: RequestInit
) => Promise<unknown>

export interface WebhookConversationArcSinkOptions {
  url: string
  method?: "POST" | "PUT"
  headers?: Record<string, string>
  fetch?: ConversationArcWebhookFetch
  mapEvent?: (event: ConversationArcEvent) => unknown
}

export interface LoadConversationArcOptions {
  /** Capacity of the hydrated ring buffer. Defaults to max(existing, events.length, 1000). */
  capacity?: number
  /** Active session id for future recordings. Replayed event session ids are preserved. */
  sessionId?: string
  /**
   * Whether the store should accept new events after hydration. Defaults to false
   * so replaying an artifact cannot accidentally start telemetry.
   */
  enabled?: boolean
  /** Append to the current buffer instead of replacing it. Defaults to false. */
  append?: boolean
}

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
  /**
   * Returns a frozen, referentially-stable snapshot of the current
   * buffer. Stable across consecutive calls until the next mutation,
   * so it can drive `useSyncExternalStore`. Read-only — callers that
   * need a mutable copy should `.slice()` the result.
   */
  getEvents(): ReadonlyArray<ConversationArcEvent>
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

// Durable sinks are opt-in and deliberately separate from event
// listeners: listeners are for in-process observers, sinks own their
// persistence side effects. Cleared by `reset()` to avoid leaking test
// or preview registrations across sessions.
const sinks = new Set<ConversationArcSink>()

const DEFAULT_STORAGE_KEY = "semiotic:conversation-arc"
const DEFAULT_INDEXEDDB_NAME = "semiotic-conversation-arc"
const DEFAULT_INDEXEDDB_STORE = "events"
const DEFAULT_MAX_EVENTS = 1000

function normalizePositiveInteger(
  value: number | undefined,
  fallback: number,
  label: string
): number {
  const next = value ?? fallback
  if (!Number.isFinite(next) || next <= 0) {
    throw new RangeError(`${label} must be a positive number, got ${String(next)}`)
  }
  return Math.floor(next)
}

function warnSinkError(label: string, err: unknown): void {
  if (typeof console !== "undefined") {
    console.warn(`[conversationArc] ${label} failed:`, err)
  }
}

function runSinkOperation(label: string, operation: () => void | Promise<void>): void {
  try {
    const result = operation()
    if (result && typeof (result as Promise<void>).then === "function") {
      void Promise.resolve(result).catch((err) => warnSinkError(label, err))
    }
  } catch (err) {
    warnSinkError(label, err)
  }
}

function dispatchSinkRecord(event: ConversationArcEvent): void {
  for (const sink of sinks) {
    if (!sink.record) continue
    runSinkOperation("sink record", () => sink.record?.(event))
  }
}

function dispatchSinkFlush(events: ReadonlyArray<ConversationArcEvent>): void {
  for (const sink of sinks) {
    if (!sink.flush) continue
    runSinkOperation("sink flush", () => sink.flush?.(events))
  }
}

function dispatchSinkClear(): void {
  for (const sink of sinks) {
    if (!sink.clear) continue
    runSinkOperation("sink clear", () => sink.clear?.())
  }
}

function resolveLocalStorage(
  storage?: ConversationArcStorageLike
): ConversationArcStorageLike | null {
  if (storage) return storage
  try {
    const candidate = (globalThis as { localStorage?: ConversationArcStorageLike }).localStorage
    return candidate ?? null
  } catch {
    return null
  }
}

function parseStoredEvents(raw: string | null): ConversationArcEvent[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ConversationArcEvent[]) : []
  } catch (err) {
    warnSinkError("localStorage load", err)
    return []
  }
}

function readStorageEvents(
  storage: ConversationArcStorageLike | null,
  key: string
): ConversationArcEvent[] {
  if (!storage) return []
  try {
    return parseStoredEvents(storage.getItem(key))
  } catch (err) {
    warnSinkError("localStorage read", err)
    return []
  }
}

function writeStorageEvents(
  storage: ConversationArcStorageLike | null,
  key: string,
  events: ReadonlyArray<ConversationArcEvent>,
  maxEvents: number
): void {
  if (!storage) return
  try {
    storage.setItem(key, JSON.stringify(events.slice(-maxEvents)))
  } catch (err) {
    warnSinkError("localStorage write", err)
  }
}

function resolveIndexedDB(factory?: IDBFactory): IDBFactory | null {
  if (factory) return factory
  try {
    return (globalThis as { indexedDB?: IDBFactory }).indexedDB ?? null
  } catch {
    return null
  }
}

// `useSyncExternalStore` requires `getSnapshot()` to return a stable
// reference until something actually changes. The in-memory buffer is
// mutated in place on `record()`, so we cache a frozen snapshot next
// to the buffer and invalidate it on every push / clear / reset.
//
// The snapshot is FROZEN (Object.freeze) because it's shared across
// every consumer: mutating it would corrupt subsequent snapshots and
// break `useSyncExternalStore`'s referential-stability contract.
// Callers that need a mutable copy can `.slice()` the result.
const EMPTY_FROZEN_SNAPSHOT: ReadonlyArray<ConversationArcEvent> = Object.freeze(
  []
) as ReadonlyArray<ConversationArcEvent>
let cachedSnapshot: ReadonlyArray<ConversationArcEvent> = EMPTY_FROZEN_SNAPSHOT
let snapshotDirty = false

function refreshSnapshotIfNeeded(): ReadonlyArray<ConversationArcEvent> {
  if (!snapshotDirty) return cachedSnapshot
  cachedSnapshot = store
    ? (Object.freeze(store.buffer.slice()) as ReadonlyArray<ConversationArcEvent>)
    : EMPTY_FROZEN_SNAPSHOT
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
 * Register an opt-in persistence sink. Sinks receive only accepted events:
 * disabled telemetry remains a no-op and replay hydration does not re-emit
 * historical events into durable stores.
 */
export function registerConversationArcSink(sink: ConversationArcSink): () => void {
  if (!sink || typeof sink !== "object") {
    throw new TypeError("registerConversationArcSink: sink must be an object")
  }
  sinks.add(sink)
  return () => {
    sinks.delete(sink)
  }
}

/**
 * Browser-local durable sink backed by `localStorage`. It appends each accepted
 * event to a JSON array and exposes `load()` so a session can be replayed later.
 * When `localStorage` is unavailable (SSR, private browser failures), operations
 * degrade to no-ops and `load()` returns `[]`.
 */
export function createLocalStorageConversationArcSink(
  options: LocalStorageConversationArcSinkOptions = {}
): ConversationArcSink & { load(): ConversationArcEvent[] } {
  const key = options.key ?? DEFAULT_STORAGE_KEY
  const maxEvents = normalizePositiveInteger(
    options.maxEvents,
    DEFAULT_MAX_EVENTS,
    "createLocalStorageConversationArcSink: maxEvents"
  )

  return {
    record(event) {
      const storage = resolveLocalStorage(options.storage)
      const events = readStorageEvents(storage, key)
      events.push(event)
      writeStorageEvents(storage, key, events, maxEvents)
    },
    clear() {
      const storage = resolveLocalStorage(options.storage)
      if (!storage) return
      try {
        storage.removeItem(key)
      } catch (err) {
        warnSinkError("localStorage clear", err)
      }
    },
    load() {
      return readStorageEvents(resolveLocalStorage(options.storage), key)
    },
  }
}

interface IndexedDBConversationArcRow {
  id?: number
  event: ConversationArcEvent
}

function openConversationArcDB(
  dbName: string,
  storeName: string,
  factory?: IDBFactory
): Promise<IDBDatabase | null> {
  const indexedDBFactory = resolveIndexedDB(factory)
  if (!indexedDBFactory) return Promise.resolve(null)

  return new Promise((resolve) => {
    let request: IDBOpenDBRequest
    try {
      request = indexedDBFactory.open(dbName, 1)
    } catch (err) {
      warnSinkError("IndexedDB open", err)
      resolve(null)
      return
    }

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: "id", autoIncrement: true })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      warnSinkError("IndexedDB open", request.error)
      resolve(null)
    }
    request.onblocked = () => {
      warnSinkError("IndexedDB open", new Error("upgrade blocked"))
      resolve(null)
    }
  })
}

function loadIndexedDBEvents(
  db: IDBDatabase | null,
  storeName: string
): Promise<ConversationArcEvent[]> {
  if (!db) return Promise.resolve([])
  return new Promise((resolve) => {
    try {
      const request = db.transaction(storeName, "readonly").objectStore(storeName).getAll()
      request.onsuccess = () => {
        const rows = Array.isArray(request.result)
          ? (request.result as IndexedDBConversationArcRow[])
          : []
        resolve(rows.map((row) => row.event).filter(Boolean))
      }
      request.onerror = () => {
        warnSinkError("IndexedDB load", request.error)
        resolve([])
      }
    } catch (err) {
      warnSinkError("IndexedDB load", err)
      resolve([])
    }
  })
}

function trimIndexedDBEvents(
  db: IDBDatabase | null,
  storeName: string,
  maxEvents: number
): Promise<void> {
  if (!db) return Promise.resolve()
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, "readwrite")
      const store = tx.objectStore(storeName)
      const request = store.getAll()
      request.onsuccess = () => {
        const rows = Array.isArray(request.result)
          ? (request.result as IndexedDBConversationArcRow[])
          : []
        const overflow = rows.length - maxEvents
        if (overflow > 0) {
          for (const row of rows.slice(0, overflow)) {
            if (row.id != null) store.delete(row.id)
          }
        }
      }
      request.onerror = () => warnSinkError("IndexedDB trim", request.error)
      tx.oncomplete = () => resolve()
      tx.onerror = () => {
        warnSinkError("IndexedDB trim", tx.error)
        resolve()
      }
    } catch (err) {
      warnSinkError("IndexedDB trim", err)
      resolve()
    }
  })
}

/**
 * Browser durable sink backed by IndexedDB. Writes are asynchronous and
 * fire-and-forget from the recorder; callers that need replay can await
 * `sink.load()`.
 */
export function createIndexedDBConversationArcSink(
  options: IndexedDBConversationArcSinkOptions = {}
): ConversationArcSink & { load(): Promise<ConversationArcEvent[]> } {
  const dbName = options.dbName ?? DEFAULT_INDEXEDDB_NAME
  const storeName = options.storeName ?? DEFAULT_INDEXEDDB_STORE
  const maxEvents = normalizePositiveInteger(
    options.maxEvents,
    DEFAULT_MAX_EVENTS,
    "createIndexedDBConversationArcSink: maxEvents"
  )
  let dbPromise: Promise<IDBDatabase | null> | null = null

  const open = () => {
    dbPromise ??= openConversationArcDB(dbName, storeName, options.indexedDB)
    return dbPromise
  }

  return {
    async record(event) {
      const db = await open()
      if (!db) return
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(storeName, "readwrite")
          tx.objectStore(storeName).add({ event } satisfies IndexedDBConversationArcRow)
          tx.oncomplete = () => resolve()
          tx.onerror = () => {
            warnSinkError("IndexedDB record", tx.error)
            resolve()
          }
        } catch (err) {
          warnSinkError("IndexedDB record", err)
          resolve()
        }
      })
      await trimIndexedDBEvents(db, storeName, maxEvents)
    },
    async clear() {
      const db = await open()
      if (!db) return
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(storeName, "readwrite")
          tx.objectStore(storeName).clear()
          tx.oncomplete = () => resolve()
          tx.onerror = () => {
            warnSinkError("IndexedDB clear", tx.error)
            resolve()
          }
        } catch (err) {
          warnSinkError("IndexedDB clear", err)
          resolve()
        }
      })
    },
    async load() {
      return loadIndexedDBEvents(await open(), storeName)
    },
  }
}

/**
 * Minimal webhook sink for app-owned analytics ingestion. The sink posts one
 * JSON payload per accepted event; retry, batching, authentication refresh, and
 * sampling policy remain application concerns.
 */
export function createWebhookConversationArcSink(
  options: WebhookConversationArcSinkOptions
): ConversationArcSink {
  if (!options.url) {
    throw new TypeError("createWebhookConversationArcSink: url is required")
  }
  const method = options.method ?? "POST"
  return {
    record(event) {
      const fetcher =
        options.fetch ??
        ((globalThis as { fetch?: ConversationArcWebhookFetch }).fetch as
          ConversationArcWebhookFetch | undefined)
      if (!fetcher) return
      const payload = options.mapEvent ? options.mapEvent(event) : event
      return fetcher(options.url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        body: JSON.stringify(payload),
      }).then(() => undefined)
    },
  }
}

/**
 * Hydrate the in-memory store from a saved arc without replaying side effects.
 * The loaded events become visible through `getEvents()` / `useConversationArc`,
 * but listeners and sinks are not called. Pass `{ enabled: true }` when you want
 * to resume recording after loading; the default is replay-only.
 */
export function loadConversationArc(
  events: ReadonlyArray<ConversationArcEvent>,
  options: LoadConversationArcOptions = {}
): ReadonlyArray<ConversationArcEvent> {
  const nextEvents = Array.isArray(events) ? events.slice() : []
  const capacity = normalizePositiveInteger(
    options.capacity,
    Math.max(store?.capacity ?? DEFAULT_MAX_EVENTS, nextEvents.length, 1),
    "loadConversationArc: capacity"
  )
  const sessionId = options.sessionId ?? nextEvents[0]?.sessionId ?? store?.sessionId ?? newSessionId()

  if (!store) {
    store = {
      enabled: options.enabled ?? false,
      sessionId,
      capacity,
      buffer: [],
    }
  } else {
    store.enabled = options.enabled ?? false
    store.sessionId = sessionId
    store.capacity = capacity
  }

  if (!options.append) store.buffer = []
  store.buffer.push(...nextEvents)
  while (store.buffer.length > store.capacity) store.buffer.shift()
  invalidateSnapshot()
  notifyChange()
  return refreshSnapshotIfNeeded()
}

/** Alias with the word replay for fixture-driven callers. */
export function replayConversationArc(
  events: ReadonlyArray<ConversationArcEvent>,
  options: LoadConversationArcOptions = {}
): ReadonlyArray<ConversationArcEvent> {
  return loadConversationArc(events, options)
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

/**
 * Sugar for an `annotation-status-changed` event (M7). Call it from the
 * accept / dispute / retract / propose UI so the arc records how an
 * annotation's editorial standing moved — the durable, observable node of the
 * conversation. No-op (returns null) until `enableConversationArc()`.
 */
export function recordAnnotationStatusChange(
  toStatus: AnnotationStatus,
  opts?: {
    annotationId?: string
    fromStatus?: AnnotationStatus
    chartId?: string
    arcId?: string
    meta?: Record<string, unknown>
  }
): ConversationArcEvent | null {
  return facade.record({
    type: "annotation-status-changed",
    toStatus,
    annotationId: opts?.annotationId,
    fromStatus: opts?.fromStatus,
    chartId: opts?.chartId,
    arcId: opts?.arcId,
    meta: opts?.meta,
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
    dispatchSinkRecord(event)
    return event
  },
  flush() {
    const s = ensureStore()
    if (!s) return []
    const out = s.buffer.slice()
    s.buffer = []
    invalidateSnapshot()
    notifyChange()
    dispatchSinkFlush(out)
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
    dispatchSinkClear()
  },
  reset() {
    listeners.clear()
    sinks.clear()
    cachedSnapshot = EMPTY_FROZEN_SNAPSHOT
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
