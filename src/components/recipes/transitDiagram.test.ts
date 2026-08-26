import { describe, expect, it } from "vitest"
import type { RealtimeEdge, RealtimeNode } from "../stream/networkTypes"
import {
  computeTransitDiagramPositions,
  octilinearRoute,
  roundedTransitPath,
} from "./transitDiagramGeometry"
import { transitDiagramLayout } from "./transitDiagram"

const plot = { width: 600, height: 360 }

function wrappedNode(data: Record<string, unknown>): RealtimeNode {
  return {
    id: String(data.id),
    x: 0,
    y: 0,
    x0: 0,
    x1: 0,
    y0: 0,
    y1: 0,
    width: 0,
    height: 0,
    value: 1,
    data,
  }
}

function wrappedEdge(data: Record<string, unknown>): RealtimeEdge {
  return {
    source: String(data.source),
    target: String(data.target),
    value: 1,
    y0: 0,
    y1: 0,
    sankeyWidth: 1,
    data,
  }
}

describe("computeTransitDiagramPositions", () => {
  it("fits complete authored coordinates into the plot", () => {
    const result = computeTransitDiagramPositions(
      [
        { id: "a", data: { id: "a", x: 0, y: 0 } },
        { id: "b", data: { id: "b", x: 10, y: 5 } },
      ],
      [{ source: "a", target: "b" }],
      plot,
      { padding: 20 },
    )

    expect(result.mode).toBe("authored")
    expect(result.positions.get("a")).toMatchObject({ x: 20, y: 20 })
    expect(result.positions.get("b")).toMatchObject({ x: 580, y: 340 })
  })

  it("falls back deterministically when coordinates are absent", () => {
    const nodes = ["a", "b", "c", "d"].map((id) => ({ id, data: { id } }))
    const edges = [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
      { source: "b", target: "d" },
    ]
    const first = computeTransitDiagramPositions(nodes, edges, plot)
    const second = computeTransitDiagramPositions(nodes, edges, plot)

    expect(first.mode).toBe("automatic")
    expect(first.warnings[0]).toContain("Complete station positions")
    expect([...first.positions]).toEqual([...second.positions])
    expect(new Set([...first.positions.values()].map((node) => `${node.x},${node.y}`)).size).toBe(4)
  })

  it("keeps disconnected components separated", () => {
    const result = computeTransitDiagramPositions(
      ["a", "b", "x", "y"].map((id) => ({ id, data: { id } })),
      [
        { source: "a", target: "b" },
        { source: "x", target: "y" },
      ],
      plot,
    )
    const firstBottom = Math.max(result.positions.get("a")!.y, result.positions.get("b")!.y)
    const secondTop = Math.min(result.positions.get("x")!.y, result.positions.get("y")!.y)
    expect(firstBottom).toBeLessThan(secondTop)
  })
})

describe("transit route geometry", () => {
  it("uses only octilinear slopes", () => {
    const points = octilinearRoute({ x: 0, y: 0 }, { x: 100, y: 40 })
    for (let index = 1; index < points.length; index += 1) {
      const dx = Math.abs(points[index].x - points[index - 1].x)
      const dy = Math.abs(points[index].y - points[index - 1].y)
      expect(dx === 0 || dy === 0 || Math.abs(dx - dy) < 0.001).toBe(true)
    }
  })

  it("rounds internal corners with quadratic commands", () => {
    expect(
      roundedTransitPath(
        [
          { x: 0, y: 0 },
          { x: 30, y: 0 },
          { x: 60, y: 30 },
        ],
        8,
      ),
    ).toContain("Q30,0")
  })
})

describe("transitDiagramLayout", () => {
  it("draws parallel shared lines, interchange stations, labels, and accessible metadata", () => {
    const nodes = [
      wrappedNode({ id: "a", label: "Alpha", x: 0, y: 0 }),
      wrappedNode({ id: "b", label: "Bravo", x: 1, y: 0 }),
      wrappedNode({ id: "c", label: "Charlie", x: 2, y: 1 }),
    ]
    const edges = [
      wrappedEdge({ source: "a", target: "b", line: "red", color: "#d33" }),
      wrappedEdge({ source: "a", target: "b", line: "blue", color: "#36c" }),
      wrappedEdge({ source: "b", target: "c", line: "blue", color: "#36c" }),
    ]
    const result = transitDiagramLayout({
      nodes,
      edges,
      dimensions: { width: 600, height: 360, plot: { x: 0, y: 0, ...plot } },
      theme: { semantic: {}, categorical: ["#999"] },
      resolveColor: () => "#999",
      config: {},
    })

    expect(result.sceneEdges).toHaveLength(3)
    expect(result.sceneEdges?.map((edge) => edge.style.stroke)).toEqual(["#36c", "#d33", "#36c"])
    expect(result.sceneEdges?.every((edge) => edge.accessibility?.tableFields)).toBe(true)
    expect(result.sceneNodes).toHaveLength(3)
    expect(result.sceneNodes?.find((node) => node.id === "b")).toMatchObject({ r: 7 })
    expect(result.labels).toHaveLength(3)
  })

  it("accepts one edge carrying multiple line descriptors and explicit ordering", () => {
    const result = transitDiagramLayout({
      nodes: [wrappedNode({ id: "a" }), wrappedNode({ id: "b" })],
      edges: [
        wrappedEdge({
          source: "a",
          target: "b",
          lines: [
            { id: "water", color: "#09f" },
            { id: "sediment", color: "#963" },
          ],
          lineOrder: ["sediment", "water"],
        }),
      ],
      dimensions: { width: 600, height: 360, plot: { x: 0, y: 0, ...plot } },
      theme: { semantic: {}, categorical: ["#999"] },
      resolveColor: () => "#999",
      config: { showLabels: false },
    })

    expect(result.sceneEdges?.map((edge) => edge.style.stroke)).toEqual(["#963", "#09f"])
    expect(result.labels).toEqual([])
  })
})
