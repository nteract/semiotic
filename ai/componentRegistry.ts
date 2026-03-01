/**
 * Maps component names to their React component + category.
 * Used by the MCP server to look up components for rendering.
 */
import type { ComponentType } from "react"

import { LineChart } from "../src/components/charts/xy/LineChart"
import { AreaChart } from "../src/components/charts/xy/AreaChart"
import { StackedAreaChart } from "../src/components/charts/xy/StackedAreaChart"
import { Scatterplot } from "../src/components/charts/xy/Scatterplot"
import { BubbleChart } from "../src/components/charts/xy/BubbleChart"
import { Heatmap } from "../src/components/charts/xy/Heatmap"

import { BarChart } from "../src/components/charts/ordinal/BarChart"
import { StackedBarChart } from "../src/components/charts/ordinal/StackedBarChart"
import { GroupedBarChart } from "../src/components/charts/ordinal/GroupedBarChart"
import { SwarmPlot } from "../src/components/charts/ordinal/SwarmPlot"
import { BoxPlot } from "../src/components/charts/ordinal/BoxPlot"
import { DotPlot } from "../src/components/charts/ordinal/DotPlot"
import { PieChart } from "../src/components/charts/ordinal/PieChart"
import { DonutChart } from "../src/components/charts/ordinal/DonutChart"

import { ForceDirectedGraph } from "../src/components/charts/network/ForceDirectedGraph"
import { ChordDiagram } from "../src/components/charts/network/ChordDiagram"
import { SankeyDiagram } from "../src/components/charts/network/SankeyDiagram"
import { TreeDiagram } from "../src/components/charts/network/TreeDiagram"
import { Treemap } from "../src/components/charts/network/Treemap"
import { CirclePack } from "../src/components/charts/network/CirclePack"

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
}
