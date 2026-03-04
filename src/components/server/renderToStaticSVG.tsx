import * as React from "react"
import * as ReactDOMServer from "react-dom/server"

import { arc as d3Arc } from "d3-shape"

import { PipelineStore, type PipelineConfig } from "../stream/PipelineStore"
import type {
  StreamXYFrameProps,
  SceneNode,
  PointSceneNode,
  LineSceneNode,
  AreaSceneNode,
  RectSceneNode,
  HeatcellSceneNode,
  CandlestickSceneNode,
  StreamScales,
  StreamLayout
} from "../stream/types"

import { getLayoutPlugin } from "../stream/layouts"
import type {
  NetworkPipelineConfig,
  RealtimeNode,
  RealtimeEdge,
  NetworkSceneNode,
  NetworkSceneEdge,
  NetworkLabel,
  StreamNetworkFrameProps,
  NetworkChartType,
  NetworkCircleNode,
  NetworkRectNode,
  NetworkArcNode,
  NetworkLineEdge,
  NetworkBezierEdge,
  NetworkRibbonEdge,
  NetworkCurvedEdge
} from "../stream/networkTypes"

type FrameType = "xy" | "ordinal" | "network"

// ── Scene graph → SVG conversion ──────────────────────────────────────────

function sceneNodeToSVG(node: SceneNode, i: number): React.ReactNode {
  switch (node.type) {
    case "line": {
      const n = node as LineSceneNode
      if (n.path.length === 0) return null
      const d = "M" + n.path.map(([x, y]) => `${x},${y}`).join("L")
      return (
        <path
          key={`line-${i}`}
          d={d}
          fill="none"
          stroke={n.style.stroke || "#4e79a7"}
          strokeWidth={n.style.strokeWidth || 2}
          strokeDasharray={n.style.strokeDasharray}
          opacity={n.style.opacity}
        />
      )
    }
    case "area": {
      const n = node as AreaSceneNode
      if (n.topPath.length === 0) return null
      const top = n.topPath.map(([x, y]) => `${x},${y}`).join("L")
      const bottom = [...n.bottomPath].reverse().map(([x, y]) => `${x},${y}`).join("L")
      const d = `M${top}L${bottom}Z`
      return (
        <path
          key={`area-${i}`}
          d={d}
          fill={n.style.fill || "#4e79a7"}
          fillOpacity={n.style.fillOpacity ?? n.style.opacity ?? 0.7}
          stroke={n.style.stroke}
          strokeWidth={n.style.strokeWidth}
        />
      )
    }
    case "point": {
      const n = node as PointSceneNode
      return (
        <circle
          key={`point-${i}`}
          cx={n.x}
          cy={n.y}
          r={n.r}
          fill={n.style.fill || "#4e79a7"}
          opacity={n.style.opacity ?? 0.8}
          stroke={n.style.stroke}
          strokeWidth={n.style.strokeWidth}
        />
      )
    }
    case "rect": {
      const n = node as RectSceneNode
      return (
        <rect
          key={`rect-${i}`}
          x={n.x}
          y={n.y}
          width={n.w}
          height={n.h}
          fill={n.style.fill || "#4e79a7"}
          opacity={n.style.opacity}
          stroke={n.style.stroke}
          strokeWidth={n.style.strokeWidth}
        />
      )
    }
    case "heatcell": {
      const n = node as HeatcellSceneNode
      return (
        <rect
          key={`heatcell-${i}`}
          x={n.x}
          y={n.y}
          width={n.w}
          height={n.h}
          fill={n.fill}
        />
      )
    }
    case "candlestick": {
      const n = node as CandlestickSceneNode
      const bodyTop = Math.min(n.openY, n.closeY)
      const bodyHeight = Math.max(Math.abs(n.openY - n.closeY), 1)
      const bodyColor = n.isUp ? n.upColor : n.downColor
      return (
        <g key={`candle-${i}`}>
          <line
            x1={n.x}
            y1={n.highY}
            x2={n.x}
            y2={n.lowY}
            stroke={n.wickColor}
            strokeWidth={n.wickWidth}
          />
          <rect
            x={n.x - n.bodyWidth / 2}
            y={bodyTop}
            width={n.bodyWidth}
            height={bodyHeight}
            fill={bodyColor}
            stroke={bodyColor}
            strokeWidth={1}
          />
        </g>
      )
    }
    default:
      return null
  }
}

