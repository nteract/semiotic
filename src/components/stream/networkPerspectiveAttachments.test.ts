import { beforeAll, describe, expect, it, vi } from "vitest"
import { projectNetworkScene } from "./networkPerspectiveScene"
import { resolveNetworkPerspective, type NetworkPerspectiveConfig } from "./networkPerspective"
import { provideNetworkPerspectiveExtras } from "./networkPerspectiveLoader"
import { networkPerspectiveExtras } from "./networkPerspectiveExtras"
import { ParticlePool } from "./ParticlePool"
import { renderNetworkParticles } from "./renderers/networkParticleRenderer"
import { createMockCanvasContext } from "../../test-utils/canvasMock"
import type { NetworkHtmlMark } from "./networkCustomLayout"
import type { NetworkCircleNode, NetworkSceneEdge, RealtimeEdge } from "./networkTypes"

beforeAll(() => provideNetworkPerspectiveExtras(networkPerspectiveExtras))

const nodes: NetworkCircleNode[] = [
  { type: "circle", id: "a", cx: 50, cy: 50, r: 10, style: {}, datum: { id: "a", tier: 0 } },
  { type: "circle", id: "b", cx: 250, cy: 150, r: 10, style: {}, datum: { id: "b", tier: 40 } }
]
const datum: RealtimeEdge = { source: "a", target: "b", value: 1, y0: 50, y1: 150, sankeyWidth: 10 }
const line: NetworkSceneEdge = {
  type: "line", x1: 50, y1: 50, x2: 250, y2: 150, style: { stroke: "#369" }, datum
}
const band: NetworkSceneEdge = {
  type: "bezier", pathD: "M50 45L250 145L250 155L50 55Z", style: { fill: "#369" }, datum
}
function project(config: NetworkPerspectiveConfig, edges: NetworkSceneEdge[] = [], htmlMarks: NetworkHtmlMark[] = []) {
  return projectNetworkScene({
    sceneNodes: nodes, sceneEdges: edges, labels: [], htmlMarks, size: [400, 300],
    perspective: resolveNetworkPerspective({ type: "isometric", elevationGuides: false, ...config })!
  })
}

describe("perspective particles", () => {
  it.each([
    { edges: { elevation: 25 }, z0: 25, z1: 25 },
    { edges: { elevation: "nodes" }, elevation: "tier", elevationScale: 1, z0: 0, z1: 40 },
    { regions: [{ id: "raised", nodes: ["b"], depth: 30 }], z0: 0, z1: 30 },
    { edges: { elevation: "ground" }, elevation: 40, z0: 0, z1: 0 }
  ] as const)("follows each edge's heights: %j", ({ z0, z1, ...settings }) => {
    const config = settings as NetworkPerspectiveConfig
    for (const edge of [line, band]) {
      const scene = project(config, [edge])
      const pool = new ParticlePool(3)
      const ctx = createMockCanvasContext() as unknown as CanvasRenderingContext2D
      const progress = [0, 0.25, 0.9]
      for (const t of progress) {
        Object.assign(pool.spawn(0)!, { t, x: 50 + 200 * t, y: 50 + 100 * t })
      }
      renderNetworkParticles(ctx, pool, [datum], {}, () => "#369", scene.projectParticle)
      for (const [i, t] of progress.entries()) {
        const z = (edge.type === "line" ? z0 + (z1 - z0) * t : (z0 + z1) / 2) + 6
        const [x, y] = scene.frame.project(50 + 200 * t, 50 + 100 * t, z)
        const call = vi.mocked(ctx.arc).mock.calls[i]
        expect(call[0]).toBeCloseTo(x, 6)
        expect(call[1]).toBeCloseTo(y, 6)
      }
    }
  })

  it("keeps particles on separate coincident edges at their own heights", () => {
    const other: RealtimeEdge = { ...datum, source: "b", target: "b" }
    const scene = project({ elevation: "tier", elevationScale: 1, edges: { elevation: "nodes" } },
      [band, { ...band, datum: other }])
    expect(scene.projectParticle(150, 100, datum, 0.5)).toEqual(scene.frame.project(150, 100, 26))
    expect(scene.projectParticle(150, 100, other, 0.5)).toEqual(scene.frame.project(150, 100, 46))
  })

  it("leaves flat particle positions unchanged", () => {
    const pool = new ParticlePool(1)
    Object.assign(pool.spawn(0)!, { x: 150, y: 100 })
    const ctx = createMockCanvasContext() as unknown as CanvasRenderingContext2D
    renderNetworkParticles(ctx, pool, [datum], {}, () => "#369")
    expect(ctx.arc).toHaveBeenCalledWith(150, 100, expect.any(Number), 0, Math.PI * 2)
  })
})

