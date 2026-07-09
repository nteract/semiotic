/**
 * Maps component names to their React component + category.
 * Used by the MCP server to look up components for rendering.
 */
import type { ComponentType } from "react"

import {
  LineChart, AreaChart, DifferenceChart, StackedAreaChart, Scatterplot, ConnectedScatterplot, BubbleChart, Heatmap,
  ScatterplotMatrix, MinimapChart, QuadrantChart, MultiAxisLineChart, CandlestickChart,
  BarChart, StackedBarChart, GroupedBarChart, SwarmPlot, BoxPlot, DotPlot,
  Histogram, ViolinPlot, RidgelinePlot,
  PieChart, DonutChart, GaugeChart, FunnelChart, LikertChart, SwimlaneChart,
  ForceDirectedGraph, ChordDiagram, SankeyDiagram, ProcessSankey, TreeDiagram, Treemap, CirclePack, OrbitDiagram,
  TemporalHistogram,
  EventDropChart, GaltonBoardChart, PhysicsPileChart, CollisionSwarmChart, PhysicalFlowChart, ProcessFlowChart, GauntletChart
} from "semiotic/ai"

import {
  ChoroplethMap, ProportionalSymbolMap, FlowMap, DistanceCartogram
} from "semiotic/geo"

export interface RegistryEntry {
  component: ComponentType<any>
  category: "xy" | "ordinal" | "network" | "geo" | "physics"
}

export const COMPONENT_REGISTRY: Record<string, RegistryEntry> = {
  LineChart: { component: LineChart, category: "xy" },
  AreaChart: { component: AreaChart, category: "xy" },
  DifferenceChart: { component: DifferenceChart, category: "xy" },
  StackedAreaChart: { component: StackedAreaChart, category: "xy" },
  Scatterplot: { component: Scatterplot, category: "xy" },
  BubbleChart: { component: BubbleChart, category: "xy" },
  Heatmap: { component: Heatmap, category: "xy" },
  ScatterplotMatrix: { component: ScatterplotMatrix, category: "xy" },
  MinimapChart: { component: MinimapChart, category: "xy" },
  ConnectedScatterplot: { component: ConnectedScatterplot, category: "xy" },
  QuadrantChart: { component: QuadrantChart, category: "xy" },
  MultiAxisLineChart: { component: MultiAxisLineChart, category: "xy" },
  CandlestickChart: { component: CandlestickChart, category: "xy" },
  TemporalHistogram: { component: TemporalHistogram, category: "xy" },

  BarChart: { component: BarChart, category: "ordinal" },
  StackedBarChart: { component: StackedBarChart, category: "ordinal" },
  GroupedBarChart: { component: GroupedBarChart, category: "ordinal" },
  SwarmPlot: { component: SwarmPlot, category: "ordinal" },
  BoxPlot: { component: BoxPlot, category: "ordinal" },
  DotPlot: { component: DotPlot, category: "ordinal" },
  Histogram: { component: Histogram, category: "ordinal" },
  ViolinPlot: { component: ViolinPlot, category: "ordinal" },
  RidgelinePlot: { component: RidgelinePlot, category: "ordinal" },
  PieChart: { component: PieChart, category: "ordinal" },
  DonutChart: { component: DonutChart, category: "ordinal" },
  GaugeChart: { component: GaugeChart, category: "ordinal" },
  FunnelChart: { component: FunnelChart, category: "ordinal" },
  LikertChart: { component: LikertChart, category: "ordinal" },
  SwimlaneChart: { component: SwimlaneChart, category: "ordinal" },

  ForceDirectedGraph: { component: ForceDirectedGraph, category: "network" },
  ChordDiagram: { component: ChordDiagram, category: "network" },
  SankeyDiagram: { component: SankeyDiagram, category: "network" },
  ProcessSankey: { component: ProcessSankey, category: "network" },
  TreeDiagram: { component: TreeDiagram, category: "network" },
  Treemap: { component: Treemap, category: "network" },
  CirclePack: { component: CirclePack, category: "network" },
  OrbitDiagram: { component: OrbitDiagram, category: "network" },

  ChoroplethMap: { component: ChoroplethMap, category: "geo" },
  ProportionalSymbolMap: { component: ProportionalSymbolMap, category: "geo" },
  FlowMap: { component: FlowMap, category: "geo" },
  DistanceCartogram: { component: DistanceCartogram, category: "geo" },

  GaltonBoardChart: { component: GaltonBoardChart, category: "physics" },
  EventDropChart: { component: EventDropChart, category: "physics" },
  PhysicsPileChart: { component: PhysicsPileChart, category: "physics" },
  CollisionSwarmChart: { component: CollisionSwarmChart, category: "physics" },
  PhysicalFlowChart: { component: PhysicalFlowChart, category: "physics" },
  ProcessFlowChart: { component: ProcessFlowChart, category: "physics" },
  GauntletChart: { component: GauntletChart, category: "physics" },
}
