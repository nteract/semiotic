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

/** Whether a config patch must re-derive its retained Geo data resources. */
export type GeoRetainedDataEffect = "preserve" | "rebuild"

export interface GeoConfigPatchDependency {
  readonly retainedData: GeoRetainedDataEffect
  readonly invalidations: readonly Invalidation[]
}

const dependency = (
  retainedData: GeoRetainedDataEffect,
  invalidations: readonly Invalidation[],
): GeoConfigPatchDependency => ({ retainedData, invalidations })

const RETAINED_REBUILD: readonly Invalidation[] = [
  "domain",
  "layout",
  "scene-geometry",
  "data-paint",
  "overlay",
  "accessibility",
  "evidence",
]

const LAYOUT: readonly Invalidation[] = [
  "domain",
  "layout",
  "scene-geometry",
  "data-paint",
  "overlay",
  "accessibility",
  "evidence",
]

const IDENTIFIER_REBUILD: readonly Invalidation[] = [
  "scene-geometry",
  "data-paint",
  "accessibility",
  "evidence",
]

const STYLE: readonly Invalidation[] = [
  "scene-style",
  "data-paint",
  "accessibility",
  "evidence",
]

const POINT_STYLE: readonly Invalidation[] = [
  "scene-geometry",
  "scene-style",
  "data-paint",
  "accessibility",
  "evidence",
]

const OVERLAY: readonly Invalidation[] = [
  "overlay",
  "accessibility",
  "evidence",
]

const NOOP: readonly Invalidation[] = []

/**
 * Geo's key-level config-patch dependency table. `windowSize` is a retained
 * resource rebuild: its `data` revision is added only when an active stream
 * actually resizes, so a bounded config-only patch is never reported as an
 * ingest.
 */
export const GEO_CONFIG_PATCH_DEPENDENCIES: Readonly<
  Record<string, GeoConfigPatchDependency>
> = {
  xAccessor: dependency("rebuild", RETAINED_REBUILD),
  yAccessor: dependency("rebuild", RETAINED_REBUILD),
  lineDataAccessor: dependency("rebuild", RETAINED_REBUILD),
  pointIdAccessor: dependency("rebuild", IDENTIFIER_REBUILD),
  lineIdAccessor: dependency("rebuild", IDENTIFIER_REBUILD),
  windowSize: dependency("rebuild", RETAINED_REBUILD),

  projection: dependency("preserve", LAYOUT),
  projectionExtent: dependency("preserve", LAYOUT),
  fitPadding: dependency("preserve", LAYOUT),
  lineType: dependency("preserve", LAYOUT),
  flowStyle: dependency("preserve", LAYOUT),
  graticule: dependency("preserve", LAYOUT),
  projectionTransform: dependency("preserve", LAYOUT),
  customLayout: dependency("preserve", LAYOUT),
  layoutConfig: dependency("preserve", LAYOUT),
  layoutMargin: dependency("preserve", LAYOUT),

  areaStyle: dependency("preserve", STYLE),
  pointStyle: dependency("preserve", POINT_STYLE),
  lineStyle: dependency("preserve", STYLE),
  colorScheme: dependency("preserve", STYLE),
  themeCategorical: dependency("preserve", STYLE),
  themeDiverging: dependency("preserve", STYLE),
  themeSemantic: dependency("preserve", STYLE),
  themeSequential: dependency("preserve", STYLE),
  decay: dependency("preserve", STYLE),
  pulse: dependency("preserve", STYLE),
  layoutSelection: dependency("preserve", STYLE),

  annotations: dependency("preserve", OVERLAY),
  autoPlaceAnnotations: dependency("preserve", OVERLAY),

  clock: dependency("preserve", NOOP),
  transition: dependency("preserve", NOOP),
  introAnimation: dependency("preserve", NOOP),
  onLayoutError: dependency("preserve", NOOP),
}

const DEFAULT_CONFIG_PATCH_DEPENDENCY = dependency("preserve", LAYOUT)

export interface GeoConfigPatchClassification {
  readonly retainedData: GeoRetainedDataEffect
  readonly invalidations: ReadonlySet<Invalidation>
}

/** Union the declared effects for a patch after its effective keys are known. */
export function classifyGeoConfigPatch(
  keys: readonly string[],
): GeoConfigPatchClassification {
  let retainedData: GeoRetainedDataEffect = "preserve"
  const invalidations = new Set<Invalidation>()

  for (const key of keys) {
    const effect = GEO_CONFIG_PATCH_DEPENDENCIES[key]
      ?? DEFAULT_CONFIG_PATCH_DEPENDENCY
    if (effect.retainedData === "rebuild") retainedData = "rebuild"
    for (const invalidation of effect.invalidations) {
      invalidations.add(invalidation)
    }
  }

  return { retainedData, invalidations }
}

type DataChangeKind = Extract<
  ChangeSet["kind"],
  "ingest" | "replace" | "remove" | "update" | "clear"
>

/** Result bookkeeping and explicit config-patch dependency policy for Geo. */
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

  recordConfig(
    keys: readonly string[],
    options: { retainedDataChanged?: boolean } = {},
  ): UpdateResult {
    const classification = classifyGeoConfigPatch(keys)
    const invalidations = new Set(classification.invalidations)
    if (options.retainedDataChanged) invalidations.add("data")
    return this.tracker.record({ kind: "config", keys }, invalidations)
  }
}
