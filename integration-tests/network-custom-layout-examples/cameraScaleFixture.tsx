import * as React from "react"
import { createRoot } from "react-dom/client"
import {
  ZoomableNetworkCustomChart,
  useNetworkLOD,
  useNetworkLODLevel
} from "semiotic/network/zoom"
import type { ZoomableNetworkCustomChartHandle } from "semiotic/network/zoom"
import type {
  NetworkCustomLayout,
  NetworkLayoutResult,
  NetworkViewportSnapshot
} from "semiotic/network"
import type { HoverData } from "../../src/components/realtime/types"
import { findNearestNetworkNode } from "../../src/components/stream/NetworkCanvasHitTester"
import { prepareNetworkEdgeHitBounds } from "../../src/components/stream/networkEdgeHitBounds"
import { buildNetworkEdgeHitIndex } from "../../src/components/stream/networkEdgeHitIndex"
import { PipelineCard } from "../../docs/src/pages/examples/pipeline-explorer/PipelineCard"
import type { PipelineNode } from "../../docs/src/pages/examples/pipeline-explorer/data"
import "../../docs/src/pages/examples/pipeline-explorer/pipeline-explorer.css"

const params = new URLSearchParams(location.search)
const count = Number(params.get("nodes") ?? 1000)
const pipeline = params.get("cards") === "pipeline"
const edgeHits = params.has("edge-hits")
const width = pipeline ? 260 : 200,
  height = pipeline ? 216 : 48
const columns = Math.ceil(Math.sqrt(count / 3))
const nodes: PipelineNode[] = Array.from({ length: count }, (_, i) => ({
  id: `node-${i}`,
  x: (i % columns) * (width + 120),
  y: Math.floor(i / columns) * (height + 80),
  label: `Pipeline ${i}`,
  pipeline: `Pipeline ${i}`,
  stage: "Validate",
  stageIndex: 1,
  color: "#358499",
  rows: 24816,
  fields: 12,
  latency: 42,
  status: "Healthy",
  detail: "Synthetic scale fixture"
}))
const edges = Array.from({ length: Math.round(count * 1.5) }, (_, i) => ({
  id: `edge-${i}`,
  source: nodes[i % count].id,
  target: nodes[(i + (i < count ? 1 : columns)) % count].id,
  label: `Connection ${i}`
}))