function defaultTickFormat(v: number): string {
  return String(Math.round(v * 100) / 100)
}

function generateAxesSVG(
  scales: StreamScales,
  layout: StreamLayout,
  props: StreamXYFrameProps
): React.ReactNode {
  const xTicks = scales.x.ticks(5).map(v => ({
    pixel: scales.x(v),
    label: (props.xFormat || props.tickFormatTime || defaultTickFormat)(v)
  }))

  const yTicks = scales.y.ticks(5).map(v => ({
    pixel: scales.y(v),
    label: (props.yFormat || props.tickFormatValue || defaultTickFormat)(v)
  }))

  return (
    <g className="stream-axes">
      {/* X axis */}
      <line x1={0} y1={layout.height} x2={layout.width} y2={layout.height} stroke="#ccc" strokeWidth={1} />
      {xTicks.map((tick, i) => (
        <g key={`xtick-${i}`} transform={`translate(${tick.pixel},${layout.height})`}>
          <line y2={5} stroke="#ccc" strokeWidth={1} />
          <text y={18} textAnchor="middle" fontSize={10} fill="#666">{tick.label}</text>
        </g>
      ))}
      {props.xLabel && (
        <text x={layout.width / 2} y={layout.height + 40} textAnchor="middle" fontSize={12} fill="#333">
          {props.xLabel}
        </text>
      )}

      {/* Y axis */}
      <line x1={0} y1={0} x2={0} y2={layout.height} stroke="#ccc" strokeWidth={1} />
      {yTicks.map((tick, i) => (
        <g key={`ytick-${i}`} transform={`translate(0,${tick.pixel})`}>
          <line x2={-5} stroke="#ccc" strokeWidth={1} />
          <text x={-8} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#666">
            {tick.label}
          </text>
        </g>
      ))}
      {props.yLabel && (
        <text
          x={-(props.margin?.left ?? 40) + 15}
          y={layout.height / 2}
          textAnchor="middle"
          fontSize={12}
          fill="#333"
          transform={`rotate(-90, ${-(props.margin?.left ?? 40) + 15}, ${layout.height / 2})`}
        >
          {props.yLabel}
        </text>
      )}
    </g>
  )
}

// ── StreamXYFrame SSR ─────────────────────────────────────────────────────

function renderStreamXYFrame(props: StreamXYFrameProps): string {
  const defaultMargin = { top: 20, right: 20, bottom: 30, left: 40 }
  const size = props.size || [500, 300]
  const margin = { ...defaultMargin, ...props.margin }
  const width = size[0] - margin.left - margin.right
  const height = size[1] - margin.top - margin.bottom

  const isStreaming = props.runtimeMode === "streaming" ||
    ["bar", "swarm", "waterfall"].includes(props.chartType)

  const pipelineConfig: PipelineConfig = {
    chartType: props.chartType,
    windowSize: props.windowSize ?? 200,
    windowMode: props.windowMode ?? "sliding",
    arrowOfTime: isStreaming ? (props.arrowOfTime ?? "right") : "right",
    extentPadding: props.extentPadding ?? 0.1,
    xAccessor: isStreaming ? undefined : props.xAccessor,
    yAccessor: isStreaming ? undefined : props.yAccessor,
    timeAccessor: isStreaming ? props.timeAccessor : undefined,
    valueAccessor: props.valueAccessor,
    colorAccessor: props.colorAccessor,
    sizeAccessor: props.sizeAccessor,
    groupAccessor: props.groupAccessor,
    categoryAccessor: props.categoryAccessor,
    lineDataAccessor: props.lineDataAccessor,
    xExtent: props.xExtent,
    yExtent: props.yExtent,
    sizeRange: props.sizeRange,
    binSize: props.binSize,
    normalize: props.normalize,
    boundsAccessor: props.boundsAccessor,
    boundsStyle: props.boundsStyle,
    openAccessor: props.openAccessor,
    highAccessor: props.highAccessor,
    lowAccessor: props.lowAccessor,
    closeAccessor: props.closeAccessor,
    candlestickStyle: props.candlestickStyle,
    lineStyle: props.lineStyle,
    pointStyle: props.pointStyle,
    areaStyle: props.areaStyle,
    colorScheme: props.colorScheme,
    barColors: props.barColors
  }

  const store = new PipelineStore(pipelineConfig)

  // Ingest bounded data
  if (props.data) {
    store.ingest({ inserts: props.data, bounded: true })
  }

  // Compute scene graph
  store.computeScene({ width, height })

  if (!store.scales || store.scene.length === 0) {
    // No data — return empty SVG
    return ReactDOMServer.renderToStaticMarkup(
      <svg xmlns="http://www.w3.org/2000/svg" className="stream-xy-frame" width={size[0]} height={size[1]} />
    )
  }

  // Convert scene nodes to SVG
  const dataMarks = store.scene
    .map((node, i) => sceneNodeToSVG(node, i))
    .filter(Boolean)

  // Generate axes
  const showAxes = props.showAxes !== false
  const axes = showAxes
    ? generateAxesSVG(store.scales, { width, height }, props)
    : null

  // Title
  const title = props.title && typeof props.title === "string" ? (
    <text
      x={size[0] / 2}
      y={16}
      textAnchor="middle"
      fontSize={14}
      fontWeight="bold"
      fill="#333"
    >
      {props.title}
    </text>
  ) : null

  // Background
  const bg = props.background ? (
    <rect x={0} y={0} width={width} height={height} fill={props.background} />
  ) : null

  const svgElement = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`stream-xy-frame${props.className ? ` ${props.className}` : ""}`}
      width={size[0]}
      height={size[1]}
    >
      <g transform={`translate(${margin.left},${margin.top})`}>
        {bg}
        {dataMarks}
        {axes}
      </g>
      {title}
    </svg>
  )

  return ReactDOMServer.renderToStaticMarkup(svgElement)
}

