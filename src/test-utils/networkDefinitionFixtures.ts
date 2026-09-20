import { readFileSync } from "node:fs"
import type { Datum } from "../components/charts/shared/datumTypes"
import { prepareNetworkAtlas } from "../components/recipes/atlas/prepare"
import { prepareDependencyForest } from "../components/recipes/atlas/dependencyForest"

const fixture = JSON.parse(
  readFileSync("scripts/network-atlas/fixtures/checkout-ab-v1.json", "utf8")
)
const prepared = prepareNetworkAtlas(fixture.spec, fixture.source)
if (!prepared.ok) throw new Error(JSON.stringify(prepared.issues))

const nodes = [{ id: "A" }, { id: "B" }, { id: "C" }]
const edges = [
  { source: "A", target: "B", value: 3 },
  { source: "B", target: "C", value: 2 }
]
const hierarchy = {
  name: "Root",
  children: [
    { name: "A", value: 3 },
    { name: "B", value: 5 }
  ]
}

/** Independent examples, with real prepared Atlas artifacts rather than fabricated indices. */
export const networkDefinitionFixtures = {
  MotifBraidChart: { atlas: prepared.atlas },
  DependencyForestChart: { forest: prepareDependencyForest(prepared.atlas) },
  ForceDirectedGraph: { nodes, edges, iterations: 12 },
  SankeyDiagram: { edges },
  ProcessSankey: {
    nodes,
    domain: [0, 10],
    edges: [
      { source: "A", target: "B", value: 3, startTime: 1, endTime: 4 },
      { source: "B", target: "C", value: 2, startTime: 5, endTime: 9 }
    ]
  },
  ChordDiagram: { edges },
  TreeDiagram: { data: hierarchy },
  Treemap: { data: hierarchy },
  CirclePack: { data: hierarchy },
  OrbitDiagram: { data: hierarchy }
} satisfies Record<string, Datum>
