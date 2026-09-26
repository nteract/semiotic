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
    it("uses composed wrapper geometry while preserving raw callback data", () => {
      const ctx = context({ fit: "none", labelAccessor: "label" })
      const raw = { id: "root", label: "Composed root" }
      ctx.nodes = [
        { ...ctx.nodes[0], x: -100, y: 80, width: 240, height: 90, data: raw }
      ]
      const result = layout(ctx)
      expect(result.sceneNodes![0]).toMatchObject({
        x: -220,
        y: 35,
        w: 240,
        h: 90,
        label: "Composed root"
      })
      expect(result.sceneNodes![0].datum).toBe(raw)
      const fitted = layout({ ...ctx, config: {} })
        .sceneNodes![0] as NetworkRectNode
      inside(fitted)
      expect(fitted.w / fitted.h).toBeCloseTo(240 / 90)
    })

    it("defaults frame-created zero dimensions but rejects authored invalid dimensions", () => {
      const ctx = context({ fit: "none", nodeWidth: 70, nodeHeight: 25 })
      ctx.nodes = [
        {
          ...ctx.nodes[0],
          width: 0,
          height: 0,
          createdByFrame: true,
          data: { id: "root" }
        }
      ]
      expect(layout(ctx).sceneNodes![0]).toMatchObject({ w: 70, h: 25 })
      ctx.nodes[0].createdByFrame = false
      expect(layout(ctx).sceneNodes).toEqual([])
      ctx.nodes[0].createdByFrame = true
      for (const field of ["width", "height"] as const) {
        for (const invalid of [-1, NaN, Infinity]) {
          ctx.nodes[0].width = 0
          ctx.nodes[0].height = 0
          ctx.nodes[0][field] = invalid
          expect(layout(ctx).sceneNodes).toEqual([])
        }
      }
      ctx.nodes[0].data = { id: "root", width: 120, height: 60 }
      expect(layout(ctx).sceneNodes![0]).toMatchObject({ w: 120, h: 60 })
      ctx.nodes[0].data.width = 0
      expect(layout(ctx).sceneNodes).toEqual([])
    })

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

it.each(["polyline", "smooth"] as const)(
  "uses wrapper Dagre waypoints for %s paths and fitted bounds",
  (edgeStyle) => {
    for (const fit of ["none", "contain"] as const) {
      const ctx = context({ edgeStyle, fit })
      const expected = dagreLayout(ctx)
      const raw = { source: "root", target: "leaf", label: "Composed edge" }
      ctx.edges[0].data = raw
      const result = dagreLayout(ctx)
      expect(result.sceneEdges![0]).toMatchObject({
        type: "curved",
        pathD: (expected.sceneEdges![0] as NetworkCurvedEdge).pathD
      })
      expect(result.sceneEdges![0].datum).toBe(raw)
      expect(result.sceneNodes).toEqual(expected.sceneNodes)
      // An explicitly supplied empty/invalid raw route still takes precedence.
      for (const points of [
        [],
        [
          { x: NaN, y: 0 },
          { x: 0, y: 0 }
        ]
      ]) {
        ctx.edges[0].data = { ...raw, points }
        expect(dagreLayout(ctx).sceneEdges![0].type).toBe("line")
      }
      ctx.edges[0] = {
        ...ctx.edges[0],
        points: [
          { x: Infinity, y: 0 },
          { x: 0, y: 0 }
        ],
        data: raw
      } as RealtimeEdge
      expect(dagreLayout(ctx).sceneEdges![0].type).toBe("line")
    }
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