// ── Network scene graph → SVG conversion ──────────────────────────────────

function networkSceneNodeToSVG(node: NetworkSceneNode, i: number): React.ReactNode {
  switch (node.type) {
    case "circle": {
      const n = node as NetworkCircleNode
      return (
        <circle
          key={`net-circle-${i}`}
          cx={n.cx}
          cy={n.cy}
          r={n.r}
          fill={n.style.fill || "#4e79a7"}
          stroke={n.style.stroke}
          strokeWidth={n.style.strokeWidth}
          opacity={n.style.opacity}
        />
      )
    }
    case "rect": {
      const n = node as NetworkRectNode
      return (
        <rect
          key={`net-rect-${i}`}
          x={n.x}
          y={n.y}
          width={n.w}
          height={n.h}
          fill={n.style.fill || "#4e79a7"}
          stroke={n.style.stroke}
          strokeWidth={n.style.strokeWidth}
          opacity={n.style.opacity}
        />
      )
    }
    case "arc": {
      const n = node as NetworkArcNode
      const arcPath = d3Arc<any>()
        .innerRadius(n.innerR)
        .outerRadius(n.outerR)
        .startAngle(n.startAngle)
        .endAngle(n.endAngle)({} as any) || ""
      return (
        <path
          key={`net-arc-${i}`}
          d={arcPath}
          transform={`translate(${n.cx},${n.cy})`}
          fill={n.style.fill || "#4e79a7"}
          stroke={n.style.stroke}
          strokeWidth={n.style.strokeWidth}
          opacity={n.style.opacity}
        />
      )
    }
    default:
      return null
  }
}

function networkSceneEdgeToSVG(edge: NetworkSceneEdge, i: number): React.ReactNode {
  switch (edge.type) {
    case "line": {
      const e = edge as NetworkLineEdge
      return (
        <line
          key={`net-edge-line-${i}`}
          x1={e.x1}
          y1={e.y1}
          x2={e.x2}
          y2={e.y2}
          stroke={e.style.stroke || "#999"}
          strokeWidth={e.style.strokeWidth || 1}
          opacity={e.style.opacity}
        />
      )
    }
    case "bezier": {
      const e = edge as NetworkBezierEdge
      return (
        <path
          key={`net-edge-bezier-${i}`}
          d={e.pathD}
          fill={e.style.fill || "#999"}
          fillOpacity={e.style.fillOpacity}
          stroke={e.style.stroke || "none"}
          strokeWidth={e.style.strokeWidth}
          opacity={e.style.opacity}
        />
      )
    }
    case "ribbon": {
      const e = edge as NetworkRibbonEdge
      return (
        <path
          key={`net-edge-ribbon-${i}`}
          d={e.pathD}
          fill={e.style.fill || "#999"}
          fillOpacity={e.style.fillOpacity}
          stroke={e.style.stroke || "none"}
          strokeWidth={e.style.strokeWidth}
          opacity={e.style.opacity}
        />
      )
    }
    case "curved": {
      const e = edge as NetworkCurvedEdge
      return (
        <path
          key={`net-edge-curved-${i}`}
          d={e.pathD}
          fill={e.style.fill || "none"}
          stroke={e.style.stroke || "#999"}
          strokeWidth={e.style.strokeWidth || 1}
          opacity={e.style.opacity}
        />
      )
    }
    default:
      return null
  }
}

