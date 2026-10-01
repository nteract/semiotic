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
  xAccessor: /* @__PURE__ */ dependency("rebuild", RETAINED_REBUILD),
  yAccessor: /* @__PURE__ */ dependency("rebuild", RETAINED_REBUILD),
  lineDataAccessor: /* @__PURE__ */ dependency("rebuild", RETAINED_REBUILD),
  pointIdAccessor: /* @__PURE__ */ dependency("rebuild", IDENTIFIER_REBUILD),
  lineIdAccessor: /* @__PURE__ */ dependency("rebuild", IDENTIFIER_REBUILD),
  windowSize: /* @__PURE__ */ dependency("rebuild", RETAINED_REBUILD),

  projection: /* @__PURE__ */ dependency("preserve", LAYOUT),
  projectionExtent: /* @__PURE__ */ dependency("preserve", LAYOUT),
  fitPadding: /* @__PURE__ */ dependency("preserve", LAYOUT),
  lineType: /* @__PURE__ */ dependency("preserve", LAYOUT),
  flowStyle: /* @__PURE__ */ dependency("preserve", LAYOUT),
  graticule: /* @__PURE__ */ dependency("preserve", LAYOUT),
  projectionTransform: /* @__PURE__ */ dependency("preserve", LAYOUT),
  customLayout: /* @__PURE__ */ dependency("preserve", LAYOUT),
  layoutConfig: /* @__PURE__ */ dependency("preserve", LAYOUT),
  layoutMargin: /* @__PURE__ */ dependency("preserve", LAYOUT),

  areaStyle: /* @__PURE__ */ dependency("preserve", STYLE),
  pointStyle: /* @__PURE__ */ dependency("preserve", POINT_STYLE),
  lineStyle: /* @__PURE__ */ dependency("preserve", STYLE),
  colorScheme: /* @__PURE__ */ dependency("preserve", STYLE),
  themeCategorical: /* @__PURE__ */ dependency("preserve", STYLE),
  themeDiverging: /* @__PURE__ */ dependency("preserve", STYLE),
  themeSemantic: /* @__PURE__ */ dependency("preserve", STYLE),
  themeSequential: /* @__PURE__ */ dependency("preserve", STYLE),
  decay: /* @__PURE__ */ dependency("preserve", STYLE),
  pulse: /* @__PURE__ */ dependency("preserve", STYLE),
  layoutSelection: /* @__PURE__ */ dependency("preserve", STYLE),

  annotations: /* @__PURE__ */ dependency("preserve", OVERLAY),
  autoPlaceAnnotations: /* @__PURE__ */ dependency("preserve", OVERLAY),

  clock: /* @__PURE__ */ dependency("preserve", NOOP),
  transition: /* @__PURE__ */ dependency("preserve", NOOP),
  introAnimation: /* @__PURE__ */ dependency("preserve", NOOP),
  onLayoutError: /* @__PURE__ */ dependency("preserve", NOOP),
}

const DEFAULT_CONFIG_PATCH_DEPENDENCY = /* @__PURE__ */ dependency("preserve", LAYOUT)

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
