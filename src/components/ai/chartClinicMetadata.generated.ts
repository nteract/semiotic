/**
 * AUTO-GENERATED from chartSpecs.ts and chartDefinitionPilot.ts by
 * scripts/regenerate-schema.ts.
 * Do not edit by hand; run `npm run docs:chart-specs:schema`.
 */
import type { ChartCategory } from "../charts/shared/chartSpecs"

interface ChartClinicMetadata {
  readonly category: ChartCategory
  readonly recommendedImport: string
  readonly serverImport?: "semiotic/server"
  readonly docsRoute?: string
  readonly pilot?: true
}

export const CHART_CLINIC_METADATA: Readonly<Record<string, ChartClinicMetadata>> = {
  "BarChart": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server","docsRoute":"/charts/bar-chart","pilot":true},
  "StackedBarChart": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server"},
  "GroupedBarChart": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server"},
  "SwarmPlot": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server"},
  "BoxPlot": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server"},
  "Histogram": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server"},
  "ViolinPlot": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server"},
  "RidgelinePlot": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server"},
  "DotPlot": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server"},
  "PieChart": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server"},
  "DonutChart": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server"},
  "GaugeChart": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server"},
  "FunnelChart": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server"},
  "SwimlaneChart": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server"},
  "LikertChart": {"category":"ordinal","recommendedImport":"semiotic/ordinal","serverImport":"semiotic/server"},
  "LineChart": {"category":"xy","recommendedImport":"semiotic/xy","serverImport":"semiotic/server","docsRoute":"/charts/line-chart","pilot":true},
  "AreaChart": {"category":"xy","recommendedImport":"semiotic/xy","serverImport":"semiotic/server"},
  "DifferenceChart": {"category":"xy","recommendedImport":"semiotic/xy","serverImport":"semiotic/server"},
  "StackedAreaChart": {"category":"xy","recommendedImport":"semiotic/xy","serverImport":"semiotic/server"},
  "Scatterplot": {"category":"xy","recommendedImport":"semiotic/xy","serverImport":"semiotic/server"},
  "BubbleChart": {"category":"xy","recommendedImport":"semiotic/xy","serverImport":"semiotic/server"},
  "Heatmap": {"category":"xy","recommendedImport":"semiotic/xy","serverImport":"semiotic/server"},
  "QuadrantChart": {"category":"xy","recommendedImport":"semiotic/xy","serverImport":"semiotic/server"},
  "MultiAxisLineChart": {"category":"xy","recommendedImport":"semiotic/xy"},
  "CandlestickChart": {"category":"xy","recommendedImport":"semiotic/xy","serverImport":"semiotic/server"},
  "ConnectedScatterplot": {"category":"xy","recommendedImport":"semiotic/xy","serverImport":"semiotic/server"},
  "ScatterplotMatrix": {"category":"xy","recommendedImport":"semiotic/xy"},
  "MinimapChart": {"category":"xy","recommendedImport":"semiotic/xy"},
  "ForceDirectedGraph": {"category":"network","recommendedImport":"semiotic/network","serverImport":"semiotic/server","docsRoute":"/charts/force-directed-graph","pilot":true},
  "SankeyDiagram": {"category":"network","recommendedImport":"semiotic/network","serverImport":"semiotic/server"},
  "ProcessSankey": {"category":"network","recommendedImport":"semiotic/network","serverImport":"semiotic/server"},
  "ChordDiagram": {"category":"network","recommendedImport":"semiotic/network","serverImport":"semiotic/server"},
  "TreeDiagram": {"category":"network","recommendedImport":"semiotic/network","serverImport":"semiotic/server"},
  "Treemap": {"category":"network","recommendedImport":"semiotic/network","serverImport":"semiotic/server"},
  "CirclePack": {"category":"network","recommendedImport":"semiotic/network","serverImport":"semiotic/server"},
  "OrbitDiagram": {"category":"network","recommendedImport":"semiotic/network"},
  "ChoroplethMap": {"category":"geo","recommendedImport":"semiotic/geo","serverImport":"semiotic/server"},
  "ProportionalSymbolMap": {"category":"geo","recommendedImport":"semiotic/geo","serverImport":"semiotic/server"},
  "FlowMap": {"category":"geo","recommendedImport":"semiotic/geo","serverImport":"semiotic/server","docsRoute":"/charts/flow-map","pilot":true},
  "DistanceCartogram": {"category":"geo","recommendedImport":"semiotic/geo"},
  "RealtimeLineChart": {"category":"realtime","recommendedImport":"semiotic/realtime","docsRoute":"/charts/realtime-line-chart","pilot":true},
  "RealtimeHistogram": {"category":"realtime","recommendedImport":"semiotic/realtime"},
  "TemporalHistogram": {"category":"realtime","recommendedImport":"semiotic/realtime"},
  "RealtimeSwarmChart": {"category":"realtime","recommendedImport":"semiotic/realtime"},
  "RealtimeWaterfallChart": {"category":"realtime","recommendedImport":"semiotic/realtime"},
  "RealtimeHeatmap": {"category":"realtime","recommendedImport":"semiotic/realtime"},
  "GaltonBoardChart": {"category":"physics","recommendedImport":"semiotic/physics","serverImport":"semiotic/server","docsRoute":"/charts/galton-board-chart","pilot":true},
  "EventDropChart": {"category":"physics","recommendedImport":"semiotic/physics","serverImport":"semiotic/server"},
  "PhysicsPileChart": {"category":"physics","recommendedImport":"semiotic/physics","serverImport":"semiotic/server"},
  "CollisionSwarmChart": {"category":"physics","recommendedImport":"semiotic/physics","serverImport":"semiotic/server"},
  "GauntletChart": {"category":"physics","recommendedImport":"semiotic/physics","serverImport":"semiotic/server"},
  "ProcessFlowChart": {"category":"physics","recommendedImport":"semiotic/physics","serverImport":"semiotic/server"},
  "PhysicalFlowChart": {"category":"physics","recommendedImport":"semiotic/physics","serverImport":"semiotic/server"},
  "BigNumber": {"category":"value","recommendedImport":"semiotic/value","docsRoute":"/charts/big-number","pilot":true}
}