function networkLabelToSVG(label: NetworkLabel, i: number): React.ReactNode {
  return (
    <text
      key={`net-label-${i}`}
      x={label.x}
      y={label.y}
      textAnchor={label.anchor || "middle"}
      dominantBaseline={(label.baseline || "auto") as any}
      fontSize={label.fontSize || 11}
      fontWeight={label.fontWeight}
      fill={label.fill || "#333"}
      stroke={label.stroke}
      strokeWidth={label.strokeWidth}
      paintOrder={label.paintOrder}
    >
      {label.text}
    </text>
  )
}

// ── Helper functions for building RealtimeNodes/Edges from props ──────────

function resolveAccessor(
  accessor: string | ((d: any) => any) | undefined,
  defaultKey: string
): (d: any) => any {
  if (!accessor) return (d: any) => d[defaultKey]
  if (typeof accessor === "function") return accessor
  return (d: any) => d[accessor]
}

function buildRealtimeNodes(
  propsNodes: any[],
  config: NetworkPipelineConfig
): RealtimeNode[] {
  const nodeIDFn = resolveAccessor(config.nodeIDAccessor, "id")
  return propsNodes.map((d) => ({
    id: String(nodeIDFn(d)),
    x: 0,
    y: 0,
    x0: 0,
    x1: 0,
    y0: 0,
    y1: 0,
    width: 0,
    height: 0,
    value: 0,
    data: d
  }))
}

function buildRealtimeEdges(
  propsEdges: any[],
  config: NetworkPipelineConfig
): RealtimeEdge[] {
  const sourceFn = resolveAccessor(config.sourceAccessor, "source")
  const targetFn = resolveAccessor(config.targetAccessor, "target")
  const valueFn = resolveAccessor(config.valueAccessor, "value")
  return propsEdges.map((d) => ({
    source: String(sourceFn(d)),
    target: String(targetFn(d)),
    value: Number(valueFn(d)) || 1,
    y0: 0,
    y1: 0,
    sankeyWidth: 0,
    data: d
  }))
}

// ── Stream-first network renderer ─────────────────────────────────────────

const HIERARCHICAL_TYPES: Set<string> = new Set([
  "tree",
  "cluster",
  "treemap",
  "circlepack",
  "partition"
])

