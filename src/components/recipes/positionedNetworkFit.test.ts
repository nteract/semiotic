import { describe, expect, it } from "vitest"
import { createDagreFit, createFlextreeFit, dagreLayout, flextreeLayout } from "../semiotic-recipes-core"
import { invertNetworkRect, projectNetworkPoint } from "../semiotic-network-zoom"
import type { NetworkLayoutContext } from "../stream/networkCustomLayout"
import type { NetworkCurvedEdge, NetworkRectNode, RealtimeEdge, RealtimeNode } from "../stream/networkTypes"
import type { Datum } from "../charts/shared/datumTypes"

// The #1503 fixture: negative coordinates, variable sizes, and a nested `data` field.
const nodes: Datum[] = [
  { id: "root", label: "Root", x: 0, y: -100, width: 100, height: 60, data: { label: "Nested" } },
  { id: "leaf", label: "Leaf", x: -1000, y: 900, width: 200, height: 120 },
  { id: "sized", label: "Sized", x: 300, y: 400 },
]
const edges: Datum[] = [
  {
    source: "root",
    target: "leaf",
    points: [{ x: 0, y: -70 }, { x: -1200, y: 500 }, { x: -1000, y: 840 }],
  },
]
const plot = { x: 35, y: 20, width: 320, height: 180 }

function context(config: Record<string, unknown> = {}, box = plot): NetworkLayoutContext<Record<string, unknown>> {
  return {
    nodes: nodes.map((data) => ({ id: data.id, x: 99, y: 99, data }) as unknown as RealtimeNode),
    edges: edges.map((edge) => ({ ...edge, data: edge }) as unknown as RealtimeEdge),
    dimensions: { width: 400, height: 240, plot: box },
    theme: { semantic: {}, categorical: [] },
    resolveColor: () => "blue",
    config,
  }
}

const rectOf = (node: NetworkRectNode) => ({ x: node.x, y: node.y, width: node.w, height: node.h })

describe.each([
  ["dagre", dagreLayout, (box: typeof plot, config?: Record<string, unknown>) => createDagreFit(nodes, edges, box, config)],
  ["flextree", flextreeLayout, (box: typeof plot, config?: Record<string, unknown>) => createFlextreeFit(nodes, box, config)],
] as const)("%s fit", (_name, layout, fitFor) => {
  it.each([plot, { x: 0, y: 0, width: 160, height: 120 }])("matches every rect the layout emits in %j", (box) => {
    const fit = fitFor(box)
    const rects = layout(context({}, box)).sceneNodes as NetworkRectNode[]
    expect(rects.map(rectOf)).toEqual(
      nodes.map((node) => {
        const { x, y, width, height } = fit.nodeBounds(node)!
        return { x, y, width, height }
      })
    )
    expect(fit.scale).toBeLessThan(1)
  })

  it("keeps authored pixels with fit none", () => {
    const fit = fitFor(plot, { fit: "none" })
    expect([fit.fit, fit.scale, fit.dx, fit.dy]).toEqual(["none", 1, 0, 0])
    expect(fit.project({ x: -1000, y: 900 })).toEqual({ x: -1000, y: 900 })
    expect(rectOf((layout(context({ fit: "none" })).sceneNodes as NetworkRectNode[])[0])).toEqual({
      x: -50, y: -130, width: 100, height: 60,
    })
  })

  it("inverts its projection and ignores later changes to the plot object", () => {
    const box = { ...plot }
    const fit = fitFor(box)
    box.width = 10
    const point = { x: -420, y: 333 }
    const back = fit.invert(fit.project(point))
    expect(back.x).toBeCloseTo(point.x)
    expect(back.y).toBeCloseTo(point.y)
    expect(fit.nodeBounds(nodes[1])).toEqual(fitFor(plot).nodeBounds(nodes[1]))
  })

  it.each([
    ["an empty plot", { x: 0, y: 0, width: 0, height: 180 }],
    ["a non-finite plot", { x: NaN, y: 0, width: 320, height: 180 }],
  ])("draws nothing for %s", (_label, box) => {
    const fit = fitFor(box)
    expect(fit.bounds).toBeNull()
    expect(fit.nodeBounds(nodes[0])).toBeUndefined()
    expect(layout(context({}, box)).sceneNodes).toEqual([])
  })
})

describe("createDagreFit", () => {
  it("projects waypoints exactly as the layout draws edge polylines", () => {
    const fit = createDagreFit(nodes, edges, plot)
    const path = (dagreLayout(context()).sceneEdges![0] as NetworkCurvedEdge).pathD
    const drawn = path.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g)!.map(Number)
    const expected = (edges[0].points as { x: number; y: number }[]).flatMap((point) => {
      const { x, y } = fit.project(point)
      return [x, y]
    })
    expect(drawn).toEqual(expected)
  })

  it("includes waypoints in its bounds, which the flextree fit does not use", () => {
    expect(createDagreFit(nodes, edges, plot).bounds!.x).toBe(-1200)
    expect(createFlextreeFit(nodes, plot).bounds!.x).toBe(-1100)
  })

  it("uses each recipe's default node size for unsized nodes", () => {
    const [dagreBox, flextreeBox] = [
      createDagreFit([nodes[2]], [], plot, { fit: "none" }),
      createFlextreeFit([nodes[2]], plot, { fit: "none" }),
    ].map((fit) => fit.nodeBounds(nodes[2])!)
    expect([dagreBox.width, dagreBox.height, flextreeBox.width, flextreeBox.height]).toEqual([100, 36, 80, 30])
  })
})

describe("network zoom projection helpers", () => {
  it("apply and invert a camera around a fitted point", () => {
    const view = { x: 12, y: -8, k: 2 }
    expect(projectNetworkPoint({ x: 10, y: 20, id: "a" }, view)).toEqual({ x: 32, y: 32, id: "a" })
    expect(invertNetworkRect({ x: 32, y: 32, width: 40, height: 20 }, view)).toEqual({
      x: 10, y: 20, width: 20, height: 10,
    })
  })
})
