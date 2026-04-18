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
    oSort: rest.sort ?? false,
    colorAccessor: colorBy,
    colorScheme,
    barPadding: rest.barPadding,
    ...(rest.roundedTop != null && { roundedTop: rest.roundedTop }),
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
    oSort: rest.sort ?? false,
    ...(rest.roundedTop != null && { roundedTop: rest.roundedTop }),
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
    oSort: rest.sort ?? false,
    barPadding: rest.barPadding,
    ...(rest.roundedTop != null && { roundedTop: rest.roundedTop }),
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
    ...(rest.cornerRadius != null && { cornerRadius: rest.cornerRadius }),
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
    ...(rest.cornerRadius != null && { cornerRadius: rest.cornerRadius }),
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
    projection: "horizontal",
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
    showGrid: common.showGrid ?? true,
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

const likertChart: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "bar",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    stackBy: rest.levelAccessor || "level",
    colorAccessor: colorBy || rest.levelAccessor || "level",
    colorScheme,
    normalize: true,
    projection: rest.orientation === "vertical" ? "vertical" : "horizontal",
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

    // Compute innerRadius from arcWidth fraction, matching renderOrdinalFrame's layout
    const m = common.margin || { top: 20, right: 20, bottom: 30, left: 40 }
    const [w, h] = common.size || [300, 300]
    const innerW = w - (m.left || 0) - (m.right || 0)
    const innerH = h - (m.top || 0) - (m.bottom || 0)
    const chartSize = Math.min(innerW, innerH)
    const computedInnerRadius = Math.max(10, (chartSize / 2) * (1 - arcWidth))

    return {
      chartType: "donut",
      data: zoneData,
      oAccessor: "category",
      rAccessor: "value",
      projection: "radial",
      innerRadius: computedInnerRadius,
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

/**
 * FlowMap expands `flows` (edges with source/target ids) + `nodes` (points
 * with coordinates) into the `lines` shape StreamGeoFrame expects, where
 * each line carries a `coordinates` array of two {x,y} endpoints.
 */
const flowMap: ChartConfig = {
  frameType: "geo",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    // Accept flows either via the primary `data` arg (matches how
    // ProportionalSymbolMap / ChoroplethMap consume their data) or via
    // the explicit `rest.flows` escape hatch. `data` wins when both are
    // present so callers using the standard renderChart(_, { data }) shape
    // behave consistently with the rest of the registry.
    const flows: Array<Record<string, any>> =
      (Array.isArray(data) ? data : null) || rest.flows || []
    const nodes: Array<Record<string, any>> = rest.nodes || []
    const nodeIdAccessor = rest.nodeIdAccessor || "id"
    const valueAccessor = rest.valueAccessor || "value"
    const xAccessorIn = rest.xAccessor || "lon"
    const yAccessorIn = rest.yAccessor || "lat"

    // Resolve accessors locally. Both strings and functions are valid per
    // the public FlowMap typings. Downstream StreamGeoFrame reads coords
    // via `xAccessor`/`yAccessor`, so we normalize everything (both the
    // synthesized line coordinates AND the passthrough points) into
    // canonical `{ x, y }` shape and hand the frame fixed string accessors.
    // That avoids the function-as-computed-key bug (where the key became
    // the stringified function source) and keeps line + point
    // accessor-resolution consistent.
    const xAcc = typeof xAccessorIn === "function" ? xAccessorIn : (d: any) => d[xAccessorIn]
    const yAcc = typeof yAccessorIn === "function" ? yAccessorIn : (d: any) => d[yAccessorIn]

    const projectedNodes: Array<Record<string, any>> = nodes.map(n => ({ ...n, x: xAcc(n), y: yAcc(n) }))
    const nodeLookup = new Map<string, Record<string, any>>()
    for (const node of projectedNodes) nodeLookup.set(String(node[nodeIdAccessor]), node)

    const lines = flows
      .map(flow => {
        if (!flow || flow.source == null || flow.target == null) return null
        const src = nodeLookup.get(String(flow.source))
        const tgt = nodeLookup.get(String(flow.target))
        if (!src || !tgt) return null
        return {
          ...flow,
          coordinates: [
            { x: src.x, y: src.y },
            { x: tgt.x, y: tgt.y },
          ],
        }
      })
      .filter(Boolean) as Record<string, any>[]

    // Precompute min/max value range once per build. Recomputing inside
    // `lineStyle` would be O(n) per line → O(n²) total for rendering.
    let minValue = Infinity
    let maxValue = -Infinity
    for (const line of lines) {
      const v = Number(line[valueAccessor] ?? 0)
      if (!isFinite(v)) continue
      if (v < minValue) minValue = v
      if (v > maxValue) maxValue = v
    }
    const valueRange = maxValue > minValue ? maxValue - minValue : 0

    // Edge-color resolution — mirror the FlowMap HOC API: `edgeColorBy`
    // (domain-specific) wins over top-level `colorBy`; both accept a
    // string field name or an accessor function. Values are mapped to
    // `colorScheme` entries via insertion-order indexing (a simplified
    // analogue of the HOC's ordinal scale — sufficient for server SVG
    // output where we don't need the full d3 scale machinery).
    const edgeColorByIn = rest.edgeColorBy ?? colorBy
    const edgeColorAcc = edgeColorByIn
      ? (typeof edgeColorByIn === "function"
          ? edgeColorByIn
          : (d: any) => d?.[edgeColorByIn])
      : null
    const schemeArray = Array.isArray(colorScheme)
      ? colorScheme
      : typeof colorScheme === "string"
        ? null // named schemes (e.g. "category10") resolved downstream; fall back to default
        : null
    // Fallback matches the FlowMap HOC's DEFAULT_COLOR constant. Kept
    // inline to avoid pulling in runtime-only hook utilities from the
    // server build graph.
    const FLOW_DEFAULT_COLOR = "#007bff"
    const edgeColorCache = new Map<string, string>()
    const resolveEdgeColor = (d: any): string => {
      if (!edgeColorAcc || !schemeArray || schemeArray.length === 0) return FLOW_DEFAULT_COLOR
      const key = String(edgeColorAcc(d) ?? "")
      if (edgeColorCache.has(key)) return edgeColorCache.get(key)!
      const color = schemeArray[edgeColorCache.size % schemeArray.length]
      edgeColorCache.set(key, color)
      return color
    }

    // Width scale — map value → edgeWidthRange linearly. Mirrors the HOC.
    const [widthMin, widthMax] = rest.edgeWidthRange ?? [1, 8]
    const widthSpan = widthMax - widthMin
    const edgeOpacity = rest.edgeOpacity ?? 0.6
    const edgeLinecap = rest.edgeLinecap ?? "round"

    return {
      lines,
      points: projectedNodes,
      xAccessor: "x",
      yAccessor: "y",
      lineDataAccessor: "coordinates",
      lineType: rest.lineType || "geo",
      flowStyle: rest.flowStyle || "basic",
      areas: rest.areas,
      areaStyle: rest.areaStyle,
      projection: rest.projection || "equalEarth",
      graticule: rest.graticule,
      fitPadding: rest.fitPadding,
      colorScheme,
      lineStyle: (d: any) => {
        const v = Number(d?.[valueAccessor] ?? 0)
        const normalized = valueRange > 0 ? (v - minValue) / valueRange : 0
        const width = widthMin + normalized * widthSpan
        return {
          stroke: resolveEdgeColor(d),
          strokeWidth: width,
          strokeLinecap: edgeLinecap,
          opacity: edgeOpacity,
          fillOpacity: 0,
        }
      },
      pointStyle: () => ({ fill: "#333", r: 4, fillOpacity: 0.8 }),
      ...common,
    }
  },
}

// ── Registry ───────────────────────────────────────────────────────────

export const CHART_CONFIGS: Record<string, ChartConfig> = {
  Sparkline: sparkline,
  LineChart: lineChart,
  AreaChart: areaChart,
  StackedAreaChart: stackedAreaChart,
  Scatterplot: scatterplot,
  BubbleChart: {
    frameType: "xy",
    buildProps: (data, colorBy, colorScheme, common, rest) => ({
      chartType: "scatter",
      data,
      xAccessor: rest.xAccessor || "x",
      yAccessor: rest.yAccessor || "y",
      colorAccessor: colorBy,
      sizeAccessor: rest.sizeBy,
      sizeRange: rest.sizeRange || [5, 40],
      colorScheme,
      ...common,
    }),
  },
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
  LikertChart: likertChart,
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
  FlowMap: flowMap,
}
