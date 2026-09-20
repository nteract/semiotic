/**
 * AUTO-GENERATED from chartDefinitionsNetwork.ts by scripts/regenerate-schema.ts.
 * Do not edit by hand; run `npm run docs:chart-specs:schema`.
 */
import type { ChartConfig } from "./serverChartConfigShared"
import { motifBraidChart, dependencyForestChart } from "./serverChartConfigsAtlas"
import { forceDirectedGraph, sankeyDiagram, processSankey, chordDiagram, treeDiagram, treemap, circlePack, orbitDiagram } from "./serverChartConfigsNetwork"

export const NETWORK_CHART_CONFIGS = {
  MotifBraidChart: motifBraidChart,
  DependencyForestChart: dependencyForestChart,
  ForceDirectedGraph: forceDirectedGraph,
  SankeyDiagram: sankeyDiagram,
  ProcessSankey: processSankey,
  ChordDiagram: chordDiagram,
  TreeDiagram: treeDiagram,
  Treemap: treemap,
  CirclePack: circlePack,
  OrbitDiagram: orbitDiagram
} satisfies Record<string, ChartConfig>
