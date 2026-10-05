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

/**
 * The retained topology is unchanged by most config updates. The distinction
 * is public here because callers must not mistake a config patch for a new
 * ingest: only accessor/chart-type patches need the retained raw graph
 * re-derived before the declared layout work runs.
 */
export type NetworkRetainedDataEffect = "preserve" | "rebuild"

export interface NetworkConfigPatchDependency {
  readonly retainedData: NetworkRetainedDataEffect
  readonly invalidations: readonly Invalidation[]
}

const dependency = (
  retainedData: NetworkRetainedDataEffect,
  invalidations: readonly Invalidation[],
): NetworkConfigPatchDependency => ({ retainedData, invalidations })

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
  "layout",
  "scene-geometry",
  "data-paint",
  "overlay",
  "accessibility",
  "evidence",
]

const GEOMETRY: readonly Invalidation[] = [
  "scene-geometry",
  "data-paint",
  "overlay",
  "accessibility",
  "evidence",
]

const STYLE: readonly Invalidation[] = [
  "scene-style",
  "data-paint",
  "accessibility",
  "evidence",
]

const LABELS: readonly Invalidation[] = [
  "scene-geometry",
  "data-paint",
  "overlay",
  "accessibility",
  "evidence",
]

const NOOP: readonly Invalidation[] = []

/**
 * Network's config dependency table. It is deliberately key-level rather
 * than a single conservative fallback so an integration can inspect whether
 * a patch rebuilds retained topology, relays out marks, repaints styles, or
 * only changes future work. Unknown future keys retain the safe layout
 * fallback below until they receive an explicit entry.
 */
export const NETWORK_CONFIG_PATCH_DEPENDENCIES: Readonly<
  Record<string, NetworkConfigPatchDependency>