type RenderSample = { id: string; phase: string; duration: number }
declare const __CAMERA_PROFILE__: boolean
const measurement = {
  profiling: __CAMERA_PROFILE__,
  viewport: null as NetworkViewportSnapshot | null,
  handle: null as ZoomableNetworkCustomChartHandle | null,
  layoutCalls: 0,
  movingFrames: 0,
  phase: "idle",
  renders: [] as RenderSample[],
  paints: [] as number[],
  hover: null as HoverData | null,
  hoverCalls: 0,
  frameRenders: 0,
  pointerQueries: 0,
  click: null as HoverData | null,
  result: null as NetworkLayoutResult | null,
  hitEdges: [] as NonNullable<NetworkLayoutResult["sceneEdges"]>,
  hitTest: findNearestNetworkNode,
  prepareEdges: buildNetworkEdgeHitIndex,
  recordRender(id: string, phase: string, duration: number) {
    this.renders.push({ id, phase, duration })
  },
  recordPaint(duration: number, cameraOnly: boolean) {
    if (cameraOnly) this.paints.push(duration)
  },
  reset() {
    this.renders = []
    this.paints = []
    this.movingFrames = 0
  },
  edgeCost() {
    // Retain the S0 early-painted hit and full-scan miss, and add a dense
    // interior hit. Cold samples use fresh records without either cache;
    // they measure cache construction, not JavaScript/module startup.
    const index = Math.floor(count / 2)
    const source = nodes[index], target = nodes[(index + 1) % count]
    return [
      { name: "early hit", hit: true, x: 100, y: -100 },
      { name: "miss", hit: false, x: -100, y: -1000 },
      { name: "interior hit", hit: true,
        x: (source.x + width + target.x) / 2,
        y: (source.y + target.y + height) / 2 }
    ].map(({ name, hit, x, y }) => {
      const probe = (edges = this.hitEdges, withNodes = false) =>
        findNearestNetworkNode(withNodes ? this.result!.sceneNodes! : [], edges, x, y, 12, null, 0, true, 1)
      const coldEdges = this.hitEdges.map((edge) => ({
        ...edge, _cachedPath2D: undefined, _cachedPath2DSource: undefined
      }))
      const start = performance.now()
      const cold = probe(coldEdges)
      const coldMs = performance.now() - start
      if (!!cold !== hit) throw new Error("Invalid cold edge benchmark probe")
      const preparedEdges = this.hitEdges.map((edge) => ({
        ...edge, _cachedPath2D: undefined, _cachedPath2DSource: undefined
      }))
      const preparationStart = performance.now()
      prepareNetworkEdgeHitBounds(preparedEdges)
      const preparationMs = performance.now() - preparationStart
      const firstHoverStart = performance.now()
      const firstHover = probe(preparedEdges)
      const firstHoverMs = performance.now() - firstHoverStart
      if (!!firstHover !== hit) throw new Error("Invalid prepared edge benchmark probe")
      probe()
      const samples = Array.from({ length: 100 }, () => {
        const start = performance.now()
        const result = probe()
        if (!!result !== hit) throw new Error("Invalid edge benchmark probe")
        return performance.now() - start
      }).sort((a, b) => a - b)
      const withNodes = Array.from({ length: 100 }, () => {
        const start = performance.now()
        const result = probe(this.hitEdges, true)
        if (!!result !== hit) throw new Error("Invalid full-scene benchmark probe")
        return performance.now() - start
      }).sort((a, b) => a - b)
      return {
        name,
        hit,
        coldMs,
        preparationMs,
        firstHoverMs,
        fullSceneMean: withNodes.reduce((a, b) => a + b, 0) / withNodes.length,
        fullSceneP95: withNodes[94],
        mean: samples.reduce((a, b) => a + b, 0) / samples.length,
        p95: samples[94]
      }
    })
  },
  edgeInvalidationCost() {
    const edges = this.hitEdges.map((edge) => ({ ...edge, style: { ...edge.style } }))
    const measure = () => {
      const start = performance.now()
      prepareNetworkEdgeHitBounds(edges)
      return performance.now() - start
    }
    const freshSceneMs = measure()
    const unchangedSceneMs = measure()
    for (const edge of edges) edge.style.strokeWidth = 40
    const restyledSceneMs = measure()
    if (edges[0].type !== "line") edges[0].pathD += " M-900,-900 L-800,-900"
    const onePathChangedMs = measure()
    for (const edge of edges) {
      if (edge.type !== "line") edge.pathD += " M-700,-700 L-600,-700"
    }
    return { freshSceneMs, unchangedSceneMs, restyledSceneMs, onePathChangedMs,
      allPathsChangedMs: measure() }
  }
}
declare global {
  interface Window {
    cameraScale: typeof measurement
  }
}
window.cameraScale = measurement

function LiveCompactCard({ node }: { node: PipelineNode }) {
  const { level } = useNetworkLOD(width, height, {
    breakpoints: [55, 125],
    hysteresis: 8
  })
  return <CompactCardContent node={node} level={level} />
}

function CompactCard({ node }: { node: PipelineNode }) {
  const level = useNetworkLODLevel(width, {
    breakpoints: [55, 125],
    hysteresis: 8
  })
  return <CompactCardContent node={node} level={level} />
}

function CompactCardContent({
  node,
  level
}: {
  node: PipelineNode
  level: number
}) {
  return (
    <article
      data-lod={level}
      style={{
        boxSizing: "border-box",
        width,
        height,
        background: "#eff7f9",
        border: "1px solid #358499",
        borderRadius: 6,
        padding: 5,
        font: "12px sans-serif"
      }}
    >
      {level === 0 ? (
        <span aria-hidden="true">●</span>
      ) : (
        <>
          <strong>◈ {node.label}</strong>
          {level === 2 && (
            <div style={{ display: "flex", gap: 8 }}>
              <span>24.8k rows</span>
              <span>42 ms</span>
            </div>
          )}
        </>
      )}
    </article>
  )
}

