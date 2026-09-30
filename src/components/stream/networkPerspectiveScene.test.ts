import { beforeAll, describe, expect, it } from "vitest"
import { projectNetworkScene } from "./networkPerspectiveScene"
import { provideNetworkPerspectiveExtras } from "./networkPerspectiveLoader"
import { networkPerspectiveExtras } from "./networkPerspectiveExtras"

beforeAll(() => provideNetworkPerspectiveExtras(networkPerspectiveExtras))
import { resolveNetworkPerspective, type NetworkPerspective } from "./networkPerspective"
import type {
  NetworkCircleNode,
  NetworkLabel,
  NetworkLineEdge,
  NetworkRectNode,
  NetworkSceneEdge,
  NetworkSceneNode
} from "./networkTypes"

const SIZE: [number, number] = [400, 300]

function circle(id: string, cx: number, cy: number, extra: Record<string, unknown> = {}): NetworkCircleNode {
  return { type: "circle", cx, cy, r: 8, style: { fill: "#4e79a7" }, datum: { id, data: { id, ...extra } }, id }
}

function rect(id: string, x: number, y: number, w: number, h: number, extra: Record<string, unknown> = {}): NetworkRectNode {
  return { type: "rect", x, y, w, h, style: { fill: "#e15759" }, datum: { id, data: { id, ...extra } }, id }
}

function line(a: NetworkCircleNode, b: NetworkCircleNode): NetworkLineEdge {
  return {
    type: "line",
    x1: a.cx, y1: a.cy, x2: b.cx, y2: b.cy,
    style: { stroke: "#999" },
    datum: { source: a.datum, target: b.datum }
  }
}

function project(
  perspective: NetworkPerspective,
  nodes: NetworkSceneNode[],
  edges: NetworkSceneEdge[] = [],
  labels: NetworkLabel[] = [],
  chartType?: string
) {
  return projectNetworkScene({
    sceneNodes: nodes,
    sceneEdges: edges,
    labels,
    size: SIZE,
    perspective: resolveNetworkPerspective(perspective)!,
    chartType
  })
}

