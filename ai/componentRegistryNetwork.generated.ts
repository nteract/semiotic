/**
 * AUTO-GENERATED from chartDefinitionsNetwork.ts by scripts/regenerate-schema.ts.
 * Do not edit by hand; run `npm run docs:chart-specs:schema`.
 */
import { MotifBraidChart, DependencyForestChart } from "semiotic/atlas"
import { ForceDirectedGraph, SankeyDiagram, ProcessSankey, ChordDiagram, TreeDiagram, Treemap, CirclePack, OrbitDiagram } from "semiotic/ai"
import type { RegistryEntry } from "./componentRegistry"

export const NETWORK_COMPONENT_REGISTRY = {
  MotifBraidChart: { component: MotifBraidChart, category: "network" },
  DependencyForestChart: { component: DependencyForestChart, category: "network" },
  ForceDirectedGraph: { component: ForceDirectedGraph, category: "network" },
  SankeyDiagram: { component: SankeyDiagram, category: "network" },
  ProcessSankey: { component: ProcessSankey, category: "network" },
  ChordDiagram: { component: ChordDiagram, category: "network" },
  TreeDiagram: { component: TreeDiagram, category: "network" },
  Treemap: { component: Treemap, category: "network" },
  CirclePack: { component: CirclePack, category: "network" },
  OrbitDiagram: { component: OrbitDiagram, category: "network" }
} satisfies Record<string, RegistryEntry>