> = {
  chartType: /* @__PURE__ */ dependency("rebuild", RETAINED_REBUILD),
  nodeIDAccessor: /* @__PURE__ */ dependency("rebuild", RETAINED_REBUILD),
  sourceAccessor: /* @__PURE__ */ dependency("rebuild", RETAINED_REBUILD),
  targetAccessor: /* @__PURE__ */ dependency("rebuild", RETAINED_REBUILD),
  valueAccessor: /* @__PURE__ */ dependency("rebuild", RETAINED_REBUILD),
  edgeIdAccessor: /* @__PURE__ */ dependency("rebuild", RETAINED_REBUILD),
  childrenAccessor: /* @__PURE__ */ dependency("rebuild", RETAINED_REBUILD),
  hierarchySum: /* @__PURE__ */ dependency("rebuild", RETAINED_REBUILD),

  orientation: /* @__PURE__ */ dependency("preserve", LAYOUT),
  nodeAlign: /* @__PURE__ */ dependency("preserve", LAYOUT),
  nodePaddingRatio: /* @__PURE__ */ dependency("preserve", LAYOUT),
  nodeWidth: /* @__PURE__ */ dependency("preserve", LAYOUT),
  edgeSort: /* @__PURE__ */ dependency("preserve", LAYOUT),
  iterations: /* @__PURE__ */ dependency("preserve", LAYOUT),
  forceStrength: /* @__PURE__ */ dependency("preserve", LAYOUT),
  padAngle: /* @__PURE__ */ dependency("preserve", LAYOUT),
  groupWidth: /* @__PURE__ */ dependency("preserve", LAYOUT),
  sortGroups: /* @__PURE__ */ dependency("preserve", LAYOUT),
  treeOrientation: /* @__PURE__ */ dependency("preserve", LAYOUT),
  edgeType: /* @__PURE__ */ dependency("preserve", LAYOUT),
  padding: /* @__PURE__ */ dependency("preserve", LAYOUT),
  paddingTop: /* @__PURE__ */ dependency("preserve", LAYOUT),
  orbitMode: /* @__PURE__ */ dependency("preserve", LAYOUT),
  orbitSize: /* @__PURE__ */ dependency("preserve", LAYOUT),
  orbitSpeed: /* @__PURE__ */ dependency("preserve", LAYOUT),
  orbitRevolution: /* @__PURE__ */ dependency("preserve", LAYOUT),
  orbitRevolutionStyle: /* @__PURE__ */ dependency("preserve", LAYOUT),
  orbitEccentricity: /* @__PURE__ */ dependency("preserve", LAYOUT),
  orbitShowRings: /* @__PURE__ */ dependency("preserve", LAYOUT),
  orbitAnimated: /* @__PURE__ */ dependency("preserve", LAYOUT),
  customNetworkLayout: /* @__PURE__ */ dependency("preserve", LAYOUT),
  layoutConfig: /* @__PURE__ */ dependency("preserve", LAYOUT),
  // Projection runs after layout: rebuild the scene, keep positions.
  perspective: /* @__PURE__ */ dependency("preserve", GEOMETRY),

  nodeSize: /* @__PURE__ */ dependency("preserve", GEOMETRY),
  nodeSizeRange: /* @__PURE__ */ dependency("preserve", GEOMETRY),
  colorByDepth: /* @__PURE__ */ dependency("preserve", GEOMETRY),
  nodeLabel: /* @__PURE__ */ dependency("preserve", LABELS),
  showLabels: /* @__PURE__ */ dependency("preserve", LABELS),
  labelMode: /* @__PURE__ */ dependency("preserve", LABELS),

  nodeStyle: /* @__PURE__ */ dependency("preserve", STYLE),
  edgeStyle: /* @__PURE__ */ dependency("preserve", STYLE),
  colorBy: /* @__PURE__ */ dependency("preserve", STYLE),
  colorScheme: /* @__PURE__ */ dependency("preserve", STYLE),
  themeCategorical: /* @__PURE__ */ dependency("preserve", STYLE),
  themeSequential: /* @__PURE__ */ dependency("preserve", STYLE),
  themeSelectionOpacity: /* @__PURE__ */ dependency("preserve", STYLE),
  themeSemantic: /* @__PURE__ */ dependency("preserve", STYLE),
  edgeColorBy: /* @__PURE__ */ dependency("preserve", STYLE),
  edgeOpacity: /* @__PURE__ */ dependency("preserve", STYLE),
  showParticles: /* @__PURE__ */ dependency("preserve", STYLE),
  particleStyle: /* @__PURE__ */ dependency("preserve", STYLE),
  decay: /* @__PURE__ */ dependency("preserve", STYLE),
  pulse: /* @__PURE__ */ dependency("preserve", STYLE),
  thresholds: /* @__PURE__ */ dependency("preserve", STYLE),
  staleness: /* @__PURE__ */ dependency("preserve", STYLE),
  layoutSelection: /* @__PURE__ */ dependency("preserve", STYLE),

  clock: /* @__PURE__ */ dependency("preserve", NOOP),
  random: /* @__PURE__ */ dependency("preserve", NOOP),
  seed: /* @__PURE__ */ dependency("preserve", NOOP),
  tensionConfig: /* @__PURE__ */ dependency("preserve", NOOP),
  transition: /* @__PURE__ */ dependency("preserve", NOOP),
  introAnimation: /* @__PURE__ */ dependency("preserve", NOOP),
  onLayoutError: /* @__PURE__ */ dependency("preserve", NOOP),
  __skipForceSimulation: /* @__PURE__ */ dependency("preserve", NOOP),
  __hierarchyRoot: /* @__PURE__ */ dependency("preserve", NOOP),
  __orbitState: /* @__PURE__ */ dependency("preserve", NOOP),
  __previousPositions: /* @__PURE__ */ dependency("preserve", NOOP),
}

const DEFAULT_CONFIG_PATCH_DEPENDENCY = /* @__PURE__ */ dependency("preserve", LAYOUT)

export interface NetworkConfigPatchClassification {
  readonly retainedData: NetworkRetainedDataEffect
  readonly invalidations: ReadonlySet<Invalidation>
}

/** Union the declared effects for a patch after its effective keys are known. */
export function classifyNetworkConfigPatch(
  keys: readonly string[],
  chartType?: string,
): NetworkConfigPatchClassification {
  let retainedData: NetworkRetainedDataEffect = "preserve"
  const invalidations = new Set<Invalidation>()

  for (const key of keys) {
    const effect = chartType === "force" && (key === "nodeSize" || key === "nodeSizeRange")
      ? dependency("preserve", LAYOUT)
      : NETWORK_CONFIG_PATCH_DEPENDENCIES[key]
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

/** Result bookkeeping and explicit config-patch dependency policy for Network. */
export class NetworkPipelineUpdateResults {
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

  recordConfig(keys: readonly string[], chartType?: string): UpdateResult {
    const classification = classifyNetworkConfigPatch(keys, chartType)
    return this.tracker.record(
      { kind: "config", keys },
      classification.invalidations,
    )
  }
}
