import { memo, useEffect } from "react"
import type {
  RevisionSet,
  UpdateResult,
  UpdateResultStore
} from "./pipelineUpdateContract"

export type SceneRevisionSet = Pick<RevisionSet, "sceneGeometry" | "layout" | "domain">

const EMPTY_SCENE_REVISIONS: SceneRevisionSet = {
  sceneGeometry: 0,
  layout: 0,
  domain: 0
}

export interface SceneRevisionCheck {
  revisions: SceneRevisionSet
  signature: string
  sawSignals: boolean
  wasUnconsumed: boolean
  warnUnconsumed: boolean
}

function sceneRevisions(updateResult: UpdateResult): SceneRevisionSet {
  const { domain, layout, sceneGeometry } = updateResult.revisions
  return { domain, layout, sceneGeometry }
}

function signature(revisions: SceneRevisionSet): string {
  return `${revisions.sceneGeometry}|${revisions.layout}|${revisions.domain}`
}

function equal(a: SceneRevisionSet, b: SceneRevisionSet): boolean {
  return a.sceneGeometry === b.sceneGeometry && a.layout === b.layout && a.domain === b.domain
}

function latest(a: SceneRevisionSet, b: SceneRevisionSet): SceneRevisionSet {
  return {
    sceneGeometry: Math.max(a.sceneGeometry, b.sceneGeometry),
    layout: Math.max(a.layout, b.layout),
    domain: Math.max(a.domain, b.domain)
  }
}

const IS_DEV = process.env.NODE_ENV !== "production"

const NOOP_CHECK: SceneRevisionCheck = {
  revisions: EMPTY_SCENE_REVISIONS,
  signature: "",
  sawSignals: false,
  wasUnconsumed: false,
  warnUnconsumed: false
}

/** Development-only consumption and duplicate-compute diagnostics for a scene host. */
export class SceneRevisionDiagnostics {
  constructor(private readonly hostName = "scene host") {}

  private lastConsumed = EMPTY_SCENE_REVISIONS
  private lastObserved = EMPTY_SCENE_REVISIONS
  private lastDuplicateWarning = ""
  private lastUnconsumedWarning = ""

  /**
   * Accept a React external-store observation without participating in frame
   * scheduling or paint. The imperative result passed to beforeCompute remains
   * authoritative; retaining the high-water mark only protects development
   * diagnostics when React observes an update between frame passes.
   */
  observeUpdateResult(updateResult: UpdateResult): void {
    if (!IS_DEV) return
    this.lastObserved = latest(this.lastObserved, sceneRevisions(updateResult))
  }

  beforeCompute(updateResult: UpdateResult, isTransitioning: boolean): SceneRevisionCheck {
    if (!IS_DEV) return NOOP_CHECK
    const revisions = latest(sceneRevisions(updateResult), this.lastObserved)
    const nextSignature = signature(revisions)
    const wasUnconsumed = !equal(revisions, this.lastConsumed)
    return {
      revisions,
      signature: nextSignature,
      sawSignals:
        updateResult.changed.has("scene-geometry") ||
        updateResult.changed.has("layout") ||
        updateResult.changed.has("domain"),
      wasUnconsumed,
      warnUnconsumed: !isTransitioning && wasUnconsumed && this.lastUnconsumedWarning !== nextSignature
    }
  }

  afterCompute(
    check: SceneRevisionCheck,
    computedScene: boolean,
    dimsChanged: boolean
  ): void {
    if (!IS_DEV) return
    if (computedScene && check.wasUnconsumed) this.lastConsumed = check.revisions
    if (check.warnUnconsumed && !computedScene) {
      console.warn(
        `[semiotic] ${this.hostName} observed scene-affecting revisions without a scene rebuild: ${check.signature}.`
      )
      this.lastUnconsumedWarning = check.signature
      return
    }
    if (
      computedScene &&
      check.sawSignals &&
      !check.wasUnconsumed &&
      !dimsChanged &&
      this.lastDuplicateWarning !== check.signature
    ) {
      console.warn(
        `[semiotic] ${this.hostName} performed scene rebuild with unchanged scene revisions: ${check.signature}.`
      )
      this.lastDuplicateWarning = check.signature
    } else if (computedScene && !check.sawSignals) {
      this.lastDuplicateWarning = ""
    }
  }
}

/**
 * Observes external-store revisions without putting diagnostics on a React
 * render path. Stores can record non-invalidating operational results during
 * host effects, so a useSyncExternalStore subscription here could feed those
 * diagnostics back into the host's render cycle.
 */
export const SceneRevisionDiagnosticsObserver = memo(
  function SceneRevisionDiagnosticsObserver({
    store,
    diagnostics
  }: {
    store: UpdateResultStore
    diagnostics: SceneRevisionDiagnostics
  }) {
    useEffect(() => {
      const observe = () => diagnostics.observeUpdateResult(store.getUpdateSnapshot())
      observe()
      return store.subscribeUpdateResult(observe)
    }, [diagnostics, store])

    return null
  }
)
