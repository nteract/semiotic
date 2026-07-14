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
  chartType: dependency("rebuild", RETAINED_REBUILD),
  nodeIDAccessor: dependency("rebuild", RETAINED_REBUILD),
  sourceAccessor: dependency("rebuild", RETAINED_REBUILD),
  targetAccessor: dependency("rebuild", RETAINED_REBUILD),
  valueAccessor: dependency("rebuild", RETAINED_REBUILD),
  edgeIdAccessor: dependency("rebuild", RETAINED_REBUILD),
  childrenAccessor: dependency("rebuild", RETAINED_REBUILD),
  hierarchySum: dependency("rebuild", RETAINED_REBUILD),

  orientation: dependency("preserve", LAYOUT),
  nodeAlign: dependency("preserve", LAYOUT),
  nodePaddingRatio: dependency("preserve", LAYOUT),
  nodeWidth: dependency("preserve", LAYOUT),
  edgeSort: dependency("preserve", LAYOUT),
  iterations: dependency("preserve", LAYOUT),
  forceStrength: dependency("preserve", LAYOUT),
  padAngle: dependency("preserve", LAYOUT),
  groupWidth: dependency("preserve", LAYOUT),
  sortGroups: dependency("preserve", LAYOUT),
  treeOrientation: dependency("preserve", LAYOUT),
  edgeType: dependency("preserve", LAYOUT),
  padding: dependency("preserve", LAYOUT),
  paddingTop: dependency("preserve", LAYOUT),
  orbitMode: dependency("preserve", LAYOUT),
  orbitSize: dependency("preserve", LAYOUT),
  orbitSpeed: dependency("preserve", LAYOUT),
  orbitRevolution: dependency("preserve", LAYOUT),
  orbitRevolutionStyle: dependency("preserve", LAYOUT),
  orbitEccentricity: dependency("preserve", LAYOUT),
  orbitShowRings: dependency("preserve", LAYOUT),
  orbitAnimated: dependency("preserve", LAYOUT),
  customNetworkLayout: dependency("preserve", LAYOUT),
  layoutConfig: dependency("preserve", LAYOUT),

  nodeSize: dependency("preserve", GEOMETRY),
  nodeSizeRange: dependency("preserve", GEOMETRY),
  colorByDepth: dependency("preserve", GEOMETRY),
  nodeLabel: dependency("preserve", LABELS),
  showLabels: dependency("preserve", LABELS),
  labelMode: dependency("preserve", LABELS),

  nodeStyle: dependency("preserve", STYLE),
  edgeStyle: dependency("preserve", STYLE),
  colorBy: dependency("preserve", STYLE),
  colorScheme: dependency("preserve", STYLE),
  themeCategorical: dependency("preserve", STYLE),
  themeSemantic: dependency("preserve", STYLE),
  edgeColorBy: dependency("preserve", STYLE),
  edgeOpacity: dependency("preserve", STYLE),
  showParticles: dependency("preserve", STYLE),
  particleStyle: dependency("preserve", STYLE),
  decay: dependency("preserve", STYLE),
  pulse: dependency("preserve", STYLE),
  thresholds: dependency("preserve", STYLE),
  staleness: dependency("preserve", STYLE),
  layoutSelection: dependency("preserve", STYLE),

  clock: dependency("preserve", NOOP),
  random: dependency("preserve", NOOP),
  seed: dependency("preserve", NOOP),
  tensionConfig: dependency("preserve", NOOP),
  transition: dependency("preserve", NOOP),
  introAnimation: dependency("preserve", NOOP),
  onLayoutError: dependency("preserve", NOOP),
  __skipForceSimulation: dependency("preserve", NOOP),
  __hierarchyRoot: dependency("preserve", NOOP),
  __orbitState: dependency("preserve", NOOP),
  __previousPositions: dependency("preserve", NOOP),
}

const DEFAULT_CONFIG_PATCH_DEPENDENCY = dependency("preserve", LAYOUT)

export interface NetworkConfigPatchClassification {
  readonly retainedData: NetworkRetainedDataEffect
  readonly invalidations: ReadonlySet<Invalidation>
}

/** Union the declared effects for a patch after its effective keys are known. */
export function classifyNetworkConfigPatch(
  keys: readonly string[],
): NetworkConfigPatchClassification {
  let retainedData: NetworkRetainedDataEffect = "preserve"
  const invalidations = new Set<Invalidation>()

  for (const key of keys) {
    const effect = NETWORK_CONFIG_PATCH_DEPENDENCIES[key]
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

  recordConfig(keys: readonly string[]): UpdateResult {
    const classification = classifyNetworkConfigPatch(keys)
    return this.tracker.record(
      { kind: "config", keys },
      classification.invalidations,
    )
  }
}
