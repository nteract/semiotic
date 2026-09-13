import { prepareDependencyForest } from "semiotic/atlas/core"
import { prepareNetworkAtlas } from "semiotic/atlas/core"
import { supplierStory } from "../scripts/network-atlas/stories/supplierStory"
import type { DependencyForestChartProps as DependencyForestLayoutConfig } from "semiotic/atlas"

export interface DependencyXRayEvidence {
  nodeCount: number
  edges: { id: string; source: string; target: string }[]
  labels: string[]
  brackets: number
}

// Public prepared reader props on both renderers, including multigraphs.
export function makeDependencyXRayParityCases() {
  const original = supplierStory().projection
  const bypass = supplierStory(true).projection
  const cycle = prepareNetworkAtlas(
    {
      ...original.atlas.spec,
      coordinate: {
        kind: "ordinal",
        sectionIds: ["Roots", "Processors", "Outputs"]
      },
      forest: {
        display: {
          kind: "rooted-backbone",
          roots: ["r", "q"],
          rankingPolicyId: "rooted-traversal:id-asc"
        },
        requiredPaths: {
          roots: ["r", "q"],
          relationScopeId: "directed-admitted"
        }
      },
      dataRevision: "dependency-parity-cycle-v1"
    },
    {
      graphRef: "dependency-parity-cycle",
      revision: "dependency-parity-cycle-v1",
      nodes: [
        { id: "r", sectionId: "Roots" },
        { id: "q", sectionId: "Roots" },
        { id: "a", sectionId: "Processors" },
        { id: "b", sectionId: "Processors" },
        { id: "output", sectionId: "Outputs" },
        { id: "unknown", sectionId: "Outputs", completeness: "unknown" }
      ],
      edges: [
        { id: "ra", source: "r", target: "a" },
        { id: "ra2", source: "r", target: "a" },
        { id: "qb", source: "q", target: "b" },
        { id: "ab", source: "a", target: "b" },
        { id: "ba", source: "b", target: "a" },
        { id: "aa", source: "a", target: "a" },
        { id: "bo", source: "b", target: "output" },
        { id: "return", source: "output", target: "r" }
      ],
      measureValues: []
    }
  )
  if (!cycle.ok) throw new Error(JSON.stringify(cycle.issues))
  const cyclic = prepareDependencyForest(cycle.atlas)
  const selected = (
    forest: typeof original,
    nodeId: string
  ): DependencyForestLayoutConfig => ({
    forest,
    reading: "required-paths",
    selection: {
      nodeId,
      analysisRevision: forest.atlas.analysisRevision,
      relationScopeId: "directed-admitted"
    }
  })
  const makeCase = (
    name: string,
    config: DependencyForestLayoutConfig,
    nodeCount: number,
    labels: string[],
    brackets: number,
    edges = config.forest.atlas.source.edges
  ) => ({
    id: `network-custom-dependency-xray-${name}`,
    component: "DependencyForestChart",
    props: {
      ...config,
      width: 720,
      height: 420,
      title: `Dependency X-Ray: ${name}`
    },
    dependencyEvidence: { nodeCount, edges, labels, brackets }
  })
  return [
    makeCase(
      "supplier",
      selected(original, "X"),
      6,
      [
        "Origin",
        "Upstream",
        "Suppliers",
        "Product",
        "X lies on all admitted paths to A, B"
      ],
      1
    ),
    makeCase(
      "zero-capacity-bypass",
      {
        ...selected(bypass, "X"),
        highlightedEdgeIds: ["wY", "YA"]
      },
      7,
      ["Y", "X lies on all admitted paths to B"],
      1
    ),
    makeCase(
      "collapsed",
      {
        ...selected(original, "X"),
        collapsedNodeIds: ["X"]
      },
      4,
      ["X +2", "2 internal links", "X lies on all admitted paths to A, B"],
      0,
      original.atlas.source.edges.filter(
        (edge) => !["XA", "XB"].includes(edge.id)
      )
    ),
    makeCase(
      "cyclic-multigraph",
      selected(cyclic, "b"),
      6,
      [
        "Unknown upstream",
        "b lies on all admitted paths to output · incomplete scope"
      ],
      1
    )
  ]
}
