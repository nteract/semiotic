import { describe, it, expect } from "vitest"
import { NetworkPipelineStore } from "../stream/NetworkPipelineStore"
import { flextreeLayout } from "./flextree"
import type { NetworkRectNode, NetworkCurvedEdge } from "../stream/networkTypes"

// Mirrors the dataset on the docs page (Features → Custom Charts → Flextree).
// Locks in the no-overlap, height-variation, and edge-routing guarantees so
// we don't ship visually-broken demo data.
const flextreeNodes = [
  { id: "root",        label: "Documentation", x: 320, y: 50,  width: 70, height: 40 },
  { id: "tutorials",   label: "Tutorials",     x: 171, y: 135, width: 92, height: 70 },
  { id: "api",         label: "API Reference", x: 422, y: 116, width: 58, height: 32 },
  { id: "recipes",     label: "Recipes",       x: 571, y: 129, width: 80, height: 58 },
  { id: "setup",       label: "Setup",         x: 31,  y: 213, width: 58, height: 26 },
  { id: "first-chart", label: "First Chart",   x: 164, y: 243, width: 84, height: 86 },
  { id: "streaming",   label: "Streaming",     x: 304, y: 213, width: 72, height: 26 },
  { id: "charts",      label: "Charts",        x: 387, y: 213, width: 58, height: 26 },
  { id: "frames",      label: "Frames",        x: 457, y: 213, width: 58, height: 26 },
  { id: "waffle",      label: "Waffle",        x: 533, y: 213, width: 58, height: 26 },
  { id: "horizon",     label: "Horizon",       x: 606, y: 234, width: 64, height: 68 },
  { id: "data",        label: "Data",          x: 95,  y: 333, width: 46, height: 26 },
  { id: "render",      label: "Render",        x: 159, y: 333, width: 58, height: 26 },
  { id: "theme",       label: "Theme",         x: 228, y: 333, width: 56, height: 26 },
  { id: "bands",       label: "Bands",         x: 606, y: 333, width: 54, height: 26 },
]
const flextreeEdges = [
  { source: "root", target: "tutorials" },
  { source: "root", target: "api" },
  { source: "root", target: "recipes" },
  { source: "tutorials", target: "setup" },
  { source: "tutorials", target: "first-chart" },
  { source: "tutorials", target: "streaming" },
  { source: "api", target: "charts" },
  { source: "api", target: "frames" },
  { source: "recipes", target: "waffle" },
  { source: "recipes", target: "horizon" },
  { source: "first-chart", target: "data" },
  { source: "first-chart", target: "render" },
  { source: "first-chart", target: "theme" },
  { source: "horizon", target: "bands" },
]

function rectsOverlap(a: NetworkRectNode, b: NetworkRectNode): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

function buildStore() {
  const store = new NetworkPipelineStore({
    chartType: "force",
    nodeIDAccessor: "id",
    sourceAccessor: "source",
    targetAccessor: "target",
    customNetworkLayout: flextreeLayout,
    layoutConfig: { orientation: "vertical", labelAccessor: "label" },
  })
  store.ingestBounded(flextreeNodes, flextreeEdges, [640, 360])
  store.buildScene([640, 360])
  return store
}

describe("flextree docs demo layout", () => {
  it("emits non-overlapping rects in 4 rows", () => {
    const store = buildStore()
    const rects = store.sceneNodes.filter((n): n is NetworkRectNode => n.type === "rect")
    expect(rects).toHaveLength(15)

    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        expect(
          rectsOverlap(rects[i], rects[j]),
          `rect ${i} (${rects[i].label}) overlaps rect ${j} (${rects[j].label})`
        ).toBe(false)
      }
    }
  })

  it("includes at least one node ≥ 3× as tall as its siblings", () => {
    // Headline value of flextree: dramatic per-node height variation.
    const store = buildStore()
    const rects = store.sceneNodes.filter((n): n is NetworkRectNode => n.type === "rect")
    const heights = rects.map((r) => r.h)
    expect(Math.max(...heights) / Math.min(...heights)).toBeGreaterThanOrEqual(3)
  })

  it("uses 4 rows of varying depth (asymmetric depth)", () => {
    // Group rects by their top edge — rows align by top, not center.
    const store = buildStore()
    const rects = store.sceneNodes.filter((n): n is NetworkRectNode => n.type === "rect")
    const topEdges = new Set(rects.map((r) => r.y))
    expect(topEdges.size).toBe(4)
  })

  it("draws edges from parent bottom to child top, not center to center", () => {
    // Regression: original recipe drew bezier paths center-to-center,
    // which visibly bisects tall rects. The fix routes each edge from the
    // parent's bottom edge to the child's top edge.
    const store = buildStore()
    const edges = store.sceneEdges.filter((e): e is NetworkCurvedEdge => e.type === "curved")
    expect(edges).toHaveLength(14)

    // Edge from Tutorials (center y=135, h=70 → bottom y=170) to First
    // Chart (center y=243, h=86 → top y=200). The path's M command should
    // start at y=170, not y=135.
    const tutToFirst = edges.find((e) => {
      const m = /^M([\d.]+),([\d.]+)/.exec(e.pathD)
      const c = /([\d.]+),([\d.]+)$/.exec(e.pathD)
      return m && c && Math.abs(Number(m[1]) - 171) < 1 && Math.abs(Number(c[1]) - 164) < 1
    })
    expect(tutToFirst).toBeDefined()
    const start = /^M([\d.]+),([\d.]+)/.exec(tutToFirst!.pathD)!
    expect(Number(start[2])).toBe(170) // bottom of Tutorials, not its center (135)
    const end = /([\d.]+),([\d.]+)$/.exec(tutToFirst!.pathD)!
    expect(Number(end[2])).toBe(200) // top of First Chart, not its center (243)
  })
})
