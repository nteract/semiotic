import { describe, expect, it, vi } from "vitest"
import { flextreeLayout } from "./flextree"
import { dagreLayout } from "./dagre"
import { NetworkPipelineStore } from "../stream/NetworkPipelineStore"
import type { NetworkLayoutContext } from "../stream/networkCustomLayout"
import type {
  RealtimeNode,
  RealtimeEdge,
  NetworkRectNode,
  NetworkCurvedEdge,
  NetworkLineEdge
} from "../stream/networkTypes"

const nodes = [
  {
    id: "root",
    label: "Root",
    x: 0,
    y: -100,
    width: 100,
    height: 60,
    data: { label: "Nested" }
  },
  { id: "leaf", label: "Leaf", x: -1000, y: 900, width: 200, height: 120 }
]
const edge = {
  source: "root",
  target: "leaf",
  label: "Connects",
  points: [
    { x: 0, y: -70 },
    { x: -1200, y: 500 },
    { x: -1000, y: 840 }
  ]
}
const plot = { x: 35, y: 20, width: 320, height: 180 }
const context = (
  config = {}
): NetworkLayoutContext<
  import("./flextree").FlextreeConfig & import("./dagre").DagreConfig
> => ({
  nodes: nodes.map(
    (data) => ({ id: data.id, x: 99, y: 99, data }) as unknown as RealtimeNode
  ),
  edges: [{ ...edge, data: edge } as unknown as RealtimeEdge],
  dimensions: { width: 400, height: 240, plot },
  theme: { semantic: {}, categorical: [] },
  resolveColor: () => "blue",
  config
})

function inside(rect: NetworkRectNode) {
  expect(rect.x).toBeGreaterThanOrEqual(plot.x)
  expect(rect.y).toBeGreaterThanOrEqual(plot.y)
  expect(rect.x + rect.w).toBeLessThanOrEqual(plot.x + plot.width)
  expect(rect.y + rect.h).toBeLessThanOrEqual(plot.y + plot.height)
  expect(rect.w).toBeGreaterThan(0)
  expect(rect.h).toBeGreaterThan(0)
}

describe.each([flextreeLayout, dagreLayout])(
  "pre-positioned network recipe %s (#1503)",
  (layout) => {
    it("fits negative coordinates and variable sizes, passing original objects exactly once", () => {
      const labelAccessor = vi.fn((d) => d.label)
      const result = layout(context({ labelAccessor }))
      const rects = result.sceneNodes as NetworkRectNode[]
      expect(rects).toHaveLength(2)
      rects.forEach(inside)
      expect(rects[1].w / rects[0].w).toBeCloseTo(2)
      expect(labelAccessor.mock.calls.map(([d]) => d)).toEqual(nodes)
      expect(labelAccessor.mock.calls[0][0]).toBe(nodes[0])
      expect(rects[0].datum).toBe(nodes[0])
      expect(rects[1].datum).toBe(nodes[1])
      expect(result.sceneEdges![0].datum).toBe(edge)
      expect(result.labels!.map((label) => label.text)).toEqual([
        "Root",
        "Leaf"
      ])
      const path = (result.sceneEdges![0] as NetworkCurvedEdge).pathD
        .match(/-?\d+(?:\.\d+)?/g)!
        .map(Number)
      for (let i = 0; i < path.length; i += 2) {
        expect(path[i]).toBeGreaterThanOrEqual(plot.x)
        expect(path[i]).toBeLessThanOrEqual(plot.x + plot.width)
        expect(path[i + 1]).toBeGreaterThanOrEqual(plot.y)
        expect(path[i + 1]).toBeLessThanOrEqual(plot.y + plot.height)
      }
    })

    it("keeps authored pixels when fit is none", () => {
      const result = layout(context({ fit: "none" }))
      expect(result.sceneNodes![0]).toMatchObject({
        x: -50,
        y: -130,
        w: 100,
        h: 60
      })
      expect(result.sceneNodes![1]).toMatchObject({
        x: -1100,
        y: 840,
        w: 200,
        h: 120
      })
    })

    it("skips invalid coordinates and dimensions without emitting invalid paths", () => {
      for (const bad of [
        { x: NaN },
        { y: Infinity },
        { width: -1 },
        { height: 0 }
      ]) {
        const ctx = context()
        ctx.nodes[1].data = { ...nodes[1], ...bad }
        const result = layout(ctx)
        expect(result.sceneNodes).toHaveLength(1)
        expect(result.sceneEdges).toEqual([])
        inside(result.sceneNodes![0] as NetworkRectNode)
      }
      const ctx = context()
      ctx.nodes = []
      expect(layout(ctx).sceneNodes).toEqual([])
    })

    it("refits bounded scenes on resize and keeps raw label data", () => {
      const labelAccessor = vi.fn((d) => d.label)
      const store = new NetworkPipelineStore({
        chartType: "force",
        customNetworkLayout: layout,
        layoutConfig: { labelAccessor }
      })
      store.ingestBounded(nodes, [edge], [400, 240])
      for (const width of [400, 160]) {
        store.buildScene([width, 120])
        expect(store.sceneNodes).toHaveLength(2)
        for (const rect of store.sceneNodes as NetworkRectNode[]) {
          expect(rect.x).toBeGreaterThanOrEqual(0)
          expect(rect.x + rect.w).toBeLessThanOrEqual(width)
          expect(rect.y).toBeGreaterThanOrEqual(0)
          expect(rect.y + rect.h).toBeLessThanOrEqual(120)
        }
        expect(store.sceneNodes[0].datum).toBe(nodes[0])
        expect(store.labels.map((label) => label.text)).toEqual([
          "Root",
          "Leaf"
        ])
      }
    })
  }
)

it.each(["vertical", "horizontal"] as const)(
  "routes fitted flextree lines to %s node borders",
  (orientation) => {
    const result = flextreeLayout(context({ orientation, edgeCurve: "line" }))
    const [source, target] = result.sceneNodes as NetworkRectNode[]
    const line = result.sceneEdges![0] as NetworkLineEdge
    expect(line.x1).toBeCloseTo(
      source.x + source.w * (orientation === "vertical" ? 0.5 : 1)
    )
    expect(line.y1).toBeCloseTo(
      source.y + source.h * (orientation === "vertical" ? 1 : 0.5)
    )
    expect(line.x2).toBeCloseTo(
      target.x + target.w * (orientation === "vertical" ? 0.5 : 0)
    )
    expect(line.y2).toBeCloseTo(
      target.y + target.h * (orientation === "vertical" ? 0 : 0.5)
    )
  }
)
