/**
 * Chart-specific prop mapping for renderChart().
 *
 * Each entry maps HOC-level props (categoryAccessor, valueAccessor, etc.)
 * to frame-level props (oAccessor, rAccessor, etc.) for server rendering.
 *
 * Extracted from renderToStaticSVG.tsx's 400-line switch statement to make
 * each chart type independently readable and testable.
 */

type FrameType = "xy" | "ordinal" | "network" | "geo"

interface ChartConfig {
  frameType: FrameType
  /** Build frame props from HOC-level props */
  buildProps: (data: any, colorBy: any, colorScheme: any, common: Record<string, any>, rest: Record<string, any>) => Record<string, any>
}

// ── XY Charts ──────────────────────────────────────────────────────────

const sparkline: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "line",
    data,
    xAccessor: rest.xAccessor || "x",
    yAccessor: rest.yAccessor || "y",
    groupAccessor: rest.lineBy || colorBy,
    colorAccessor: colorBy,
    ...common,
    // Sparkline-specific overrides — always applied regardless of frameProps
    showAxes: false,
    margin: common.margin || { top: 2, right: 2, bottom: 2, left: 2 },
    showLegend: false,
    showGrid: false,
    title: undefined,
  }),
}

const lineChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "line",
    data,
    xAccessor: rest.xAccessor || "x",
    yAccessor: rest.yAccessor || "y",
    groupAccessor: rest.lineBy || colorBy,
    colorAccessor: colorBy,
    colorScheme,
    lineStyle: rest.lineStyle,
    ...common,
  }),
}

const areaChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "area",
    data,
    xAccessor: rest.xAccessor || "x",
    yAccessor: rest.yAccessor || "y",
    y0Accessor: rest.y0Accessor,
    groupAccessor: rest.areaBy || colorBy,
    colorAccessor: colorBy,
    colorScheme,
    ...common,
  }),
}

const stackedAreaChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "stackedarea",
    data,
    xAccessor: rest.xAccessor || "x",
    yAccessor: rest.yAccessor || "y",
    groupAccessor: rest.areaBy,
    colorAccessor: colorBy || rest.areaBy,
    colorScheme,
    normalize: rest.normalize,
    ...common,
  }),
}

const scatterplot: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "scatter",
    data,
    xAccessor: rest.xAccessor || "x",
    yAccessor: rest.yAccessor || "y",
    colorAccessor: colorBy,
    sizeAccessor: rest.sizeBy,
    colorScheme,
    ...common,
  }),
}

const connectedScatterplot: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "line",
    data,
    xAccessor: rest.xAccessor || "x",
    yAccessor: rest.yAccessor || "y",
    colorAccessor: colorBy,
    colorScheme,
    showPoints: true,
    ...common,
  }),
}

const heatmap: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "heatmap",
    data,
    xAccessor: rest.xAccessor || "x",
    yAccessor: rest.yAccessor || "y",
    valueAccessor: rest.valueAccessor,
    colorScheme: colorScheme || rest.colorScheme || "blues",
    showValues: rest.showValues,
    cellBorderColor: rest.cellBorderColor,
    ...common,
  }),
}

// ── Ordinal Charts ─────────────────────────────────────────────────────

const barChart: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "bar",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    projection: rest.orientation === "horizontal" ? "horizontal" : "vertical",
    colorAccessor: colorBy,
    colorScheme,
    barPadding: rest.barPadding,
    ...common,
  }),
}

const stackedBarChart: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "bar",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    stackBy: rest.stackBy,
    colorAccessor: colorBy || rest.stackBy,
    colorScheme,
    projection: rest.orientation === "horizontal" ? "horizontal" : "vertical",
    normalize: rest.normalize,
    ...common,
  }),
}

const groupedBarChart: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "clusterbar",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    groupBy: rest.groupBy,
    colorAccessor: colorBy || rest.groupBy,
    colorScheme,
    projection: rest.orientation === "horizontal" ? "horizontal" : "vertical",
    barPadding: rest.barPadding,
    ...common,
  }),
}

const pieChart: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "pie",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    projection: "radial",
    colorAccessor: colorBy || rest.categoryAccessor,
    colorScheme,
    ...common,
  }),
}

