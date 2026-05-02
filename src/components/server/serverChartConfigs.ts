import type { Datum } from "../charts/shared/datumTypes"
/**
 * Chart-specific prop mapping for renderChart().
 *
 * Each entry maps HOC-level props (categoryAccessor, valueAccessor, etc.)
 * to frame-level props (oAccessor, rAccessor, etc.) for server rendering.
 *
 * Extracted from renderToStaticSVG.tsx's 400-line switch statement to make
 * each chart type independently readable and testable.
 */

import { createColorScale, getColor } from "../charts/shared/colorUtils"
import { interpolateViridis } from "../charts/shared/colorPalettes"

type FrameType = "xy" | "ordinal" | "network" | "geo"

interface ChartConfig {
  frameType: FrameType
  /** Build frame props from HOC-level props */
  buildProps: (data: any, colorBy: any, colorScheme: any, common: Datum, rest: Datum) => Datum
}

function accessorValue(accessor: any, fallback: string, d: Datum): any {
  if (typeof accessor === "function") return accessor(d)
  return d[accessor || fallback]
}

function numericValue(value: any): number {
  return value instanceof Date ? value.getTime() : Number(value)
}

function viridisColor(i: number, n: number): string {
  return interpolateViridis(n === 1 ? 0.5 : i / (n - 1))
}

