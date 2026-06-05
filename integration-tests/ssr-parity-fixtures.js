// Shared SSR/CSR parity fixtures.
//
// The Playwright spec uses these props for `renderChart(component, props)`;
// the browser fixture renders the same component+props through the live HOC.
// Keep this module React-light: callers pass their React instance so graphics
// fixtures can create React nodes without coupling this file to either the
// browser bundle or Playwright's Node runtime.

const xyData = [
  { x: 0, y: 1 },
  { x: 1, y: 4 },
  { x: 2, y: 2 },
  { x: 3, y: 5 },
  { x: 4, y: 3 },
]

const groupedXyData = [
  { x: 0, y: 10, series: "A" },
  { x: 1, y: 14, series: "A" },
  { x: 2, y: 12, series: "A" },
  { x: 3, y: 18, series: "A" },
  { x: 0, y: 6, series: "B" },
  { x: 1, y: 8, series: "B" },
  { x: 2, y: 13, series: "B" },
  { x: 3, y: 11, series: "B" },
]

const differenceData = [
  { x: 0, actual: 12, target: 10 },
  { x: 1, actual: 14, target: 16 },
  { x: 2, actual: 19, target: 15 },
  { x: 3, actual: 17, target: 18 },
  { x: 4, actual: 23, target: 20 },
]

const heatmapData = [
  { xBin: "A", yBin: "Q1", value: 12 },
  { xBin: "B", yBin: "Q1", value: 19 },
  { xBin: "C", yBin: "Q1", value: 6 },
  { xBin: "A", yBin: "Q2", value: 22 },
  { xBin: "B", yBin: "Q2", value: 9 },
  { xBin: "C", yBin: "Q2", value: 31 },
  { xBin: "A", yBin: "Q3", value: 8 },
  { xBin: "B", yBin: "Q3", value: 27 },
  { xBin: "C", yBin: "Q3", value: 14 },
]

const quadrantData = [
  { x: 20, y: 80, segment: "risk" },
  { x: 70, y: 85, segment: "growth" },
  { x: 75, y: 30, segment: "watch" },
  { x: 30, y: 25, segment: "low" },
  { x: 55, y: 50, segment: "center" },
]

const categoryData = [
  { region: "AMER", value: 42 },
  { region: "EMEA", value: 33 },
  { region: "APAC", value: 51 },
]

const statisticalData = [
  { category: "Alpha", value: 20 },
  { category: "Alpha", value: 24 },
  { category: "Alpha", value: 29 },
  { category: "Alpha", value: 32 },
  { category: "Alpha", value: 38 },
  { category: "Beta", value: 14 },
  { category: "Beta", value: 18 },
  { category: "Beta", value: 22 },
  { category: "Beta", value: 28 },
  { category: "Beta", value: 35 },
  { category: "Gamma", value: 30 },
  { category: "Gamma", value: 33 },
  { category: "Gamma", value: 37 },
  { category: "Gamma", value: 42 },
  { category: "Gamma", value: 47 },
]

const networkNodes = [{ id: "a" }, { id: "b" }, { id: "c" }]
const networkEdges = [
  { source: "a", target: "b", value: 5 },
  { source: "b", target: "c", value: 3 },
]

const hierarchy = {
  name: "root",
  children: [
    { name: "alpha", value: 10 },
    { name: "beta", value: 7 },
    { name: "gamma", value: 4 },
  ],
}

// ProcessSankey fixture: a tiny 4-node temporal flow. Inline timestamps
// (ms since epoch) keep the spec-side mirror byte-identical.
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
  {
    type: "Feature",
    properties: { name: "Region A", value: 100 },
    geometry: {
      type: "Polygon",
      coordinates: [[[-10, 40], [10, 40], [10, 50], [-10, 50], [-10, 40]]],
    },
  },
  {
    type: "Feature",
    properties: { name: "Region B", value: 200 },
    geometry: {
      type: "Polygon",
      coordinates: [[[10, 40], [30, 40], [30, 50], [10, 50], [10, 40]]],
    },
  },
  {
    type: "Feature",
    properties: { name: "Region C", value: 150 },
    geometry: {
      type: "Polygon",
      coordinates: [[[-10, 50], [10, 50], [10, 60], [-10, 60], [-10, 50]]],
    },
  },
]

