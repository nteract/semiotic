/**
 * In-repo network recipes under `perspective`: every decoration a recipe
 * draws in `backgrounds`/`overlays` must follow the projection (ground
 * geometry on the ground, upright chrome at its projected anchor), flat
 * output must be unchanged, and recipes never trip the flat-decoration
 * warning.
 */
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import type { ReactNode } from "react"
import type { NetworkLayoutContext, NetworkLayoutResult } from "../stream/networkCustomLayout"
import type { NetworkRectNode } from "../stream/networkTypes"
import { NetworkPerspectiveLayer } from "../stream/networkPerspectiveContext"
import { buildNetworkPerspectiveFrame, resolveNetworkPerspective } from "../stream/networkPerspective"
import { NetworkPerspectiveState } from "../stream/networkPerspectiveState"
import { projectNetworkScene } from "../stream/networkPerspectiveScene"
import { dagreLayout } from "./dagre"
import { lineageDagLayout } from "./lineageDag"
import { adjacencyFlowLayout } from "./adjacencyFlow"
import { mermaidDagLayout } from "./mermaidDag"
import { netEnsembleLayout } from "./netEnsembleLayout"
import { packedClusterMatrix } from "./packedClusterMatrix"
import { transitDiagramLayout } from "./transitDiagram"
import { unstable_fromGofishIR } from "./gofishIR"
import { gofishIRExamples } from "./gofishIRExamples"

const plot = { x: 10, y: 20, width: 600, height: 360 }
const ISO = resolveNetworkPerspective("isometric")!.config
// A fitted isometric-like frame for a scene with 6px pieces.
const frame = { ...buildNetworkPerspectiveFrame("isometric", [0.7, 0.4, -0.7, 0.4, 320, 40], 0.8), thickness: 6 }

function context(
  nodes: Record<string, unknown>[],
  edges: Record<string, unknown>[],
  config: unknown = {},
  perspective: typeof ISO | null = null
): NetworkLayoutContext<never> {
  return {
    nodes: nodes.map((data) => ({ ...data, data })),
    edges: edges.map((data) => ({ ...data, data })),
    dimensions: { width: 640, height: 400, plot },
    theme: { semantic: {}, categorical: ["#4e79a7", "#f28e2c", "#59a14f"] },
    resolveColor: () => "#4e79a7",
    config,
    selection: null,
    perspective
  } as unknown as NetworkLayoutContext<never>
}

const decorations = (r: NetworkLayoutResult) => (
  <svg>
    {r.backgrounds}
    {r.overlays}
  </svg>
)

function projected(content: ReactNode): Document {
  const html = renderToStaticMarkup(<NetworkPerspectiveLayer frame={frame}>{content}</NetworkPerspectiveLayer>)
  return new DOMParser().parseFromString(html, "text/html")
}

const DRAWN = "path, polygon, polyline, circle, ellipse, rect, line, text, foreignObject"

/** Drawn elements not wrapped in a perspective placement. */
function unplaced(doc: Document): Element[] {
  return [...doc.querySelectorAll(DRAWN)].filter((el) => !el.closest("[data-perspective]"))
}

function roles(doc: Document): Record<string, number> {
  const out: Record<string, number> = {}
  for (const el of doc.querySelectorAll("[data-perspective]")) {
    const role = el.getAttribute("data-perspective")!
    out[role] = (out[role] ?? 0) + 1
  }
  return out
}

/** Flat output never mentions the perspective wrappers. */
function expectFlatUntouched(r: NetworkLayoutResult) {
  const flat = renderToStaticMarkup(decorations(r))
  expect(flat).not.toContain("data-perspective")
  expect(renderToStaticMarkup(<NetworkPerspectiveLayer frame={null}>{decorations(r)}</NetworkPerspectiveLayer>)).toBe(flat)
}

