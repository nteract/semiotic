/**
 * Server-side rendering of Semiotic charts to standalone SVG strings.
 *
 * Uses the shared SceneToSVG converters (same code used by Stream Frames
 * for SSR) plus PipelineStore / OrdinalPipelineStore / NetworkPipelineStore
 * for scene graph computation.
 */

import * as React from "react"
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ReactDOMServer = require("react-dom/server") as { renderToStaticMarkup: (element: React.ReactElement) => string }

import { PipelineStore, type PipelineConfig } from "../stream/PipelineStore"
import type {
  StreamXYFrameProps,
  StreamScales,
  StreamLayout
} from "../stream/types"

import { getLayoutPlugin } from "../stream/layouts"
import { NetworkPipelineStore } from "../stream/NetworkPipelineStore"
import type {
  NetworkPipelineConfig,
  RealtimeNode,
  RealtimeEdge,
  StreamNetworkFrameProps,
  NetworkChartType
} from "../stream/networkTypes"

import { OrdinalPipelineStore } from "../stream/OrdinalPipelineStore"
import type {
  OrdinalPipelineConfig,
  StreamOrdinalFrameProps
} from "../stream/ordinalTypes"

// Shared scene → SVG converters
import {
  xySceneNodeToSVG,
  networkSceneNodeToSVG,
  networkSceneEdgeToSVG,
  networkLabelToSVG,
  ordinalSceneNodeToSVG
} from "../stream/SceneToSVG"

type FrameType = "xy" | "ordinal" | "network"

// ── Axis generation ─────────────────────────────────────────────────────

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

// ── StreamXYFrame SSR ───────────────────────────────────────────────────

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

  if (props.data) {
    store.ingest({ inserts: props.data, bounded: true })
  }

  store.computeScene({ width, height })

  if (!store.scales || store.scene.length === 0) {
    return ReactDOMServer.renderToStaticMarkup(
      <svg xmlns="http://www.w3.org/2000/svg" className="stream-xy-frame" width={size[0]} height={size[1]} />
    )
  }

  const dataMarks = store.scene
    .map((node, i) => xySceneNodeToSVG(node, i))
    .filter(Boolean)

  const showAxes = props.showAxes !== false
  const axes = showAxes
    ? generateAxesSVG(store.scales, { width, height }, props)
    : null

  const title = props.title && typeof props.title === "string" ? (
    <text x={size[0] / 2} y={16} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#333">
      {props.title}
    </text>
  ) : null

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

// ── Helper functions for building RealtimeNodes/Edges from props ────────

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
    x: 0, y: 0, x0: 0, x1: 0, y0: 0, y1: 0,
    width: 0, height: 0, value: 0, data: d
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
    y0: 0, y1: 0, sankeyWidth: 0, data: d
  }))
}

// ── Network SSR ─────────────────────────────────────────────────────────

