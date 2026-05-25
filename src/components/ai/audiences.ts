import type { AudienceProfile } from "./audienceProfile"

/**
 * Three example AudienceProfile shapes. Not authoritative — these are
 * sketches based on rough industry stereotypes, useful for documentation,
 * demos, and as starting points consumers can fork.
 *
 * To use one in production, copy it and tune to your audience's actual
 * survey/telemetry data. Do not assume these defaults represent your team.
 */

/**
 * Executive audience — high familiarity with bar/line/pie/gauge,
 * limited tolerance for unfamiliar chart shapes. Most likely to encounter
 * dashboards built by analysts; not building their own.
 */
export const executivePersona: AudienceProfile = {
  name: "Executive",
  familiarity: {
    // Boardroom-comfortable
    BarChart: 5,
    LineChart: 5,
    PieChart: 5,
    DonutChart: 4,
    GaugeChart: 5,
    AreaChart: 4,
    FunnelChart: 4,
    ChoroplethMap: 4,

    // Recognizable but less common
    Histogram: 3,
    Heatmap: 3,
    StackedBarChart: 3,
    StackedAreaChart: 3,
    Scatterplot: 3,
    BubbleChart: 3,
    GroupedBarChart: 3,
    DotPlot: 3,

    // Specialist
    BoxPlot: 2,
    ViolinPlot: 1,
    SwarmPlot: 1,
    RidgelinePlot: 1,
    MultiAxisLineChart: 2,
    CandlestickChart: 2,
    DifferenceChart: 2,
    QuadrantChart: 3,
    LikertChart: 3,
    SwimlaneChart: 2,
    MinimapChart: 2,
    ConnectedScatterplot: 1,

    // Network/hierarchy
    SankeyDiagram: 2,
    TreeDiagram: 3,
    Treemap: 3,
    CirclePack: 2,
    OrbitDiagram: 1,
    ChordDiagram: 1,
    ProcessSankey: 2,
    ForceDirectedGraph: 1,

    // Geo specialist
    ProportionalSymbolMap: 3,
    FlowMap: 2,
    DistanceCartogram: 1,
  },
  targets: {
    PieChart: {
      direction: "decrease",
      weight: 1,
      reason: "shifting from share-by-angle toward share-by-length for accuracy",
    },
    BarChart: {
      direction: "increase",
      weight: 1,
    },
  },
  exposureLevel: 1,
}

/**
 * Analyst audience — broader chart vocabulary, comfortable with
 * distribution-shape and matrix-shape charts. Building dashboards for
 * others; can read most things on first encounter.
 */
export const analystPersona: AudienceProfile = {
  name: "Analyst",
  familiarity: {
    BarChart: 5,
    LineChart: 5,
    PieChart: 4,
    DonutChart: 4,
    AreaChart: 5,
    StackedAreaChart: 4,
    StackedBarChart: 5,
    GroupedBarChart: 5,
    Histogram: 5,
    Heatmap: 5,
    Scatterplot: 5,
    BubbleChart: 4,
    BoxPlot: 4,
    DotPlot: 4,
    GaugeChart: 3,
    FunnelChart: 4,
    LikertChart: 4,
    QuadrantChart: 4,
    SwimlaneChart: 4,
    MinimapChart: 4,
    DifferenceChart: 3,
    MultiAxisLineChart: 4,
    CandlestickChart: 3,
    ConnectedScatterplot: 3,

    // Less common in analyst workflows
    ViolinPlot: 3,
    SwarmPlot: 3,
    RidgelinePlot: 2,

    // Network/hierarchy
    TreeDiagram: 4,
    Treemap: 4,
    CirclePack: 3,
    SankeyDiagram: 4,
    ProcessSankey: 3,
    ChordDiagram: 3,
    OrbitDiagram: 2,
    ForceDirectedGraph: 3,

    // Geo
    ChoroplethMap: 4,
    ProportionalSymbolMap: 4,
    FlowMap: 3,
    DistanceCartogram: 2,
  },
  targets: {
    PieChart: { direction: "decrease", weight: 1 },
    BoxPlot: {
      direction: "increase",
      weight: 1,
      reason: "team is shifting from averages to distribution-aware comparisons",
    },
  },
  exposureLevel: 1,
}

/**
 * Data scientist audience — comfortable with the full distribution-chart
 * family, regression overlays, and density encodings. Will accept most
 * exotic shapes if they're more honest about the data.
 */
export const dataScientistPersona: AudienceProfile = {
  name: "Data scientist",
  familiarity: {
    BarChart: 5,
    LineChart: 5,
    PieChart: 3,
    DonutChart: 3,
    AreaChart: 5,
    StackedAreaChart: 5,
    StackedBarChart: 5,
    GroupedBarChart: 5,
    Histogram: 5,
    Heatmap: 5,
    Scatterplot: 5,
    BubbleChart: 5,
    BoxPlot: 5,
    ViolinPlot: 5,
    SwarmPlot: 4,
    RidgelinePlot: 4,
    DotPlot: 4,
    QuadrantChart: 4,
    LikertChart: 4,
    DifferenceChart: 4,
    MultiAxisLineChart: 4,
    ConnectedScatterplot: 4,
    GaugeChart: 2,
    FunnelChart: 3,
    SwimlaneChart: 3,
    MinimapChart: 4,
    CandlestickChart: 3,

    // Network/hierarchy
    TreeDiagram: 4,
    Treemap: 4,
    CirclePack: 4,
    SankeyDiagram: 4,
    ProcessSankey: 3,
    ChordDiagram: 3,
    OrbitDiagram: 2,
    ForceDirectedGraph: 4,

    // Geo
    ChoroplethMap: 4,
    ProportionalSymbolMap: 4,
    FlowMap: 3,
    DistanceCartogram: 3,
  },
  targets: {
    PieChart: {
      direction: "decrease",
      weight: 2,
      reason: "preferring length-encoded comparisons for precision",
    },
    BarChart: {
      direction: "decrease",
      weight: 1,
      reason: "promoting distribution-aware charts over single-value bars when raw observations are available",
    },
    BoxPlot: { direction: "increase", weight: 1 },
    ViolinPlot: { direction: "increase", weight: 1 },
  },
  exposureLevel: 2,
}

/**
 * Convenience map for consumers loading audience by name (e.g. from a config string).
 */
export const BUILT_IN_AUDIENCES: Record<string, AudienceProfile> = {
  executive: executivePersona,
  analyst: analystPersona,
  "data-scientist": dataScientistPersona,
}
