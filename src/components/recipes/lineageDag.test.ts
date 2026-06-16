import { describe, it, expect } from "vitest"
import { lineageDagLayout, type LineageDagConfig } from "./lineageDag"
import type { NetworkLayoutContext } from "../stream/networkCustomLayout"
import type { RealtimeNode, RealtimeEdge, NetworkRectNode, NetworkCircleNode, NetworkCurvedEdge } from "../stream/networkTypes"

function makeCtx(
  config: LineageDagConfig,
  nodes: RealtimeNode[],
  edges: RealtimeEdge[],
  selection?: NetworkLayoutContext<LineageDagConfig>["selection"],
  plot = { x: 0, y: 0, width: 900, height: 400 }
): NetworkLayoutContext<LineageDagConfig> {
  return {
    nodes,
    edges,
    dimensions: { width: plot.width, height: plot.height, plot },
    theme: { semantic: { border: "#888", surface: "#222" }, categorical: ["#4e79a7", "#f28e2c"] },
    resolveColor: (key) => key,
    config,
    selection,
  }
}

// 3-layer DAG: source → {aggregate, filter} → sink, plus a back-edge sink→aggregate.
const nodes: RealtimeNode[] = [
  { id: "src", x: 0, y: 0, data: { id: "src", x: 0, y: 0, partition: "topic-source", semantic: "source", label: "orders" } },
  { id: "agg", x: 1, y: -0.5, data: { id: "agg", x: 1, y: -0.5, partition: "processor", semantic: "aggregate", label: "KSTREAM-AGGREGATE-0000000007", stores: ["hourly-revenue", "changelog"] } },
  { id: "flt", x: 1, y: 0.5, data: { id: "flt", x: 1, y: 0.5, partition: "processor", semantic: "filter", label: "confirmed-only" } },
  { id: "snk", x: 2, y: 0, data: { id: "snk", x: 2, y: 0, partition: "topic-sink", semantic: "sink", label: "revenue-out" } },
] as unknown as RealtimeNode[]

const edges: RealtimeEdge[] = [
  { source: "src", target: "agg", data: { source: "src", target: "agg", edgeType: "internal", isBackEdge: false } },
  { source: "src", target: "flt", data: { source: "src", target: "flt", edgeType: "internal", isBackEdge: false } },
  { source: "agg", target: "snk", data: { source: "agg", target: "snk", edgeType: "internal", isBackEdge: false } },
  { source: "flt", target: "snk", data: { source: "flt", target: "snk", edgeType: "internal", isBackEdge: false } },
  { source: "snk", target: "agg", data: { source: "snk", target: "agg", edgeType: "topic-bridge", isBackEdge: true } },
] as unknown as RealtimeEdge[]

const baseConfig: LineageDagConfig = { layerCount: 3, maxLayerSize: 2 }