function prepareConnectedScatterplotData(
  data: any,
  rest: Datum,
): { data: any; orderMap: WeakMap<Datum, { idx: number; total: number }> } {
  if (!Array.isArray(data)) {
    return { data, orderMap: new WeakMap() }
  }
  const xAccessor = rest.xAccessor || "x"
  const yAccessor = rest.yAccessor || "y"
  const ordered = rest.orderAccessor
    ? [...data].sort((a, b) => {
        if (a == null || typeof a !== "object") return 1
        if (b == null || typeof b !== "object") return -1
        return numericValue(accessorValue(rest.orderAccessor, "order", a))
          - numericValue(accessorValue(rest.orderAccessor, "order", b))
      })
    : data

  const orderMap = new WeakMap<Datum, { idx: number; total: number }>()
  let total = 0
  for (const d of ordered) {
    if (d == null || typeof d !== "object") continue
    const x = numericValue(accessorValue(xAccessor, "x", d))
    const y = numericValue(accessorValue(yAccessor, "y", d))
    if (Number.isFinite(x) && Number.isFinite(y)) total++
  }
  let idx = 0
  for (const d of ordered) {
    if (d == null || typeof d !== "object") continue
    const x = numericValue(accessorValue(xAccessor, "x", d))
    const y = numericValue(accessorValue(yAccessor, "y", d))
    if (Number.isFinite(x) && Number.isFinite(y)) {
      orderMap.set(d, { idx: idx++, total })
    }
  }
  return { data: ordered, orderMap }
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

const candlestickChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, _colorBy, _colorScheme, common, rest) => ({
    chartType: "candlestick",
    data,
    xAccessor: rest.xAccessor || "x",
    // yAccessor drives the scale extent; the scene builder reads high/low/
    // open/close directly. High is the natural upper bound for the axis.
    yAccessor: rest.highAccessor || "high",
    highAccessor: rest.highAccessor || "high",
    lowAccessor: rest.lowAccessor || "low",
    // Open/close are optional — PipelineStore detects range mode when both
    // are absent, so don't synthesize defaults here.
    openAccessor: rest.openAccessor,
    closeAccessor: rest.closeAccessor,
    candlestickStyle: rest.candlestickStyle,
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
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const prepared = prepareConnectedScatterplotData(data, rest)
    const pointRadius = rest.pointRadius ?? 4
    return {
      chartType: "line",
      data: prepared.data,
      xAccessor: rest.xAccessor || "x",
      yAccessor: rest.yAccessor || "y",
      colorAccessor: colorBy,
      colorScheme,
      lineStyle: rest.lineStyle || {
        stroke: rest.stroke || "#6366f1",
        strokeWidth: rest.strokeWidth ?? pointRadius,
        opacity: rest.opacity,
      },
      pointStyle: (d: Datum) => {
        const order = prepared.orderMap.get(d)
        const i = order?.idx ?? 0
        const n = order?.total ?? 1
        return {
          fill: n > 0 ? viridisColor(i, n) : "#6366f1",
          stroke: "white",
          strokeWidth: 1,
          r: pointRadius,
          fillOpacity: 1,
        }
      },
      ...common,
    }
  },
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
    const flows: Array<Datum> =
      (Array.isArray(data) ? data : null) || rest.flows || []
    const nodes: Array<Datum> = rest.nodes || []
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
    const xAcc = typeof xAccessorIn === "function" ? xAccessorIn : (d: Datum) => d[xAccessorIn]
    const yAcc = typeof yAccessorIn === "function" ? yAccessorIn : (d: Datum) => d[yAccessorIn]

    const projectedNodes: Array<Datum> = nodes.map(n => ({ ...n, x: xAcc(n), y: yAcc(n) }))
    const nodeLookup = new Map<string, Datum>()
    for (const node of projectedNodes) nodeLookup.set(String(node[nodeIdAccessor]), node)

    // Edge-color resolution — mirror the FlowMap HOC API. `edgeColorBy`
    // (domain-specific) wins over top-level `colorBy`; either can be a
    // string field or an accessor function. Resolution goes through the
    // shared `getColor` so named schemes ("category10", "blues", …) and
    // function-accessors that return literal CSS colors both behave
    // identically to the client-side FlowMap. Fallback color matches
    // the HOC's `DEFAULT_COLOR`; kept inline to avoid pulling hook
    // internals into the server config module.
    const FLOW_DEFAULT_COLOR = "#007bff"
    const edgeColorByIn = rest.edgeColorBy ?? colorBy
    const isFnEdgeColor = typeof edgeColorByIn === "function"

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
      .filter(Boolean) as Datum[]

    // Build an ordinal scale once so every line reuses the same category →
    // color mapping. For function accessors we synthesize a scratch field
    // on a cloned array solely to seed the scale's domain — the lines
    // themselves aren't mutated. `getColor` calls the user's function
    // fresh at resolution time and short-circuits for CSS-color returns
    // (so function accessors that return "#ff0000" or "red" literally
    // pass through instead of being mapped).
    const EDGE_COLOR_FIELD = "__flowMapEdgeColor"
    const colorScale = (() => {
      if (!edgeColorByIn) return null
      if (isFnEdgeColor) {
        const domainSeed = lines.map(l => ({
          [EDGE_COLOR_FIELD]: (edgeColorByIn as (d: Datum) => string)(l),
        }))
        return createColorScale(domainSeed, EDGE_COLOR_FIELD, colorScheme || "category10")
      }
      return createColorScale(lines, edgeColorByIn as string, colorScheme || "category10")
    })()
    const resolveEdgeColor = (d: Datum): string => {
      if (!edgeColorByIn || !colorScale) return FLOW_DEFAULT_COLOR
      return getColor(d, edgeColorByIn as string | ((d: Datum) => string), colorScale)
    }

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
      lineStyle: (d: Datum) => {
        // Guard against non-finite values (NaN from strings, Infinity, etc.)
        // — they'd otherwise propagate through `normalized` and produce an
        // invalid `stroke-width="NaN"` in the output SVG. Non-finite inputs
        // collapse to `minValue`, and the ratio is clamped to [0, 1] as a
        // belt-and-suspenders against odd (value < minValue, value > maxValue)
        // inputs.
        const raw = Number(d?.[valueAccessor])
        const v = Number.isFinite(raw) ? raw : minValue
        const ratio = valueRange > 0 ? (v - minValue) / valueRange : 0
        const normalized = Math.max(0, Math.min(1, ratio))
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

// `satisfies` (not `: Record<string, ChartConfig>`) so TypeScript preserves
// the literal key union. Downstream code derives `ChartName` via
// `keyof typeof CHART_CONFIGS` and stays in lockstep automatically — adding
// a chart here makes it available to renderChart() without a second edit.
export const CHART_CONFIGS = {
  Sparkline: sparkline,
  LineChart: lineChart,
  AreaChart: areaChart,
  StackedAreaChart: stackedAreaChart,
  Scatterplot: scatterplot,
  CandlestickChart: candlestickChart,
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
} satisfies Record<string, ChartConfig>