const donutChart: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "donut",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    projection: "radial",
    innerRadius: rest.innerRadius || 60,
    colorAccessor: colorBy || rest.categoryAccessor,
    colorScheme,
    ...common,
  }),
}

const histogram: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "histogram",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    bins: rest.bins,
    colorAccessor: colorBy,
    colorScheme,
    ...common,
  }),
}

const boxPlot: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "boxplot",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    colorScheme,
    ...common,
  }),
}

const violinPlot: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "violin",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    bins: rest.bins,
    colorScheme,
    ...common,
  }),
}

const swarmPlot: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "swarm",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    colorAccessor: colorBy,
    colorScheme,
    ...common,
  }),
}

const dotPlot: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "point",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    colorAccessor: colorBy,
    colorScheme,
    ...common,
  }),
}

const swimlaneChart: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "swimlane",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    stackBy: rest.subcategoryAccessor,
    colorAccessor: colorBy || rest.subcategoryAccessor,
    categoryAccessor: rest.categoryAccessor,
    subcategoryAccessor: rest.subcategoryAccessor,
    colorScheme,
    projection: rest.orientation === "horizontal" ? "horizontal" : "vertical",
    ...common,
  }),
}

const ridgelinePlot: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "ridgeline",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    bins: rest.bins,
    amplitude: rest.amplitude,
    ...common,
  }),
}

const funnelChart: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const isVertical = rest.orientation === "vertical"
    return {
      chartType: isVertical ? "bar-funnel" : "funnel",
      data,
      oAccessor: rest.stepAccessor || "step",
      rAccessor: rest.valueAccessor || "value",
      colorAccessor: colorBy || rest.categoryAccessor,
      categoryAccessor: rest.categoryAccessor,
      projection: isVertical ? "vertical" : "horizontal",
      connectorAccessor: rest.connectorAccessor,
      connectorStyle: rest.connectorStyle,
      colorScheme,
      ...common,
    }
  },
}

// GaugeChart is special — it computes needle geometry
const gaugeChart: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, _colorBy, _colorScheme, common, rest) => {
    const gMin = rest.min ?? 0
    const gMax = rest.max ?? 100
    const sweep = rest.sweep ?? 240
    const arcWidth = rest.arcWidth ?? 0.3
    const gapDeg = 360 - sweep
    const startAngleDeg = 180 + gapDeg / 2

    const thresholds = rest.thresholds || [{ value: gMax, color: "#4e79a7" }]
    const zoneData = thresholds.map((t: any, i: number) => ({
      category: t.label || `zone-${i}`,
      value: t.value - (i > 0 ? thresholds[i - 1].value : gMin),
    }))
    const zoneColors: Record<string, string> = {}
    thresholds.forEach((t: any, i: number) => {
      zoneColors[t.label || `zone-${i}`] = t.color || "#4e79a7"
    })

    return {
      chartType: "donut",
      data: zoneData,
      oAccessor: "category",
      rAccessor: "value",
      projection: "radial",
      innerRadius: undefined, // computed in renderChart from arcWidth
      sweepAngle: sweep,
      startAngle: startAngleDeg,
      oSort: false,
      pieceStyle: (d: any, cat?: string) => ({ fill: zoneColors[cat || ""] || "#4e79a7" }),
      ...common,
      showAxes: false,
      // Pass gauge-specific fields through for needle rendering
      __gauge: { gMin, gMax, sweep, arcWidth, value: rest.value, startAngleDeg, thresholds },
    }
  },
}

// ── Network Charts ─────────────────────────────────────────────────────

const forceDirectedGraph: ChartConfig = {
  frameType: "network",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "force",
    nodes: rest.nodes,
    edges: rest.edges,
    nodeIDAccessor: rest.nodeIDAccessor,
    sourceAccessor: rest.sourceAccessor,
    targetAccessor: rest.targetAccessor,
    colorBy,
    colorScheme,
    iterations: rest.iterations,
    forceStrength: rest.forceStrength,
    showLabels: rest.showLabels,
    nodeLabel: rest.nodeLabel,
    nodeSize: rest.nodeSize,
    nodeSizeRange: rest.nodeSizeRange,
    nodeStyle: rest.nodeStyle,
    edgeStyle: rest.edgeStyle,
    ...common,
  }),
}

