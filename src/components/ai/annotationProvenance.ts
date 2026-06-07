// Annotation provenance + lifecycle.
//
// Anchored conversations need a defensible answer to "what about stale
// notes when the data changes?" The answer requires every annotation
// to carry provenance (who/where/when/on-what-basis) and lifecycle
// (temporal freshness + editorial status, TTL, anchor strategy).
//
// Freshness computation (`computeAnnotationFreshness`), the default
// visual treatment (`applyAnnotationLifecycle`), and stable-id anchor
// re-resolution (the `"semantic"` anchor) ship together.
//
// This type surface is the union of the shipped fields and the IDID
// framework's `ChartAnnotationProvenance` shape. That shape packs
// everything into one flat block; here the origin/evidence fields live on `provenance`
// and the editorial-state fields (`status`, `supersedes`) live on
// `lifecycle`, parallel to the temporal `freshness` band — the two
// lifecycle axes are orthogonal (a note can be fresh-but-disputed or
// stale-but-accepted). Status-driven visibility and visual treatment ship
// alongside the types so visual and non-visual surfaces can agree on which
// notes are current.
//
// All fields are optional. Existing annotation arrays keep working
// unchanged — the new blocks attach to whatever annotation shape the
// chart already accepts.

// ── Provenance ────────────────────────────────────────────────────────

/**
 * Where an annotation came from and how confident we should be in it.
 * Lives on `annotation.provenance`.
 */
export interface AnnotationProvenance {
  /**
   * Display name (or stable id) for who created the annotation — a
   * person, agent, or watcher. Together with `authorKind` this expresses
   * IDID §8's structured `author: { kind, id }`: `authorKind` is the
   * actor category, `author` is the name/id.
   */
  author?: string
  /**
   * Actor category — *who* created the annotation. IDID §8's
   * `author.kind`. Distinct from `basis` (*how* it was derived) and from
   * the coarser `source`. Open union; consumers may extend.
   */
  authorKind?: AnnotationActorKind
  /**
   * Origin category. Recognized values are not exhaustive; consumers
   * may extend with their own source labels. Coarser than the
   * `authorKind` / `basis` pair — kept for back-compat and as a single
   * convenience label when the finer split isn't needed.
   */
  source?: AnnotationSource
  /**
   * Evidence type — *how* the annotation's claim was derived
   * (a hand note, a statistical test, a rule, an LLM inference, an
   * external source). IDID §8's `basis`. Distinct from `authorKind`
   * (the actor) and `source` (the coarse origin): a `"human"` author can
   * relay a `"statistical-test"` basis. Lets a reader weight a note by
   * the strength of its evidence, not just who left it.
   */
  basis?: AnnotationBasis
  /**
   * Confidence in the assertion, 0–1. `1` is a hand-placed user
   * annotation; LLM-suggested annotations typically land below 0.8.
   */
  confidence?: number
  /** ISO 8601 timestamp marking when the annotation was created. */
  createdAt?: string
  /**
   * Identifier of the data snapshot the annotation was made against
   * (IDID §8's `dataVersion`). Lets a consumer tell "this note was
   * written about last week's data" from "this note still tracks the
   * current data," independent of wall-clock freshness.
   */
  dataVersion?: string
  /**
   * Stable, opaque identifier that survives data refresh and chart
   * recreation. Used by the `"semantic"` anchor-resolution work to
   * re-locate "the Q3 spike" after new data arrives, and as the target
   * of another annotation's `lifecycle.supersedes`.
   */
  stableId?: string
}

/**
 * Actor category for an annotation — *who* created it. IDID §8 models
 * this as `author.kind`. Open string union: `"system"` covers
 * non-watcher automated placement, and consumers may pass any other
 * label (it is preserved).
 */
export type AnnotationActorKind =
  | "human"
  | "agent"
  | "watcher"
  | "system"
  | (string & {})

/**
 * Evidence type for an annotation — *how* its claim was derived. IDID
 * §8's `basis`. Open string union so consumers can add evidence kinds
 * (e.g. `"forecast"`, `"manual-review"`) without a type change.
 */
export type AnnotationBasis =
  | "human-note"
  | "statistical-test"
  | "rule"
  | "llm-inference"
  | "external-source"
  | "computed"
  | (string & {})

/**
 * Recognized provenance sources. Open string union — consumers may
 * pass any other label and it will be preserved.
 */
export type AnnotationSource =
  | "user"
  | "ai"
  | "agent"
  | "import"
  | "computed"
  | "system"
  | (string & {})

