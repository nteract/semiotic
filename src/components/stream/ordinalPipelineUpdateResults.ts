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

/** Whether a config patch re-derives retained ordinal data resources. */
export type OrdinalRetainedDataEffect = "preserve" | "rebuild"

export interface OrdinalConfigPatchDependency {
  readonly retainedData: OrdinalRetainedDataEffect
  readonly invalidations: readonly Invalidation[]
}

const dependency = (
  retainedData: OrdinalRetainedDataEffect,
  invalidations: readonly Invalidation[]
): OrdinalConfigPatchDependency => ({ retainedData, invalidations })

const RETAINED_DOMAIN_REBUILD: readonly Invalidation[] = [
  "domain",
  "layout",
  "scene-geometry",
  "data-paint",
  "overlay",
  "accessibility",
  "evidence"
]

const DOMAIN_LAYOUT: readonly Invalidation[] = [
  "domain",
  "layout",
  "scene-geometry",
  "data-paint",
  "overlay",
  "accessibility",
  "evidence"
]

const LAYOUT: readonly Invalidation[] = [
  "layout",
  "scene-geometry",
  "data-paint",
  "overlay",
  "accessibility",
  "evidence"
]

const GEOMETRY: readonly Invalidation[] = [
  "scene-geometry",
  "data-paint",
  "accessibility",
  "evidence"
]

const STYLE: readonly Invalidation[] = [
  "scene-style",
  "data-paint",
  "accessibility",
  "evidence"
]

const NOOP: readonly Invalidation[] = []

/**
 * Ordinal's key-level patch policy. Category/value/order accessors re-derive
 * retained categorical state. Layout, style, and future-only controls expose
 * distinct revision effects instead of the previous blanket scene rebuild.
 */
export const ORDINAL_CONFIG_PATCH_DEPENDENCIES: Readonly<
  Record<string, OrdinalConfigPatchDependency>
