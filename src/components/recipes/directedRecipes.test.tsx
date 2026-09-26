import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { lineageDagLayout } from "./lineageDag"
import { dagreLayout } from "./dagre"
import type { NetworkLayoutContext } from "../stream/networkCustomLayout"
import type { NetworkCurvedEdge } from "../stream/networkTypes"

const plot = { x: 10, y: 20, width: 700, height: 400 }
function context(
  nodes: Record<string, unknown>[],
  edges: Record<string, unknown>[],
  config = {}
) {
  return {
    nodes: nodes.map((data) => ({ ...data, data })),
    edges: edges.map((data) => ({ ...data, data })),
    dimensions: { width: 740, height: 440, plot },
    theme: { semantic: {}, categorical: [] },
    resolveColor: () => "blue",
    config
  } as unknown as NetworkLayoutContext
}

function arrows(overlay: Parameters<typeof renderToStaticMarkup>[0]) {
  const doc = new DOMParser().parseFromString(
    renderToStaticMarkup(overlay),
    "text/html"
  )
  return [...doc.querySelectorAll("polygon.recipe-edge-arrow")].map(
    (polygon) => {
      expect(polygon.getAttribute("style")).toContain("pointer-events:none")
      expect(polygon.getAttribute("aria-hidden")).toBe("true")
      return polygon
        .getAttribute("points")!
        .split(" ")
        .map((point) => point.split(",").map(Number))
    }
  )
}

describe("directed recipe geometry (#1508)", () => {
  it.each(["full", "dot"])(
    "keeps inferred cycles and self-loops visible at both row extremes in %s LOD",
    (lod) => {
      const nodes = [
        { id: "a", x: -1, y: 0, label: "A", data: { nested: true } },
        { id: "b", x: 0, y: 1 },
        { id: "c", x: 1, y: 2 },
        { id: "d", x: -1, y: 2 }
      ]
      const edges = [
        { source: "a", target: "b" },
        { source: "c", target: "d" },
        { source: "a", target: "a" },
        { source: "c", target: "c" },
        { source: "c", target: "a" }
      ]
      const result = lineageDagLayout(context(nodes, edges, { lod }))
      expect(result.sceneNodes).toHaveLength(4)
      result.sceneNodes!.forEach((node, i) => expect(node.datum).toBe(nodes[i]))
      expect(result.sceneEdges).toHaveLength(5)
      result.sceneEdges!.forEach((edge, i) => {
        expect(edge.datum).toBe(edges[i])
        expect(edge.style.strokeDasharray).toBe(i === 0 ? undefined : "5 4")
        const coords = (edge as NetworkCurvedEdge).pathD
          .match(/-?\d+(?:\.\d+)?/g)!
          .map(Number)
        coords.forEach((value, j) => {
          expect(value).toBeGreaterThanOrEqual(j % 2 ? plot.y : plot.x)
          expect(value).toBeLessThanOrEqual(
            j % 2 ? plot.y + plot.height : plot.x + plot.width
          )
        })
        if (i === 2 || i === 3) expect(coords[0]).not.toBe(coords[6])
      })
      const markers = arrows(result.overlays)
      expect(markers).toHaveLength(5)
      // Forward arrow faces right; bottom loop enters downward; top self-loop upward.
      expect(markers[0][0][0]).toBeGreaterThan(markers[0][1][0])
      expect(markers[1][0][1]).toBeGreaterThan(markers[1][1][1])
      expect(markers[2][0][1]).toBeLessThan(markers[2][1][1])
      for (const marker of markers)
        for (const [x, y] of marker) {
          expect(x).toBeGreaterThanOrEqual(plot.x)
          expect(x).toBeLessThanOrEqual(plot.x + plot.width)
          expect(y).toBeGreaterThanOrEqual(plot.y)
          expect(y).toBeLessThanOrEqual(plot.y + plot.height)
        }
    }
  )

  it("honors explicit false backedge overrides and custom flag accessors", () => {
    const result = lineageDagLayout(
      context(
        [
          { id: "a", x: 1, y: 0 },
          { id: "b", x: 0, y: 0 }
        ],
        [
          { source: "a", target: "b", cycle: false },
          { source: "b", target: "a", cycle: true }
        ],
        { backEdgeAccessor: "cycle" }
      )
    )
    expect(result.sceneEdges![0].style.strokeDasharray).toBeUndefined()
    expect(result.sceneEdges![1].style.strokeDasharray).toBe("5 4")
    const marker = arrows(result.overlays)[0]
    expect(marker[0][0]).toBeLessThan(marker[1][0])
  })

  it.each(["polyline", "smooth"])(
    "marks the final %s waypoint tangent without adding semantic edges",
    (edgeStyle) => {
      const points = [
        { x: 50, y: 60 },
        { x: 50, y: 120 },
        { x: 150, y: 120 }
      ]
      const edge = { source: "a", target: "b", points }
      const result = dagreLayout(
        context(
          [
            { id: "a", x: 50, y: 40 },
            { id: "b", x: 200, y: 120 }
          ],
          [edge],
          { fit: "none", edgeStyle }
        )
      )
      expect(result.sceneEdges).toHaveLength(1)
      expect(result.sceneEdges![0].datum).toBe(edge)
      const [tip, base1, base2] = arrows(result.overlays)[0]
      expect(tip).toEqual([150, 120])
      expect(base1[0]).toBeLessThan(tip[0])
      expect(base1[1] + base2[1]).toBe(240)
    }
  )

  it("clips diagonal Dagre fallback edges and truncates visible labels while retaining full accessible text", () => {
    const label = "This label is much too long for a node"
    const result = dagreLayout(
      context(
        [
          { id: "a", x: 100, y: 100, width: 100, height: 40, label },
          { id: "b", x: 300, y: 300, width: 100, height: 40 }
        ],
        [{ source: "a", target: "b" }],
        { fit: "none" }
      )
    )
    expect(result.sceneEdges![0]).toMatchObject({
      type: "line",
      x1: 120,
      y1: 120,
      x2: 280,
      y2: 280
    })
    expect(result.sceneNodes![0].label).toBe(label)
    expect(result.labels![0].text).toBe("This label i…")
    expect(arrows(result.overlays)[0][0]).toEqual([280, 280])
  })
})
