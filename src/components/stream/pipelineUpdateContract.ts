/**
 * Pure update contract for the stream-pipeline migration pilot.
 *
 * Stores still expose their established boolean/void mutation APIs. This
 * module gives a host an additive, inspectable result path without coupling it
 * to React, canvas, timers, or a particular chart family.
 */

/** Reasons a host may need to recompute or repaint part of a chart. */
export const INVALIDATION_KINDS = [
  "data",
  "domain",
  "layout",
  "scene-geometry",
  "scene-style",
  "data-paint",
  "interaction-paint",
  "overlay",
  "accessibility",
  "evidence",
] as const

export type Invalidation = (typeof INVALIDATION_KINDS)[number]

/**
 * Describes the operation that produced an update without retaining raw data
 * or user callbacks in a diagnostic/result object.
 */
export interface ChangeSet {
  readonly kind:
    | "initialize"
    | "ingest"
    | "replace"
    | "remove"
    | "update"
    | "clear"
    | "config"
    | "restyle"
    | "enqueue"
    | "tick"
    | "settle"
    | "restore"
    | "constraint"
    | "impulse"
    | "pause"
    | "visibility"
  readonly keys?: readonly string[]
  readonly count?: number
}

/**
 * Monotonic revision counters. A host can consume only the counters relevant
 * to its work (for example a canvas data layer observes `dataPaint`, while an
 * accessibility tree observes `accessibility`).
 */
export interface RevisionSet {
  readonly data: number
  readonly domain: number
  readonly layout: number
  readonly sceneGeometry: number
  readonly sceneStyle: number
  readonly dataPaint: number
  readonly interactionPaint: number
  readonly overlay: number
  readonly accessibility: number
  readonly evidence: number
}

/** The additive result exposed by the XY PipelineStore reference path. */
export interface UpdateResult {
  readonly changeSet: ChangeSet
  readonly changed: ReadonlySet<Invalidation>
  readonly revisions: RevisionSet
}

const REVISION_KEY_BY_INVALIDATION: Record<Invalidation, keyof RevisionSet> = {
  data: "data",
  domain: "domain",
  layout: "layout",
  "scene-geometry": "sceneGeometry",
  "scene-style": "sceneStyle",
  "data-paint": "dataPaint",
  "interaction-paint": "interactionPaint",
  overlay: "overlay",
  accessibility: "accessibility",
  evidence: "evidence",
}

export function createRevisionSet(): RevisionSet {
  return {
    data: 0,
    domain: 0,
    layout: 0,
    sceneGeometry: 0,
    sceneStyle: 0,
    dataPaint: 0,
    interactionPaint: 0,
    overlay: 0,
    accessibility: 0,
    evidence: 0,
  }
}

/** Return a fresh revision snapshot with exactly the invalidated counters bumped. */
export function advanceRevisions(
  previous: RevisionSet,
  invalidations: Iterable<Invalidation>,
): RevisionSet {
  const next: { -readonly [K in keyof RevisionSet]: number } = { ...previous }
  for (const invalidation of invalidations) {
    const key = REVISION_KEY_BY_INVALIDATION[invalidation]
    next[key]++
  }
  return next
}

/**
 * Build an immutable-by-convention update record from a change description.
 * The Set is copied so later mutation of the caller's iterable cannot alter
 * the revision decision that was recorded.
 */
export function createUpdateResult(
  changeSet: ChangeSet,
  invalidations: Iterable<Invalidation>,
  previousRevisions: RevisionSet,
): UpdateResult {
  const changed = new Set(invalidations)
  return {
    changeSet: {
      ...changeSet,
      ...(changeSet.keys ? { keys: [...changeSet.keys] } : {}),
    },
    changed,
    revisions: advanceRevisions(previousRevisions, changed),
  }
}

/**
 * Small retained-state helper for stores adopting the result contract. It
 * keeps revision bookkeeping out of family-specific data/layout code while
 * preserving each store's existing mutation API.
 */
export class UpdateResultTracker {
  private revisions = createRevisionSet()
  private latest = createUpdateResult({ kind: "initialize" }, [], this.revisions)

  get last(): UpdateResult {
    return this.latest
  }

  record(
    changeSet: ChangeSet,
    invalidations: Iterable<Invalidation>,
  ): UpdateResult {
    const result = createUpdateResult(changeSet, invalidations, this.revisions)
    this.revisions = result.revisions
    this.latest = result
    return result
  }
}