const geoPoints = [
  { city: "Alpha", lon: 0, lat: 45, magnitude: 30 },
  { city: "Beta", lon: 20, lat: 55, magnitude: 60 },
  { city: "Gamma", lon: -5, lat: 50, magnitude: 45 },
  { city: "Delta", lon: 15, lat: 42, magnitude: 20 },
]

const geoFlows = [
  { source: "Alpha", target: "Beta", value: 50 },
  { source: "Alpha", target: "Gamma", value: 30 },
  { source: "Gamma", target: "Delta", value: 25 },
]

function graphicsProps(React) {
  const h = React.createElement
  return {
    backgroundGraphics: h(
      "g",
      null,
      h("rect", {
        x: 0,
        y: 0,
        width: 320,
        height: 150,
        fill: "#fff7ed",
        stroke: "#fb923c",
        strokeWidth: 2,
      }),
      h("text", { x: 10, y: 22, fill: "#9a3412", fontSize: 12 }, "SSR-BG")
    ),
    foregroundGraphics: h(
      "g",
      null,
      h("line", {
        x1: 0,
        y1: 0,
        x2: 320,
        y2: 150,
        stroke: "#7c3aed",
        strokeWidth: 2,
        strokeDasharray: "4 4",
      }),
      h("text", { x: 230, y: 18, fill: "#5b21b6", fontSize: 12 }, "SSR-FG")
    ),
  }
}

const calloutAnnotations = [
  { type: "callout", x: 3, y: 5, label: "Peak", dx: -36, dy: -38, color: "#7c3aed" },
  { type: "text", x: 1, y: 4, label: "Lift", dx: 8, dy: -10, color: "#0f766e" },
]

const deferredAnnotations = [
  { type: "callout", x: 2, y: 2, label: "Deferred context", dx: 24, dy: 38, color: "#0f766e", _annotationDeferred: true },
]

const statusAnnotations = [
  {
    type: "callout",
    x: 1,
    y: 4,
    label: "Contested (?)",
    dx: 34,
    dy: -34,
    color: "#dc2626",
    opacity: 0.7,
    strokeDasharray: "2 3",
    lifecycle: { status: "disputed" },
  },
]

const geoAnnotations = [
  { type: "callout", coordinates: [20, 55], label: "Beta", dx: 24, dy: -24, color: "#7c3aed" },
]

