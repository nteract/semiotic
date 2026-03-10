/**
 * Maps component names to their React component + category.
 * Used by the MCP server to look up components for rendering.
 */
import type { ComponentType } from "react"

import {
  LineChart, AreaChart, StackedAreaChart, Scatterplot, ConnectedScatterplot, BubbleChart, Heatmap,
  BarChart, StackedBarChart, GroupedBarChart, SwarmPlot, BoxPlot, DotPlot,
  PieChart, DonutChart,
  ForceDirectedGraph, ChordDiagram, SankeyDiagram, TreeDiagram, Treemap, CirclePack, OrbitDiagram
} from "semiotic/ai"

export interface RegistryEntry {
  component: ComponentType<any>
  category: "xy" | "ordinal" | "network"
}

export const COMPONENT_REGISTRY: Record<string, RegistryEntry> = {
  LineChart: { component: LineChart, category: "xy" },
  AreaChart: { component: AreaChart, category: "xy" },
  StackedAreaChart: { component: StackedAreaChart, category: "xy" },
  Scatterplot: { component: Scatterplot, category: "xy" },
  BubbleChart: { component: BubbleChart, category: "xy" },
  Heatmap: { component: Heatmap, category: "xy" },
  ConnectedScatterplot: { component: ConnectedScatterplot, category: "xy" },

  BarChart: { component: BarChart, category: "ordinal" },
  StackedBarChart: { component: StackedBarChart, category: "ordinal" },
  GroupedBarChart: { component: GroupedBarChart, category: "ordinal" },
  SwarmPlot: { component: SwarmPlot, category: "ordinal" },
  BoxPlot: { component: BoxPlot, category: "ordinal" },
  DotPlot: { component: DotPlot, category: "ordinal" },
  PieChart: { component: PieChart, category: "ordinal" },
  DonutChart: { component: DonutChart, category: "ordinal" },

  ForceDirectedGraph: { component: ForceDirectedGraph, category: "network" },
  ChordDiagram: { component: ChordDiagram, category: "network" },
  SankeyDiagram: { component: SankeyDiagram, category: "network" },
  TreeDiagram: { component: TreeDiagram, category: "network" },
  Treemap: { component: Treemap, category: "network" },
  CirclePack: { component: CirclePack, category: "network" },
  OrbitDiagram: { component: OrbitDiagram, category: "network" },
}