// ── Lifecycle ─────────────────────────────────────────────────────────

/**
 * How an annotation ages relative to the chart's current data extent.
 * Default visual treatment (defined in M2): `aging` dims, `stale`
 * draws a dashed border, `expired` is hidden unless
 * `showExpiredAnnotations` is on.
 */
// Alias of `LifecycleBand` (which lives next to `bandFromAge` in the
// realtime runtime). Keeping the public name `AnnotationFreshness`
// for the AI surface but pointing it at the shared union prevents
// drift if future bands are added.
export type AnnotationFreshness = LifecycleBand

// Re-export the canonical anchor type from the streaming runtime,
// which owns the resolution implementation. Same union of modes
// either way — defining once means the AI lifecycle vocabulary and
// the streaming runtime can't drift. Imported locally because
// `AnnotationLifecycle` below references it.
import type { AnnotationAnchor } from "../realtime/types"
export type { AnnotationAnchor } from "../realtime/types"

// `bandFromAge` is the shared lifecycle-classification primitive.
// Same algorithm whether we're tagging annotations (today),
// classifying datums in a streaming buffer (banded decay, future),
// or surfacing staleness bands instead of binary live/stale (future).
// Imported locally because `annotationFreshnessFor` wraps it.
import { bandFromAge } from "../realtime/lifecycleBands"
import type { LifecycleBand, LifecycleBandThresholds } from "../realtime/lifecycleBands"
export { bandFromAge, DEFAULT_LIFECYCLE_THRESHOLDS } from "../realtime/lifecycleBands"
export type { LifecycleBand, LifecycleBandThresholds } from "../realtime/lifecycleBands"

/**
 * Editorial standing of an annotation in a multiplayer conversation —
 * is the note still believed? IDID §8's `status`. Orthogonal to the
 * temporal `freshness` band: a note can be fresh-but-`disputed` or
 * stale-but-`accepted`. Closed union — these four are the editorial
 * state machine the editorial-lifecycle work drives:
 *
 * - `"proposed"` — placed but unreviewed (e.g. a watcher's auto-note).
 * - `"accepted"` — confirmed by a human or agent.
 * - `"disputed"` — contested; under review.
 * - `"retracted"` — withdrawn; treat like an expired note.
 */
export type AnnotationStatus = "proposed" | "accepted" | "disputed" | "retracted"

/**
 * Lifecycle state for an annotation. Lives on `annotation.lifecycle`.
 *
 * Two orthogonal axes: the **temporal** band (`freshness`, derived from
 * `createdAt` + `ttlHint`) and the **editorial** state (`status`,
 * driven by the multiplayer accept/dispute/retract flow). `supersedes`
 * links a revision to the note it replaces.
 */
export interface AnnotationLifecycle {
  /**
   * Current freshness band. When omitted, `computeAnnotationFreshness`
   * derives it from `ttlHint` and the data's current temporal extent.
   */
  freshness?: AnnotationFreshness
  /**
   * Editorial standing (IDID §8's `status`). Set by the multiplayer
   * accept/dispute/retract flow; orthogonal to `freshness`. When
   * omitted, the annotation is treated as unconditionally shown (the
   * pre-editorial-lifecycle behavior). Status-driven visual treatment
   * is owed alongside the editorial-lifecycle work — the field ships
   * first so it can be stamped now.
   */
  status?: AnnotationStatus
  /**
   * `provenance.stableId` of the annotation this one replaces (IDID
   * §8's `supersedes`). Forms a revision chain so a reader can trace how
   * an interpretation changed; the superseded note is typically hidden
   * once its replacement is `accepted`.
   */
  supersedes?: string
  /**
   * How long this annotation should be considered fresh. Either an
   * ISO 8601 duration string (`"PT24H"`, `"P7D"`) or a number of
   * milliseconds. The freshness computation walks `fresh → aging
   * → stale → expired` as the chart's "now" advances past
   * `createdAt + ttlHint`.
   */
  ttlHint?: string | number
  /** Anchor resolution strategy. Defaults to `"fixed"` when omitted. */
  anchor?: AnnotationAnchor
}

// ── Authoring helpers ─────────────────────────────────────────────────

/**
 * Carries the new optional blocks onto whatever annotation type the
 * chart accepts. Use as `Annotated<typeof myAnnotation>` for explicit
 * typing, or call `withProvenance()` for inline authoring.
 */
