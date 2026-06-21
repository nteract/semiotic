import { describe, expect, it } from "vitest"
import { mermaidDagLayout } from "./mermaidDag"
import type { MermaidDagConfig } from "./mermaidDag"
import type { NetworkLayoutContext } from "../stream/networkCustomLayout"
import type { NetworkRectNode } from "../stream/networkTypes"

function makeCtx(
  nodes: Array<{ id: string; data: Record<string, unknown> }>,
  edges: Array<{ source: string; target: string; data?: Record<string, unknown> }>,
  config: MermaidDagConfig,
): NetworkLayoutContext<MermaidDagConfig> {
  return {
    nodes: nodes as unknown as NetworkLayoutContext<MermaidDagConfig>["nodes"],
    edges: edges as unknown as NetworkLayoutContext<MermaidDagConfig>["edges"],
    dimensions: { width: 600, height: 400, plot: { x: 0, y: 0, width: 600, height: 400 } },
    theme: { semantic: {} as never, categorical: [] },
    resolveColor: () => "#888",
    config,
    selection: null,
  }
}

const NODES = [
  { id: "A", data: { layer: 0, row: 0, label: "Start", shape: "rect" } },
  { id: "B", data: { layer: 1, row: 0, label: "Decide", shape: "diamond" } },
  { id: "C", data: { layer: 1, row: 1, label: "Other", shape: "rect" } },
  { id: "D", data: { layer: 2, row: 0, label: "End", shape: "cylinder" } },
]
const EDGES = [
  { source: "A", target: "B", data: { label: "go" } },
  { source: "A", target: "C" },
  { source: "B", target: "D" },
  { source: "C", target: "D" },
]

const rects = (res: ReturnType<typeof mermaidDagLayout>): Record<string, NetworkRectNode> =>
  Object.fromEntries((res.sceneNodes as NetworkRectNode[]).map((n) => [n.id, n]))

describe("mermaidDagLayout", () => {
  it("emits one hit-rect per node plus an overlay", () => {
    const res = mermaidDagLayout(makeCtx(NODES, EDGES, { direction: "TD" }))
    expect(res.sceneNodes).toHaveLength(4)
    expect(res.overlays).toBeTruthy()
    // Hit-rects are transparent (visuals are in the overlay).
    expect((res.sceneNodes as NetworkRectNode[])[0].style.fill).toBe("transparent")
  })

  it("lays out top-down by layer (TD): deeper layers sit lower", () => {
    const r = rects(mermaidDagLayout(makeCtx(NODES, EDGES, { direction: "TD" })))
    expect(r.A.y).toBeLessThan(r.B.y) // layer 0 above layer 1
    expect(r.B.y).toBeLessThan(r.D.y) // layer 1 above layer 2
    // Same-layer nodes share depth (y) but differ on the cross axis (x).
    expect(Math.abs(r.B.y - r.C.y)).toBeLessThan(1)
    expect(r.B.x).not.toBe(r.C.x)
  })

  it("lays out left-right by layer (LR): deeper layers sit further right", () => {
    const r = rects(mermaidDagLayout(makeCtx(NODES, EDGES, { direction: "LR" })))
    expect(r.A.x).toBeLessThan(r.B.x)
    expect(r.B.x).toBeLessThan(r.D.x)
    expect(Math.abs(r.B.x - r.C.x)).toBeLessThan(1)
    expect(r.B.y).not.toBe(r.C.y)
  })

  it("reverses with BT (bottom-up): layer 0 sits lower than deeper layers", () => {
    const r = rects(mermaidDagLayout(makeCtx(NODES, EDGES, { direction: "BT" })))
    expect(r.A.y).toBeGreaterThan(r.D.y)
  })

  it("gives each hit-rect a tooltip-shaped datum (name + human-readable type)", () => {
    const res = mermaidDagLayout(makeCtx(NODES, EDGES, { direction: "TD" }))
    const r = rects(res)
    expect(r.A.datum).toMatchObject({ name: "Start", type: "process", shape: "rect" })
    expect(r.B.datum).toMatchObject({ name: "Decide", type: "decision", shape: "diamond" })
    expect(r.D.datum).toMatchObject({ name: "End", type: "database", shape: "cylinder" })
  })

  it("returns empty scene for no nodes", () => {
    const res = mermaidDagLayout(makeCtx([], [], {}))
    expect(res.sceneNodes).toEqual([])
    expect(res.overlays).toBeNull()
  })

  it("keeps all node rects within the plot bounds", () => {
    const r = rects(mermaidDagLayout(makeCtx(NODES, EDGES, { direction: "TD" })))
    for (const n of Object.values(r)) {
      expect(n.x).toBeGreaterThanOrEqual(0)
      expect(n.y).toBeGreaterThanOrEqual(0)
      expect(n.x + n.w).toBeLessThanOrEqual(600 + 1)
      expect(n.y + n.h).toBeLessThanOrEqual(400 + 1)
    }
  })
})
