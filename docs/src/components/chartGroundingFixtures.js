// Representative configs for the per-chart <ChartGrounding> panel.
//
// One reviewed map keyed by component, so a chart page only needs
// `<ChartGrounding component="X" />` — the props live here. Shapes are drawn
// from the tested SSR-parity fixtures (integration-tests/ssr-parity-fixtures.js)
// so the grounding describes a config the library actually renders. Each entry
// carries a `title` so the accessibility audit reads a labeled chart.
//
// Realtime (push-only) charts and the geo concept page (TileMap) are
// intentionally absent — static-data grounding doesn't represent them.

const xyData = [
  { x: 0, y: 1 }, { x: 1, y: 4 }, { x: 2, y: 2 }, { x: 3, y: 5 }, { x: 4, y: 3 },
]
const seriesData = [
  { x: 0, y: 10, series: "A" }, { x: 1, y: 14, series: "A" }, { x: 2, y: 12, series: "A" }, { x: 3, y: 18, series: "A" },
  { x: 0, y: 6, series: "B" }, { x: 1, y: 8, series: "B" }, { x: 2, y: 13, series: "B" }, { x: 3, y: 11, series: "B" },
]
const bubbleData = [
  { x: 1, y: 4, size: 12 }, { x: 2, y: 7, size: 22 }, { x: 3, y: 5, size: 16 }, { x: 4, y: 9, size: 28 },
]
const candlestickData = [
  { day: 1, open: 12, high: 18, low: 10, close: 16 },
  { day: 2, open: 16, high: 20, low: 14, close: 15 },
  { day: 3, open: 15, high: 24, low: 13, close: 22 },
  { day: 4, open: 22, high: 26, low: 19, close: 21 },
]
const connectedScatterData = [
  { x: 10, y: 20, order: 1 }, { x: 20, y: 42, order: 2 }, { x: 32, y: 34, order: 3 }, { x: 42, y: 62, order: 4 },
]
const differenceData = [
  { x: 0, actual: 12, target: 10 }, { x: 1, actual: 14, target: 16 },
  { x: 2, actual: 19, target: 15 }, { x: 3, actual: 17, target: 18 }, { x: 4, actual: 23, target: 20 },
]
const dualAxisData = [
  { month: 1, revenue: 120, margin: 0.12 }, { month: 2, revenue: 145, margin: 0.18 },
  { month: 3, revenue: 138, margin: 0.15 }, { month: 4, revenue: 162, margin: 0.21 },
]
const matrixData = [
  { reach: 20, cost: 8, score: 72 }, { reach: 35, cost: 14, score: 80 },
  { reach: 48, cost: 19, score: 64 }, { reach: 60, cost: 26, score: 91 },
]
const heatmapData = [
  { xBin: "A", yBin: "Q1", value: 12 }, { xBin: "B", yBin: "Q1", value: 19 }, { xBin: "C", yBin: "Q1", value: 6 },
  { xBin: "A", yBin: "Q2", value: 22 }, { xBin: "B", yBin: "Q2", value: 9 }, { xBin: "C", yBin: "Q2", value: 31 },
]
const quadrantData = [
  { x: 20, y: 80 }, { x: 70, y: 85 }, { x: 75, y: 30 }, { x: 30, y: 25 }, { x: 55, y: 50 },
]
const categoryData = [
  { region: "AMER", value: 42 }, { region: "EMEA", value: 33 }, { region: "APAC", value: 51 }, { region: "LATAM", value: 18 },
]
const groupedCategoryData = [
  { region: "AMER", segment: "Enterprise", value: 26 }, { region: "AMER", segment: "SMB", value: 16 },
  { region: "EMEA", segment: "Enterprise", value: 18 }, { region: "EMEA", segment: "SMB", value: 15 },
  { region: "APAC", segment: "Enterprise", value: 28 }, { region: "APAC", segment: "SMB", value: 23 },
]
const funnelData = [
  { step: "Visited", value: 100 }, { step: "Activated", value: 52 }, { step: "Paid", value: 24 },
]
const likertLevels = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]
const likertData = [
  { question: "Clarity", level: "Disagree", value: 8 }, { question: "Clarity", level: "Neutral", value: 12 },
  { question: "Clarity", level: "Agree", value: 28 }, { question: "Clarity", level: "Strongly Agree", value: 18 },
  { question: "Trust", level: "Disagree", value: 10 }, { question: "Trust", level: "Neutral", value: 16 },
  { question: "Trust", level: "Agree", value: 22 }, { question: "Trust", level: "Strongly Agree", value: 14 },
]
const swimlaneData = [
  { lane: "Design", phase: "Plan", value: 18 }, { lane: "Design", phase: "Build", value: 28 },
  { lane: "Engineering", phase: "Plan", value: 14 }, { lane: "Engineering", phase: "Build", value: 34 },
]
const statisticalData = [
  { category: "Alpha", value: 20 }, { category: "Alpha", value: 24 }, { category: "Alpha", value: 29 }, { category: "Alpha", value: 38 },
  { category: "Beta", value: 14 }, { category: "Beta", value: 18 }, { category: "Beta", value: 28 }, { category: "Beta", value: 35 },
  { category: "Gamma", value: 30 }, { category: "Gamma", value: 37 }, { category: "Gamma", value: 42 }, { category: "Gamma", value: 47 },
]
const networkNodes = [{ id: "a" }, { id: "b" }, { id: "c" }]
const networkEdges = [
  { source: "a", target: "b", value: 5 }, { source: "b", target: "c", value: 3 },
]
const chordEdges = [
  { source: "Product", target: "Support", value: 8 }, { source: "Support", target: "Success", value: 5 },
  { source: "Success", target: "Product", value: 3 }, { source: "Product", target: "Sales", value: 6 },
]
const hierarchy = {
  name: "root",
  children: [
    { name: "alpha", value: 10, children: [{ name: "a1", value: 4 }, { name: "a2", value: 6 }] },
    { name: "beta", value: 7 },
    { name: "gamma", value: 4 },
  ],
}
const psNodes = [
  { id: "Alice", category: "Person", xExtent: [1767657600000, 1767657600000] },
  { id: "Bob", category: "Person", xExtent: [1769472000000, 1769472000000] },
  { id: "Eng", category: "Team" },
  { id: "Release", category: "Milestone", xExtent: [1776384000000, 1779494400000] },
]
const psEdges = [
  { id: "alice-eng", source: "Alice", target: "Eng", value: 8, startTime: 1769904000000, endTime: 1771632000000 },
  { id: "bob-eng", source: "Bob", target: "Eng", value: 5, startTime: 1771977600000, endTime: 1774569600000 },
  { id: "eng-rel", source: "Eng", target: "Release", value: 13, startTime: 1776384000000, endTime: 1778889600000 },
]
const psDomain = [1767225600000, 1779494400000]
const geoAreas = [
  { type: "Feature", properties: { name: "Region A", value: 100 }, geometry: { type: "Polygon", coordinates: [[[-10, 40], [10, 40], [10, 50], [-10, 50], [-10, 40]]] } },
  { type: "Feature", properties: { name: "Region B", value: 200 }, geometry: { type: "Polygon", coordinates: [[[10, 40], [30, 40], [30, 50], [10, 50], [10, 40]]] } },
  { type: "Feature", properties: { name: "Region C", value: 150 }, geometry: { type: "Polygon", coordinates: [[[-10, 50], [10, 50], [10, 60], [-10, 60], [-10, 50]]] } },
]
const geoPoints = [
  { city: "Alpha", lon: 0, lat: 45, magnitude: 30 }, { city: "Beta", lon: 20, lat: 55, magnitude: 60 },
  { city: "Gamma", lon: -5, lat: 50, magnitude: 45 }, { city: "Delta", lon: 15, lat: 42, magnitude: 20 },
]
const geoFlows = [
  { source: "Alpha", target: "Beta", value: 50 }, { source: "Alpha", target: "Gamma", value: 30 }, { source: "Gamma", target: "Delta", value: 25 },
]

