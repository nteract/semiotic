export const HIERARCHY_CHARTS = new Set([
  "TreeDiagram",
  "Treemap",
  "CirclePack",
  "OrbitDiagram",
])

export const NETWORK_CHARTS = new Set([
  "ForceDirectedGraph",
  "SankeyDiagram",
  "ChordDiagram",
])

export const BAR_AREA_CHARTS = new Set([
  "BarChart",
  "StackedBarChart",
  "GroupedBarChart",
  "AreaChart",
  "StackedAreaChart",
])

export const TREND_SERIES_CHARTS = new Set([
  "LineChart",
  "AreaChart",
  "StackedAreaChart",
])

export const ORDINAL_BAR_CHARTS = new Set([
  "BarChart",
  "StackedBarChart",
  "GroupedBarChart",
  "FunnelChart",
])

export const CURVE_CHARTS = new Set([
  "LineChart",
  "AreaChart",
  "StackedAreaChart",
  "ConnectedScatterplot",
])

export const PIE_CHARTS = new Set(["PieChart", "DonutChart"])

export const PART_TO_WHOLE_ACCESSORS: Record<string, string> = {
  PieChart: "valueAccessor",
  DonutChart: "valueAccessor",
  FunnelChart: "valueAccessor",
}

export const PART_TO_WHOLE_CHARTS = new Set(
  Object.keys(PART_TO_WHOLE_ACCESSORS),
)

export const NORMALIZED_STACK_ACCESSORS: Record<string, string> = {
  StackedBarChart: "valueAccessor",
  StackedAreaChart: "yAccessor",
}

export const VALUE_CHARTS = new Set(["BigNumber"])

export const XY_WITH_AXES_CHARTS = new Set([
  "LineChart",
  "AreaChart",
  "DifferenceChart",
  "StackedAreaChart",
  "Scatterplot",
  "ConnectedScatterplot",
  "BubbleChart",
  "QuadrantChart",
  "MultiAxisLineChart",
  "CandlestickChart",
  "Heatmap",
  "MinimapChart",
])

// Charts whose default presentation animates continuously / loops.
export const PHYSICS_MOTION_CHARTS = new Set([
  "StreamPhysicsFrame",
  "GaltonBoardChart",
  "EventDropChart",
  "PhysicsPileChart",
  "CollisionSwarmChart",
  "PhysicalFlowChart",
  "ProcessFlowChart",
  "PhysicsCustomChart",
])

export const CONTINUOUS_MOTION_CHARTS = new Set([
  "OrbitDiagram",
  ...PHYSICS_MOTION_CHARTS,
])

// Frame-based physics data charts whose StreamPhysicsFrame always renders a
// settled-projection semantic table (the aggregate the motion collapses to).
export const PHYSICS_SETTLED_CHARTS = new Set([
  "GaltonBoardChart",
  "EventDropChart",
  "PhysicsPileChart",
  "CollisionSwarmChart",
  "PhysicalFlowChart",
  "ProcessFlowChart",
  "GauntletChart",
])

export const PHYSICS_DIAGNOSTIC_CHARTS = new Set([
  "GaltonBoardChart",
  "EventDropChart",
  "PhysicsPileChart",
  "CollisionSwarmChart",
  "PhysicalFlowChart",
  "ProcessFlowChart",
  "GauntletChart",
  "PhysicsCustomChart",
])

export const REALTIME_CHARTS = new Set([
  "RealtimeLineChart",
  "RealtimeHistogram",
  "RealtimeSwarmChart",
  "RealtimeWaterfallChart",
  "RealtimeHeatmap",
  "ProcessSankey",
])

// Dual/secondary-axis charts: Chartability flags multiple axes as a complexity risk.
export const DUAL_AXIS_CHARTS = new Set(["MultiAxisLineChart"])

// Geo charts support pan/zoom (and therefore reflow) via `zoomable`.
export const GEO_CHARTS = new Set([
  "ChoroplethMap",
  "ProportionalSymbolMap",
  "FlowMap",
  "DistanceCartogram",
])

// Charts that draw discrete, point-like interactive marks whose hit target is
// driven by a radius/size prop (Chartability target-size heuristic, 24px min).
export const POINT_TARGET_RADIUS_PROP: Record<string, string> = {
  Scatterplot: "pointRadius",
  BubbleChart: "pointRadius",
  ConnectedScatterplot: "pointRadius",
  QuadrantChart: "pointRadius",
  SwarmPlot: "pointRadius",
  DotPlot: "dotRadius",
}
