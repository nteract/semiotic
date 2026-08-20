/**
 * AUTO-GENERATED from chartSpecs.ts by scripts/regenerate-schema.ts.
 * Do not edit by hand; run `npm run docs:chart-specs:schema`.
 *
 * This compact registry is intentionally separate from validation metadata:
 * config serialization only needs chart-name membership.
 */
export const KNOWN_CHART_COMPONENTS = [
  "BarChart",
  "StackedBarChart",
  "GroupedBarChart",
  "SwarmPlot",
  "BoxPlot",
  "Histogram",
  "ViolinPlot",
  "RidgelinePlot",
  "DotPlot",
  "PieChart",
  "DonutChart",
  "GaugeChart",
  "FunnelChart",
  "RadarChart",
  "SwimlaneChart",
  "LikertChart",
  "LineChart",
  "BumpChart",
  "AreaChart",
  "DifferenceChart",
  "StackedAreaChart",
  "Scatterplot",
  "BubbleChart",
  "Heatmap",
  "QuadrantChart",
  "MultiAxisLineChart",
  "WaterfallChart",
  "CandlestickChart",
  "ConnectedScatterplot",
  "ScatterplotMatrix",
  "MinimapChart",
  "ForceDirectedGraph",
  "SankeyDiagram",
  "ProcessSankey",
  "ChordDiagram",
  "TreeDiagram",
  "Treemap",
  "CirclePack",
  "OrbitDiagram",
  "ChoroplethMap",
  "ProportionalSymbolMap",
  "FlowMap",
  "DistanceCartogram",
  "RealtimeLineChart",
  "RealtimeHistogram",
  "TemporalHistogram",
  "RealtimeSwarmChart",
  "RealtimeWaterfallChart",
  "RealtimeHeatmap",
  "GaltonBoardChart",
  "EventDropChart",
  "UnitPileChart",
  "CollisionSwarmChart",
  "GauntletChart",
  "CrucibleChart",
  "ProcessFlowChart",
  "PacketFlowChart",
  "ChainReactionChart",
  "BigNumber"
] as const

const KNOWN_CHART_COMPONENT_SET: ReadonlySet<string> = new Set(
  KNOWN_CHART_COMPONENTS,
)

export function isKnownChartComponent(componentName: string): boolean {
  return KNOWN_CHART_COMPONENT_SET.has(componentName)
}
