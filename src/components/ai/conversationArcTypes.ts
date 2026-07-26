// Typed event vocabulary for conversation-arc telemetry.
//
// Kept separate from the store and persistence implementations so adding a
// durable authoring beat does not grow the already-large runtime module.

import type { AnnotationStatus } from "./annotationProvenance"

export type ConversationArcEventType =
  | "suggestion-shown"
  | "suggestion-chosen"
  | "audience-set"
  | "proposal-refused"
  | "chart-rendered"
  | "render-evidence"
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

/**
 * The deterministic trust loop declined to paint a model proposal.
 * `stage` identifies which gate stopped it and `codes` preserves the
 * machine-readable reasons an agent can use for repair.
 */
export interface ProposalRefusedEvent extends ConversationArcEventBase {
  type: "proposal-refused"
  component?: string
  stage: "validation" | "diagnosis" | "fit" | "render"
  codes: string[]
  alternatives?: string[]
}

export interface ChartRenderedEvent extends ConversationArcEventBase {
  type: "chart-rendered"
  component: string
  chartId?: string
}

/**
 * Render evidence captured after a chart attempt. Unlike `chart-rendered`, this
 * records whether the output was actually non-empty and free of error findings.
 */
export interface RenderEvidenceEvent extends ConversationArcEventBase {
  type: "render-evidence"
  component: string
  chartId?: string
  markCount: number
  empty: boolean
  /** Stable warning codes emitted by `renderChartWithEvidence`. */
  warnings: string[]
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
  | ProposalRefusedEvent
  | ChartRenderedEvent
  | RenderEvidenceEvent
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