export type Annotated<T> = T & {
  provenance?: AnnotationProvenance
  lifecycle?: AnnotationLifecycle
}

/**
 * Convenience builder — attaches provenance + lifecycle blocks to an
 * annotation without disturbing its existing fields. Returns a new
 * object; does not mutate. Pure function, safe to call in SSR.
 *
 * ```ts
 * withProvenance(
 *   { type: "y-threshold", value: 100, label: "SLA breach" },
 *   {
 *     provenance: { author: "alice", source: "user", createdAt: "2026-05-20T14:00:00Z" },
 *     lifecycle: { ttlHint: "P30D", anchor: "semantic" },
 *   }
 * )
 * ```
 */
export function withProvenance<T extends object>(
  annotation: T,
  blocks: {
    provenance?: AnnotationProvenance
    lifecycle?: AnnotationLifecycle
  }
): Annotated<T> {
  const next: Annotated<T> = { ...annotation }
  if (blocks.provenance) next.provenance = blocks.provenance
  if (blocks.lifecycle) next.lifecycle = blocks.lifecycle
  return next
}

/**
 * Returns an ISO 8601 wall-clock timestamp suitable for stamping
 * `provenance.createdAt`. Sugar over `new Date().toISOString()`, but
 * named to make intent obvious in streaming consumers: "mark this
 * annotation as created now, so the lifecycle helpers can age it."
 *
 * Pair with `applyAnnotationLifecycle({ dataExtent })` on time-series
 * charts to have annotations age against chart-time rather than
 * wall-clock — the chart's latest data point becomes the "now"
 * reference, and recently-stamped annotations stay fresh for as long
 * as new data is flowing.
 */
export function currentTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Stamp an annotation with `provenance.createdAt = currentTimestamp()`
 * (unless it already has a `createdAt`) and optional additional
 * provenance fields. Intended for the streaming "I'm marking the
 * latest data point" pattern, where the annotation's age should be
 * measured from when the consumer added it.
 *
 * Equivalent to:
 *   ```ts
 *   withProvenance(ann, {
 *     provenance: { createdAt: currentTimestamp(), ...rest },
 *     lifecycle: ann.lifecycle,
 *   })
 *   ```
 * — but reads cleaner at call sites and preserves any existing
 * `createdAt`.
 */
export function withCurrentProvenance<T extends object>(
  annotation: T,
  rest: Omit<AnnotationProvenance, "createdAt"> & { createdAt?: string } = {}
): Annotated<T> {
  const existing = (annotation as Annotated<T>).provenance
  return {
    ...annotation,
    provenance: {
      ...existing,
      ...rest,
      createdAt: rest.createdAt ?? existing?.createdAt ?? currentTimestamp(),
    },
  } as Annotated<T>
}

// ── Freshness computation (M2) ────────────────────────────────────────

/**
 * Options accepted by `computeAnnotationFreshness` and
 * `applyAnnotationLifecycle`.
 */
export interface ComputeAnnotationFreshnessOptions {
  /**
   * "Now" reference for age calculations. Number is epoch ms; string is
   * any value `Date.parse` accepts. When omitted, defaults to the max
   * of `dataExtent`, falling back to `Date.now()`.
   */
  now?: number | Date | string
  /**
   * The chart's current temporal extent — typically `[oldest, newest]`
   * x values. Used to derive a sensible "now" for streaming charts
   * (where wall-clock time and the data's notion of "now" can drift).
   */
  dataExtent?:
    | ReadonlyArray<number | Date | string>
    | { min: number | Date | string; max: number | Date | string }
  /**
   * Override the default age thresholds. Each value is a multiplier of
   * `ttlHint`. Defaults: aging at 1×, stale at 1.5×, expired at 3×.
   * Same shape as `LifecycleBandThresholds` from the shared primitive.
   */
  thresholds?: LifecycleBandThresholds
}