/** Every declared decoration bound projects inside the plot once fitted. */
function expectBoundsInPlot(r: NetworkLayoutResult, preset: "isometric" | "dimetric" | "pixel" = "isometric") {
  const size: [number, number] = [640, 400]
  const scene = projectNetworkScene({
    sceneNodes: r.sceneNodes ?? [],
    sceneEdges: r.sceneEdges ?? [],
    labels: r.labels ?? [],
    bounds: r.perspectiveBounds,
    size,
    perspective: resolveNetworkPerspective(preset)!
  })
  const T = scene.frame.thickness ?? 0
  const inside = (x: number, y: number) => {
    expect(x).toBeGreaterThanOrEqual(-0.5)
    expect(x).toBeLessThanOrEqual(size[0] + 0.5)
    expect(y).toBeGreaterThanOrEqual(-0.5)
    expect(y).toBeLessThanOrEqual(size[1] + 0.5)
  }
  for (const b of r.perspectiveBounds ?? []) {
    if ("extent" in b) {
      const [px, py] = scene.frame.project(b.x, b.y, b.z === "top" || b.z == null ? T : b.z)
      const [l, rr, t, bb] = b.extent
      inside(px - l, py - t)
      inside(px + rr, py + bb)
    } else {
      const z = b.z === "top" ? T : b.z ?? 0
      for (const [x, y] of [[b.x, b.y], [b.x + b.width, b.y], [b.x + b.width, b.y + b.height], [b.x, b.y + b.height]]) {
        inside(...scene.frame.project(x, y, z))
      }
    }
  }
}

function expectNoWarning(r: NetworkLayoutResult) {
  const state = new NetworkPerspectiveState()
  const warn = console.warn
  const calls: unknown[] = []
  console.warn = (...args: unknown[]) => calls.push(args)
  try {
    state.warnFlatDecorations(r as { backgrounds?: unknown; overlays?: unknown; perspective?: string })
  } finally {
    console.warn = warn
  }
  expect(calls).toHaveLength(0)
  expect(r.perspective).toBe("manual")
}

