import * as React from "react"
import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ForceDirectedGraph } from "semiotic/network"
import { NetworkPipelineStore } from "../NetworkPipelineStore"
import StreamNetworkFrame from "../StreamNetworkFrame"
import { forceLayoutPlugin } from "./forceLayoutPlugin"
import { createFrameForceWorkerRequest } from "./forceLayoutWorkerPolicy"
import { renderChartWithEvidence } from "../../server/renderToStaticSVG"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import type { NetworkPipelineConfig, RealtimeNode, StreamNetworkFrameHandle } from "../networkTypes"
import type { Datum } from "../../charts/shared/datumTypes"

const nodes = Array.from({ length: 6 }, (_, index) => ({ id: `n${index}`, amount: index + 1 }))
const edges = nodes.slice(1).map((node, index) => ({ source: `n${index}`, target: node.id, amount: index + 1 }))
const size: [number, number] = [600, 400]
const positions = (values: Iterable<RealtimeNode>) => Array.from(values, ({ id, x, y }) => ({ id, x, y }))

function storeFor(config: Partial<NetworkPipelineConfig> = {}) {
  return new NetworkPipelineStore({ chartType: "force", iterations: 150, seed: 27, transition: { duration: 0 }, ...config })
}

describe("force pipeline initialization and worker parity", () => {
  it("initializes the first bounded layout with a centered phyllotaxis spiral", () => {
    const store = storeFor({ iterations: 0 })
    store.ingestBounded(nodes, edges, size)
    const first = store.nodes.get("n0")!
    expect(first.x).toBeCloseTo(300 + Math.sqrt(0.5) * 10)
    expect(first.y).toBe(200)
    const second = store.nodes.get("n1")!
    const angle = Math.PI * (3 - Math.sqrt(5))
    expect(second.x).toBeCloseTo(300 + Math.sqrt(1.5) * 10 * Math.cos(angle))
    expect(second.y).toBeCloseTo(200 + Math.sqrt(1.5) * 10 * Math.sin(angle))
  })

  it("honors the iteration count on the first bounded force layout", () => {
    const short = storeFor({ iterations: 50 })
    const settled = storeFor({ iterations: 300 })
    short.ingestBounded(nodes, edges, size)
    settled.ingestBounded(nodes, edges, size)
    expect(positions(short.nodes.values())).not.toEqual(positions(settled.nodes.values()))
  })

  it("refreshes cached scene data for deferred, pushed and empty ingests", () => {
    const store = storeFor()
    store.ingestBounded(nodes, edges, size)
    store.buildScene(size)
    store.ingestBounded([{ id: "next" }], [], size, { deferLayout: true })
    store.buildScene(size)
    expect(store.sceneNodes.map((node) => node.datum?.id)).toEqual(["next"])
    expect(store.sceneEdges).toEqual([])
    store.ingestEdge({ source: "next", target: "pushed", value: 1 })
    expect(store.nodesArray.map((node) => node.id)).toEqual(["next", "pushed"])
    expect(store.edgesArray).toHaveLength(1)
    store.ingestBounded([], [], size)
    store.buildScene(size)
    expect(store.sceneNodes).toEqual([])
    expect(store.sceneEdges).toEqual([])
  })

  it.each([
    ["default", {}, edges],
    ["resolved accessor", { valueAccessor: "amount" }, edges],
    ["authored weights", {}, edges.map((edge) => ({ ...edge, weight: edge.amount * 2 }))],
    ["functional radius", { nodeSize: (node: Datum) => node.data?.amount * 2 }, edges],
  ] as const)("matches sync and worker geometry for %s on first and replacement ingests", (_label, config, data) => {
    const sync = storeFor(config)
    const worker = storeFor(config)
    for (const graph of [data, [...data, { source: "n0", target: "n5", amount: 12, weight: 2 }]]) {
      sync.ingestBounded(nodes, graph, size)
      const previous = worker._lastPositionSnapshot
      worker.ingestBounded(nodes, graph, size, { deferLayout: true })
      const layoutData = worker.getLayoutData()
      const request = createFrameForceWorkerRequest(
        layoutData.nodes, layoutData.edges, { chartType: "force", iterations: 150, seed: 27, ...config }, size, previous,
      )
      // This is the worker's production compute path after structured cloning.
      const cloned = structuredClone(request)
      forceLayoutPlugin.computeLayout(cloned.nodes, cloned.edges, cloned.config, cloned.size)
      worker.applyForceLayoutPositions(Object.fromEntries(cloned.nodes.map((node) => [node.id, { x: node.x, y: node.y }])), size)
      expect(positions(worker.nodes.values())).toEqual(positions(sync.nodes.values()))
      worker.buildScene(size)
    }
  })

  it("uses resolved values and explicit weights in synchronous force geometry", () => {
    const unweighted = storeFor()
    const accessor = storeFor({ valueAccessor: "amount" })
    const explicit = storeFor()
    unweighted.ingestBounded(nodes, edges, size)
    accessor.ingestBounded(nodes, edges, size)
    explicit.ingestBounded(nodes, edges.map((edge) => ({ ...edge, weight: edge.amount })), size)
    expect(positions(accessor.nodes.values())).not.toEqual(positions(unweighted.nodes.values()))
    expect(positions(accessor.nodes.values())).toEqual(positions(explicit.nodes.values()))
  })

  it("places a pushed new node close to an already positioned neighbor", () => {
    const store = storeFor()
    store.ingestBounded(nodes, edges, size)
    store.updateConfig({ iterations: 0 })
    const neighbor = { ...store.nodes.get("n2")! }
    store.ingestEdge({ source: "n2", target: "new", value: 1 })
    store.runLayout(size)
    const pushed = store.nodes.get("new")!
    expect(Math.hypot(pushed.x - neighbor.x, pushed.y - neighbor.y)).toBeLessThan(40)
    expect(Math.hypot(pushed.x - neighbor.x, pushed.y - neighbor.y)).toBeGreaterThan(5)
  })

  it("classifies force radius changes as layout while retaining other chart geometry policy", () => {
    for (const key of ["nodeSize", "nodeSizeRange"] as const) {
      const patch = key === "nodeSize" ? { nodeSize: 20 } : { nodeSizeRange: [10, 30] as [number, number] }
      expect(storeFor().updateConfigWithResult(patch).changed.has("layout")).toBe(true)
      const sankey = new NetworkPipelineStore({ chartType: "sankey" })
      const update = sankey.updateConfigWithResult(patch)
      expect(update.changed.has("layout")).toBe(false)
      expect(update.changed.has("scene-geometry")).toBe(true)
    }
  })

  it("honors iteration budgets in the public static force renderer", () => {
    const geometry = (iterations: number) => {
      const { svg, evidence } = renderChartWithEvidence("ForceDirectedGraph", { nodes, edges, iterations, seed: 27, width: 600, height: 400 })
      expect(evidence.nodeCount).toBe(6)
      return Array.from(new DOMParser().parseFromString(svg, "image/svg+xml").querySelectorAll("circle"), (circle) => [circle.getAttribute("cx"), circle.getAttribute("cy")])
    }
    expect(geometry(50)).not.toEqual(geometry(300))
  })
})

