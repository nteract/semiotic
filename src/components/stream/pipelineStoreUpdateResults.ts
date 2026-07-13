import {
  type ChangeSet,
  type Invalidation,
  type UpdateResult,
  UpdateResultTracker
} from "./pipelineUpdateContract"

const DATA_INVALIDATIONS: readonly Invalidation[] = [
  "data",
  "domain",
  "layout",
  "scene-geometry",
  "data-paint",
  "overlay",
  "accessibility",
  "evidence"
]

const RESTYLE_INVALIDATIONS: readonly Invalidation[] = [
  "scene-style",
  "data-paint",
  "accessibility",
  "evidence"
]

const STYLE_CONFIG_KEYS = new Set([
  "lineStyle",
  "pointStyle",
  "areaStyle",
  "barStyle",
  "swarmStyle",
  "waterfallStyle",
  "candlestickStyle",
  "boundsStyle",
  "colorScheme",
  "themeCategorical",
  "themeSemantic",
  "barColors"
])

function configInvalidations(
  changedKeys: readonly string[],
  extentAccessorChanged: boolean
): ReadonlySet<Invalidation> {
  // The reference path reports the conservative full-rebuild behavior that
  // PipelineStore performs today; it does not claim style callbacks are safe
  // paint-only config patches yet.
  const changed = new Set<Invalidation>([
    "layout",
    "scene-geometry",
    "data-paint",
    "overlay",
    "accessibility",
    "evidence"
  ])
  if (extentAccessorChanged) changed.add("domain")
  if (changedKeys.some((key) => STYLE_CONFIG_KEYS.has(key))) {
    changed.add("scene-style")
  }
  return changed
}

type DataChangeKind = Extract<
  ChangeSet["kind"],
  "ingest" | "replace" | "remove" | "update" | "clear"
>

/** Result bookkeeping and invalidation policy for the XY PipelineStore pilot. */
export class PipelineStoreUpdateResults {
  private tracker = new UpdateResultTracker()

  get last(): UpdateResult {
    return this.tracker.last
  }

  recordData(kind: DataChangeKind, count?: number): UpdateResult {
    return this.tracker.record({ kind, ...(count === undefined ? {} : { count }) }, DATA_INVALIDATIONS)
  }

  recordNoop(kind: DataChangeKind | "restyle"): UpdateResult {
    return this.tracker.record({ kind, ...(kind === "restyle" ? {} : { count: 0 }) }, [])
  }

  recordRestyle(hasCustomRestyle: boolean): UpdateResult {
    return hasCustomRestyle
      ? this.tracker.record({ kind: "restyle" }, RESTYLE_INVALIDATIONS)
      : this.recordNoop("restyle")
  }

  recordConfig(
    keys: readonly string[],
    requiresRebuild: boolean,
    extentAccessorChanged: boolean
  ): UpdateResult {
    return this.tracker.record(
      { kind: "config", keys },
      requiresRebuild ? configInvalidations(keys, extentAccessorChanged) : []
    )
  }
}