const chartGroundingFixtures = {
  // XY
  LineChart: { data: xyData, xAccessor: "x", yAccessor: "y", title: "Value over time" },
  AreaChart: { data: xyData, xAccessor: "x", yAccessor: "y", title: "Value over time" },
  BumpChart: { data: seriesData, xAccessor: "x", yAccessor: "y", lineBy: "series", title: "Ranking over time" },
  StackedAreaChart: { data: seriesData, xAccessor: "x", yAccessor: "y", areaBy: "series", title: "Composition over time" },
  Scatterplot: { data: bubbleData, xAccessor: "x", yAccessor: "y", title: "Y by X" },
  ConnectedScatterplot: { data: connectedScatterData, xAccessor: "x", yAccessor: "y", orderAccessor: "order", title: "Trajectory through X–Y space" },
  DifferenceChart: { data: differenceData, xAccessor: "x", seriesAAccessor: "actual", seriesBAccessor: "target", seriesALabel: "Actual", seriesBLabel: "Target", title: "Actual vs. target over time" },
  BubbleChart: { data: bubbleData, xAccessor: "x", yAccessor: "y", sizeBy: "size", title: "Y by X, sized by magnitude" },
  Heatmap: { data: heatmapData, xAccessor: "xBin", yAccessor: "yBin", valueAccessor: "value", title: "Value by bin" },
  ScatterplotMatrix: { data: matrixData, fields: ["reach", "cost", "score"], title: "Pairwise relationships" },
  QuadrantChart: { data: quadrantData, xAccessor: "x", yAccessor: "y", xCenter: 50, yCenter: 50, title: "Four-quadrant positioning" },
  MultiAxisLineChart: { data: dualAxisData, xAccessor: "month", series: [{ yAccessor: "revenue" }, { yAccessor: "margin" }], title: "Two metrics on dual axes" },
  CandlestickChart: { data: candlestickData, xAccessor: "day", highAccessor: "high", lowAccessor: "low", openAccessor: "open", closeAccessor: "close", title: "OHLC range over time" },

  // Categorical / ordinal
  BarChart: { data: categoryData, categoryAccessor: "region", valueAccessor: "value", title: "Value by category" },
  StackedBarChart: { data: groupedCategoryData, categoryAccessor: "region", valueAccessor: "value", stackBy: "segment", title: "Stacked value by category" },
  GroupedBarChart: { data: groupedCategoryData, categoryAccessor: "region", valueAccessor: "value", groupBy: "segment", title: "Grouped value by category" },
  SwarmPlot: { data: statisticalData, categoryAccessor: "category", valueAccessor: "value", title: "Distribution by category" },
  BoxPlot: { data: statisticalData, categoryAccessor: "category", valueAccessor: "value", title: "Distribution by category" },
  Histogram: { data: statisticalData, categoryAccessor: "category", valueAccessor: "value", bins: 8, title: "Value distribution" },
  ViolinPlot: { data: statisticalData, categoryAccessor: "category", valueAccessor: "value", bins: 8, title: "Distribution by category" },
  DotPlot: { data: statisticalData, categoryAccessor: "category", valueAccessor: "value", title: "Value by category" },
  RidgelinePlot: { data: statisticalData, categoryAccessor: "category", valueAccessor: "value", bins: 8, title: "Distributions across categories" },
  PieChart: { data: categoryData, categoryAccessor: "region", valueAccessor: "value", title: "Share by category" },
  DonutChart: { data: categoryData, categoryAccessor: "region", valueAccessor: "value", title: "Share by category" },
  GaugeChart: { value: 64, min: 0, max: 100, title: "Progress toward target" },
  FunnelChart: { data: funnelData, stepAccessor: "step", valueAccessor: "value", title: "Conversion funnel" },
  SwimlaneChart: { data: swimlaneData, categoryAccessor: "lane", subcategoryAccessor: "phase", valueAccessor: "value", title: "Activity by lane and phase" },
  LikertChart: { data: likertData, categoryAccessor: "question", levelAccessor: "level", countAccessor: "value", levels: likertLevels, title: "Survey responses" },

  // Network
  ForceDirectedGraph: { nodes: networkNodes, edges: networkEdges, nodeIDAccessor: "id", sourceAccessor: "source", targetAccessor: "target", title: "Relationship network" },
  ChordDiagram: { edges: chordEdges, sourceAccessor: "source", targetAccessor: "target", valueAccessor: "value", title: "Flows between groups" },
  SankeyDiagram: { nodes: networkNodes, edges: networkEdges, nodeIdAccessor: "id", sourceAccessor: "source", targetAccessor: "target", valueAccessor: "value", title: "Flow magnitudes" },
  ProcessSankey: { nodes: psNodes, edges: psEdges, domain: psDomain, colorBy: "category", title: "Temporal flow" },
  TreeDiagram: { data: hierarchy, childrenAccessor: "children", title: "Hierarchy" },
  Treemap: { data: hierarchy, childrenAccessor: "children", valueAccessor: "value", title: "Nested proportions" },
  CirclePack: { data: hierarchy, childrenAccessor: "children", valueAccessor: "value", title: "Nested proportions" },
  OrbitDiagram: { data: hierarchy, childrenAccessor: "children", nodeIdAccessor: "name", title: "Orbital hierarchy" },

  // Geo
  ChoroplethMap: { areas: geoAreas, valueAccessor: (d) => d.properties.value, colorScheme: "blues", title: "Value by region" },
  ProportionalSymbolMap: { points: geoPoints, xAccessor: "lon", yAccessor: "lat", sizeBy: "magnitude", areas: geoAreas, title: "Magnitude by location" },
  FlowMap: { nodes: geoPoints, flows: geoFlows, nodeIdAccessor: "city", xAccessor: "lon", yAccessor: "lat", valueAccessor: "value", areas: geoAreas, title: "Flows between places" },
  DistanceCartogram: { points: geoPoints, nodeIdAccessor: "city", xAccessor: "lon", yAccessor: "lat", center: "Alpha", costAccessor: "magnitude", title: "Distance by cost from center" },

  // Value
  BigNumber: { value: 4218, label: "Active users", format: "compact", title: "Active users" },
}

export default chartGroundingFixtures