function renderNetworkFrame(props: StreamNetworkFrameProps): string {
  const chartType: NetworkChartType = props.chartType || "force"
  const size: [number, number] = props.size || [500, 500]
  const defaultMargin = { top: 20, right: 20, bottom: 20, left: 20 }
  const margin = { ...defaultMargin, ...props.margin }
  const innerWidth = size[0] - margin.left - margin.right
  const innerHeight = size[1] - margin.top - margin.bottom

  const plugin = getLayoutPlugin(chartType)
  if (!plugin) {
    throw new Error(
      `No layout plugin found for chart type: "${chartType}". ` +
      `Supported types: force, sankey, chord, tree, cluster, treemap, circlepack, partition.`
    )
  }

  // Build pipeline config from props
  const config: NetworkPipelineConfig = {
    chartType,
    nodeIDAccessor: props.nodeIDAccessor,
    sourceAccessor: props.sourceAccessor,
    targetAccessor: props.targetAccessor,
    valueAccessor: props.valueAccessor,
    childrenAccessor: props.childrenAccessor,
    hierarchySum: props.hierarchySum,
    orientation: props.orientation,
    nodeAlign: props.nodeAlign,
    nodePaddingRatio: props.nodePaddingRatio,
    nodeWidth: props.nodeWidth,
    iterations: props.iterations,
    forceStrength: props.forceStrength,
    padAngle: props.padAngle,
    groupWidth: props.groupWidth,
    sortGroups: props.sortGroups,
    edgeSort: props.edgeSort,
    treeOrientation: props.treeOrientation,
    edgeType: props.edgeType,
    padding: props.padding,
    paddingTop: props.paddingTop,
    nodeStyle: props.nodeStyle,
    edgeStyle: props.edgeStyle,
    nodeLabel: props.nodeLabel,
    showLabels: props.showLabels,
    colorBy: props.colorBy,
    colorScheme: props.colorScheme,
    edgeColorBy: props.edgeColorBy,
    edgeOpacity: props.edgeOpacity,
    colorByDepth: props.colorByDepth,
    nodeSize: props.nodeSize,
    nodeSizeRange: props.nodeSizeRange
  }

  let nodes: RealtimeNode[]
  let edges: RealtimeEdge[]

  if (HIERARCHICAL_TYPES.has(chartType)) {
    // Hierarchical layouts: single root object from props.data or props.edges
    const hierarchyRoot = props.data || props.edges
    if (!hierarchyRoot || Array.isArray(hierarchyRoot)) {
      // No valid hierarchy root — return empty SVG
      return ReactDOMServer.renderToStaticMarkup(
        <svg xmlns="http://www.w3.org/2000/svg" className="stream-network-frame" width={size[0]} height={size[1]} />
      )
    }
    // The hierarchy plugin expects the root via config.__hierarchyRoot
    ;(config as any).__hierarchyRoot = hierarchyRoot
    // computeLayout will populate these arrays from the hierarchy
    nodes = []
    edges = []
  } else {
    // Graph layouts (force, sankey, chord): nodes + edges arrays
    const propsNodes = props.nodes || []
    const propsEdges = Array.isArray(props.edges) ? props.edges : []

    if (propsNodes.length === 0 && propsEdges.length === 0) {
      return ReactDOMServer.renderToStaticMarkup(
        <svg xmlns="http://www.w3.org/2000/svg" className="stream-network-frame" width={size[0]} height={size[1]} />
      )
    }

    nodes = buildRealtimeNodes(propsNodes, config)
    edges = buildRealtimeEdges(propsEdges, config)
  }

  // Run layout
  plugin.computeLayout(nodes, edges, config, [innerWidth, innerHeight])

  // Build scene graph
  const { sceneNodes, sceneEdges, labels } = plugin.buildScene(
    nodes,
    edges,
    config,
    [innerWidth, innerHeight]
  )

  // Convert scene graph to SVG elements
  const edgeElements = sceneEdges
    .map((edge, i) => networkSceneEdgeToSVG(edge, i))
    .filter(Boolean)

  const nodeElements = sceneNodes
    .map((node, i) => networkSceneNodeToSVG(node, i))
    .filter(Boolean)

  const labelElements = labels
    .map((label, i) => networkLabelToSVG(label, i))
    .filter(Boolean)

  // Title
  const title =
    props.title && typeof props.title === "string" ? (
      <text
        x={size[0] / 2}
        y={16}
        textAnchor="middle"
        fontSize={14}
        fontWeight="bold"
        fill="#333"
      >
        {props.title}
      </text>
    ) : null

  // Background
  const bg = props.background ? (
    <rect x={0} y={0} width={innerWidth} height={innerHeight} fill={props.background} />
  ) : null

  const svgElement = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`stream-network-frame${props.className ? ` ${props.className}` : ""}`}
      width={size[0]}
      height={size[1]}
    >
      <g transform={`translate(${margin.left},${margin.top})`}>
        {bg}
        {edgeElements}
        {nodeElements}
        {labelElements}
      </g>
      {title}
    </svg>
  )

  return ReactDOMServer.renderToStaticMarkup(svgElement)
}

// ── Public API ────────────────────────────────────────────────────────────

export function renderToStaticSVG(
  frameType: FrameType,
  props: StreamXYFrameProps | StreamNetworkFrameProps
): string {
  switch (frameType) {
    case "xy":
      return renderStreamXYFrame(props as StreamXYFrameProps)
    case "ordinal":
      throw new Error(
        `Legacy ordinal SSR has been removed. Use StreamOrdinalFrame for ordinal charts.`
      )
    case "network":
      return renderNetworkFrame(props as StreamNetworkFrameProps)
    default:
      throw new Error(
        `Unknown frame type: ${frameType}. Must be "xy", "ordinal", or "network".`
      )
  }
}

export function renderXYToStaticSVG(props: StreamXYFrameProps): string {
  return renderStreamXYFrame(props)
}

export function renderOrdinalToStaticSVG(_props: unknown): string {
  throw new Error(
    `Legacy ordinal SSR has been removed. Use StreamOrdinalFrame for ordinal charts.`
  )
}

export function renderNetworkToStaticSVG(props: StreamNetworkFrameProps): string {
  return renderNetworkFrame(props)
}