function makeSsrParityCases(React) {
  return [
    {
      id: "line",
      component: "LineChart",
      props: { data: xyData, xAccessor: "x", yAccessor: "y", width: 400, height: 200 },
    },
    {
      id: "bar",
      component: "BarChart",
      props: { data: categoryData, categoryAccessor: "region", valueAccessor: "value", width: 400, height: 200 },
    },
    {
      id: "pie",
      component: "PieChart",
      props: { data: categoryData, categoryAccessor: "region", valueAccessor: "value", width: 300, height: 300 },
    },
    {
      id: "sankey",
      component: "SankeyDiagram",
      props: {
        nodes: networkNodes,
        edges: networkEdges,
        valueAccessor: "value",
        nodeIdAccessor: "id",
        sourceAccessor: "source",
        targetAccessor: "target",
        width: 500,
        height: 300,
      },
    },
    {
      id: "treemap",
      component: "Treemap",
      props: { data: hierarchy, childrenAccessor: "children", valueAccessor: "value", width: 500, height: 400 },
    },
    {
      id: "process-sankey",
      component: "ProcessSankey",
      props: {
        nodes: psNodes,
        edges: psEdges,
        domain: psDomain,
        colorBy: "category",
        showLegend: true,
        width: 500,
        height: 320,
      },
    },
    {
      id: "difference",
      component: "DifferenceChart",
      props: {
        data: differenceData,
        xAccessor: "x",
        seriesAAccessor: "actual",
        seriesBAccessor: "target",
        width: 420,
        height: 240,
        showLines: true,
      },
    },
    {
      id: "heatmap",
      component: "Heatmap",
      props: {
        data: heatmapData,
        xAccessor: "xBin",
        yAccessor: "yBin",
        valueAccessor: "value",
        showValues: true,
        width: 420,
        height: 240,
      },
    },
    {
      id: "quadrant",
      component: "QuadrantChart",
      props: {
        data: quadrantData,
        xAccessor: "x",
        yAccessor: "y",
        colorBy: "segment",
        xCenter: 50,
        yCenter: 50,
        quadrants: {
          topRight: { label: "High / High", color: "#16a34a" },
          topLeft: { label: "Low / High", color: "#f59e0b" },
          bottomRight: { label: "High / Low", color: "#2563eb" },
          bottomLeft: { label: "Low / Low", color: "#dc2626" },
        },
        width: 420,
        height: 260,
      },
    },
    {
      id: "boxplot",
      component: "BoxPlot",
      props: { data: statisticalData, categoryAccessor: "category", valueAccessor: "value", width: 420, height: 260 },
    },
    {
      id: "violin",
      component: "ViolinPlot",
      props: { data: statisticalData, categoryAccessor: "category", valueAccessor: "value", bins: 8, width: 420, height: 260 },
    },
    {
      id: "swarm",
      component: "SwarmPlot",
      props: { data: statisticalData, categoryAccessor: "category", valueAccessor: "value", colorBy: "category", width: 420, height: 260 },
    },
    {
      id: "dotplot",
      component: "DotPlot",
      props: { data: statisticalData, categoryAccessor: "category", valueAccessor: "value", colorBy: "category", width: 420, height: 260 },
    },
    {
      id: "histogram",
      component: "Histogram",
      props: { data: statisticalData, categoryAccessor: "category", valueAccessor: "value", bins: 8, width: 420, height: 260 },
    },
    {
      id: "ridgeline",
      component: "RidgelinePlot",
      props: { data: statisticalData, categoryAccessor: "category", valueAccessor: "value", bins: 8, width: 420, height: 260 },
    },
    {
      id: "choropleth",
      component: "ChoroplethMap",
      package: "geo",
      props: { areas: geoAreas, valueAccessor: (d) => d.properties.value, colorScheme: "blues", width: 460, height: 300 },
    },
    {
      id: "proportional-symbol",
      component: "ProportionalSymbolMap",
      package: "geo",
      props: {
        points: geoPoints,
        xAccessor: "lon",
        yAccessor: "lat",
        sizeBy: "magnitude",
        areas: geoAreas,
        width: 460,
        height: 300,
      },
    },
    {
      id: "flowmap",
      component: "FlowMap",
      package: "geo",
      props: {
        nodes: geoPoints,
        flows: geoFlows,
        nodeIdAccessor: "city",
        xAccessor: "lon",
        yAccessor: "lat",
        areas: geoAreas,
        width: 460,
        height: 300,
      },
    },
    {
      id: "line-graphics",
      component: "LineChart",
      props: {
        data: groupedXyData,
        xAccessor: "x",
        yAccessor: "y",
        lineBy: "series",
        colorBy: "series",
        width: 420,
        height: 240,
        frameProps: graphicsProps(React),
      },
    },
    {
      id: "line-dark-theme",
      component: "LineChart",
      theme: "dark",
      props: {
        data: groupedXyData,
        xAccessor: "x",
        yAccessor: "y",
        lineBy: "series",
        colorBy: "series",
        showLegend: true,
        showGrid: true,
        width: 420,
        height: 260,
      },
    },
    {
      id: "annotation-callout",
      component: "LineChart",
      props: {
        data: xyData,
        xAccessor: "x",
        yAccessor: "y",
        annotations: calloutAnnotations,
        width: 420,
        height: 240,
      },
    },
    {
      id: "annotation-progressive",
      component: "LineChart",
      props: {
        data: xyData,
        xAccessor: "x",
        yAccessor: "y",
        annotations: deferredAnnotations,
        width: 420,
        height: 240,
      },
    },
    {
      id: "annotation-status",
      component: "LineChart",
      props: {
        data: xyData,
        xAccessor: "x",
        yAccessor: "y",
        annotations: statusAnnotations,
        width: 420,
        height: 240,
      },
    },
    {
      id: "geo-annotation",
      component: "ProportionalSymbolMap",
      package: "geo",
      props: {
        points: geoPoints,
        xAccessor: "lon",
        yAccessor: "lat",
        sizeBy: "magnitude",
        areas: geoAreas,
        annotations: geoAnnotations,
        width: 460,
        height: 300,
      },
    },
  ]
}

module.exports = { makeSsrParityCases }