describe("public force radius changes", () => {
  let restoreCanvas: () => void
  beforeEach(() => { restoreCanvas = setupCanvasMock({ stubRaf: "noop" }) })
  afterEach(() => { restoreCanvas(); vi.restoreAllMocks() })

  const checkClearance = (graph: Array<{ x: number; y: number }>, radius: number) => {
    for (let i = 0; i < graph.length; i++) {
      for (let j = i + 1; j < graph.length; j++) {
        expect(Math.hypot(graph[i].x - graph[j].x, graph[i].y - graph[j].y)).toBeGreaterThanOrEqual(radius * 2 - 1)
      }
    }
  }

  it.each(["nodeSize", "nodeSizeRange"])("re-solves bounded graph positions when %s increases", (sizing) => {
    const layouts = vi.spyOn(NetworkPipelineStore.prototype, "runLayout")
    const chart = (radius: number) => <ForceDirectedGraph nodes={nodes} edges={edges}
      nodeSize={sizing === "nodeSize" ? radius : "amount"}
      nodeSizeRange={sizing === "nodeSizeRange" ? [radius, radius] : undefined}
      iterations={300} width={600} height={400} animate={false} layoutExecution="sync" />
    const { rerender } = render(chart(4))
    const store = layouts.mock.contexts[layouts.mock.contexts.length - 1] as NetworkPipelineStore
    const before = positions(store.nodes.values())
    expect(before).toHaveLength(6)
    rerender(chart(20))
    const after = positions(store.nodes.values())
    expect(after).toHaveLength(6)
    expect(after).not.toEqual(before)
    expect(store.sceneNodes.every((node) => node.type === "circle" && node.r === 20)).toBe(true)
    checkClearance(after, 20)
  })

  it("re-solves retained push-mode positions when nodeSize increases", () => {
    const ref = React.createRef<StreamNetworkFrameHandle>()
    const chart = (nodeSize: number) => <StreamNetworkFrame ref={ref} chartType="force" nodeSize={nodeSize} iterations={300} size={size} tensionConfig={{ transitionDuration: 0 }} />
    const { rerender } = render(chart(4))
    act(() => ref.current!.pushMany(edges.map((edge) => ({ ...edge, value: 1 }))))
    const before = positions(ref.current!.getTopology().nodes)
    rerender(chart(20))
    const after = ref.current!.getTopology().nodes
    expect(positions(after)).not.toEqual(before)
    expect(after).toHaveLength(6)
    checkClearance(after, 20)
  })
})
