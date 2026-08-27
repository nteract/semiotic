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
  waterfallChart,
  multiAxisLineChart,
  temporalHistogram
} from "./serverChartConfigsXY"
import { heatmap } from "./serverChartConfigHeatmap"
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
  gaugeChart,
  radarChart
} from "./serverChartConfigsOrdinal"
import {
  forceDirectedGraph,
  processSankey,
  sankeyDiagram,
  chordDiagram,
  treeDiagram,
  treemap,
  circlePack,
  orbitDiagram
} from "./serverChartConfigsNetwork"
import {
  choroplethMap,
  proportionalSymbolMap,
  flowMap,
  distanceCartogram
} from "./serverChartConfigsGeo"
import {
  xyCustomChart,
  ordinalCustomChart,
  networkCustomChart,
  geoCustomChart,
  parallelCoordinatesRecipe,
  calendarHeatmapRecipe
} from "./serverChartConfigsCustom"
import {
  galtonBoardChart,
  eventDropChart,
  unitPileChart,
  collisionSwarmChart,
  processFlowChart,
  gauntletChart,
  crucibleChart,
  packetFlowChart,
  physicsCustomChart
} from "./serverChartConfigsPhysics"
import {
  chainReactionChart,
  minimapChart,
  scatterplotMatrix
} from "./serverChartConfigsComposite"

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
  WaterfallChart: waterfallChart,
  MultiAxisLineChart: multiAxisLineChart,
  MinimapChart: minimapChart,
  ScatterplotMatrix: scatterplotMatrix,
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
  RadarChart: radarChart,
  GaugeChart: gaugeChart,
  OrdinalCustomChart: ordinalCustomChart,
  ParallelCoordinatesRecipe: parallelCoordinatesRecipe,
  CalendarHeatmapRecipe: calendarHeatmapRecipe,
  ForceDirectedGraph: forceDirectedGraph,
  NetworkCustomChart: networkCustomChart,
  SankeyDiagram: sankeyDiagram,
  ProcessSankey: processSankey,
  ChordDiagram: chordDiagram,
  TreeDiagram: treeDiagram,
  Treemap: treemap,
  CirclePack: circlePack,
  OrbitDiagram: orbitDiagram,
  ChoroplethMap: choroplethMap,
  ProportionalSymbolMap: proportionalSymbolMap,
  FlowMap: flowMap,
  DistanceCartogram: distanceCartogram,
  GeoCustomChart: geoCustomChart,
  GaltonBoardChart: galtonBoardChart,
  EventDropChart: eventDropChart,
  UnitPileChart: unitPileChart,
  CollisionSwarmChart: collisionSwarmChart,
  ProcessFlowChart: processFlowChart,
  GauntletChart: gauntletChart,
  CrucibleChart: crucibleChart,
  PacketFlowChart: packetFlowChart,
  ChainReactionChart: chainReactionChart,
  PhysicsCustomChart: physicsCustomChart
} satisfies Record<string, ChartConfig>
