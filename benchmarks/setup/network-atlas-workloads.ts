import type { NetworkAtlasSource, NetworkAtlasSpec } from "semiotic/atlas/core"

export type AtlasWorkloadSize = 1000 | 10000
export type AtlasWorkloadOptions = {
  size: AtlasWorkloadSize
  witnessLimit: number
  reverse?: boolean
}

/** Deterministic stress fixture: 100-node feedback regions, five outgoing edges
 * per node and 20 ordinal bands. Region roots are staggered across the bands.
 * This is a synthetic structure workload, not a process or capacity model.
 */
export function atlasWorkload({
  size,
  witnessLimit,
  reverse = false
}: AtlasWorkloadOptions) {
  const sections = Array.from({ length: 20 }, (_, i) => `Band ${i + 1}`)
  const groups = Array.from({ length: size / 100 }, (_, group) => ({
    id: `Region ${group + 1}`,
    nodeIds: Array.from({ length: 100 }, (_, i) => `r${group + 1}.${i + 1}`)
  }))
  const source: NetworkAtlasSource = {
    graphRef: "synthetic-atlas-acceptance-v1",
    revision: `synthetic-${size}-nodes-v1`,
    nodes: groups.flatMap((group, g) =>
      group.nodeIds.map((id, i) => ({
        id,
        sectionId: sections[(Math.floor(i / 5) + g) % 20]
      }))
    ),
    edges: groups.flatMap((group) =>
      group.nodeIds.flatMap((id, i) =>
        [1, 2, 7, 17, 31].map((offset) => ({
          id: `${id}+${offset}`,
          source: id,
          target: group.nodeIds[(i + offset) % 100]
        }))
      )
    ),
    measureValues: groups.flatMap((group) =>
      group.nodeIds.map((subjectId) => ({
        measureId: "inventory",
        subjectId,
        value: 1,
        status: "exact" as const
      }))
    )
  }
  const roots = groups.map((group) => group.nodeIds[0])
  const spec: NetworkAtlasSpec = {
    schemaVersion: "0.2",
    dataRevision: source.revision,
    coordinate: { kind: "ordinal", sectionIds: sections },
    relations: {
      directed: true,
      edgeIdRequired: true,
      parallelEdges: "keep-by-id",
      selfLoops: "keep-by-id"
    },
    evidencePolicyId: "synthetic-structure-only",
    measures: { inventory: { unitKind: "stock", countUnit: "work-item" } },
    motifs: {
      catalogId: "atlas-core",
      catalogVersion: "1",
      countUnit: "embedding",
      anchor: "completion",
      matchBudget: witnessLimit
    },
    forest: {
      display: {
        kind: "rooted-backbone",
        roots,
        rankingPolicyId: `rooted-traversal:id-${reverse ? "desc" : "asc"}`
      },
      requiredPaths: { roots, relationScopeId: "directed-admitted" }
    },
    temporal: { kind: "snapshot" }
  }
  return { spec, source, groups }
}

/** The drawing keeps three regions open; every other region is an existing
 * collapsed branch. No source vertex, original edge or ledger row is removed.
 */
export function overviewBranches(
  groups: ReturnType<typeof atlasWorkload>["groups"],
  active = 0
) {
  const open = new Set([
    active,
    (active + 1) % groups.length,
    (active + 2) % groups.length
  ])
  return groups
    .filter((_, index) => !open.has(index))
    .map((group) => group.nodeIds[0])
}