describe("perspective edge shadows", () => {
  it.each(["bezier", "ribbon", "curved", "line"] as const)("omits invisible %s shadows", (type) => {
    const edge = type === "line" ? line : { ...band, type }
    for (const style of [
      { fill: "#369", fillOpacity: 0, stroke: "none" },
      { fill: "none", stroke: "#369", strokeWidth: 0 },
      { fill: "#369", fillOpacity: 0, stroke: "#369", strokeOpacity: 0 },
      { fill: "#369", opacity: 0, stroke: "#369" },
      { fill: "none", stroke: "none" }
    ]) {
      expect(project({}, [{ ...edge, style }]).underlay).toEqual([])
    }
  })

  it.each(["bezier", "ribbon"] as const)("does not invent a stroke for an invisible %s fill", (type) => {
    expect(project({}, [{ ...band, type, style: { fill: "#369", fillOpacity: 0 } }]).underlay).toEqual([])
    expect(project({}, [{ ...band, type, style: { fill: "", stroke: "" } }]).underlay).toEqual([])
  })

  it.each(["bezier", "ribbon", "curved"] as const)("keeps visible %s fill or stroke shadows", (type) => {
    const filled = project({}, [{ ...band, type, style: { fill: "#369", fillOpacity: 0.4, stroke: "none" } }])
    expect(filled.underlay).toHaveLength(1)
    expect(filled.underlay[0].style.fill).toBe("#000")
    const outlined = project({}, [{ ...band, type, style: { fill: "#369", fillOpacity: 0, stroke: "#369", strokeWidth: 2 } }])
    expect(outlined.underlay).toHaveLength(1)
    expect(outlined.underlay[0].style).toMatchObject({ fill: "none", stroke: "#000", strokeWidth: 4 })
  })
})

describe("perspective HTML node anchors", () => {
  const mark = { id: "b", x: 230, y: 120, width: 60, height: 40, content: null }

  it.each(["token", "billboard"] as const)("follows %s nodes across region and datum elevation with screen offsets", (marks) => {
    const scene = project({
      marks, elevation: "tier", elevationScale: 1,
      regions: [{ id: "raised", nodes: ["b"], depth: 20 }]
    }, [], [mark])
    const node = scene.sceneNodes.find((n) => n.id === "b") as NetworkCircleNode
    expect(scene.htmlMarks[0].x).toBeCloseTo(node.cx - 20, 6)
    expect(scene.htmlMarks[0].y).toBeCloseTo(node.cy - 30, 6)
    expect(scene.htmlMarks[0].width).toBe(60)
    expect(scene.htmlMarks[0].height).toBe(40)
  })

  it("uses identity before coordinates for coincident nodes, including zero elevation", () => {
    const scene = projectNetworkScene({
      sceneNodes: [nodes[0], { ...nodes[1], cx: 50, cy: 50 }], sceneEdges: [], labels: [],
      htmlMarks: [{ ...mark, id: "a", x: 20, y: 30 }, { ...mark, x: 20, y: 30 }], size: [400, 300],
      perspective: resolveNetworkPerspective({ type: "isometric", elevation: "tier", elevationScale: 1 })!
    })
    for (const [index, z] of [6, 46].entries()) {
      const [x, y] = scene.frame.project(50, 50, z)
      expect(scene.htmlMarks[index].x).toBeCloseTo(x - 30, 6)
      expect(scene.htmlMarks[index].y).toBeCloseTo(y - 20, 6)
    }
  })

  it("fits elevated HTML extents and retains the unassociated ground fallback", () => {
    const free = { ...mark, id: "free", x: 100, y: 100 }
    const scene = project({ elevation: 80 }, [], [{ ...mark, width: 160, height: 100 }, free])
    const fitted = scene.htmlMarks[0]
    expect(fitted.x).toBeGreaterThanOrEqual(0)
    expect(fitted.y).toBeGreaterThanOrEqual(0)
    expect(fitted.x + fitted.width).toBeLessThanOrEqual(400)
    expect(fitted.y + fitted.height).toBeLessThanOrEqual(300)
    const [x, y] = scene.frame.project(130, 120, 6)
    expect(scene.htmlMarks[1].x).toBeCloseTo(x - 30, 6)
    expect(scene.htmlMarks[1].y).toBeCloseTo(y - 20, 6)
  })

  it.each(["ground", "extrude"] as const)("anchors HTML to the top of %s rects", (marks) => {
    const scene = projectNetworkScene({
      sceneNodes: [{ type: "rect", x: 100, y: 100, w: 60, h: 40, id: "rect", style: {}, datum: {} }],
      sceneEdges: [], labels: [], htmlMarks: [{ ...mark, id: "rect", x: 100, y: 100 }], size: [400, 300],
      perspective: resolveNetworkPerspective({ type: "isometric", marks, elevation: 20, extrude: 50 })!
    })
    const [x, y] = scene.frame.project(130, 120, marks === "extrude" ? 70 : 26)
    expect(scene.htmlMarks[0].x).toBeCloseTo(x - 30, 6)
    expect(scene.htmlMarks[0].y).toBeCloseTo(y - 20, 6)
  })
})