const layout: NetworkCustomLayout = () => {
  measurement.layoutCalls++
  const sceneEdges = edges.map((edge, i) => {
    const a = nodes[i % count],
      b = nodes[(i + (i < count ? 1 : columns)) % count]
    const x1 = a.x + width,
      y1 = a.y + height / 2,
      x2 = b.x,
      y2 = b.y + height / 2
    return {
      type: "curved" as const,
      id: edge.id,
      datum: edge,
      // Dedicated 1,000px probe curve, isolated above the cards. At its
      // midpoint the tangent is horizontal, so CSS-pixel offsets are exact.
      pathD:
        i === 0
          ? "M-400,-25 C-150,-125 350,-125 600,-25"
          : `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`,
      style: {
        fill: "none", stroke: "#358499", strokeWidth: 2, opacity: 0,
        cursor: params.has("hit-policy") ? "crosshair" : undefined
      }
    }
  })
  const result: NetworkLayoutResult = {
    sceneNodes: nodes.map((node) => ({
      type: "rect",
      id: node.id,
      datum: node,
      x: node.x,
      y: node.y,
      w: width,
      h: height,
      style: { fill: "transparent" }
    })),
    sceneEdges: edgeHits ? sceneEdges : [],
    overlays: (
      <g pointerEvents="none">
        {sceneEdges.map((edge) => (
          <path
            key={edge.id}
            d={edge.pathD}
            fill="none"
            stroke="#358499"
            strokeWidth={2}
          />
        ))}
      </g>
    ),
    htmlMarks: nodes.map((node) => ({
      id: node.id,
      x: node.x,
      y: node.y,
      width,
      height,
      content: pipeline ? (
        <PipelineCard node={node} />
      ) : params.get("lod") === "live" ? (
        <LiveCompactCard node={node} />
      ) : (
        <CompactCard node={node} />
      )
    }))
  }
  measurement.result = result
  measurement.hitEdges = sceneEdges
  return result
}

function Fixture() {
  const [chartWidth, setWidth] = React.useState(1400)
  const [edgeHitTesting, setEdgeHitTesting] = React.useState(true)
  const interactiveLayout = React.useCallback<NetworkCustomLayout>((ctx) => ({
    ...layout(ctx), edgeHitTesting
  }), [edgeHitTesting])
  return (
    <>
      <button
        onClick={() => setWidth((value) => (value === 1400 ? 1100 : 1400))}
      >
        Resize chart
      </button>
      {params.has("hit-policy") && (
        <button onClick={() => setEdgeHitTesting((enabled) => !enabled)}>
          {edgeHitTesting ? "Disable edge hits" : "Enable edge hits"}
        </button>
      )}
      <ZoomableNetworkCustomChart
        ref={(handle) => {
          measurement.handle = handle
        }}
        nodes={nodes}
        edges={edges}
        layout={interactiveLayout}
        width={chartWidth}
        height={800}
        margin={{ top: 20, left: 20, right: 20, bottom: 20 }}
        title="Network camera scale fixture"
        description="Synthetic pipeline nodes and connections"
        animate={false}
        annotations={
          params.has("widgets")
            ? [
                {
                  type: "widget",
                  nodeId: "node-0",
                  width: 32,
                  height: 32,
                  content: <span data-testid="camera-widget">Info</span>
                }
              ]
            : undefined
        }
        zoomControls={false}
        zoomOptions={{
          minZoom: 0.005,
          maxZoom: 4,
          duration: 0,
          wheelZoom: true
        }}
        onZoomChange={(_zoom, event) => {
          measurement.phase = event.phase
          if (event.phase === "moving") measurement.movingFrames++
        }}
        frameProps={{
          tooltipContent: (datum) => (
            <div data-testid="camera-tooltip">
              {String(datum.nodeOrEdge)}: {String(datum.data?.label)}
            </div>
          ),
          htmlMarkCulling: params.has("all-mounted")
            ? { enabled: false }
            : undefined,
          onViewportChange: (viewport) => {
            measurement.viewport = viewport
          },
          customHoverBehavior: (datum) => {
            measurement.hoverCalls++
            measurement.hover = datum
          },
          customClickBehavior: (datum) => {
            measurement.click = datum
          }
        }}
      />
    </>
  )
}

createRoot(document.getElementById("root")!).render(<Fixture />)
