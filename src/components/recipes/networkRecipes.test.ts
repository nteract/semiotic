import { describe, it, expect } from "vitest"
import { flextreeLayout } from "./flextree"
import { dagreLayout } from "./dagre"
import type { NetworkLayoutContext } from "../stream/networkCustomLayout"
import type { RealtimeNode, RealtimeEdge, NetworkRectNode, NetworkCurvedEdge, NetworkLineEdge } from "../stream/networkTypes"

function makeCtx<C extends object>(
  config: C,
  nodes: RealtimeNode[],
  edges: RealtimeEdge[]
): NetworkLayoutContext<C> {
  return {
    nodes,
    edges,
    dimensions: { width: 600, height: 400, plot: { x: 0, y: 0, width: 600, height: 400 } },
    theme: { semantic: { primary: "#4e79a7", border: "#888", surface: "#fff" }, categorical: ["#4e79a7", "#f28e2c"] },
    resolveColor: (key) => {
      let h = 0
      for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
      return ["#4e79a7", "#f28e2c"][Math.abs(h) % 2]
    },
    config,
  }
}

describe("flextreeLayout", () => {
  const nodes: RealtimeNode[] = [
    { id: "root", x: 200, y: 20 },
    { id: "a", x: 100, y: 100 },
    { id: "b", x: 300, y: 100 },
  ]
  const edges: RealtimeEdge[] = [
    { source: "root", target: "a" },
    { source: "root", target: "b" },
  ]

  it("emits one rect per node", () => {
    const result = flextreeLayout(makeCtx({}, nodes, edges))
    expect(result.sceneNodes).toHaveLength(3)
    for (const n of result.sceneNodes!) {
      expect(n.type).toBe("rect")
    }
  })

  it("emits curved edges by default", () => {
    const result = flextreeLayout(makeCtx({}, nodes, edges))
    expect(result.sceneEdges).toHaveLength(2)
    for (const e of result.sceneEdges! as NetworkCurvedEdge[]) {
      expect(e.type).toBe("curved")
      expect(e.pathD).toMatch(/^M\d/)
    }
  })

  it("respects edgeCurve: 'line'", () => {
    const result = flextreeLayout(makeCtx({ edgeCurve: "line" }, nodes, edges))
    for (const e of result.sceneEdges! as NetworkLineEdge[]) {
      expect(e.type).toBe("line")
    }
  })

  it("centers rects on each node's x/y", () => {
    const result = flextreeLayout(makeCtx({ nodeWidth: 40, nodeHeight: 20 }, nodes, edges))
    const root = result.sceneNodes!.find((n: NetworkRectNode) => n.id === "root") as NetworkRectNode
    expect(root.x).toBe(200 - 20)
    expect(root.y).toBe(20 - 10)
    expect(root.w).toBe(40)
    expect(root.h).toBe(20)
  })

  it("emits labels when showLabels is enabled", () => {
    const result = flextreeLayout(makeCtx({}, nodes, edges))
    expect(result.labels).toHaveLength(3)
  })

  it("reads positions from node.data (the ingest-wrapper shape)", async () => {
    // Regression: when nodes flow through `ingestBounded`, the user's `x`/`y`
    // live on `node.data.x` etc. — `node.x` defaults to 0. The recipe must
    // fall back to node.data for that case.
    const { NetworkPipelineStore } = await import("../stream/NetworkPipelineStore")
    const store = new NetworkPipelineStore({
      chartType: "force",
      nodeIDAccessor: "id",
      sourceAccessor: "source",
      targetAccessor: "target",
      customNetworkLayout: flextreeLayout,
    })
    store.ingestBounded(
      [
        { id: "root", x: 200, y: 20, width: 80, height: 30 },
        { id: "leaf", x: 100, y: 100, width: 60, height: 24 },
      ],
      [{ source: "root", target: "leaf" }],
      [400, 200]
    )
    store.buildScene([400, 200])

    expect(store.sceneNodes).toHaveLength(2)
    const root = store.sceneNodes.find((n) => "id" in n && n.id === "root") as { x: number; y: number; w: number; h: number }
    expect(root.w).toBe(80)
    expect(root.h).toBe(30)
    // x: 200 - w/2 = 160, y: 20 - h/2 = 5
    expect(root.x).toBe(160)
    expect(root.y).toBe(5)
  })
})

describe("dagreLayout", () => {
  it("renders a polyline through waypoints when present", () => {
    const nodes: RealtimeNode[] = [
      { id: "x", x: 50, y: 50, width: 80, height: 30, label: "X" },
      { id: "y", x: 200, y: 200, width: 80, height: 30, label: "Y" },
    ] as unknown as RealtimeNode[]
    const edges: RealtimeEdge[] = [
      { source: "x", target: "y", points: [{ x: 50, y: 65 }, { x: 100, y: 130 }, { x: 200, y: 185 }] },
    ] as unknown as RealtimeEdge[]
    const result = dagreLayout(makeCtx({}, nodes, edges))
    expect(result.sceneEdges).toHaveLength(1)
    const e = result.sceneEdges![0] as NetworkCurvedEdge
    expect(e.type).toBe("curved")
    // Polyline pathD has L segments for each waypoint
    expect(e.pathD).toContain("L")
  })

  it("falls back to a straight line when no waypoints provided", () => {
    const nodes: RealtimeNode[] = [
      { id: "x", x: 50, y: 50 },
      { id: "y", x: 200, y: 200 },
    ]
    const edges: RealtimeEdge[] = [{ source: "x", target: "y" }]
    const result = dagreLayout(makeCtx({}, nodes, edges))
    expect(result.sceneEdges).toHaveLength(1)
    const e = result.sceneEdges![0] as NetworkLineEdge
    expect(e.type).toBe("line")
    expect(e.x1).toBe(50)
    expect(e.x2).toBe(200)
  })

  it("renders rect nodes sized from each node's width/height", () => {
    const nodes: RealtimeNode[] = [
      { id: "x", x: 100, y: 50, width: 120, height: 40 },
    ] as unknown as RealtimeNode[]
    const result = dagreLayout(makeCtx({}, nodes, []))
    const n = result.sceneNodes![0] as NetworkRectNode
    expect(n.w).toBe(120)
    expect(n.h).toBe(40)
    expect(n.x).toBe(100 - 60)
    expect(n.y).toBe(50 - 20)
  })

  it("smooth edge style produces a curved path", () => {
    const nodes: RealtimeNode[] = [
      { id: "x", x: 0, y: 0 },
      { id: "y", x: 200, y: 200 },
    ]
    const edges: RealtimeEdge[] = [
      { source: "x", target: "y", points: [{ x: 0, y: 0 }, { x: 100, y: 50 }, { x: 150, y: 150 }, { x: 200, y: 200 }] },
    ] as unknown as RealtimeEdge[]
    const result = dagreLayout(makeCtx({ edgeStyle: "smooth" }, nodes, edges))
    const e = result.sceneEdges![0] as NetworkCurvedEdge
    expect(e.pathD).toContain("Q")
    expect(e.pathD).toContain("T")
  })
})
