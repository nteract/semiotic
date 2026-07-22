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
  "SwimlaneChart",
  "LikertChart",
  "LineChart",
  "AreaChart",
  "DifferenceChart",
  "StackedAreaChart",
  "Scatterplot",
  "BubbleChart",
  "Heatmap",
  "QuadrantChart",
  "MultiAxisLineChart",
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
  "PhysicsPileChart",
  "CollisionSwarmChart",
  "GauntletChart",
  "CrucibleChart",
  "ProcessFlowChart",
  "PhysicalFlowChart",
  "BigNumber"
] as const

const KNOWN_CHART_COMPONENT_SET: ReadonlySet<string> = new Set(
  KNOWN_CHART_COMPONENTS,
)

export function isKnownChartComponent(componentName: string): boolean {
  return KNOWN_CHART_COMPONENT_SET.has(componentName)
}
