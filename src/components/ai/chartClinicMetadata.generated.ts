/**
 * AUTO-GENERATED from chartSpecs.ts and chartDefinitions.ts by
 * scripts/regenerate-schema.ts.
 * Do not edit by hand; run `npm run docs:chart-specs:schema`.
 */
import type { ChartCategory } from "../charts/shared/chartSpecs"

interface ChartClinicMetadata {
  readonly category: ChartCategory
  readonly recommendedImport: string
  readonly serverImport?: "semiotic/server"
  readonly docsRoute?: string
  readonly definition?: true
}

export const CHART_CLINIC_METADATA: Readonly<Record<string, ChartClinicMetadata>> = {
  "MotifBraidChart": {"category":"network","recommendedImport":"semiotic/atlas","serverImport":"semiotic/server","docsRoute":"/charts/motif-braid-chart","definition":true},
  "DependencyForestChart": {"category":"network","recommendedImport":"semiotic/atlas","serverImport":"semiotic/server","docsRoute":"/charts/dependency-forest-chart","definition":true},
  "FlowCircuitChart": {"category":"physics","recommendedImport":"semiotic/atlas","serverImport":"semiotic/server","docsRoute":"/charts/flow-circuit-chart","definition":true},
  "BarChart": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server","docsRoute":"/charts/bar-chart","definition":true},
  "StackedBarChart": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server","docsRoute":"/charts/stacked-bar-chart","definition":true},
  "GroupedBarChart": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server","docsRoute":"/charts/grouped-bar-chart","definition":true},
  "SwarmPlot": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server","docsRoute":"/charts/swarm-plot","definition":true},
  "BoxPlot": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server","docsRoute":"/charts/box-plot","definition":true},
  "Histogram": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server","docsRoute":"/charts/histogram","definition":true},
  "ViolinPlot": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server","docsRoute":"/charts/violin-plot","definition":true},
  "RidgelinePlot": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server","docsRoute":"/cookbook/ridgeline-plot","definition":true},
  "DotPlot": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server","docsRoute":"/charts/dot-plot","definition":true},
  "PieChart": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server","docsRoute":"/charts/pie-chart","definition":true},
  "DonutChart": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server","docsRoute":"/charts/donut-chart","definition":true},
  "GaugeChart": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server","docsRoute":"/charts/gauge-chart","definition":true},
  "FunnelChart": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server","docsRoute":"/charts/funnel-chart","definition":true},
  "RadarChart": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server","docsRoute":"/charts/radar-chart","definition":true},
  "SwimlaneChart": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server","docsRoute":"/charts/swimlane-chart","definition":true},
  "LikertChart": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server","docsRoute":"/charts/likert-chart","definition":true},
  "LineChart": {"category":"xy","recommendedImport":"semiotic/line","serverImport":"semiotic/server","docsRoute":"/charts/line-chart","definition":true},
  "BumpChart": {"category":"xy","recommendedImport":"semiotic/xy","serverImport":"semiotic/server","docsRoute":"/charts/bump-chart","definition":true},
  "AreaChart": {"category":"xy","recommendedImport":"semiotic/xy","serverImport":"semiotic/server","docsRoute":"/charts/area-chart","definition":true},
  "DifferenceChart": {"category":"xy","recommendedImport":"semiotic/xy","serverImport":"semiotic/server","docsRoute":"/charts/difference-chart","definition":true},
  "StackedAreaChart": {"category":"xy","recommendedImport":"semiotic/xy","serverImport":"semiotic/server","docsRoute":"/charts/stacked-area-chart","definition":true},
  "Scatterplot": {"category":"xy","recommendedImport":"semiotic/xy","serverImport":"semiotic/server","docsRoute":"/charts/scatterplot","definition":true},
  "BubbleChart": {"category":"xy","recommendedImport":"semiotic/xy","serverImport":"semiotic/server","docsRoute":"/charts/bubble-chart","definition":true},
  "Heatmap": {"category":"xy","recommendedImport":"semiotic/xy","serverImport":"semiotic/server","docsRoute":"/charts/heatmap","definition":true},
  "QuadrantChart": {"category":"xy","recommendedImport":"semiotic/xy","serverImport":"semiotic/server","docsRoute":"/charts/quadrant-chart","definition":true},
  "MultiAxisLineChart": {"category":"xy","recommendedImport":"semiotic/xy","serverImport":"semiotic/server","docsRoute":"/charts/multi-axis-line-chart","definition":true},
  "WaterfallChart": {"category":"xy","recommendedImport":"semiotic/xy","serverImport":"semiotic/server","docsRoute":"/charts/waterfall-chart","definition":true},
  "CandlestickChart": {"category":"xy","recommendedImport":"semiotic/xy","serverImport":"semiotic/server","docsRoute":"/charts/candlestick-chart","definition":true},
  "ConnectedScatterplot": {"category":"xy","recommendedImport":"semiotic/xy","serverImport":"semiotic/server","docsRoute":"/charts/connected-scatterplot","definition":true},
  "ScatterplotMatrix": {"category":"xy","recommendedImport":"semiotic/xy","serverImport":"semiotic/server","docsRoute":"/charts/scatterplot-matrix","definition":true},
  "MinimapChart": {"category":"xy","recommendedImport":"semiotic/xy","serverImport":"semiotic/server","docsRoute":"/recipes/time-series-brush","definition":true},
  "ForceDirectedGraph": {"category":"network","recommendedImport":"semiotic/network","serverImport":"semiotic/server","docsRoute":"/charts/force-directed-graph","definition":true},
  "SankeyDiagram": {"category":"network","recommendedImport":"semiotic/network","serverImport":"semiotic/server","docsRoute":"/charts/sankey-diagram","definition":true},
  "ProcessSankey": {"category":"network","recommendedImport":"semiotic/network","serverImport":"semiotic/server","docsRoute":"/charts/process-sankey","definition":true},
  "ChordDiagram": {"category":"network","recommendedImport":"semiotic/network","serverImport":"semiotic/server","docsRoute":"/charts/chord-diagram","definition":true},
  "TreeDiagram": {"category":"network","recommendedImport":"semiotic/network","serverImport":"semiotic/server","docsRoute":"/charts/tree-diagram","definition":true},
  "Treemap": {"category":"network","recommendedImport":"semiotic/network","serverImport":"semiotic/server","docsRoute":"/charts/treemap","definition":true},
  "CirclePack": {"category":"network","recommendedImport":"semiotic/network","serverImport":"semiotic/server","docsRoute":"/charts/circle-pack","definition":true},
  "OrbitDiagram": {"category":"network","recommendedImport":"semiotic/network","serverImport":"semiotic/server","docsRoute":"/charts/orbit-diagram","definition":true},
  "ChoroplethMap": {"category":"geo","recommendedImport":"semiotic/geo","serverImport":"semiotic/server"},
  "ProportionalSymbolMap": {"category":"geo","recommendedImport":"semiotic/geo","serverImport":"semiotic/server"},
  "FlowMap": {"category":"geo","recommendedImport":"semiotic/geo","serverImport":"semiotic/server","docsRoute":"/charts/flow-map","definition":true},
  "DistanceCartogram": {"category":"geo","recommendedImport":"semiotic/geo","serverImport":"semiotic/server"},
  "RealtimeLineChart": {"category":"realtime","recommendedImport":"semiotic/realtime","serverImport":"semiotic/server","docsRoute":"/charts/realtime-line-chart","definition":true},
  "RealtimeHistogram": {"category":"realtime","recommendedImport":"semiotic/realtime","serverImport":"semiotic/server","docsRoute":"/charts/realtime-histogram","definition":true},
  "TemporalHistogram": {"category":"realtime","recommendedImport":"semiotic/realtime","serverImport":"semiotic/server","docsRoute":"/charts/realtime-histogram","definition":true},
  "RealtimeSwarmChart": {"category":"realtime","recommendedImport":"semiotic/realtime","serverImport":"semiotic/server","docsRoute":"/charts/realtime-swarm-chart","definition":true},
  "RealtimeWaterfallChart": {"category":"realtime","recommendedImport":"semiotic/realtime","serverImport":"semiotic/server","docsRoute":"/charts/realtime-waterfall-chart","definition":true},
  "RealtimeHeatmap": {"category":"realtime","recommendedImport":"semiotic/realtime","serverImport":"semiotic/server","docsRoute":"/charts/realtime-heatmap","definition":true},
  "GaltonBoardChart": {"category":"physics","recommendedImport":"semiotic/physics","serverImport":"semiotic/server","docsRoute":"/charts/galton-board-chart","definition":true},
  "EventDropChart": {"category":"physics","recommendedImport":"semiotic/physics","serverImport":"semiotic/server","docsRoute":"/charts/event-drop-chart","definition":true},
  "UnitPileChart": {"category":"physics","recommendedImport":"semiotic/physics","serverImport":"semiotic/server","docsRoute":"/charts/unit-pile-chart","definition":true},
  "CollisionSwarmChart": {"category":"physics","recommendedImport":"semiotic/physics","serverImport":"semiotic/server","docsRoute":"/charts/collision-swarm-chart","definition":true},
  "GauntletChart": {"category":"physics","recommendedImport":"semiotic/physics","serverImport":"semiotic/server","docsRoute":"/charts/gauntlet-chart","definition":true},
  "CrucibleChart": {"category":"physics","recommendedImport":"semiotic/physics","serverImport":"semiotic/server","docsRoute":"/charts/crucible-chart","definition":true},
  "ProcessFlowChart": {"category":"physics","recommendedImport":"semiotic/physics","serverImport":"semiotic/server","docsRoute":"/charts/process-flow-chart","definition":true},
  "PacketFlowChart": {"category":"physics","recommendedImport":"semiotic/physics","serverImport":"semiotic/server","docsRoute":"/charts/packet-flow-chart","definition":true},
  "ChainReactionChart": {"category":"physics","recommendedImport":"semiotic/physics","serverImport":"semiotic/server","docsRoute":"/charts/chain-reaction-chart","definition":true},
  "BigNumber": {"category":"value","recommendedImport":"semiotic/value","serverImport":"semiotic/server","docsRoute":"/charts/big-number","definition":true}
}
