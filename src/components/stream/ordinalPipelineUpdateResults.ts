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
  chartType: dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  runtimeMode: dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  categoryAccessor: dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  valueAccessor: dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  oAccessor: dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  rAccessor: dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  stackBy: dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  groupBy: dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  timeAccessor: dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  accessorRevision: dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  colorAccessor: dependency("rebuild", STYLE),
  symbolAccessor: dependency("rebuild", GEOMETRY),
  connectorAccessor: dependency("rebuild", GEOMETRY),
  dataIdAccessor: dependency("rebuild", GEOMETRY),

  projection: dependency("preserve", DOMAIN_LAYOUT),
  extentPadding: dependency("preserve", DOMAIN_LAYOUT),
  axisExtent: dependency("preserve", DOMAIN_LAYOUT),
  rExtent: dependency("preserve", DOMAIN_LAYOUT),
  oExtent: dependency("preserve", DOMAIN_LAYOUT),
  multiAxis: dependency("preserve", DOMAIN_LAYOUT),
  normalize: dependency("preserve", DOMAIN_LAYOUT),
  bins: dependency("preserve", DOMAIN_LAYOUT),

  oSort: dependency("preserve", LAYOUT),
  barPadding: dependency("preserve", LAYOUT),
  roundedTop: dependency("preserve", LAYOUT),
  baselinePadding: dependency("preserve", LAYOUT),
  innerRadius: dependency("preserve", LAYOUT),
  cornerRadius: dependency("preserve", LAYOUT),
  startAngle: dependency("preserve", LAYOUT),
  sweepAngle: dependency("preserve", LAYOUT),
  trackFill: dependency("preserve", LAYOUT),
  showOutliers: dependency("preserve", LAYOUT),
  showIQR: dependency("preserve", LAYOUT),
  amplitude: dependency("preserve", LAYOUT),
  connectorOpacity: dependency("preserve", LAYOUT),
  showLabels: dependency("preserve", LAYOUT),
  dynamicColumnWidth: dependency("rebuild", LAYOUT),
  customLayout: dependency("preserve", LAYOUT),
  layoutConfig: dependency("preserve", LAYOUT),
  layoutMargin: dependency("preserve", LAYOUT),
  symbolMap: dependency("preserve", GEOMETRY),

  pieceStyle: dependency("preserve", STYLE),
  summaryStyle: dependency("preserve", STYLE),
  connectorStyle: dependency("preserve", STYLE),
  gradientFill: dependency("preserve", STYLE),
  colorScheme: dependency("preserve", STYLE),
  themeCategorical: dependency("preserve", STYLE),
  themeSemantic: dependency("preserve", STYLE),
  themeSequential: dependency("preserve", STYLE),
  themeDiverging: dependency("preserve", STYLE),
  barColors: dependency("preserve", STYLE),
  decay: dependency("preserve", STYLE),
  pulse: dependency("preserve", STYLE),
  staleness: dependency("preserve", STYLE),
  layoutSelection: dependency("preserve", STYLE),

  windowSize: dependency("preserve", NOOP),
  windowMode: dependency("preserve", NOOP),
  clock: dependency("preserve", NOOP),
  transition: dependency("preserve", NOOP),
  introAnimation: dependency("preserve", NOOP),
  onLayoutError: dependency("preserve", NOOP)
}

const DEFAULT_CONFIG_PATCH_DEPENDENCY = dependency("preserve", LAYOUT)

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
