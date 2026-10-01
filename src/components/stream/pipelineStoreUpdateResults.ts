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
  chartType: /* @__PURE__ */ dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  runtimeMode: /* @__PURE__ */ dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  xAccessor: /* @__PURE__ */ dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  yAccessor: /* @__PURE__ */ dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  timeAccessor: /* @__PURE__ */ dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  valueAccessor: /* @__PURE__ */ dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  y0Accessor: /* @__PURE__ */ dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  boundsAccessor: /* @__PURE__ */ dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  band: /* @__PURE__ */ dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  openAccessor: /* @__PURE__ */ dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  highAccessor: /* @__PURE__ */ dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  lowAccessor: /* @__PURE__ */ dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  closeAccessor: /* @__PURE__ */ dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  candlestickRangeMode: /* @__PURE__ */ dependency("rebuild", RETAINED_DOMAIN_REBUILD),
  accessorRevision: /* @__PURE__ */ dependency("rebuild", RETAINED_DOMAIN_REBUILD),

  groupAccessor: /* @__PURE__ */ dependency("rebuild", RETAINED_SCENE_REBUILD),
  categoryAccessor: /* @__PURE__ */ dependency("rebuild", RETAINED_SCENE_REBUILD),
  lineDataAccessor: /* @__PURE__ */ dependency("rebuild", RETAINED_SCENE_REBUILD),
  colorAccessor: /* @__PURE__ */ dependency("rebuild", STYLE),
  sizeAccessor: /* @__PURE__ */ dependency("rebuild", GEOMETRY),
  symbolAccessor: /* @__PURE__ */ dependency("rebuild", GEOMETRY),
  pointIdAccessor: /* @__PURE__ */ dependency("rebuild", GEOMETRY),

  xScaleType: /* @__PURE__ */ dependency("preserve", DOMAIN_LAYOUT),
  yScaleType: /* @__PURE__ */ dependency("preserve", DOMAIN_LAYOUT),
  xExtent: /* @__PURE__ */ dependency("preserve", DOMAIN_LAYOUT),
  invertY: /* @__PURE__ */ dependency("preserve", DOMAIN_LAYOUT),
  yExtent: /* @__PURE__ */ dependency("preserve", DOMAIN_LAYOUT),
  extentPadding: /* @__PURE__ */ dependency("preserve", DOMAIN_LAYOUT),
  scalePadding: /* @__PURE__ */ dependency("preserve", DOMAIN_LAYOUT),
  axisExtent: /* @__PURE__ */ dependency("preserve", DOMAIN_LAYOUT),
  yAxisExtent: /* @__PURE__ */ dependency("preserve", DOMAIN_LAYOUT),
  binSize: /* @__PURE__ */ dependency("preserve", DOMAIN_LAYOUT),
  normalize: /* @__PURE__ */ dependency("preserve", DOMAIN_LAYOUT),
  heatmapAggregation: /* @__PURE__ */ dependency("preserve", DOMAIN_LAYOUT),
  heatmapXBins: /* @__PURE__ */ dependency("preserve", DOMAIN_LAYOUT),
  heatmapYBins: /* @__PURE__ */ dependency("preserve", DOMAIN_LAYOUT),

  arrowOfTime: /* @__PURE__ */ dependency("preserve", LAYOUT),
  baseline: /* @__PURE__ */ dependency("preserve", LAYOUT),
  stackOrder: /* @__PURE__ */ dependency("preserve", LAYOUT),
  sizeRange: /* @__PURE__ */ dependency("preserve", LAYOUT),
  curve: /* @__PURE__ */ dependency("preserve", LAYOUT),
  areaGroups: /* @__PURE__ */ dependency("preserve", LAYOUT),
  customLayout: /* @__PURE__ */ dependency("preserve", LAYOUT),
  layoutConfig: /* @__PURE__ */ dependency("preserve", LAYOUT),
  layoutMargin: /* @__PURE__ */ dependency("preserve", LAYOUT),
  symbolMap: /* @__PURE__ */ dependency("preserve", GEOMETRY),
  showValues: /* @__PURE__ */ dependency("preserve", GEOMETRY),
  heatmapValueFormat: /* @__PURE__ */ dependency("preserve", GEOMETRY),

  trackHoverRows: /* @__PURE__ */ dependency("preserve", GEOMETRY),
  lineStyle: /* @__PURE__ */ dependency("preserve", STYLE),
  pointStyle: /* @__PURE__ */ dependency("preserve", STYLE),
  areaStyle: /* @__PURE__ */ dependency("preserve", STYLE),
  barStyle: /* @__PURE__ */ dependency("preserve", STYLE),
  swarmStyle: /* @__PURE__ */ dependency("preserve", STYLE),
  waterfallStyle: /* @__PURE__ */ dependency("preserve", STYLE),
  candlestickStyle: /* @__PURE__ */ dependency("preserve", STYLE),
  boundsStyle: /* @__PURE__ */ dependency("preserve", STYLE),
  gradientFill: /* @__PURE__ */ dependency("preserve", STYLE),
  lineGradient: /* @__PURE__ */ dependency("preserve", STYLE),
  semanticLineStops: /* @__PURE__ */ dependency("preserve", STYLE),
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

  annotations: /* @__PURE__ */ dependency("preserve", OVERLAY),

  windowSize: /* @__PURE__ */ dependency("preserve", NOOP),
  windowMode: /* @__PURE__ */ dependency("preserve", NOOP),
  maxCapacity: /* @__PURE__ */ dependency("preserve", NOOP),
  clock: /* @__PURE__ */ dependency("preserve", NOOP),
  transition: /* @__PURE__ */ dependency("preserve", NOOP),
  introAnimation: /* @__PURE__ */ dependency("preserve", NOOP),
  onLayoutError: /* @__PURE__ */ dependency("preserve", NOOP)
}

const DEFAULT_CONFIG_PATCH_DEPENDENCY = /* @__PURE__ */ dependency("preserve", LAYOUT)

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

  recordConfig(keys: readonly string[], rebuildGeometry = false): UpdateResult {
    const classification = classifyXYConfigPatch(keys)
    return this.tracker.record(
      { kind: "config", keys },
      rebuildGeometry ? new Set([...classification.invalidations, ...GEOMETRY]) : classification.invalidations
    )
  }
}