> = {
  chartType: /* @__PURE__ */ dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  runtimeMode: /* @__PURE__ */ dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  categoryAccessor: /* @__PURE__ */ dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  valueAccessor: /* @__PURE__ */ dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  oAccessor: /* @__PURE__ */ dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  rAccessor: /* @__PURE__ */ dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  stackBy: /* @__PURE__ */ dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  groupBy: /* @__PURE__ */ dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  timeAccessor: /* @__PURE__ */ dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  accessorRevision: /* @__PURE__ */ dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  colorAccessor: /* @__PURE__ */ dependency("rebuild", STYLE),
  symbolAccessor: /* @__PURE__ */ dependency("rebuild", GEOMETRY),
  connectorAccessor: /* @__PURE__ */ dependency("rebuild", GEOMETRY),
  dataIdAccessor: /* @__PURE__ */ dependency("rebuild", GEOMETRY),

  projection: /* @__PURE__ */ dependency("preserve", DOMAIN_LAYOUT),
  extentPadding: /* @__PURE__ */ dependency("preserve", DOMAIN_LAYOUT),
  axisExtent: /* @__PURE__ */ dependency("preserve", DOMAIN_LAYOUT),
  rExtent: /* @__PURE__ */ dependency("preserve", DOMAIN_LAYOUT),
  oExtent: /* @__PURE__ */ dependency("preserve", DOMAIN_LAYOUT),
  multiAxis: /* @__PURE__ */ dependency("preserve", DOMAIN_LAYOUT),
  normalize: /* @__PURE__ */ dependency("preserve", DOMAIN_LAYOUT),
  bins: /* @__PURE__ */ dependency("preserve", DOMAIN_LAYOUT),

  oSort: /* @__PURE__ */ dependency("preserve", LAYOUT),
  barPadding: /* @__PURE__ */ dependency("preserve", LAYOUT),
  roundedTop: /* @__PURE__ */ dependency("preserve", LAYOUT),
  baselinePadding: /* @__PURE__ */ dependency("preserve", LAYOUT),
  innerRadius: /* @__PURE__ */ dependency("preserve", LAYOUT),
  cornerRadius: /* @__PURE__ */ dependency("preserve", LAYOUT),
  startAngle: /* @__PURE__ */ dependency("preserve", LAYOUT),
  sweepAngle: /* @__PURE__ */ dependency("preserve", LAYOUT),
  trackFill: /* @__PURE__ */ dependency("preserve", LAYOUT),
  showOutliers: /* @__PURE__ */ dependency("preserve", LAYOUT),
  showIQR: /* @__PURE__ */ dependency("preserve", LAYOUT),
  amplitude: /* @__PURE__ */ dependency("preserve", LAYOUT),
  connectorOpacity: /* @__PURE__ */ dependency("preserve", LAYOUT),
  showLabels: /* @__PURE__ */ dependency("preserve", LAYOUT),
  dynamicColumnWidth: /* @__PURE__ */ dependency("rebuild", LAYOUT),
  customLayout: /* @__PURE__ */ dependency("preserve", LAYOUT),
  layoutConfig: /* @__PURE__ */ dependency("preserve", LAYOUT),
  layoutMargin: /* @__PURE__ */ dependency("preserve", LAYOUT),
  symbolMap: /* @__PURE__ */ dependency("preserve", GEOMETRY),

  pieceStyle: /* @__PURE__ */ dependency("preserve", STYLE),
  summaryStyle: /* @__PURE__ */ dependency("preserve", STYLE),
  connectorStyle: /* @__PURE__ */ dependency("preserve", STYLE),
  gradientFill: /* @__PURE__ */ dependency("preserve", STYLE),
  colorScheme: /* @__PURE__ */ dependency("preserve", STYLE),
  themeCategorical: /* @__PURE__ */ dependency("preserve", STYLE),
  themeSemantic: /* @__PURE__ */ dependency("preserve", STYLE),
  themeSequential: /* @__PURE__ */ dependency("preserve", STYLE),
  themeDiverging: /* @__PURE__ */ dependency("preserve", STYLE),
  barColors: /* @__PURE__ */ dependency("preserve", STYLE),
  decay: /* @__PURE__ */ dependency("preserve", STYLE),
  pulse: /* @__PURE__ */ dependency("preserve", STYLE),
  staleness: /* @__PURE__ */ dependency("preserve", STYLE),
  layoutSelection: /* @__PURE__ */ dependency("preserve", STYLE),

  windowSize: /* @__PURE__ */ dependency("preserve", NOOP),
  windowMode: /* @__PURE__ */ dependency("preserve", NOOP),
  clock: /* @__PURE__ */ dependency("preserve", NOOP),
  transition: /* @__PURE__ */ dependency("preserve", NOOP),
  introAnimation: /* @__PURE__ */ dependency("preserve", NOOP),
  onLayoutError: /* @__PURE__ */ dependency("preserve", NOOP)
}

const DEFAULT_CONFIG_PATCH_DEPENDENCY = /* @__PURE__ */ dependency("preserve", LAYOUT)

export interface OrdinalConfigPatchClassification {
  readonly retainedData: OrdinalRetainedDataEffect
  readonly invalidations: ReadonlySet<Invalidation>
}

/** Union the declared effects for a patch after its effective keys are known. */
export function classifyOrdinalConfigPatch(
  keys: readonly string[]
): OrdinalConfigPatchClassification {
  let retainedData: OrdinalRetainedDataEffect = "preserve"
  const invalidations = new Set<Invalidation>()

  for (const key of keys) {
    const effect = ORDINAL_CONFIG_PATCH_DEPENDENCIES[key]
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

/** Result bookkeeping and invalidation policy for the Ordinal store pilot. */
export class OrdinalPipelineUpdateResults {
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
      DATA_INVALIDATIONS
    )
  }

  recordNoop(kind: DataChangeKind | "restyle"): UpdateResult {
    return this.tracker.record(
      { kind, ...(kind === "restyle" ? {} : { count: 0 }) },
      []
    )
  }

  recordRestyle(hasCustomRestyle: boolean): UpdateResult {
    return hasCustomRestyle
      ? this.tracker.record({ kind: "restyle" }, RESTYLE_INVALIDATIONS)
      : this.recordNoop("restyle")
  }

  recordConfig(keys: readonly string[]): UpdateResult {
    const classification = classifyOrdinalConfigPatch(keys)
    return this.tracker.record({ kind: "config", keys }, classification.invalidations)
  }
}