describe("recipes follow an active perspective", () => {
  it("dagre: arrowheads lie on the ground at edge height", () => {
    const r = dagreLayout(context(
      [{ id: "a", x: 100, y: 100, width: 80, height: 30 }, { id: "b", x: 300, y: 260, width: 80, height: 30 }],
      [{ source: "a", target: "b" }]
    ))
    expectFlatUntouched(r)
    expectNoWarning(r)
    const doc = projected(decorations(r))
    expect(unplaced(doc)).toEqual([])
    const ground = doc.querySelector('[data-perspective="ground"]')!
    // The plane is lifted by thickness × lift (6 × 0.8) above the ground.
    expect(ground.getAttribute("transform")).toBe("matrix(0.7 0.4 -0.7 0.4 320 35.2)")
    expect(ground.querySelectorAll("polygon.recipe-edge-arrow")).toHaveLength(1)
  })

  it("lineageDag: hulls on the ground, arrowheads at edge height, chrome standing", () => {
    const nodes = [
      { id: "a", x: 0, y: 0, label: "Orders", subtopologyId: "s1" },
      { id: "b", x: 1, y: 0, label: "Join", subtopologyId: "s1" },
      { id: "c", x: 2, y: 1, label: "Sink", subtopologyId: "s2" }
    ]
    const edges = [{ source: "a", target: "b" }, { source: "b", target: "c" }]
    const config = { hullGroupAccessor: "subtopologyId", hullLabel: (g: string) => `Group ${g}` }
    const r = lineageDagLayout(context(nodes, edges, config))
    expectFlatUntouched(r)
    expectNoWarning(r)
    const lifted = lineageDagLayout(context(nodes, edges, config, ISO))
    // Three upright cards, two hull boxes and two hull labels.
    expect(lifted.perspectiveBounds).toHaveLength(7)
    expectBoundsInPlot(lifted)
    const doc = projected(decorations(r))
    expect(unplaced(doc)).toEqual([])
    const counts = roles(doc)
    // Two hulls; one arrow layer; three node chrome cards + two hull labels.
    expect(counts.ground).toBe(3)
    expect(counts.billboard).toBe(5)
    expect(doc.querySelectorAll('[data-perspective="ground"] path.lineage-dag-hull')).toHaveLength(2)
  })

  it("adjacencyFlow: matrix grid on the ground, arrows at edge height", () => {
    const nodes = ["a", "b", "c"].map((id) => ({ id }))
    const edges = [{ source: "a", target: "b", value: 4 }, { source: "b", target: "c", value: 3 }]
    const r = adjacencyFlowLayout(context(nodes, edges, {}))
    expectFlatUntouched(r)
    expectNoWarning(r)
    const lifted = adjacencyFlowLayout(context(nodes, edges, {}, ISO))
    expect(lifted.perspectiveBounds).toHaveLength(1)
    expectBoundsInPlot(lifted)
    const doc = projected(decorations(r))
    expect(unplaced(doc)).toEqual([])
    expect(roles(doc).ground).toBe(2)
  })

  it("mermaid: under a perspective nodes and edges become solid scene pieces", () => {
    const nodes = [
      { id: "A", layer: 0, row: 0, label: "Start", shape: "stadium" },
      { id: "B", layer: 1, row: 0, label: "Valid?", shape: "diamond" },
      { id: "C", layer: 2, row: 0, label: "Store", shape: "cylinder" }
    ]
    const edges = [{ source: "A", target: "B", label: "go" }, { source: "B", target: "C" }]
    const flat = mermaidDagLayout(context(nodes, edges))
    expect((flat.sceneNodes as NetworkRectNode[])[0].style.fill).toBe("transparent")
    expect(flat.sceneEdges).toBeUndefined()

    const solid = mermaidDagLayout(context(nodes, edges, {}, ISO))
    expectNoWarning(solid)
    const rects = solid.sceneNodes as NetworkRectNode[]
    // Visible pieces whose outline is the node's shape.
    expect(rects.every((n) => n.style.fill !== "transparent")).toBe(true)
    expect(rects[1]._hitPath?.pathD).toMatch(/^M[\d.]+,[\d.]+ L/)
    expect(rects[0]._hitPath?.pathD).toContain(" A")
    expect(solid.sceneEdges).toHaveLength(2)
    // Labels keep their offset from the node.
    expect(solid.labels?.map((l) => l.anchorPoint)).toEqual(rects.map((n) => [n.x + n.w / 2, n.y + n.h / 2]))
    const doc = projected(decorations(solid))
    expect(unplaced(doc)).toEqual([])
    // Edge label card stands; arrowheads and the cylinder rim lie on the top plane.
    expect(roles(doc).billboard).toBe(1)
    expect(doc.body.textContent).toContain("go")
    expect(doc.body.textContent).not.toContain("Start")
  })

  it("netEnsemble: enclosures on the ground, headers standing, legend flat", () => {
    const diamond = (p: string) => [
      { source: `${p}a`, target: `${p}b` }, { source: `${p}a`, target: `${p}c` },
      { source: `${p}b`, target: `${p}d` }, { source: `${p}c`, target: `${p}d` }
    ]
    const nodes = ["a", "b", "c", "d"].flatMap((id) => [{ id: `p${id}` }, { id: `q${id}` }])
    const edges = [...diamond("p"), ...diamond("q")]
    const flatResult = netEnsembleLayout(context(nodes, edges, {}))
    expectFlatUntouched(flatResult)
    expect(flatResult.perspectiveBounds).toBeUndefined()
    const r = netEnsembleLayout(context(nodes, edges, {}, ISO))
    expectNoWarning(r)
    // Flat bands are full-width rows; projected bands hug their cells and
    // header so they don't run off the plot as long empty diagonals.
    const widthOf = (res: NetworkLayoutResult) =>
      Number(new DOMParser().parseFromString(renderToStaticMarkup(decorations(res)), "text/html")
        .querySelector("rect")!.getAttribute("width"))
    expect(widthOf(flatResult)).toBeCloseTo(plot.width + 12, 6)
    expect(widthOf(r)).toBeLessThan(plot.width / 2)
    expect(r.perspectiveBounds?.length).toBe(2)
    expectBoundsInPlot(r, "dimetric")
    const doc = projected(decorations(r))
    const flat = unplaced(doc)
    // Only the legend (screen chrome) stays in plot space.
    expect(flat.length).toBeGreaterThan(0)
    expect(flat.every((el) => el.closest("g")?.textContent?.includes("converges (1 sink)"))).toBe(true)
    expect(roles(doc).ground).toBeGreaterThan(0)
    expect(roles(doc).billboard).toBeGreaterThan(0)
  })

  it("packedClusterMatrix: icons and marker dots lie on their tokens, headers stand", () => {
    const rows = [
      { id: "a1", region: "US", orbit: "LEO", mass: 200, klass: "Biz", uk: true },
      { id: "a2", region: "US", orbit: "GEO", mass: 900, klass: "Civil" },
      { id: "b1", region: "EU", orbit: "LEO", mass: 300, klass: "Civil" }
    ]
    const matrixConfig = {
      columnAccessor: "region",
      rowAccessor: "orbit",
      sizeAccessor: "mass",
      iconAccessor: "klass",
      iconMap: { Civil: "star", Biz: "triangle" },
      markerAccessor: "uk",
      callouts: [{ field: "id", value: "a2", label: "Largest" }]
    }
    const r = packedClusterMatrix(context(rows, [], matrixConfig) as never)
    expectFlatUntouched(r)
    expectNoWarning(r)
    expect(r.perspectiveBounds).toBeUndefined()
    const lifted = packedClusterMatrix(context(rows, [], matrixConfig, ISO) as never)
    // Enclosures, column headers, row labels and the callout.
    expect(lifted.perspectiveBounds!.length).toBeGreaterThanOrEqual(6)
    expectBoundsInPlot(lifted)
    const doc = projected(decorations(r))
    expect(unplaced(doc)).toEqual([])
    const counts = roles(doc)
    expect(counts["on-ground"]).toBeGreaterThanOrEqual(3)
    expect(counts.billboard).toBeGreaterThanOrEqual(4)
    // Token-style placement: translate, normalized ground map, translate back.
    const lay = doc.querySelector('[data-perspective="on-ground"]')!.getAttribute("transform")!
    const coefficients = lay.match(/matrix\(([^)]+)\)/)![1].split(" ").map(Number)
    const k = Math.hypot(frame.matrix[0], frame.matrix[2])
    expect(coefficients).toEqual([...frame.matrix.slice(0, 4).map((v) => v / k), 0, 0])
  })

  it("transitDiagram: station labels keep their offset, custom stations stand", () => {
    const nodes = [
      { id: "a", label: "Alpha", x: 0, y: 0 },
      { id: "b", label: "Bravo", x: 1, y: 0 }
    ]
    const edges = [{ source: "a", target: "b", line: "red", color: "#d33" }]
    const r = transitDiagramLayout(context(nodes, edges, {
      renderStation: ({ x, y }: { x: number; y: number }) => <rect x={x - 3} y={y - 3} width={6} height={6} />
    }) as never)
    expectFlatUntouched(r)
    expectNoWarning(r)
    const stations = new Map(r.sceneNodes!.map((n) => [n.id, n]))
    for (const label of r.labels ?? []) {
      const station = [...stations.values()].find((n) => n.type === "circle" && n.cx === label.anchorPoint?.[0] && n.cy === label.anchorPoint?.[1])
      expect(station).toBeTruthy()
    }
    const doc = projected(decorations(r))
    expect(unplaced(doc)).toEqual([])
    expect(roles(doc).billboard).toBe(2)
  })

  it("GoFish: the baked picture lies on its hit targets' top plane", () => {
    const ex = gofishIRExamples[0]
    const config = unstable_fromGofishIR(ex.doc)
    const r = config.networkLayout(context([], [], config.layoutConfig))
    expectFlatUntouched(r)
    expectNoWarning(r)
    const lifted = config.networkLayout(context([], [], config.layoutConfig, ISO))
    expect(lifted.perspectiveBounds).toEqual([{ x: 0, y: 0, width: ex.doc.viewport.w, height: ex.doc.viewport.h, z: "top" }])
    expectBoundsInPlot(lifted)
    const doc = projected(decorations(r))
    expect(unplaced(doc)).toEqual([])
    expect(roles(doc).ground).toBe(1)
  })
})
