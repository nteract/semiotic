import {
  type ChangeSet,
  type Invalidation,
  type UpdateResult,
  UpdateResultTracker,
} from "./pipelineUpdateContract"

const DATA_INVALIDATIONS: readonly Invalidation[] = [
  "data",
  "domain",
  "layout",
  "scene-geometry",
  "data-paint",
  "overlay",
  "accessibility",
  "evidence",
]

const RESTYLE_INVALIDATIONS: readonly Invalidation[] = [
  "scene-style",
  "data-paint",
  "accessibility",
  "evidence",
]

const CONFIG_INVALIDATIONS: readonly Invalidation[] = [
  "layout",
  "scene-geometry",
  "data-paint",
  "overlay",
  "accessibility",
  "evidence",
]

const DOMAIN_CONFIG_KEYS = new Set([
  "fitPadding",
  "flowStyle",
  "graticule",
  "lineDataAccessor",
  "lineType",
  "projection",
  "projectionExtent",
  "projectionTransform",
  "xAccessor",
  "yAccessor",
])

const STYLE_CONFIG_KEYS = new Set([
  "areaStyle",
  "colorScheme",
  "layoutSelection",
  "lineStyle",
  "pointStyle",
  "themeCategorical",
  "themeDiverging",
  "themeSemantic",
  "themeSequential",
])

type DataChangeKind = Extract<
  ChangeSet["kind"],
  "ingest" | "replace" | "remove" | "update" | "clear"
>

/** Result bookkeeping and conservative invalidation policy for Geo. */
export class GeoPipelineUpdateResults {
  private tracker = new UpdateResultTracker()

  get last(): UpdateResult {
    return this.tracker.last
  }

  subscribe(listener: () => void): () => void {
    return this.tracker.subscribe(listener)
  }

  recordData(kind: DataChangeKind, count?: number): UpdateResult {
    return this.tracker.record(
      { kind, ...(count === undefined ? {} : { count }) },
      DATA_INVALIDATIONS,
    )
  }

  recordNoop(kind: DataChangeKind | "restyle"): UpdateResult {
    return this.tracker.record(
      { kind, ...(kind === "restyle" ? {} : { count: 0 }) },
      [],
    )
  }

  recordRestyle(hasCustomRestyle: boolean): UpdateResult {
    return hasCustomRestyle
      ? this.tracker.record({ kind: "restyle" }, RESTYLE_INVALIDATIONS)
      : this.recordNoop("restyle")
  }

  recordConfig(keys: readonly string[]): UpdateResult {
    if (keys.length === 0) {
      return this.tracker.record({ kind: "config", keys }, [])
    }

    const invalidations = new Set<Invalidation>(CONFIG_INVALIDATIONS)
    if (keys.some((key) => DOMAIN_CONFIG_KEYS.has(key))) {
      invalidations.add("domain")
    }
    if (keys.some((key) => STYLE_CONFIG_KEYS.has(key))) {
      invalidations.add("scene-style")
    }
    return this.tracker.record({ kind: "config", keys }, invalidations)
  }
}
