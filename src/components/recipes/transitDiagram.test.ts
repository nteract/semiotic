import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import type {
  NetworkArcNode,
  NetworkCircleNode,
  NetworkCurvedEdge,
  RealtimeEdge,
  RealtimeNode,
} from "../stream/networkTypes"
import { findNearestNetworkNode } from "../stream/NetworkCanvasHitTester"
import { buildNetworkTableModel } from "../stream/accessibleDataTableModel"
import {
  computeTransitDiagramPositions,
  offsetTransitPath,
  octilinearRoute,
  roundedTransitPath,
} from "./transitDiagramGeometry"
import {
  transitDiagramLayout,
  type TransitDiagramStationRenderInfo,
} from "./transitDiagram"

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

  it("uses stable id tie-breaks regardless of input order", () => {
    const nodes = ["delta", "alpha", "charlie", "bravo"].map((id) => ({
      id,
      data: { id },
    }))
    const edges = [
      { source: "alpha", target: "charlie" },
      { source: "bravo", target: "charlie" },
      { source: "charlie", target: "delta" },
    ]
    const ordered = computeTransitDiagramPositions(nodes, edges, plot)
    const reversed = computeTransitDiagramPositions(
      [...nodes].reverse(),
      [...edges].reverse(),
      plot,
    )

    expect([...ordered.positions]).toEqual([...reversed.positions])
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

  it("keeps disconnected components inside a constrained plot", () => {
    const constrainedPlot = { width: 120, height: 100 }
    const result = computeTransitDiagramPositions(
      ["a", "b", "c", "d"].map((id) => ({ id, data: { id } })),
      [],
      constrainedPlot,
    )

    expect([...result.positions.values()]).toHaveLength(4)
    for (const position of result.positions.values()) {
      expect(position.x).toBeGreaterThanOrEqual(0)
      expect(position.x).toBeLessThanOrEqual(constrainedPlot.width)
      expect(position.y).toBeGreaterThanOrEqual(0)
      expect(position.y).toBeLessThanOrEqual(constrainedPlot.height)
    }
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

  it("keeps the requested perpendicular offset through bends", () => {
    const offset = offsetTransitPath(
      [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 30, y: 30 },
      ],
      10,
    )

    expect(offset[1].x).toBeCloseTo(20)
    expect(offset[1].y).toBeCloseTo(10)
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
    expect(result.sceneNodes?.find((node) => node.id === "b")).toMatchObject({
      r: 7,
    })
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

  it("reverses authored waypoints while preserving reverse-edge metadata", () => {
    const result = transitDiagramLayout({
      nodes: [wrappedNode({ id: "a", x: 0, y: 0 }), wrappedNode({ id: "b", x: 1, y: 0 })],
      edges: [
        wrappedEdge({ source: "a", target: "b", line: "red" }),
        wrappedEdge({
          source: "b",
          target: "a",
          line: "blue",
          points: [
            { x: 0.75, y: 0 },
            { x: 0.25, y: 0 },
          ],
        }),
      ],
      dimensions: { width: 600, height: 360, plot: { x: 0, y: 0, ...plot } },
      theme: { semantic: {}, categorical: ["#999"] },
      resolveColor: () => "#999",
      config: { cornerRadius: 0, lineWidth: 2, lineGap: 0, showLabels: false },
    })

    const blue = result.sceneEdges?.find(
      (edge): edge is NetworkCurvedEdge =>
        edge.type === "curved" && edge.id?.endsWith(":blue") === true,
    )
    expect(blue?.pathD).toBe("M36,179 L168,179 L432,179 L564,179")
    expect(blue).toMatchObject({
      label: "blue: b to a",
      datum: { source: "b", target: "a" },
      accessibility: {
        label: "blue, b to a",
        tableFields: { source: "b", target: "a" },
      },
    })
  })

  it("does not read prototype properties as configured line colors", () => {
    const result = transitDiagramLayout({
      nodes: [wrappedNode({ id: "a" }), wrappedNode({ id: "b" })],
      edges: [wrappedEdge({ source: "a", target: "b", line: "constructor" })],
      dimensions: { width: 600, height: 360, plot: { x: 0, y: 0, ...plot } },
      theme: { semantic: {}, categorical: ["#999"] },
      resolveColor: () => "#123456",
      config: { lineColors: {}, showLabels: false },
    })

    expect(result.sceneEdges?.[0].style.stroke).toBe("#123456")
  })

  it("grows default interchange markers to cover wide line bundles", () => {
    const result = transitDiagramLayout({
      nodes: [wrappedNode({ id: "a" }), wrappedNode({ id: "b" })],
      edges: [
        wrappedEdge({
          source: "a",
          target: "b",
          lines: ["a", "b", "c", "d", "e"],
        }),
      ],
      dimensions: { width: 600, height: 360, plot: { x: 0, y: 0, ...plot } },
      theme: { semantic: {}, categorical: ["#999"] },
      resolveColor: () => "#999",
      config: { showLabels: false },
    })

    const circles = result.sceneNodes?.filter(
      (node): node is NetworkCircleNode => node.type === "circle",
    )
    expect(circles?.map((node) => node.r)).toEqual([19, 19])
  })

  it("derives deterministic source-rooted lines and colors from a plain DAG", () => {
    const result = transitDiagramLayout({
      nodes: [
        wrappedNode({
          id: "red-source",
          label: "Red source",
          familyColor: "#d33",
        }),
        wrappedNode({
          id: "blue-source",
          label: "Blue source",
          familyColor: "#36c",
        }),
        wrappedNode({ id: "merge", label: "Merge" }),
        wrappedNode({ id: "sink", label: "Sink" }),
      ],
      edges: [
        wrappedEdge({ source: "red-source", target: "merge" }),
        wrappedEdge({ source: "blue-source", target: "merge" }),
        wrappedEdge({ source: "merge", target: "sink" }),
      ],
      dimensions: { width: 600, height: 360, plot: { x: 0, y: 0, ...plot } },
      theme: { semantic: {}, categorical: ["#999"] },
      resolveColor: () => "#999",
      config: {
        lineMode: "source-rooted",
        sourceColorAccessor: "familyColor",
        showLabels: false,
      },
    })

    expect(result.sceneEdges).toHaveLength(4)
    expect(result.sceneEdges?.map((edge) => edge.style.stroke)).toEqual([
      "#36c",
      "#d33",
      "#36c",
      "#d33",
    ])
    expect(
      result.sceneEdges?.slice(2).map((edge) => (edge.datum as { lineId: string }).lineId),
    ).toEqual(["blue-source", "red-source"])
    expect(
      result.sceneNodes?.find((node) => node.id === "merge")?.accessibility?.tableFields,
    ).toEqual({
      station: "Merge",
      lines: "blue-source, red-source",
    })
  })

  it("uses compact geometry and suppresses labels", () => {
    const result = transitDiagramLayout({
      nodes: [wrappedNode({ id: "a" }), wrappedNode({ id: "b" })],
      edges: [wrappedEdge({ source: "a", target: "b", line: "red" })],
      dimensions: { width: 600, height: 360, plot: { x: 0, y: 0, ...plot } },
      theme: { semantic: {}, categorical: ["#999"] },
      resolveColor: () => "#999",
      config: { mode: "compact", showLabels: true },
    })

    expect(result.sceneEdges?.[0].style.strokeWidth).toBe(3.5)
    expect((result.sceneNodes?.[0] as NetworkCircleNode).r).toBe(2.75)
    expect(result.labels).toEqual([])
  })

  it("collapses co-located minimap stops into segmented line-color circles", () => {
    const result = transitDiagramLayout({
      nodes: [
        wrappedNode({ id: "a", x: 0, y: 0, color: "#d33" }),
        wrappedNode({ id: "b", x: 0, y: 0, color: "#36c" }),
        wrappedNode({ id: "merge", x: 1, y: 0 }),
      ],
      edges: [
        wrappedEdge({ source: "a", target: "merge" }),
        wrappedEdge({ source: "b", target: "merge" }),
      ],
      dimensions: { width: 600, height: 360, plot: { x: 0, y: 0, ...plot } },
      theme: { semantic: {}, categorical: ["#999"] },
      resolveColor: () => "#999",
      config: { mode: "minimap", lineMode: "source-rooted" },
    })

    const arcs = result.sceneNodes?.filter((node): node is NetworkArcNode => node.type === "arc")
    const outlines = result.sceneNodes?.filter(
      (node): node is NetworkCircleNode => node.type === "circle",
    )
    expect(arcs).toHaveLength(4)
    expect(new Set(arcs?.map((arc) => arc.style.fill))).toEqual(new Set(["#d33", "#36c"]))
    expect(arcs?.every((arc) => arc.datum === null)).toBe(true)
    expect(outlines).toHaveLength(2)
    expect(outlines?.map((circle) => circle.id)).toEqual(["a--b", "merge"])
    const collapsedStop = outlines?.find((circle) => circle.id === "a--b")
    expect(collapsedStop?.datum).toMatchObject({
      id: "a--b",
      label: "a / b",
      stationIds: ["a", "b"],
      lineIds: ["a", "b"],
      interchange: true,
    })
    expect((collapsedStop?.datum as { stations?: unknown[] }).stations).toEqual([
      { id: "a", x: 0, y: 0, color: "#d33" },
      { id: "b", x: 0, y: 0, color: "#36c" },
    ])

    const hit = collapsedStop
      ? findNearestNetworkNode(
          result.sceneNodes ?? [],
          result.sceneEdges ?? [],
          collapsedStop.cx,
          collapsedStop.cy,
        )
      : null
    expect(hit?.datum).toBe(collapsedStop?.datum)

    const table = buildNetworkTableModel(result.sceneNodes ?? [], result.sceneEdges ?? [])
    expect(table.nodeRows).toHaveLength(2)
    expect(table.nodeRows.map((row) => row.id).sort()).toEqual(["a--b", "merge"])
    expect(table.nodeRows.find((row) => row.id === "a--b")?.semantic.values).toEqual({
      station: "a / b",
      lines: "a, b",
    })
    expect(result.labels).toEqual([])
  })

  it("renders custom primary and compact stations in the fitted SVG station layer", () => {
    const calls: TransitDiagramStationRenderInfo[] = []
    const result = transitDiagramLayout({
      nodes: [wrappedNode({ id: "a", icon: "A" }), wrappedNode({ id: "b", icon: "B" })],
      edges: [wrappedEdge({ source: "a", target: "b", line: "red" })],
      dimensions: { width: 600, height: 360, plot: { x: 0, y: 0, ...plot } },
      theme: { semantic: {}, categorical: ["#999"] },
      resolveColor: () => "#999",
      config: {
        mode: "compact",
        renderStation: (info) => {
          calls.push(info)
          return createElement(
            "text",
            { x: info.x, y: info.y, "data-station": info.station.id },
            info.station.icon,
          )
        },
      },
    })

    expect(calls).toHaveLength(2)
    expect(calls[0]).toMatchObject({
      radius: 2.75,
      mode: "compact",
      lineIds: ["red"],
    })
    expect(renderToStaticMarkup(result.overlays)).toContain('class="transit-diagram-stations"')
    expect(renderToStaticMarkup(result.overlays)).toContain('data-station="a"')
    expect(result.sceneNodes?.every((node) => node.style.fill === "transparent")).toBe(true)
    expect(result.labels).toEqual([])
    expect(result.restyle).toBeUndefined()
  })
})