const HIERARCHICAL_TYPES: Set<string> = new Set([
  "tree", "cluster", "treemap", "circlepack", "partition"
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
    const hierarchyRoot = props.data || props.edges
    if (!hierarchyRoot || Array.isArray(hierarchyRoot)) {
      return ReactDOMServer.renderToStaticMarkup(
        <svg xmlns="http://www.w3.org/2000/svg" className="stream-network-frame" width={size[0]} height={size[1]} />
      )
    }
    ;(config as any).__hierarchyRoot = hierarchyRoot
    nodes = []
    edges = []
  } else {
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

  plugin.computeLayout(nodes, edges, config, [innerWidth, innerHeight])

  const { sceneNodes, sceneEdges, labels } = plugin.buildScene(
    nodes, edges, config, [innerWidth, innerHeight]
  )

  const edgeElements = sceneEdges
    .map((edge, i) => networkSceneEdgeToSVG(edge, i))
    .filter(Boolean)

  const nodeElements = sceneNodes
    .map((node, i) => networkSceneNodeToSVG(node, i))
    .filter(Boolean)

  const labelElements = labels
    .map((label, i) => networkLabelToSVG(label, i))
    .filter(Boolean)

  const title = props.title && typeof props.title === "string" ? (
    <text x={size[0] / 2} y={16} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#333">
      {props.title}
    </text>
  ) : null

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

// ── Ordinal SSR ─────────────────────────────────────────────────────────

function generateOrdinalAxesSVG(
  store: OrdinalPipelineStore,
  layout: { width: number; height: number },
  props: StreamOrdinalFrameProps
): React.ReactNode {
  const scales = store.scales
  if (!scales) return null
  if (scales.projection === "radial") return null

  const isVertical = scales.projection === "vertical"
  const columns = store.columns

  const categoryTicks = Object.values(columns).map(col => ({
    pixel: col.middle,
    label: (props.oFormat || String)(col.name)
  }))

  const rTicks = scales.r.ticks(5).map(v => ({
    pixel: scales.r(v),
    label: (props.rFormat || defaultTickFormat)(v)
  }))

  if (isVertical) {
    return (
      <g className="ordinal-axes">
        <line x1={0} y1={layout.height} x2={layout.width} y2={layout.height} stroke="#ccc" strokeWidth={1} />
        {categoryTicks.map((tick, i) => (
          <g key={`oxtick-${i}`} transform={`translate(${tick.pixel},${layout.height})`}>
            <line y2={5} stroke="#ccc" strokeWidth={1} />
            <text y={18} textAnchor="middle" fontSize={10} fill="#666">{tick.label}</text>
          </g>
        ))}
        {props.oLabel && (
          <text x={layout.width / 2} y={layout.height + 40} textAnchor="middle" fontSize={12} fill="#333">
            {props.oLabel}
          </text>
        )}
        <line x1={0} y1={0} x2={0} y2={layout.height} stroke="#ccc" strokeWidth={1} />
        {rTicks.map((tick, i) => (
          <g key={`oytick-${i}`} transform={`translate(0,${tick.pixel})`}>
            <line x2={-5} stroke="#ccc" strokeWidth={1} />
            <text x={-8} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#666">{tick.label}</text>
          </g>
        ))}
        {props.rLabel && (
          <text
            x={-(props.margin?.left ?? 40) + 15}
            y={layout.height / 2}
            textAnchor="middle" fontSize={12} fill="#333"
            transform={`rotate(-90, ${-(props.margin?.left ?? 40) + 15}, ${layout.height / 2})`}
          >
            {props.rLabel}
          </text>
        )}
      </g>
    )
  } else {
    return (
      <g className="ordinal-axes">
        <line x1={0} y1={layout.height} x2={layout.width} y2={layout.height} stroke="#ccc" strokeWidth={1} />
        {rTicks.map((tick, i) => (
          <g key={`oxtick-${i}`} transform={`translate(${tick.pixel},${layout.height})`}>
            <line y2={5} stroke="#ccc" strokeWidth={1} />
            <text y={18} textAnchor="middle" fontSize={10} fill="#666">{tick.label}</text>
          </g>
        ))}
        {props.rLabel && (
          <text x={layout.width / 2} y={layout.height + 40} textAnchor="middle" fontSize={12} fill="#333">
            {props.rLabel}
          </text>
        )}
        <line x1={0} y1={0} x2={0} y2={layout.height} stroke="#ccc" strokeWidth={1} />
        {categoryTicks.map((tick, i) => (
          <g key={`oytick-${i}`} transform={`translate(0,${tick.pixel})`}>
            <line x2={-5} stroke="#ccc" strokeWidth={1} />
            <text x={-8} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#666">{tick.label}</text>
          </g>
        ))}
        {props.oLabel && (
          <text
            x={-(props.margin?.left ?? 40) + 15}
            y={layout.height / 2}
            textAnchor="middle" fontSize={12} fill="#333"
            transform={`rotate(-90, ${-(props.margin?.left ?? 40) + 15}, ${layout.height / 2})`}
          >
            {props.oLabel}
          </text>
        )}
      </g>
    )
  }
}

function renderOrdinalFrame(props: StreamOrdinalFrameProps): string {
  const defaultMargin = { top: 20, right: 20, bottom: 30, left: 40 }
  const size = props.size || [500, 400]
  const margin = { ...defaultMargin, ...props.margin }
  const width = size[0] - margin.left - margin.right
  const height = size[1] - margin.top - margin.bottom

  const projection = props.projection || "vertical"
  const isRadial = projection === "radial"

  const pipelineConfig: OrdinalPipelineConfig = {
    chartType: props.chartType,
    windowSize: props.windowSize ?? 10000,
    windowMode: props.windowMode ?? "sliding",
    extentPadding: props.extentPadding ?? 0.05,
    projection,
    oAccessor: props.oAccessor,
    rAccessor: props.rAccessor,
    colorAccessor: props.colorAccessor,
    stackBy: props.stackBy,
    groupBy: props.groupBy,
    categoryAccessor: props.categoryAccessor,
    valueAccessor: props.valueAccessor,
    timeAccessor: props.timeAccessor,
    rExtent: props.rExtent,
    oExtent: props.oExtent,
    barPadding: props.barPadding,
    innerRadius: props.innerRadius,
    normalize: props.normalize,
    startAngle: props.startAngle,
    bins: props.bins,
    showOutliers: props.showOutliers,
    showIQR: props.showIQR,
    amplitude: props.amplitude,
    oSort: props.oSort,
    connectorAccessor: props.connectorAccessor,
    connectorStyle: props.connectorStyle,
    dynamicColumnWidth: props.dynamicColumnWidth,
    pieceStyle: props.pieceStyle,
    summaryStyle: props.summaryStyle,
    colorScheme: props.colorScheme,
    barColors: props.barColors
  }

  const store = new OrdinalPipelineStore(pipelineConfig)

  if (props.data) {
    store.ingest({ inserts: props.data, bounded: true })
  }

  store.computeScene({ width, height })

  if (!store.scales || store.scene.length === 0) {
    return ReactDOMServer.renderToStaticMarkup(
      <svg xmlns="http://www.w3.org/2000/svg" className="stream-ordinal-frame" width={size[0]} height={size[1]} />
    )
  }

  const dataMarks = store.scene
    .map((node, i) => ordinalSceneNodeToSVG(node, i))
    .filter(Boolean)

  const showAxes = props.showAxes !== false
  const axes = showAxes
    ? generateOrdinalAxesSVG(store, { width, height }, props)
    : null

  const title = props.title && typeof props.title === "string" ? (
    <text x={size[0] / 2} y={16} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#333">
      {props.title}
    </text>
  ) : null

  const bg = props.background ? (
    <rect x={0} y={0} width={width} height={height} fill={props.background} />
  ) : null

  const translateX = isRadial ? margin.left + width / 2 : margin.left
  const translateY = isRadial ? margin.top + height / 2 : margin.top

  const svgElement = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`stream-ordinal-frame${props.className ? ` ${props.className}` : ""}`}
      width={size[0]}
      height={size[1]}
    >
      <g transform={`translate(${translateX},${translateY})`}>
        {bg}
        {dataMarks}
        {axes}
      </g>
      {title}
    </svg>
  )

  return ReactDOMServer.renderToStaticMarkup(svgElement)
}

// ── Public API ──────────────────────────────────────────────────────────

export function renderToStaticSVG(
  frameType: FrameType,
  props: StreamXYFrameProps | StreamNetworkFrameProps | StreamOrdinalFrameProps
): string {
  switch (frameType) {
    case "xy":
      return renderStreamXYFrame(props as StreamXYFrameProps)
    case "ordinal":
      return renderOrdinalFrame(props as StreamOrdinalFrameProps)
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

export function renderOrdinalToStaticSVG(props: StreamOrdinalFrameProps): string {
  return renderOrdinalFrame(props)
}

export function renderNetworkToStaticSVG(props: StreamNetworkFrameProps): string {
  return renderNetworkFrame(props)
}
