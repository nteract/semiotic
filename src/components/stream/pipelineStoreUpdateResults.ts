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

/** Whether a config patch re-derives retained XY data resources. */
export type XYRetainedDataEffect = "preserve" | "rebuild"

export interface XYConfigPatchDependency {
  readonly retainedData: XYRetainedDataEffect
  readonly invalidations: readonly Invalidation[]
}

const dependency = (
  retainedData: XYRetainedDataEffect,
  invalidations: readonly Invalidation[]
): XYConfigPatchDependency => ({ retainedData, invalidations })

const RETAINED_DOMAIN_REBUILD: readonly Invalidation[] = [
  "domain",
  "layout",
  "scene-geometry",
  "data-paint",
  "overlay",
  "accessibility",
  "evidence"
]

const RETAINED_SCENE_REBUILD: readonly Invalidation[] = [
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

const OVERLAY: readonly Invalidation[] = [
  "overlay",
  "accessibility",
  "evidence"
]

const NOOP: readonly Invalidation[] = []

/**
 * XY's explicit config-patch dependency table. Accessor and chart-mode
 * changes re-derive retained data; scale/layout keys preserve data while
 * rebuilding derived scene state; styling and overlays repaint their own
 * layers. Mount-only and future-work keys intentionally have no immediate
 * revision effect.
 */
export const XY_CONFIG_PATCH_DEPENDENCIES: Readonly<
  Record<string, XYConfigPatchDependency>
> = {
  chartType: dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  runtimeMode: dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  xAccessor: dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  yAccessor: dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  timeAccessor: dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  valueAccessor: dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  y0Accessor: dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  boundsAccessor: dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  band: dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  openAccessor: dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  highAccessor: dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  lowAccessor: dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  closeAccessor: dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  candlestickRangeMode: dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  accessorRevision: dependency("rebuild", RETAINED_DOMAIN_REBUILD),

  groupAccessor: dependency("rebuild", RETAINED_SCENE_REBUILD),
  categoryAccessor: dependency("rebuild", RETAINED_SCENE_REBUILD),
  lineDataAccessor: dependency("rebuild", RETAINED_SCENE_REBUILD),
  colorAccessor: dependency("rebuild", STYLE),
  sizeAccessor: dependency("rebuild", GEOMETRY),
  symbolAccessor: dependency("rebuild", GEOMETRY),
  pointIdAccessor: dependency("rebuild", GEOMETRY),

  xScaleType: dependency("preserve", DOMAIN_LAYOUT),
  yScaleType: dependency("preserve", DOMAIN_LAYOUT),
  xExtent: dependency("preserve", DOMAIN_LAYOUT),
  yExtent: dependency("preserve", DOMAIN_LAYOUT),
  extentPadding: dependency("preserve", DOMAIN_LAYOUT),
  scalePadding: dependency("preserve", DOMAIN_LAYOUT),
  axisExtent: dependency("preserve", DOMAIN_LAYOUT),
  binSize: dependency("preserve", DOMAIN_LAYOUT),
  normalize: dependency("preserve", DOMAIN_LAYOUT),
  heatmapAggregation: dependency("preserve", DOMAIN_LAYOUT),
  heatmapXBins: dependency("preserve", DOMAIN_LAYOUT),
  heatmapYBins: dependency("preserve", DOMAIN_LAYOUT),

  arrowOfTime: dependency("preserve", LAYOUT),
  baseline: dependency("preserve", LAYOUT),
  stackOrder: dependency("preserve", LAYOUT),
  sizeRange: dependency("preserve", LAYOUT),
  curve: dependency("preserve", LAYOUT),
  areaGroups: dependency("preserve", LAYOUT),
  customLayout: dependency("preserve", LAYOUT),
  layoutConfig: dependency("preserve", LAYOUT),
  layoutMargin: dependency("preserve", LAYOUT),
  symbolMap: dependency("preserve", GEOMETRY),
  showValues: dependency("preserve", GEOMETRY),
  heatmapValueFormat: dependency("preserve", GEOMETRY),

  lineStyle: dependency("preserve", STYLE),
  pointStyle: dependency("preserve", STYLE),
  areaStyle: dependency("preserve", STYLE),
  barStyle: dependency("preserve", STYLE),
  swarmStyle: dependency("preserve", STYLE),
  waterfallStyle: dependency("preserve", STYLE),
  candlestickStyle: dependency("preserve", STYLE),
  boundsStyle: dependency("preserve", STYLE),
  gradientFill: dependency("preserve", STYLE),
  lineGradient: dependency("preserve", STYLE),
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

  annotations: dependency("preserve", OVERLAY),

  windowSize: dependency("preserve", NOOP),
  windowMode: dependency("preserve", NOOP),
  maxCapacity: dependency("preserve", NOOP),
  clock: dependency("preserve", NOOP),
  transition: dependency("preserve", NOOP),
  introAnimation: dependency("preserve", NOOP),
  onLayoutError: dependency("preserve", NOOP)
}

const DEFAULT_CONFIG_PATCH_DEPENDENCY = dependency("preserve", LAYOUT)

export interface XYConfigPatchClassification {
  readonly retainedData: XYRetainedDataEffect
  readonly invalidations: ReadonlySet<Invalidation>
}

/** Union the declared effects for a patch after its effective keys are known. */
export function classifyXYConfigPatch(
  keys: readonly string[]
): XYConfigPatchClassification {
  let retainedData: XYRetainedDataEffect = "preserve"
  const invalidations = new Set<Invalidation>()

  for (const key of keys) {
    const effect = XY_CONFIG_PATCH_DEPENDENCIES[key]
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

/** Result bookkeeping and invalidation policy for the XY PipelineStore pilot. */
export class PipelineStoreUpdateResults {
  private tracker = new UpdateResultTracker()

  get last(): UpdateResult {
    return this.tracker.last
  }

  subscribe(listener: () => void): () => void {
    return this.tracker.subscribe(listener)
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

  recordConfig(keys: readonly string[]): UpdateResult {
    const classification = classifyXYConfigPatch(keys)
    return this.tracker.record(
      { kind: "config", keys },
      classification.invalidations
    )
  }
}
