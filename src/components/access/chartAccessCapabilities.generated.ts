/**
 * Generated from chartSpecs capability metadata by
 * scripts/generate-capabilities-json.mjs. Do not edit by hand.
 */
export type GeneratedMarkNavigation =
  | "built-in"
  | "delegated"
  | "not-applicable"
  | "unsupported"

export interface GeneratedChartAccessCapabilities {
  readonly supportsSSR: boolean
  readonly realtime: boolean
  readonly supportsAccessibleTable: boolean
  readonly supportsLegend: boolean
  readonly recipeNavigation?: true
  readonly markNavigation: GeneratedMarkNavigation
}

export const CHART_ACCESS_CAPABILITIES: Readonly<
  Record<string, GeneratedChartAccessCapabilities>
> = Object.freeze({
  "AreaChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "BubbleChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "BumpChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "CandlestickChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "ConnectedScatterplot": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "DifferenceChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "Heatmap": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "LineChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "MinimapChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "delegated"
  },
  "MultiAxisLineChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "QuadrantChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "Scatterplot": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "ScatterplotMatrix": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "delegated"
  },
  "StackedAreaChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "WaterfallChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "BarChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "BoxPlot": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "DonutChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "DotPlot": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "FunnelChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "GaugeChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": false,
    "markNavigation": "unsupported"
  },
  "GroupedBarChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "Histogram": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "LikertChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "PieChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "RadarChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "RidgelinePlot": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "StackedBarChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "SwarmPlot": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "SwimlaneChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "ViolinPlot": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "ChordDiagram": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "CirclePack": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "ForceDirectedGraph": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "OrbitDiagram": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "ProcessSankey": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "SankeyDiagram": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "TreeDiagram": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "Treemap": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "ChoroplethMap": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "DistanceCartogram": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "FlowMap": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "ProportionalSymbolMap": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "RealtimeHeatmap": {
    "supportsSSR": false,
    "realtime": true,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "RealtimeHistogram": {
    "supportsSSR": false,
    "realtime": true,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "RealtimeLineChart": {
    "supportsSSR": false,
    "realtime": true,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "RealtimeSwarmChart": {
    "supportsSSR": false,
    "realtime": true,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "RealtimeWaterfallChart": {
    "supportsSSR": false,
    "realtime": true,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "TemporalHistogram": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "ChainReactionChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": false,
    "markNavigation": "unsupported"
  },
  "CollisionSwarmChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "CrucibleChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": false,
    "markNavigation": "unsupported"
  },
  "EventDropChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "GaltonBoardChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "GauntletChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": false,
    "markNavigation": "unsupported"
  },
  "PacketFlowChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "ProcessFlowChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "UnitPileChart": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": true,
    "markNavigation": "unsupported"
  },
  "BigNumber": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": false,
    "supportsLegend": false,
    "markNavigation": "not-applicable"
  },
  "ParallelCoordinatesRecipe": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": false,
    "recipeNavigation": true,
    "markNavigation": "unsupported"
  },
  "CalendarHeatmapRecipe": {
    "supportsSSR": true,
    "realtime": false,
    "supportsAccessibleTable": true,
    "supportsLegend": false,
    "recipeNavigation": true,
    "markNavigation": "unsupported"
  }
})