const sankeyDiagram: ChartConfig = {
  frameType: "network",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "sankey",
    nodes: rest.nodes,
    edges: rest.edges,
    nodeIDAccessor: rest.nodeIdAccessor || rest.nodeIDAccessor,
    sourceAccessor: rest.sourceAccessor,
    targetAccessor: rest.targetAccessor,
    valueAccessor: rest.valueAccessor,
    orientation: rest.orientation,
    nodeAlign: rest.nodeAlign,
    nodeWidth: rest.nodeWidth,
    nodePaddingRatio: rest.nodePaddingRatio,
    showLabels: rest.showLabels,
    nodeLabel: rest.nodeLabel,
    colorBy,
    edgeColorBy: rest.edgeColorBy,
    edgeOpacity: rest.edgeOpacity,
    nodeStyle: rest.nodeStyle,
    edgeStyle: rest.edgeStyle,
    colorScheme,
    ...common,
  }),
}

const chordDiagram: ChartConfig = {
  frameType: "network",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "chord",
    nodes: rest.nodes,
    edges: rest.edges,
    valueAccessor: rest.valueAccessor,
    padAngle: rest.padAngle,
    groupWidth: rest.groupWidth,
    showLabels: rest.showLabels,
    colorBy,
    edgeColorBy: rest.edgeColorBy,
    colorScheme,
    ...common,
  }),
}

const treeDiagram: ChartConfig = {
  frameType: "network",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: rest.layout === "cluster" ? "cluster" : "tree",
    data,
    childrenAccessor: rest.childrenAccessor,
    colorBy,
    colorByDepth: rest.colorByDepth,
    orientation: rest.orientation,
    showLabels: rest.showLabels,
    colorScheme,
    ...common,
  }),
}

const treemap: ChartConfig = {
  frameType: "network",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "treemap",
    data,
    childrenAccessor: rest.childrenAccessor,
    hierarchySum: rest.valueAccessor,
    colorBy,
    colorByDepth: rest.colorByDepth,
    showLabels: rest.showLabels,
    colorScheme,
    ...common,
  }),
}

const circlePack: ChartConfig = {
  frameType: "network",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "circlepack",
    data,
    childrenAccessor: rest.childrenAccessor,
    hierarchySum: rest.valueAccessor,
    colorBy,
    colorByDepth: rest.colorByDepth,
    colorScheme,
    ...common,
  }),
}

// ── Geo Charts ─────────────────────────────────────────────────────────

const choroplethMap: ChartConfig = {
  frameType: "geo",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    areas: rest.areas,
    projection: rest.projection || "equalEarth",
    areaStyle: rest.areaStyle,
    valueAccessor: rest.valueAccessor,
    colorScheme: colorScheme || "blues",
    graticule: rest.graticule,
    fitPadding: rest.fitPadding,
    ...common,
  }),
}

const proportionalSymbolMap: ChartConfig = {
  frameType: "geo",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    points: data || rest.points,
    xAccessor: rest.xAccessor || "lon",
    yAccessor: rest.yAccessor || "lat",
    areas: rest.areas,
    areaStyle: rest.areaStyle,
    sizeBy: rest.sizeBy,
    colorBy,
    colorScheme,
    projection: rest.projection || "equalEarth",
    graticule: rest.graticule,
    fitPadding: rest.fitPadding,
    ...common,
  }),
}

// ── Registry ───────────────────────────────────────────────────────────

export const CHART_CONFIGS: Record<string, ChartConfig> = {
  Sparkline: sparkline,
  LineChart: lineChart,
  AreaChart: areaChart,
  StackedAreaChart: stackedAreaChart,
  Scatterplot: scatterplot,
  BubbleChart: scatterplot, // same config, sizeBy handled via rest
  ConnectedScatterplot: connectedScatterplot,
  Heatmap: heatmap,
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
  FunnelChart: funnelChart,
  GaugeChart: gaugeChart,
  ForceDirectedGraph: forceDirectedGraph,
  SankeyDiagram: sankeyDiagram,
  ChordDiagram: chordDiagram,
  TreeDiagram: treeDiagram,
  Treemap: treemap,
  CirclePack: circlePack,
  ChoroplethMap: choroplethMap,
  ProportionalSymbolMap: proportionalSymbolMap,
}
