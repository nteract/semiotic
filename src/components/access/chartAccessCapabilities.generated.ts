/**
 * Generated from chartSpecs capability metadata by
 * scripts/generate-capabilities-json.mjs. Do not edit by hand.
 */
export type GeneratedMarkNavigation =
  "built-in" | "delegated" | "not-applicable" | "unsupported"

export interface GeneratedChartAccessCapabilities {
  readonly supportsSSR: boolean
  readonly realtime: boolean
  readonly supportsAccessibleTable: boolean
  readonly supportsLegend: boolean
  readonly recipeNavigation?: true
  readonly markNavigation: GeneratedMarkNavigation
}

type GeneratedChartAccessCapabilityRow = readonly [
  name: string,
  flags: number,
  markNavigation?: GeneratedMarkNavigation
]

// Boolean capabilities are packed into flags so this public tooling registry
// does not repeat the same property names for every chart in consumer bundles.
const CAPABILITY_ROWS: readonly GeneratedChartAccessCapabilityRow[] = [
  ["AreaChart", 13],
  ["BubbleChart", 13],
  ["BumpChart", 13],
  ["CandlestickChart", 13],
  ["ConnectedScatterplot", 13],
  ["DifferenceChart", 13],
  ["Heatmap", 13],
  ["LineChart", 13],
  ["MinimapChart", 13, "delegated"],
  ["MultiAxisLineChart", 13],
  ["QuadrantChart", 13],
  ["Scatterplot", 13],
  ["ScatterplotMatrix", 13, "delegated"],
  ["StackedAreaChart", 13],
  ["WaterfallChart", 13],
  ["BarChart", 13],
  ["BoxPlot", 13],
  ["DonutChart", 13],
  ["DotPlot", 13],
  ["FunnelChart", 13],
  ["GaugeChart", 5],
  ["GroupedBarChart", 13],
  ["Histogram", 13],
  ["LikertChart", 13],
  ["PieChart", 13],
  ["RadarChart", 13],
  ["RidgelinePlot", 13],
  ["StackedBarChart", 13],
  ["SwarmPlot", 13],
  ["SwimlaneChart", 13],
  ["ViolinPlot", 13],
  ["ChordDiagram", 13],
  ["CirclePack", 13],
  ["ForceDirectedGraph", 13],
  ["OrbitDiagram", 13],
  ["ProcessSankey", 13],
  ["SankeyDiagram", 13],
  ["TreeDiagram", 13],
  ["Treemap", 13],
  ["ChoroplethMap", 13],
  ["DistanceCartogram", 13],
  ["FlowMap", 13],
  ["ProportionalSymbolMap", 13],
  ["RealtimeHeatmap", 14],
  ["RealtimeHistogram", 14],
  ["RealtimeLineChart", 14],
  ["RealtimeSwarmChart", 14],
  ["RealtimeWaterfallChart", 14],
  ["TemporalHistogram", 13],
  ["ChainReactionChart", 5],
  ["CollisionSwarmChart", 13],
  ["CrucibleChart", 5],
  ["EventDropChart", 13],
  ["GaltonBoardChart", 13],
  ["GauntletChart", 5],
  ["PacketFlowChart", 13],
  ["ProcessFlowChart", 13],
  ["UnitPileChart", 13],
  ["BigNumber", 1, "not-applicable"],
  ["ParallelCoordinatesRecipe", 21],
  ["CalendarHeatmapRecipe", 21]
]

export const CHART_ACCESS_CAPABILITIES: Readonly<
  Record<string, GeneratedChartAccessCapabilities>
> = Object.freeze(
  Object.fromEntries(
    CAPABILITY_ROWS.map(([name, flags, markNavigation = "unsupported"]) => [
      name,
      {
        supportsSSR: Boolean(flags & 1),
        realtime: Boolean(flags & 2),
        supportsAccessibleTable: Boolean(flags & 4),
        supportsLegend: Boolean(flags & 8),
        ...(flags & 16 ? { recipeNavigation: true as const } : {}),
        markNavigation
      }
    ])
  )
)
