import type { RevisionSet, UpdateResult } from "./pipelineUpdateContract"

type SceneRevisionSet = Pick<RevisionSet, "sceneGeometry" | "layout" | "domain">

const EMPTY_SCENE_REVISIONS: SceneRevisionSet = {
  sceneGeometry: 0,
  layout: 0,
  domain: 0
}

interface SceneRevisionCheck {
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

/** Development-only consumption and duplicate-compute diagnostics for an XY scene host. */
export class SceneRevisionDiagnostics {
  private lastConsumed = EMPTY_SCENE_REVISIONS
  private lastDuplicateWarning = ""
  private lastUnconsumedWarning = ""

  beforeCompute(updateResult: UpdateResult, isTransitioning: boolean): SceneRevisionCheck {
    const revisions = sceneRevisions(updateResult)
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
      warnUnconsumed:
        process.env.NODE_ENV !== "production" &&
        !isTransitioning &&
        wasUnconsumed &&
        this.lastUnconsumedWarning !== nextSignature
    }
  }

  afterCompute(
    check: SceneRevisionCheck,
    computedScene: boolean,
    dimsChanged: boolean
  ): void {
    if (computedScene && check.wasUnconsumed) this.lastConsumed = check.revisions
    if (check.warnUnconsumed && !computedScene) {
      console.warn(
        `[semiotic] StreamXYFrame observed scene-affecting revisions without a scene rebuild: ${check.signature}.`
      )
      this.lastUnconsumedWarning = check.signature
      return
    }
    if (
      process.env.NODE_ENV !== "production" &&
      computedScene &&
      check.sawSignals &&
      !check.wasUnconsumed &&
      !dimsChanged &&
      this.lastDuplicateWarning !== check.signature
    ) {
      console.warn(
        `[semiotic] StreamXYFrame performed scene rebuild with unchanged scene revisions: ${check.signature}.`
      )
      this.lastDuplicateWarning = check.signature
    } else if (computedScene && !check.sawSignals) {
      this.lastDuplicateWarning = ""
    }
  }
}