describe("lineageDagLayout", () => {
  it("emits exactly one scene node per node (the single hit-testable unit)", () => {
    const r = lineageDagLayout(makeCtx(baseConfig, nodes, edges))
    expect(r.sceneNodes).toHaveLength(4)
    for (const n of r.sceneNodes!) {
      expect(n.type).toBe("rect")
      expect(n.id).toBeTruthy()
      expect(n.datum).toBeTruthy() // carries the datum so hover/click resolve to the node
    }
    // one edge per input edge
    expect(r.sceneEdges).toHaveLength(5)
    // composite glyph chrome rides the overlay layer
    expect(r.overlays).toBeTruthy()
  })

  it("maps logical layer/row into the plot rect, left → right", () => {
    const r = lineageDagLayout(makeCtx(baseConfig, nodes, edges))
    const byId = Object.fromEntries(r.sceneNodes!.map((n) => [n.id!, n as NetworkRectNode]))
    // src (layer 0) is left of agg (layer 1) is left of snk (layer 2)
    expect(byId.src.x).toBeLessThan(byId.agg.x)
    expect(byId.agg.x).toBeLessThan(byId.snk.x)
    // within plot bounds
    for (const n of r.sceneNodes as NetworkRectNode[]) {
      expect(n.x).toBeGreaterThanOrEqual(-1)
      expect(n.x + n.w).toBeLessThanOrEqual(901)
    }
  })

  it("renders back-edges visibly distinct (dashed + danger color)", () => {
    const r = lineageDagLayout(makeCtx(baseConfig, nodes, edges))
    const back = (r.sceneEdges as NetworkCurvedEdge[]).find((e) => e.datum && (e.datum as { data?: { isBackEdge?: boolean } }).data?.isBackEdge)
    expect(back).toBeTruthy()
    expect(back!.style.strokeDasharray).toBeTruthy()
    const forward = (r.sceneEdges as NetworkCurvedEdge[]).find((e) => !(e.datum as { data?: { isBackEdge?: boolean } }).data?.isBackEdge)
    expect(forward!.style.strokeDasharray).toBeFalsy()
    // back-edge bows below (its path differs from a straight forward S-curve)
    expect(back!.pathD).not.toEqual(forward!.pathD)
  })

  it("dims nodes outside a caller-supplied reachable set", () => {
    const r = lineageDagLayout(makeCtx({ ...baseConfig, reachableIds: ["src", "agg", "snk"], dimOpacity: 0.1 }, nodes, edges))
    const byId = Object.fromEntries(r.sceneNodes!.map((n) => [n.id!, n]))
    expect(byId.flt.style.opacity).toBe(0.1) // out of reach → dimmed
    expect(byId.agg.style.opacity).toBe(1) // in reach → full
  })

  it("dims an edge when either endpoint is dimmed", () => {
    const r = lineageDagLayout(makeCtx({ ...baseConfig, reachableIds: ["src", "agg", "snk"], dimOpacity: 0.1, edgeOpacity: 0.5 }, nodes, edges))
    const edgeTo = (tid: string) =>
      (r.sceneEdges as NetworkCurvedEdge[]).find((e) => (e.datum as { data?: { target?: string } }).data?.target === tid)
    expect(edgeTo("flt")!.style.opacity).toBeLessThan(0.5) // src→flt: flt dimmed
    expect(edgeTo("snk")!.style.opacity).toBe(0.5) // agg→snk: both in reach
  })

  it("draws the selection ring on the selected node only, host-driven", () => {
    const r = lineageDagLayout(makeCtx({ ...baseConfig, selectedId: "agg", accentColor: "#ff0" }, nodes, edges))
    const byId = Object.fromEntries(r.sceneNodes!.map((n) => [n.id!, n]))
    expect(byId.agg.style.stroke).toBe("#ff0")
    expect(byId.agg.style.strokeWidth).toBe(3)
    expect(byId.flt.style.strokeWidth).toBe(1)
  })

  it("honors the shared selection predicate from ctx.selection (LinkedCharts)", () => {
    const r = lineageDagLayout(
      makeCtx(baseConfig, nodes, edges, {
        isActive: true,
        predicate: (d) => (d as { id?: string }).id === "agg",
      })
    )
    const byId = Object.fromEntries(r.sceneNodes!.map((n) => [n.id!, n]))
    expect(byId.agg.style.opacity).toBe(1) // matches selection
    expect(byId.src.style.opacity).toBeLessThan(1) // not selected → dim
  })

  it("applies configurable edge widths (forward + back)", () => {
    const def = lineageDagLayout(makeCtx(baseConfig, nodes, edges)).sceneEdges as NetworkCurvedEdge[]
    expect(def.find((e) => !(e.datum as { data?: { isBackEdge?: boolean } }).data?.isBackEdge)!.style.strokeWidth).toBe(1.25)
    expect(def.find((e) => (e.datum as { data?: { isBackEdge?: boolean } }).data?.isBackEdge)!.style.strokeWidth).toBe(1.5)

    const wide = lineageDagLayout(makeCtx({ ...baseConfig, edgeWidth: 3 }, nodes, edges)).sceneEdges as NetworkCurvedEdge[]
    expect(wide.find((e) => !(e.datum as { data?: { isBackEdge?: boolean } }).data?.isBackEdge)!.style.strokeWidth).toBe(3)
    // backEdgeWidth falls back to edgeWidth when unset
    expect(wide.find((e) => (e.datum as { data?: { isBackEdge?: boolean } }).data?.isBackEdge)!.style.strokeWidth).toBe(3)
  })

  it("collapses to dot circles with no glyph overlay in dot LOD", () => {
    const r = lineageDagLayout(makeCtx({ ...baseConfig, lod: "dot" }, nodes, edges))
    for (const n of r.sceneNodes!) expect(n.type).toBe("circle")
    const r0 = r.sceneNodes![0] as NetworkCircleNode
    expect(r0.r).toBeGreaterThan(0)
    expect(r.overlays).toBeNull() // dots carry no overlay chrome
  })

  it("auto-derives a tighter LOD when the plot is crowded", () => {
    // 3 layers in a 120px-wide plot → no room for full glyphs.
    const tight = makeCtx(baseConfig, nodes, edges, undefined, { x: 0, y: 0, width: 120, height: 80 })
    const r = lineageDagLayout(tight)
    // crowded → dots (no overlay) rather than full glyphs
    expect(r.overlays).toBeNull()
  })

  it("is deterministic — identical input yields identical geometry", () => {
    const a = lineageDagLayout(makeCtx(baseConfig, nodes, edges))
    const b = lineageDagLayout(makeCtx(baseConfig, nodes, edges))
    const geo = (r: typeof a) => (r.sceneNodes as NetworkRectNode[]).map((n) => [n.id, n.x, n.y, n.w, n.h])
    expect(geo(a)).toEqual(geo(b))
  })

  it("auto-computes layerCount/maxLayerSize from node coords when omitted", () => {
    const r = lineageDagLayout(makeCtx({}, nodes, edges))
    expect(r.sceneNodes).toHaveLength(4)
    // still maps left→right
    const byId = Object.fromEntries(r.sceneNodes!.map((n) => [n.id!, n as NetworkRectNode]))
    expect(byId.src.x).toBeLessThan(byId.snk.x)
  })
})
