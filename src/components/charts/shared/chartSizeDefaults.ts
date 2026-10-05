import { MULTI_AXIS_LINE_CHART_SIZE } from "./chartSizeDefaultsXY"
import {
  PIE_CHART_SIZE,
  DONUT_CHART_SIZE,
  GAUGE_CHART_SIZE
} from "./chartSizeDefaultsOrdinal"
import {
  FORCE_DIRECTED_GRAPH_SIZE,
  SANKEY_DIAGRAM_SIZE,
  CHORD_DIAGRAM_SIZE,
  TREE_DIAGRAM_SIZE,
  TREEMAP_SIZE,
  CIRCLE_PACK_SIZE,
  ORBIT_DIAGRAM_SIZE
} from "./chartSizeDefaultsNetwork"
import {
  GALTON_BOARD_CHART_SIZE,
  UNIT_PILE_CHART_SIZE,
  COLLISION_SWARM_CHART_SIZE,
  EVENT_DROP_CHART_SIZE,
  PACKET_FLOW_CHART_SIZE,
  PROCESS_FLOW_CHART_SIZE,
  PHYSICS_CUSTOM_CHART_SIZE,
  GAUNTLET_CHART_SIZE,
  CRUCIBLE_CHART_SIZE,
  CHAIN_REACTION_CHART_SIZE
} from "./chartSizeDefaultsPhysics"
import {
  DEPENDENCY_FOREST_CHART_SIZE,
  FLOW_CIRCUIT_CHART_SIZE
} from "./chartSizeDefaultsAtlas"
/** Shared size values; individual exports keep unrelated charts out of family bundles. */

const PRIMARY_SIZE_OVERRIDES = {
  MultiAxisLineChart: MULTI_AXIS_LINE_CHART_SIZE,
  PieChart: PIE_CHART_SIZE,
  DonutChart: DONUT_CHART_SIZE,
  GaugeChart: GAUGE_CHART_SIZE,
  ForceDirectedGraph: FORCE_DIRECTED_GRAPH_SIZE,
  SankeyDiagram: SANKEY_DIAGRAM_SIZE,
  ChordDiagram: CHORD_DIAGRAM_SIZE,
  TreeDiagram: TREE_DIAGRAM_SIZE,
  Treemap: TREEMAP_SIZE,
  CirclePack: CIRCLE_PACK_SIZE,
  OrbitDiagram: ORBIT_DIAGRAM_SIZE,
  GaltonBoardChart: GALTON_BOARD_CHART_SIZE,
  UnitPileChart: UNIT_PILE_CHART_SIZE,
  CollisionSwarmChart: COLLISION_SWARM_CHART_SIZE,
  EventDropChart: EVENT_DROP_CHART_SIZE,
  PacketFlowChart: PACKET_FLOW_CHART_SIZE,
  ProcessFlowChart: PROCESS_FLOW_CHART_SIZE,
  PhysicsCustomChart: PHYSICS_CUSTOM_CHART_SIZE,
  GauntletChart: GAUNTLET_CHART_SIZE,
  CrucibleChart: CRUCIBLE_CHART_SIZE,
  ChainReactionChart: CHAIN_REACTION_CHART_SIZE,
  DependencyForestChart: DEPENDENCY_FOREST_CHART_SIZE,
  FlowCircuitChart: FLOW_CIRCUIT_CHART_SIZE
} as const

/** All numeric chart viewports, including charts using the shared mode defaults. */
export const CHART_PRIMARY_SIZES = {
  ...PRIMARY_SIZE_OVERRIDES,
  LineChart: undefined,
  AreaChart: undefined,
  StackedAreaChart: undefined,
  DifferenceChart: undefined,
  BumpChart: undefined,
  Scatterplot: undefined,
  BubbleChart: undefined,
  Heatmap: undefined,
  QuadrantChart: undefined,
  WaterfallChart: undefined,
  CandlestickChart: undefined,
  ConnectedScatterplot: undefined,
  MinimapChart: undefined,
  ScatterplotMatrix: undefined,
  BarChart: undefined,
  StackedBarChart: undefined,
  GroupedBarChart: undefined,
  SwarmPlot: undefined,
  BoxPlot: undefined,
  Histogram: undefined,
  ViolinPlot: undefined,
  RidgelinePlot: undefined,
  DotPlot: undefined,
  FunnelChart: undefined,
  RadarChart: undefined,
  SwimlaneChart: undefined,
  LikertChart: undefined,
  ProcessSankey: undefined,
  ChoroplethMap: undefined,
  ProportionalSymbolMap: undefined,
  FlowMap: undefined,
  DistanceCartogram: undefined,
  RealtimeLineChart: undefined,
  RealtimeHistogram: undefined,
  TemporalHistogram: undefined,
  RealtimeTemporalHistogram: undefined,
  RealtimeSwarmChart: undefined,
  RealtimeWaterfallChart: undefined,
  RealtimeHeatmap: undefined,
  XYCustomChart: undefined,
  OrdinalCustomChart: undefined,
  NetworkCustomChart: undefined,
  GeoCustomChart: undefined,
  MotifBraidChart: undefined,
  Sparkline: undefined
} as const

/** A chart with a numeric plotting viewport. BigNumber has separate CSS-sized modes. */
export type SizedChartName = keyof typeof CHART_PRIMARY_SIZES

export function hasFixedModeSize(name: string): boolean {
  return [
    "MinimapChart",
    "ProcessSankey",
    "ChainReactionChart",
    "DependencyForestChart",
    "FlowCircuitChart"
  ].includes(name)
}

export function chartPrimarySize(name: string) {
  return Object.prototype.hasOwnProperty.call(PRIMARY_SIZE_OVERRIDES, name)
    ? PRIMARY_SIZE_OVERRIDES[name as keyof typeof PRIMARY_SIZE_OVERRIDES]
    : undefined
}
