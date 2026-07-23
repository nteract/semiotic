/**
 * Chart-specific prop mapping for renderChart().
 *
 * Family implementations live in serverChartConfigs{XY,Ordinal,Network,Geo,Custom,Physics}.ts.
 */
import type { ChartConfig } from "./serverChartConfigShared"
import {
  sparkline,
  bumpChart,
  lineChart,
  areaChart,
  differenceChart,
  stackedAreaChart,
  candlestickChart,
  bubbleChart,
  scatterplot,
  quadrantChart,
  connectedScatterplot,
  heatmap,
  temporalHistogram
} from "./serverChartConfigsXY"
import {
  barChart,
  stackedBarChart,
  groupedBarChart,
  pieChart,
  donutChart,
  histogram,
  boxPlot,
  violinPlot,
  swarmPlot,
  dotPlot,
  swimlaneChart,
  ridgelinePlot,
  likertChart,
  funnelChart,
  gaugeChart
} from "./serverChartConfigsOrdinal"
import {
  forceDirectedGraph,
  processSankey,
  sankeyDiagram,
  chordDiagram,
  treeDiagram,
  treemap,
  circlePack
} from "./serverChartConfigsNetwork"
import {
  choroplethMap,
  proportionalSymbolMap,
  flowMap
} from "./serverChartConfigsGeo"
import {
  xyCustomChart,
  ordinalCustomChart,
  networkCustomChart,
  geoCustomChart
} from "./serverChartConfigsCustom"
import {
  galtonBoardChart,
  eventDropChart,
  physicsPileChart,
  collisionSwarmChart,
  processFlowChart,
  gauntletChart,
  crucibleChart,
  physicalFlowChart,
  physicsCustomChart
} from "./serverChartConfigsPhysics"

// ── Registry ───────────────────────────────────────────────────────────

// `satisfies` (not `: Record<string, ChartConfig>`) so TypeScript preserves
// the literal key union. Downstream code derives `ChartName` via
// `keyof typeof CHART_CONFIGS` and stays in lockstep automatically — adding
// a chart here makes it available to renderChart() without a second edit.
export const CHART_CONFIGS = {
  Sparkline: sparkline,
  BumpChart: bumpChart,
  LineChart: lineChart,
  AreaChart: areaChart,
  DifferenceChart: differenceChart,
  StackedAreaChart: stackedAreaChart,
  Scatterplot: scatterplot,
  CandlestickChart: candlestickChart,
  BubbleChart: bubbleChart,
  ConnectedScatterplot: connectedScatterplot,
  QuadrantChart: quadrantChart,
  Heatmap: heatmap,
  TemporalHistogram: temporalHistogram,
  XYCustomChart: xyCustomChart,
  BarChart: barChart,
  StackedBarChart: stackedBarChart,
  GroupedBarChart: groupedBarChart,
  PieChart: pieChart,
  DonutChart: donutChart,
  Histogram: histogram,
  BoxPlot: boxPlot,
  ViolinPlot: violinPlot,
  SwarmPlot: swarmPlot,
  DotPlot: dotPlot,
  SwimlaneChart: swimlaneChart,
  RidgelinePlot: ridgelinePlot,
  LikertChart: likertChart,
  FunnelChart: funnelChart,
  GaugeChart: gaugeChart,
  OrdinalCustomChart: ordinalCustomChart,
  ForceDirectedGraph: forceDirectedGraph,
  NetworkCustomChart: networkCustomChart,
  SankeyDiagram: sankeyDiagram,
  ProcessSankey: processSankey,
  ChordDiagram: chordDiagram,
  TreeDiagram: treeDiagram,
  Treemap: treemap,
  CirclePack: circlePack,
  ChoroplethMap: choroplethMap,
  ProportionalSymbolMap: proportionalSymbolMap,
  FlowMap: flowMap,
  GeoCustomChart: geoCustomChart,
  GaltonBoardChart: galtonBoardChart,
  EventDropChart: eventDropChart,
  PhysicsPileChart: physicsPileChart,
  CollisionSwarmChart: collisionSwarmChart,
  ProcessFlowChart: processFlowChart,
  GauntletChart: gauntletChart,
  CrucibleChart: crucibleChart,
  PhysicalFlowChart: physicalFlowChart,
  PhysicsCustomChart: physicsCustomChart
} satisfies Record<string, ChartConfig>
