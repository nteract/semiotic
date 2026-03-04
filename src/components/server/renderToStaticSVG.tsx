import * as React from "react"
import * as ReactDOMServer from "react-dom/server"

import { scaleLinear } from "d3-scale"

import { calculateNetworkFrame } from "../processing/network"
import { createNetworkPipelineCache } from "../data/networkPipelineCache"

import { generateFinalDefs } from "../constants/jsx"
import { generateFrameTitle } from "../svg/frameFunctions"

import { stringToFn } from "../data/dataFunctions"
import { genericFunction } from "../generic_utilities/functions"

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

import { NetworkFrameProps, NetworkFrameState } from "../types/networkTypes"
import { RenderPipelineType } from "../types/generalTypes"

type FrameType = "xy" | "ordinal" | "network"

const networkProjectedCoordinateNames = { y: "y", x: "x" }

const defaultFrameRenderOrder = [
  "axes-tick-lines",
  "viz-layer",
  "matte",
  "axes-labels",
  "labels"
]

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

// ── Legacy frame renderers (ordinal, network) ─────────────────────────────

function runVisualizationPipeline(
  renderPipeline: RenderPipelineType,
  renderOrder: ReadonlyArray<string>,
  xScale: Function,
  yScale: Function,
  projectedCoordinateNames: object
): React.ReactNode[] {
  const renderedElements: React.ReactNode[] = []
  const renderVizKeys = Object.keys(renderPipeline)
  const renderKeys = [
    ...renderOrder,
    ...renderVizKeys.filter((d) => renderOrder.indexOf(d) === -1)
  ]

  renderKeys.forEach((k) => {
    const pipe = renderPipeline[k]
    if (
      pipe &&
      ((pipe.data &&
        typeof pipe.data === "object" &&
        !Array.isArray(pipe.data)) ||
        (pipe.data && (pipe.data as any[]).length > 0))
    ) {
      const renderedPipe = pipe.behavior({
        xScale,
        yScale,
        canvasDrawing: [],
        projectedCoordinateNames,
        ...pipe
      })

      if (renderedPipe && renderedPipe.length > 0) {
        renderedElements.push(
          <g key={k} className={k} role="group">
            {renderedPipe}
          </g>
        )
      }
    }
  })
  return renderedElements
}

function buildNetworkBaseState(props: NetworkFrameProps): NetworkFrameState {
  return {
    dataVersion: undefined,
    nodeData: [],
    edgeData: [],
    adjustedPosition: [],
    adjustedSize: [],
    backgroundGraphics: null,
    foregroundGraphics: null,
    projectedNodes: [],
    projectedEdges: [],
    renderNumber: 0,
    nodeLabelAnnotations: [],
    graphSettings: {
      type: "empty-start",
      nodes: [],
      edges: [],
      nodeHash: new Map(),
      edgeHash: new Map(),
      hierarchicalNetwork: false
    },
    edgeWidthAccessor: stringToFn<number>("weight"),
    legendSettings: undefined,
    margin: { top: 0, left: 0, right: 0, bottom: 0 },
    networkFrameRender: {},
    nodeIDAccessor: stringToFn<string>("id"),
    nodeSizeAccessor: genericFunction(5),
    overlay: [],
    projectedXYPoints: [],
    sourceAccessor: stringToFn<string | Record<string, any>>("source"),
    targetAccessor: stringToFn<string | Record<string, any>>("target"),
    title: { title: undefined },
    props
  } as NetworkFrameState
}