describe("projectNetworkScene", () => {
  const a = circle("a", 50, 50)
  const b = circle("b", 350, 50)
  const c = circle("c", 200, 250)

  it("lays point marks on the ground as tokens with a rim", () => {
    const scene = project("isometric", [a, b, c], [line(a, b)])
    for (const node of scene.sceneNodes as NetworkCircleNode[]) {
      const original = [a, b, c].find((n) => n.id === node.id)!
      // The top disc sits one thickness (6) above the ground point.
      const [x, y] = scene.frame.project(original.cx, original.cy, 6)
      expect(node.cx).toBeCloseTo(x, 6)
      expect(node.cy).toBeCloseTo(y, 6)
      expect(node.r).toBe(8)
      expect(node._perspectiveToken).toBe(true)
      expect(node.pathD).toMatch(/^M.*C.*Z$/)
      // The rim: shaded walls hanging below the top disc.
      expect(node.faces?.length).toBeGreaterThan(1)
      for (const face of node.faces!) expect(face.shade).toBeLessThan(0)
      expect(node.datum).toBe(original.datum)
    }
    // Edges ride at piece height.
    const edge = scene.sceneEdges[0] as NetworkLineEdge
    expect(edge.y1).toBeCloseTo(scene.frame.project(50, 50, 6)[1], 6)
  })

  it("keeps billboard marks upright and moves them to projected ground points", () => {
    const scene = project({ type: "isometric", marks: "billboard", thickness: 0 }, [a, b, c], [line(a, b)])
    expect(scene.sceneNodes).toHaveLength(3)
    for (const node of scene.sceneNodes as NetworkCircleNode[]) {
      expect(node.r).toBe(8)
      expect(node.pathD).toBeUndefined()
      const original = [a, b, c].find((n) => n.id === node.id)!
      const [x, y] = scene.frame.project(original.cx, original.cy)
      expect(node.cx).toBeCloseTo(x, 6)
      expect(node.cy).toBeCloseTo(y, 6)
      // Datum identity is preserved for hover, keyboard and table lookups.
      expect(node.datum).toBe(original.datum)
    }
    const edge = scene.sceneEdges[0] as NetworkLineEdge
    expect(edge.x1).toBeCloseTo(scene.frame.project(50, 50)[0], 6)
    // Inputs are not mutated.
    expect(a.cx).toBe(50)
  })

  it("keeps every mark inside the plot", () => {
    const scene = project("isometric", [a, b, c])
    for (const node of scene.sceneNodes as NetworkCircleNode[]) {
      expect(node.cx - node.r).toBeGreaterThanOrEqual(0)
      expect(node.cx + node.r).toBeLessThanOrEqual(SIZE[0])
      expect(node.cy - node.r).toBeGreaterThanOrEqual(0)
      expect(node.cy + node.r).toBeLessThanOrEqual(SIZE[1])
    }
  })

  it("paints standing marks back to front", () => {
    const scene = project("isometric", [c, b, a])
    const depths = (scene.sceneNodes as NetworkCircleNode[]).map((n) => n.cy)
    expect([...depths].sort((p, q) => p - q)).toEqual(depths)
    const unsorted = project({ type: "isometric", depthSort: false }, [c, b, a])
    expect(unsorted.sceneNodes.map((n) => n.id)).toEqual(["c", "b", "a"])
  })

  it("lays rects on the ground with an exact hit path", () => {
    const r = rect("r", 100, 100, 80, 40)
    const scene = project({ type: "isometric", thickness: 0 }, [r])
    const out = scene.sceneNodes[0] as NetworkRectNode
    expect(out.pathD).toMatch(/^M.*Z$/)
    expect(out._hitPath?.pathD).toBe(out.pathD)
    // The bounds hold the parallelogram and its center is the projected center.
    const [cx, cy] = scene.frame.project(140, 120)
    expect(out.x + out.w / 2).toBeCloseTo(cx, 6)
    expect(out.y + out.h / 2).toBeCloseTo(cy, 6)
    expect(out.faces).toBeUndefined()
  })

  it("gives ground rects thickness: a raised top, side walls and a hit path over both", () => {
    const r = rect("r", 100, 100, 80, 40)
    const scene = project({ type: "isometric", thickness: 10 }, [r])
    const out = scene.sceneNodes[0] as NetworkRectNode
    // A backing strip in the darker shade, then the two visible walls.
    expect(out.faces).toHaveLength(3)
    expect(out.faces![0].shade).toBe(-0.32)
    expect(out.faces!.slice(1).map((f) => f.shade).sort((p, q) => p - q)).toEqual([-0.32, -0.16])
    expect(out._hitPath?.pathD.startsWith(out.pathD!)).toBe(true)
    expect(out._hitPath!.pathD.length).toBeGreaterThan(out.pathD!.length)
    // The bounds run from the top face down to the base.
    const [, topFront] = scene.frame.project(180, 140, 10)
    expect(out.y + out.h).toBeCloseTo(topFront + 10 * scene.frame.lift, 6)
  })

  it("stacks nested treemap levels on their parent's top surface", () => {
    const parent = { ...rect("p", 100, 100, 160, 100), depth: 0 }
    const child = { ...rect("c", 110, 110, 60, 40), depth: 1 }
    const scene = project({ type: "isometric", thickness: 8 }, [parent, child], [], [], "treemap")
    const byId = new Map(scene.sceneNodes.map((n) => [n.id, n as NetworkRectNode]))
    const top = (n: NetworkRectNode) => Number(n.pathD!.match(/^M(-?[\d.]+) (-?[\d.]+)/)![2])
    // Same ground corner (110,110) vs its parent at depth 0: 8 layout px higher.
    const [, parentAt] = scene.frame.project(110, 110, 8)
    const [, childAt] = scene.frame.project(110, 110, 16)
    expect(top(byId.get("c")!)).toBeCloseTo(childAt, 1)
    expect(parentAt - childAt).toBeCloseTo(8 * scene.frame.lift, 6)
    // Outside hierarchies, depth does not stack.
    const sankey = project({ type: "isometric", thickness: 8 }, [parent, child], [], [], "sankey")
    const flatChild = sankey.sceneNodes.find((n) => n.id === "c") as NetworkRectNode
    expect(top(flatChild)).toBeCloseTo(scene.frame.project(110, 110, 8)[1], 1)
  })

  it("casts a shadow under every edge onto its surface", () => {
    const scene = project("isometric", [a, b], [line(a, b)])
    const shadow = scene.underlay.find((e) => e.type === "curved" && e.style.stroke)
    expect(shadow).toBeTruthy()
    if (shadow?.type !== "curved") throw new Error("expected curved")
    const [x0, y0] = scene.frame.project(50, 50, 0)
    expect(shadow.pathD.startsWith(`M${x0} ${y0}L`)).toBe(true)
    expect(shadow.interactive).toBe(false)
    expect(scene.edgeLift).toBe(6)
    const custom = project({ type: "isometric", edgeShadow: { color: "#123456", opacity: 0.5 } }, [a, b], [line(a, b)])
    expect(custom.underlay.find((e) => e.style.stroke === "#123456")?.style.opacity).toBe(0.5)
    expect(project({ type: "isometric", edgeShadow: false }, [a, b], [line(a, b)]).underlay).toHaveLength(0)
    const flat = project({ type: "isometric", thickness: 0 }, [a, b], [line(a, b)])
    expect(flat.underlay).toHaveLength(0)
    expect(flat.edgeLift).toBe(0)
  })

  it("extrudes leaf rects into prisms with shaded front faces", () => {
    const r = rect("r", 100, 100, 80, 40, { value: 10 })
    const scene = project({ type: "isometric", marks: "extrude", extrude: 30 }, [r])
    const out = scene.sceneNodes[0] as NetworkRectNode
    expect(out.faces).toHaveLength(3)
    expect(out.faces!.slice(1).map((f) => f.shade).sort((p, q) => p - q)).toEqual([-0.32, -0.16])
    // The top face is lifted above the footprint.
    const [, groundY] = scene.frame.project(140, 120, 0)
    const [, topY] = scene.frame.project(140, 120, 30)
    expect(topY).toBeLessThan(groundY)
  })

  it("draws circle-pack circles as ground ellipses", () => {
    const scene = project("isometric", [a], [], [], "circlepack")
    const out = scene.sceneNodes[0] as NetworkCircleNode
    expect(out.pathD).toMatch(/^M.*C.*Z$/)
    // A disc with a rim, hit by its exact outline (not a token).
    expect(out.faces?.length).toBeGreaterThan(0)
    expect(out._perspectiveToken).toBeUndefined()
  })

  it("keeps anchored labels at their screen offset from the mark", () => {
    const label: NetworkLabel = { x: 50, y: 38, text: "A", anchorPoint: [50, 50] }
    const scene = project({ type: "isometric", elevation: 20 }, [a], [], [label])
    const node = scene.sceneNodes[0] as NetworkCircleNode
    expect(scene.labels[0].x).toBeCloseTo(node.cx, 6)
    expect(scene.labels[0].y).toBeCloseTo(node.cy - 12, 6)
  })

  it("projects unanchored labels as ground points", () => {
    const label: NetworkLabel = { x: 200, y: 150, text: "mid" }
    const scene = project("isometric", [a, b], [], [label])
    // Lifted to piece height, level with edges and slab tops.
    const [x, y] = scene.frame.project(200, 150, 6)
    expect(scene.labels[0].x).toBeCloseTo(x, 6)
    expect(scene.labels[0].y).toBeCloseTo(y, 6)
  })

  it("rotates ground-mode labels along a ground axis", () => {
    const label: NetworkLabel = { x: 200, y: 150, text: "mid" }
    const scene = project({ type: "isometric", labels: { mode: "ground" } }, [a], [], [label])
    expect(scene.labels[0].rotate).toBeCloseTo(Math.PI / 6, 6)
  })

  it("lifts nodes by elevation and draws guides and shadows", () => {
    const high = circle("high", 200, 150, { tier: 2 })
    const low = circle("low", 100, 150, { tier: 0 })
    const scene = project({ type: "isometric", elevation: "tier" }, [high, low])
    const byId = new Map(scene.sceneNodes.map((n) => [n.id, n as NetworkCircleNode]))
    const [, groundY] = scene.frame.project(200, 150, 0)
    // "auto" scale maps the largest value to 48 layout px; the token's top
    // disc sits one thickness (6) above that.
    expect(groundY - byId.get("high")!.cy).toBeCloseTo((48 + 6) * scene.frame.lift, 6)
    expect(scene.underlay.length).toBe(2)
    expect(scene.underlay.every((e) => e.interactive === false)).toBe(true)
  })

  it("routes line edges orthogonally on the ground", () => {
    const scene = project({ type: "isometric", edges: { route: "orthogonal" } }, [a, b], [line(a, c)])
    const edge = scene.sceneEdges[0]
    expect(edge.type).toBe("curved")
    expect(edge.datum).toEqual({ source: a.datum, target: c.datum })
    if (edge.type !== "curved") throw new Error("expected curved")
    const pts = edge.pathD.match(/-?\d+(\.\d+)?/g)!.map(Number)
    // Four vertices; each segment follows one of the two iso ground axes (±30°).
    expect(pts).toHaveLength(8)
    for (let i = 2; i < pts.length; i += 2) {
      const angle = Math.abs(Math.atan2(pts[i + 1] - pts[i - 1], pts[i] - pts[i - 2]))
      const deg = (angle * 180) / Math.PI
      expect(Math.min(Math.abs(deg - 30), Math.abs(deg - 150))).toBeLessThan(0.5)
    }
  })

  it("emits a clipped ground grid and seats region members on their plate", () => {
    const scene = project(
      {
        type: "isometric",
        ground: { grid: { step: 40 } },
        regions: [{ id: "dmz", label: "DMZ", nodes: ["a", "b"], depth: 10 }]
      },
      [a, b, c]
    )
    const grid = scene.underlay[0]
    expect(grid.type).toBe("curved")
    if (grid.type !== "curved") throw new Error("expected curved")
    for (const v of grid.pathD.match(/-?\d+(\.\d+)?/g)!.map(Number)) {
      expect(v).toBeGreaterThanOrEqual(-0.01)
      expect(v).toBeLessThanOrEqual(SIZE[0] + 0.01)
    }
    // Faces + top fill + outline for the region.
    expect(scene.underlay.length).toBeGreaterThanOrEqual(4)
    expect(scene.labels[0].text).toBe("DMZ")
    expect(typeof scene.labels[0].rotate).toBe("number")
    const seated = scene.sceneNodes.find((n) => n.id === "a") as NetworkCircleNode
    const [, groundY] = scene.frame.project(50, 50, 0)
    // Plate top (10) plus the token's own thickness (6).
    expect(groundY - seated.cy).toBeCloseTo(16 * scene.frame.lift, 6)
  })

  it("hands glyph callbacks the raw datum and draws billboard glyphs", () => {
    const glyph = { viewBox: [10, 10] as [number, number], anchor: [0.5, 1] as [number, number], parts: [{ d: "M0 0L10 0L10 10Z" }] }
    const seen: unknown[] = []
    const server = circle("s", 100, 100, { kind: "server" })
    const scene = project(
      { type: "isometric", glyph: (d) => { seen.push(d); return d.kind === "server" ? glyph : undefined } },
      [server, circle("x", 200, 200)]
    )
    expect(seen[0]).toEqual({ id: "s", kind: "server" })
    const node = scene.sceneNodes.find((n) => n.id === "s")!
    expect(node.type).toBe("glyph")
    expect(node.datum).toBe(server.datum)
    expect(scene.sceneNodes.find((n) => n.id === "x")!.type).toBe("circle")
  })

  it("attaches edges to the surface their nodes stand on", () => {
    const scene = project(
      { type: "isometric", regions: [{ id: "r", nodes: ["a", "b"], depth: 10 }] },
      [a, b, c],
      [line(a, b), line(a, c)]
    )
    // Edges ride one thickness (6) above the surface each end stands on.
    const onPlate = scene.sceneEdges[0] as NetworkLineEdge
    const [x1, y1] = scene.frame.project(50, 50, 16)
    expect(onPlate.x1).toBeCloseTo(x1, 6)
    expect(onPlate.y1).toBeCloseTo(y1, 6)
    // Plate to ground: the far end drops to c's ground point.
    const down = scene.sceneEdges[1] as NetworkLineEdge
    const [x2, y2] = scene.frame.project(200, 250, 6)
    expect(down.x2).toBeCloseTo(x2, 6)
    expect(down.y2).toBeCloseTo(y2, 6)
    const ground = project(
      { type: "isometric", regions: [{ id: "r", nodes: ["a", "b"], depth: 10 }], edges: { elevation: "ground" } },
      [a, b, c],
      [line(a, b)]
    )
    const [gx, gy] = ground.frame.project(50, 50, 6)
    expect((ground.sceneEdges[0] as NetworkLineEdge).y1).toBeCloseTo(gy, 6)
    expect((ground.sceneEdges[0] as NetworkLineEdge).x1).toBeCloseTo(gx, 6)
  })

  it.each(["nodes", "surface"] as const)("uses endpoint identity for coincident nodes at different %s heights", (elevation) => {
    const low = circle("low", 50, 50, { tier: 0 })
    const high = circle("high", 50, 50, { tier: 30 })
    const scene = project({
      type: "isometric",
      elevation: "tier",
      elevationScale: 1,
      regions: elevation === "surface" ? [{ id: "raised", nodes: ["high"], depth: 30 }] : [],
      edges: { elevation }
    }, [low, high, b], [line(low, b), line(high, b)])
    const edges = scene.sceneEdges as NetworkLineEdge[]
    expect(edges[0].y1).toBeCloseTo(scene.frame.project(50, 50, 6)[1], 6)
    expect(edges[1].y1).toBeCloseTo(scene.frame.project(50, 50, 36)[1], 6)
  })

  it("separates node IDs from coordinate keys and retains coordinate fallback", () => {
    const named = circle("50|50", 100, 100, { tier: 30 })
    const fallback = { ...line(named, b), datum: null }
    const scene = project({ type: "isometric", elevation: "tier", elevationScale: 1, edges: { elevation: "nodes" } },
      [a, named, b], [line(named, b), fallback])
    for (const edge of scene.sceneEdges as NetworkLineEdge[]) {
      expect(edge.y1).toBeCloseTo(scene.frame.project(100, 100, 36)[1], 6)
    }
  })

  it("fits declared decoration bounds inside the plot", () => {
    const perspective = resolveNetworkPerspective("isometric")!
    const box = { x: 40, y: 40, width: 900, height: 60 }
    const header = { x: 40, y: 40, z: 0, extent: [0, 240, 2, 32] as const }
    const scene = projectNetworkScene({
      sceneNodes: [a], sceneEdges: [], labels: [], size: SIZE, perspective, bounds: [box, header]
    })
    const inside = ([x, y]: [number, number]) => {
      expect(x).toBeGreaterThanOrEqual(-0.01)
      expect(x).toBeLessThanOrEqual(SIZE[0] + 0.01)
      expect(y).toBeGreaterThanOrEqual(-0.01)
      expect(y).toBeLessThanOrEqual(SIZE[1] + 0.01)
    }
    for (const [x, y] of [[40, 40], [940, 40], [940, 100], [40, 100]]) inside(scene.frame.project(x, y, 0))
    const [hx, hy] = scene.frame.project(40, 40, 0)
    inside([hx + 240, hy + 32])
    // Without the bounds, the fit only sees the node and the box runs off the plot.
    const bare = projectNetworkScene({ sceneNodes: [a], sceneEdges: [], labels: [], size: SIZE, perspective })
    expect(bare.frame.project(940, 100, 0)[0]).toBeGreaterThan(SIZE[0])
  })

  it("transforms path edges point by point", () => {
    const curved: NetworkSceneEdge = {
      type: "curved",
      pathD: "M50 50C100 50 300 250 350 250",
      style: { stroke: "#999" },
      datum: null
    }
    const scene = project("isometric", [a, b, c], [curved])
    const edge = scene.sceneEdges[0]
    if (edge.type !== "curved") throw new Error("expected curved")
    const [x0, y0] = scene.frame.project(50, 50, 6)
    expect(edge.pathD.startsWith(`M${Math.round(x0 * 100) / 100} ${Math.round(y0 * 100) / 100}C`)).toBe(true)
  })
})