function toMs(value: number | Date | string | undefined): number | null {
  if (value == null) return null
  if (typeof value === "number") return value
  if (value instanceof Date) return value.getTime()
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function resolveNow(options?: ComputeAnnotationFreshnessOptions): number {
  const explicit = toMs(options?.now)
  if (explicit != null) return explicit
  const extent = options?.dataExtent
  if (extent) {
    // `Array.isArray` does narrow ReadonlyArray vs. object in modern TS,
    // but the union including `{ min, max }` confuses it; fall back to
    // `"max" in extent` for the object branch.
    if (Array.isArray(extent)) {
      const last = extent[extent.length - 1]
      const ms = toMs(last)
      if (ms != null) return ms
    } else if ("max" in extent) {
      const ms = toMs(extent.max)
      if (ms != null) return ms
    }
  }
  return Date.now()
}

function parseIsoDuration(s: string): number {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(s)
  if (!m) return 0
  const days = parseInt(m[1] || "0", 10)
  const hours = parseInt(m[2] || "0", 10)
  const minutes = parseInt(m[3] || "0", 10)
  const seconds = parseInt(m[4] || "0", 10)
  return ((days * 24 + hours) * 3600 + minutes * 60 + seconds) * 1000
}

function ttlToMs(ttl: string | number | undefined): number | null {
  if (ttl == null) return null
  if (typeof ttl === "number") return ttl
  const parsed = parseIsoDuration(ttl)
  return parsed > 0 ? parsed : null
}

/**
 * Classify an annotation into a freshness band. Exported for tests and
 * for consumers that want the per-annotation band without rebuilding
 * the entire array.
 *
 * Returns the annotation's existing `lifecycle.freshness` verbatim if
 * the annotation lacks the `createdAt` or `ttlHint` needed to compute
 * a band — i.e. an explicit assignment always wins over inference.
 */
export function annotationFreshnessFor<T>(
  annotation: Annotated<T>,
  nowMs: number,
  thresholds: LifecycleBandThresholds = {}
): AnnotationFreshness {
  const existing = annotation?.lifecycle?.freshness
  const createdMs = toMs(annotation?.provenance?.createdAt)
  const ttlMs = ttlToMs(annotation?.lifecycle?.ttlHint)
  if (createdMs == null || ttlMs == null) {
    return existing ?? "fresh"
  }
  // Defer to the shared lifecycle classifier — same algorithm any
  // future banded-decay / banded-staleness opt-in will use.
  return bandFromAge(nowMs - createdMs, ttlMs, thresholds)
}

/**
 * Walk an annotations array and populate `lifecycle.freshness` on each
 * entry from its `provenance.createdAt` and `lifecycle.ttlHint`.
 *
 * Pure function — returns a new array; does not mutate input. Safe
 * to call in SSR. Annotations missing the inputs needed to compute a
 * band keep whatever `lifecycle.freshness` they already had (so an
 * explicit assignment always wins).
 *
 * For non-temporal charts, pass `now` explicitly. For streaming /
 * time-series charts, pass `dataExtent` — the helper picks the latest
 * value as "now" so freshness tracks chart-time, not wall-clock.
 */
export function computeAnnotationFreshness<T>(
  annotations: ReadonlyArray<Annotated<T>>,
  options: ComputeAnnotationFreshnessOptions = {}
): Annotated<T>[] {
  const nowMs = resolveNow(options)
  return annotations.map((a) => {
    const freshness = annotationFreshnessFor(a, nowMs, options.thresholds)
    return {
      ...a,
      lifecycle: { ...a.lifecycle, freshness },
    }
  })
}

// ── Default visual treatment (M2) ─────────────────────────────────────

/**
 * Style overrides per freshness band. Each map is partial — bands not
 * present fall back to the defaults below. `null` for a value removes
 * the default rather than applying it (e.g. `{ opacity: { aging: null } }`
 * disables dimming aging annotations).
 */
export interface AnnotationLifecycleTreatment {
  opacity?: Partial<Record<AnnotationFreshness, number | null>>
  strokeDasharray?: Partial<Record<AnnotationFreshness, string | null>>
  /** Suffix appended to `label` for that band. Default suffixes are off. */
  labelSuffix?: Partial<Record<AnnotationFreshness, string>>
  /**
   * When true, expired annotations stay in the returned array (with
   * the expired treatment applied). When false (default), expired
   * annotations are filtered out — matching the "hidden by default"
   * contract from the talk-readiness roadmap.
   */
  showExpiredAnnotations?: boolean
}

export type ApplyAnnotationLifecycleOptions =
  ComputeAnnotationFreshnessOptions & AnnotationLifecycleTreatment

const DEFAULT_OPACITY: Record<AnnotationFreshness, number | null> = {
  fresh: null,
  aging: 0.55,
  stale: 0.35,
  expired: 0.2,
}

const DEFAULT_DASHARRAY: Record<AnnotationFreshness, string | null> = {
  fresh: null,
  aging: null,
  stale: "4 4",
  expired: "2 4",
}

function pick<V>(
  overrides: Partial<Record<AnnotationFreshness, V | null>> | undefined,
  defaults: Record<AnnotationFreshness, V | null>,
  band: AnnotationFreshness
): V | null {
  if (overrides && band in overrides) return overrides[band] as V | null
  return defaults[band]
}

/**
 * Compute freshness and apply the default visual treatment in one pass.
 *
 * Behavior per band (overridable via options):
 * - **fresh** — no change
 * - **aging** — `opacity` 0.55
 * - **stale** — `opacity` 0.35, `strokeDasharray` `"4 4"` (cascades
 *   through the annotation's stroked children)
 * - **expired** — filtered out by default; pass
 *   `showExpiredAnnotations: true` to keep them with `opacity` 0.2 and
 *   `strokeDasharray` `"2 4"`
 *
 * Treatment composes cleanly with annotations that already carry their
 * own `color` / `opacity` — explicit fields on the annotation win,
 * the treatment only fills in what isn't already set.
 */
export function applyAnnotationLifecycle<T>(
  annotations: ReadonlyArray<Annotated<T>>,
  options: ApplyAnnotationLifecycleOptions = {}
): Annotated<T>[] {
  const nowMs = resolveNow(options)
  const showExpired = options.showExpiredAnnotations === true

  const out: Annotated<T>[] = []
  for (const annotation of annotations) {
    const freshness = annotationFreshnessFor(annotation, nowMs, options.thresholds)
    if (freshness === "expired" && !showExpired) continue

    const opacity = pick(options.opacity, DEFAULT_OPACITY, freshness)
    const dashArray = pick(options.strokeDasharray, DEFAULT_DASHARRAY, freshness)
    const suffix = options.labelSuffix?.[freshness]

    const next: Annotated<T> & {
      opacity?: number
      strokeDasharray?: string
      label?: string
      anchor?: AnnotationAnchor
    } = {
      ...annotation,
      lifecycle: { ...annotation.lifecycle, freshness },
    }

    // Only fill the prop when the caller hasn't already set it on the
    // annotation itself — explicit annotation fields win.
    if (opacity != null && (next as { opacity?: number }).opacity == null) {
      next.opacity = opacity
    }
    if (dashArray != null && (next as { strokeDasharray?: string }).strokeDasharray == null) {
      next.strokeDasharray = dashArray
    }
    if (suffix && typeof (next as { label?: string }).label === "string") {
      next.label = (next as { label: string }).label + suffix
    }

    // Mirror `lifecycle.anchor` onto the top-level `anchor` field so
    // the streaming annotation resolver (which reads `ann.anchor`,
    // not `ann.lifecycle.anchor`) picks up the requested mode. The
    // top-level field still wins if a caller set it explicitly.
    const lifecycleAnchor = annotation.lifecycle?.anchor
    if (lifecycleAnchor && (next as { anchor?: AnnotationAnchor }).anchor == null) {
      next.anchor = lifecycleAnchor
    }

    out.push(next)
  }
  return out
}

// ── Editorial-status visual treatment (M7) ────────────────────────────

/**
 * Style overrides per editorial status. Each map is partial — statuses not
 * present fall back to the defaults below. `null` for a value removes the
 * default rather than applying it.
 */
export interface AnnotationStatusVisibility {
  /**
   * Keep `retracted` annotations instead of filtering them out. Default false
   * — retracted is hidden like `expired`.
   */
  showRetractedAnnotations?: boolean
  /**
   * Keep an annotation that another *present* note supersedes. Default false
   * — a superseded note is hidden once its replacement is in the array.
   */
  showSupersededAnnotations?: boolean
}

export interface AnnotationStatusTreatment extends AnnotationStatusVisibility {
  /**
   * Opacity *factor* per status, multiplied into any existing opacity so it
   * composes with the freshness treatment (run `applyAnnotationLifecycle`
   * first, then this). `null` disables the factor for that status.
   */
  opacity?: Partial<Record<AnnotationStatus, number | null>>
  strokeDasharray?: Partial<Record<AnnotationStatus, string | null>>
  /**
   * Suffix appended to a string `label` for that status — the `disputed`
   * default `" (?)"` is the query affordance the strategy calls for.
   */
  labelSuffix?: Partial<Record<AnnotationStatus, string>>
}

const DEFAULT_STATUS_OPACITY: Record<AnnotationStatus, number | null> = {
  proposed: 0.7,
  accepted: null,
  disputed: 0.7,
  retracted: 0.25,
}

const DEFAULT_STATUS_DASHARRAY: Record<AnnotationStatus, string | null> = {
  proposed: "3 3",
  accepted: null,
  disputed: "2 3",
  retracted: "2 4",
}

const DEFAULT_STATUS_SUFFIX: Record<AnnotationStatus, string> = {
  proposed: " (proposed)",
  accepted: "",
  disputed: " (?)",
  retracted: "",
}

function pickStatus<V>(
  overrides: Partial<Record<AnnotationStatus, V | null>> | undefined,
  defaults: Record<AnnotationStatus, V | null>,
  status: AnnotationStatus
): V | null {
  if (overrides && status in overrides) return overrides[status] as V | null
  return defaults[status]
}

/**
 * Apply the default editorial visibility contract without changing annotation
 * styling. Retracted notes and notes replaced by a present revision are hidden
 * unless explicitly requested. Shared by visual treatment, chart descriptions,
 * and navigation trees so they expose the same current set.
 */
export function filterAnnotationsByStatus<T>(
  annotations: ReadonlyArray<Annotated<T>>,
  options: AnnotationStatusVisibility = {}
): Annotated<T>[] {
  const showRetracted = options.showRetractedAnnotations === true
  const showSuperseded = options.showSupersededAnnotations === true

  // stableIds that a present, non-retracted note supersedes.
  const supersededIds = new Set<string>()
  for (const a of annotations) {
    const target = a?.lifecycle?.supersedes
    if (target && a?.lifecycle?.status !== "retracted") supersededIds.add(target)
  }

  return annotations.filter((annotation) => {
    if (annotation?.lifecycle?.status === "retracted" && !showRetracted) return false
    const myId = annotation?.provenance?.stableId
    return !(myId && supersededIds.has(myId) && !showSuperseded)
  })
}

/**
 * Apply the editorial-status visual treatment (M7) — the orthogonal companion
 * to {@link applyAnnotationLifecycle}'s temporal-freshness treatment. The two
 * compose (a note can be stale-and-disputed); run freshness first, then this.
 *
 * Per status (overridable via options):
 * - **accepted** — no change (full weight).
 * - **proposed** — `opacity` ×0.7, dashed `"3 3"`, `label` suffix `" (proposed)"`.
 *   An unreviewed (e.g. watcher) note reads provisionally.
 * - **disputed** — `opacity` ×0.7, dashed `"2 3"`, `label` suffix `" (?)"`.
 *   The suffix is the query affordance: a contested note announces itself.
 * - **retracted** — filtered out by default (like `expired`); pass
 *   `showRetractedAnnotations: true` to keep it at `opacity` ×0.25.
 *
 * Also resolves **supersession**: a note whose `provenance.stableId` is the
 * `lifecycle.supersedes` target of another *present, non-retracted* note is
 * hidden (the revision replaced it), unless `showSupersededAnnotations` is set.
 *
 * Pure — returns a new array; safe in SSR. Opacity is multiplied into any
 * existing value, so it composes with freshness dimming and author-set opacity.
 */
export function applyAnnotationStatus<T>(
  annotations: ReadonlyArray<Annotated<T>>,
  options: AnnotationStatusTreatment = {}
): Annotated<T>[] {
  const out: Annotated<T>[] = []
  for (const annotation of filterAnnotationsByStatus(annotations, options)) {
    const status = annotation?.lifecycle?.status

    if (!status) {
      out.push(annotation)
      continue
    }

    const opacityFactor = pickStatus(options.opacity, DEFAULT_STATUS_OPACITY, status)
    const dashArray = pickStatus(options.strokeDasharray, DEFAULT_STATUS_DASHARRAY, status)
    const suffix = options.labelSuffix?.[status] ?? DEFAULT_STATUS_SUFFIX[status]

    const next: Annotated<T> & {
      opacity?: number
      strokeDasharray?: string
      label?: string
    } = { ...annotation }

    if (opacityFactor != null) {
      const existing = typeof (next as { opacity?: number }).opacity === "number"
        ? (next as { opacity: number }).opacity
        : 1
      next.opacity = existing * opacityFactor
    }
    if (dashArray != null && (next as { strokeDasharray?: string }).strokeDasharray == null) {
      next.strokeDasharray = dashArray
    }
    if (suffix && typeof (next as { label?: string }).label === "string") {
      next.label = (next as { label: string }).label + suffix
    }

    out.push(next)
  }
  return out
}