function renderNetworkFrame(props: NetworkFrameProps): string {
  const networkDefaultProps = {
    annotations: [],
    foregroundGraphics: [],
    size: [500, 500] as number[],
    className: "",
    name: "networkframe",
    networkType: { type: "force", iterations: 500 }
  }
  const mergedProps = { ...networkDefaultProps, ...props }
  const cache = createNetworkPipelineCache()
  const baseState = buildNetworkBaseState(mergedProps)

  const state = {
    ...baseState,
    ...calculateNetworkFrame(mergedProps, baseState, cache)
  } as NetworkFrameState

  const {
    margin,
    networkFrameRender,
    title,
    graphSettings
  } = state

  const size = mergedProps.size || [500, 500]

  const nXScale = scaleLinear()
  const nYScale = scaleLinear()

  const matrixRenderOrder: ReadonlyArray<string> = ["nodes", "edges"]
  const generalRenderOrder: ReadonlyArray<string> = ["edges", "nodes"]
  const renderOrder = mergedProps.renderOrder ||
    (graphSettings && graphSettings.type === "matrix"
      ? matrixRenderOrder
      : generalRenderOrder)
  const frameRenderOrder = mergedProps.frameRenderOrder || defaultFrameRenderOrder

  const renderedElements = runVisualizationPipeline(
    networkFrameRender,
    renderOrder,
    nXScale,
    nYScale,
    networkProjectedCoordinateNames
  )

  return assembleAndRender({
    size,
    margin,
    renderedElements,
    title,
    frameRenderOrder,
    additionalDefs: mergedProps.additionalDefs,
    name: "networkframe",
    matte: mergedProps.matte,
    frameKey: "static"
  })
}

interface AssembleOptions {
  size: number[]
  margin: { top: number; bottom: number; left: number; right: number }
  renderedElements: React.ReactNode[]
  axes?: React.ReactNode[]
  axesTickLines?: React.ReactNode | Object[]
  title?: any
  frameRenderOrder: string[]
  additionalDefs?: React.ReactNode
  name: string
  matte?: any
  frameKey: string
}

function assembleAndRender({
  size,
  margin,
  renderedElements,
  axes,
  axesTickLines,
  title,
  frameRenderOrder,
  additionalDefs,
  name,
  matte,
  frameKey
}: AssembleOptions): string {
  const renderHash: Record<string, React.ReactNode> = {
    "axes-tick-lines": axesTickLines ? (
      <g
        key="visualization-tick-lines"
        className="axis axis-tick-lines"
        aria-hidden={true}
      >
        {axesTickLines as React.ReactNode}
      </g>
    ) : null,
    "axes-labels": axes ? (
      <g key="visualization-axis-labels" className="axis axis-labels">
        {axes}
      </g>
    ) : null,
    "viz-layer":
      renderedElements && renderedElements.length > 0
        ? renderedElements
        : null
  }

  const orderedElements: React.ReactNode[] = []
  frameRenderOrder.forEach((r) => {
    if (renderHash[r]) {
      orderedElements.push(renderHash[r])
    }
  })

  const generatedTitle = generateFrameTitle({
    title: title || { title: undefined },
    size
  })

  const { defs } = generateFinalDefs({
    matte: null,
    size,
    margin,
    frameKey,
    additionalDefs,
    name
  })

  const svgElement = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`${name} frame`}
      width={size[0]}
      height={size[1]}
    >
      {defs}
      {orderedElements.length > 0 && (
        <g
          className="data-visualization"
          key="visualization-clip-path"
          role="group"
          transform={`translate(${margin.left},${margin.top})`}
        >
          {orderedElements}
        </g>
      )}
      {generatedTitle && <g className="frame-title">{generatedTitle}</g>}
    </svg>
  )

  return ReactDOMServer.renderToStaticMarkup(svgElement)
}

// ── Public API ────────────────────────────────────────────────────────────

export function renderToStaticSVG(
  frameType: FrameType,
  props: StreamXYFrameProps | NetworkFrameProps
): string {
  switch (frameType) {
    case "xy":
      return renderStreamXYFrame(props as StreamXYFrameProps)
    case "ordinal":
      throw new Error(
        `Legacy ordinal SSR has been removed. Use StreamOrdinalFrame for ordinal charts.`
      )
    case "network":
      return renderNetworkFrame(props as NetworkFrameProps)
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

export function renderNetworkToStaticSVG(props: NetworkFrameProps): string {
  return renderNetworkFrame(props)
}
