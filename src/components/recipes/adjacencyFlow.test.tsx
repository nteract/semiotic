import * as React from "react"
import { act } from "react"
import { hydrateRoot } from "react-dom/client"
import { renderToStaticMarkup, renderToString } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import type { Datum } from "../charts/shared/datumTypes"
import { NetworkCustomChart } from "../charts/custom/NetworkCustomChart"
import type { NetworkLayoutContext } from "../stream/networkCustomLayout"
import type {
  NetworkCurvedEdge,
  NetworkRectNode,
  RealtimeEdge,
  RealtimeNode
} from "../stream/networkTypes"
import { adjacencyFlowLayout, type AdjacencyFlowConfig } from "./adjacencyFlow"
import { aggregateAdjacencyFlow } from "./adjacencyFlowAggregation"

function nodes(rows: Datum[]): RealtimeNode[] {
  return rows.map((row) => ({
    id: String(row.id),
    data: row
  })) as unknown as RealtimeNode[]
}

function edges(rows: Datum[]): RealtimeEdge[] {
  return rows.map((row) => ({
    source: String(row.source),
    target: String(row.target),
    value: Number(row.value),
    data: row
  })) as unknown as RealtimeEdge[]
}

function context(
  nodeRows: Datum[],
  edgeRows: Datum[],
  config: AdjacencyFlowConfig = {}
): NetworkLayoutContext<AdjacencyFlowConfig> {
  return {
    nodes: nodes(nodeRows),
    edges: edges(edgeRows),
    dimensions: {
      width: 420,
      height: 420,
      plot: { x: 0, y: 0, width: 420, height: 420 }
    },
    theme: {
      semantic: {
        primary: "#173f5f",
        info: "#55a9c7",
        text: "#173f5f",
        surface: "#ffffff",
        border: "#9aa7b2",
        grid: "#c6ced4"
      },
      categorical: ["#55a9c7", "#e07a5f"]
    },
    resolveColor: (key) => (key.length % 2 ? "#55a9c7" : "#e07a5f"),
    config
  }
}

describe("adjacencyFlowLayout", () => {
  const nodeRows = [
    { id: "A", label: "A" },
    { id: "B", label: "B" },
    { id: "C", label: "C" }
  ]

  it("places ordered nodes on the matrix diagonal", () => {
    const result = adjacencyFlowLayout(
      context(nodeRows, [], { order: ["C", "A", "B"] })
    )
    const rects = result.sceneNodes as NetworkRectNode[]
    expect(rects.map((node) => node.id)).toEqual(["C", "A", "B"])
    const centers = rects.map((node) => [
      node.x + node.w / 2,
      node.y + node.h / 2
    ])
    expect(centers[0][0]).toBe(centers[0][1])
    expect(centers[1][0]).toBeGreaterThan(centers[0][0])
    expect(centers[2][1]).toBeGreaterThan(centers[1][1])
  })

  it("routes forward flow through the upper-right and reverse flow through the lower-left", () => {
    const result = adjacencyFlowLayout(
      context(nodeRows, [
        { source: "A", target: "C", value: 6 },
        { source: "C", target: "A", value: 3 }
      ])
    )
    const sceneEdges = result.sceneEdges as NetworkCurvedEdge[]
    const forward = sceneEdges.find(
      (edge) => (edge.datum as Datum).source === "A"
    )
    const reverse = sceneEdges.find(
      (edge) => (edge.datum as Datum).source === "C"
    )
    expect(forward?.pathD).toMatch(/^M[\d.]+,[\d.]+L/)
    expect(forward?.pathD).toContain("Q")
    expect(reverse?.pathD).toContain("Q")

    const rects = result.sceneNodes as NetworkRectNode[]
    const a = rects.find((node) => node.id === "A") as NetworkRectNode
    const c = rects.find((node) => node.id === "C") as NetworkRectNode
    const forwardStart = Number(forward?.pathD.match(/^M([\d.]+)/)?.[1])
    const reverseStart = Number(reverse?.pathD.match(/^M([\d.]+)/)?.[1])
    expect(forwardStart).toBeCloseTo(a.x + a.w, 1)
    expect(reverseStart).toBeCloseTo(c.x, 1)
  })

  it("sums parallel edges and keeps width proportional to value", () => {
    const result = adjacencyFlowLayout(
      context(nodeRows, [
        { source: "A", target: "B", value: 2 },
        { source: "A", target: "B", value: 3 },
        { source: "A", target: "C", value: 1 }
      ])
    )
    const sceneEdges = result.sceneEdges as NetworkCurvedEdge[]
    expect(sceneEdges).toHaveLength(2)
    const ab = sceneEdges.find((edge) => (edge.datum as Datum).target === "B")
    const ac = sceneEdges.find((edge) => (edge.datum as Datum).target === "C")
    expect(ab?.datum).toMatchObject({
      source: "A",
      target: "B",
      value: 5,
      edgeCount: 2
    })
    expect(ab?.style.strokeWidth).toBeGreaterThan(
      (ac?.style.strokeWidth as number) * 4.5
    )
  })

  it("renders a compact self-flow, dotted matrix, and visible direction arrows", () => {
    const result = adjacencyFlowLayout(
      context(nodeRows, [{ source: "B", target: "B", value: 12 }])
    )
    const edge = result.sceneEdges?.[0] as NetworkCurvedEdge
    expect(edge.pathD.match(/Q/g)).toHaveLength(3)
    const markup = renderToStaticMarkup(
      <svg>
        {result.backgrounds}
        {result.overlays}
      </svg>
    )
    expect(markup.match(/<line/g)?.length).toBe(8)
    expect(markup).toContain('stroke-dasharray="2 5"')
    expect(markup).toContain("<path")
  })

  it("keeps arrows inside thick routes and omits them from routes with two or fewer usable pixels", () => {
    const result = adjacencyFlowLayout(
      context(nodeRows, [
        { source: "A", target: "B", value: 100 },
        { source: "A", target: "C", value: 1 }
      ])
    )
    const host = document.createElement("div")
    host.innerHTML = renderToStaticMarkup(<svg>{result.overlays}</svg>)
    const arrows = [
      ...host.querySelectorAll<SVGPathElement>(".semiotic-adjacency-flow-arrow")
    ]
    expect(arrows).toHaveLength(1)
    const arrowWidth = Number(arrows[0].dataset.arrowWidth)
    const edgeWidth = Number(arrows[0].dataset.edgeWidth)
    expect(arrowWidth).toBeGreaterThan(2)
    expect(arrowWidth).toBeLessThanOrEqual(edgeWidth - 2)
    expect(arrows[0]).toHaveAttribute(
      "fill",
      "var(--semiotic-adjacency-flow-arrow-fill, rgba(255, 255, 255, 0.72))"
    )
    expect(arrows[0]).toHaveAttribute("aria-hidden", "true")
    expect(arrows[0]).toHaveAttribute("stroke", "none")
  })

  it("uses semantic theme colors and accepts an explicit arrow fill override", () => {
    const result = adjacencyFlowLayout(
      context(nodeRows, [{ source: "A", target: "B", value: 8 }], {
        arrowColor: "rgba(10, 20, 30, 0.6)"
      })
    )
    const edge = result.sceneEdges?.[0] as NetworkCurvedEdge
    const node = result.sceneNodes?.[0] as NetworkRectNode
    const host = document.createElement("div")
    host.innerHTML = renderToStaticMarkup(<svg>{result.overlays}</svg>)
    expect(edge.style.stroke).toBe("#55a9c7")
    expect(node.style.fill).toBe("#173f5f")
    expect(
      host.querySelector(".semiotic-adjacency-flow-arrow")
    ).toHaveAttribute("fill", "rgba(10, 20, 30, 0.6)")
  })

  it("uses the source palette color for both source nodes and their edges", () => {
    const result = adjacencyFlowLayout(
      context(nodeRows, [{ source: "A", target: "B", value: 8 }], {
        colorMode: "source"
      })
    )
    const edge = result.sceneEdges?.[0] as NetworkCurvedEdge
    const source = result.sceneNodes?.find(
      (node) => node.id === "A"
    ) as NetworkRectNode
    expect(source.style.fill).toBe(edge.style.stroke)
    expect(source.style.fill).toBe("#55a9c7")
  })

  it("emits accessible node and edge projections", () => {
    const result = adjacencyFlowLayout(
      context(nodeRows, [{ source: "A", target: "B", value: 8 }])
    )
    const a = result.sceneNodes?.find(
      (node) => node.id === "A"
    ) as NetworkRectNode
    const edge = result.sceneEdges?.[0] as NetworkCurvedEdge
    expect(a.accessibility?.tableFields).toMatchObject({
      step: 1,
      node: "A",
      outgoing: 8
    })
    expect(edge.accessibility?.tableFields).toMatchObject({
      source: "A",
      target: "B",
      value: 8
    })
  })
})

describe("adjacency flow CSR/SSR parity", () => {
  const renderChart = () => (
    <NetworkCustomChart
      nodes={[
        { id: "A", label: "A" },
        { id: "B", label: "B" },
        { id: "C", label: "C" }
      ]}
      edges={[
        { source: "A", target: "B", value: 8 },
        { source: "B", target: "C", value: 5 },
        { source: "C", target: "A", value: 3 }
      ]}
      nodeIDAccessor="id"
      sourceAccessor="source"
      targetAccessor="target"
      layout={adjacencyFlowLayout}
      layoutConfig={{ showArrows: true }}
      title="Adjacency flow"
      description="Forward and reverse weighted routes in an ordered matrix."
      summary="B is the middle step."
      accessibleTable
      width={420}
      height={420}
    />
  )

  it("server-renders an accessible SVG and hydrates to interactive canvas without mismatches", () => {
    const html = renderToString(renderChart())
    expect(html).toContain("<svg")
    expect(html).not.toContain("<canvas")
    expect(html).toContain("semiotic-adjacency-flow-arrow")
    expect(html).toContain('role="img"')
    expect(html).toContain(
      "Forward and reverse weighted routes in an ordered matrix."
    )
    expect(html).toContain("B is the middle step.")

    const container = document.createElement("div")
    document.body.appendChild(container)
    container.innerHTML = html
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    let root: ReturnType<typeof hydrateRoot> | null = null

    try {
      act(() => {
        root = hydrateRoot(container, renderChart())
      })
      const mismatchWarnings = errorSpy.mock.calls.filter((call) =>
        /hydration|did not match|server rendered html/i.test(
          String(call[0] ?? "")
        )
      )
      expect(mismatchWarnings).toEqual([])
      expect(
        container.querySelector(
          '[aria-label="Network chart, 3 nodes, 3 edges"]'
        )
      ).toBeTruthy()
      expect(
        container.querySelector(".semiotic-accessible-data-table")
      ).toBeTruthy()
      expect(
        container.querySelector(".semiotic-adjacency-flow-arrow")
      ).toHaveAttribute("aria-hidden", "true")
    } finally {
      act(() => root?.unmount())
      errorSpy.mockRestore()
      container.remove()
    }
  })
})

describe("aggregateAdjacencyFlow", () => {
  const groupedNodes = [
    { id: "A", label: "A", group: "ABC" },
    { id: "B", label: "B", group: "ABC" },
    { id: "C", label: "C", group: "ABC" },
    { id: "D", label: "D", group: "DEF" },
    { id: "E", label: "E", group: "DEF" },
    { id: "F", label: "F", group: "DEF" }
  ]
  const groupedEdges = [
    { source: "A", target: "B", value: 10 },
    { source: "B", target: "C", value: 5 },
    { source: "C", target: "D", value: 7 },
    { source: "D", target: "C", value: 2 },
    { source: "E", target: "F", value: 4 }
  ]

  it("collapses groups, sums cross-group movement, and preserves internal flow", () => {
    const result = aggregateAdjacencyFlow(groupedNodes, groupedEdges)
    expect(result.nodes.map((node) => node.label)).toEqual(["ABC", "DEF"])
    expect(result.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "group:ABC",
          target: "group:ABC",
          value: 15
        }),
        expect.objectContaining({
          source: "group:ABC",
          target: "group:DEF",
          value: 7
        }),
        expect.objectContaining({
          source: "group:DEF",
          target: "group:ABC",
          value: 2
        }),
        expect.objectContaining({
          source: "group:DEF",
          target: "group:DEF",
          value: 4
        })
      ])
    )
    expect(result.groups[0]).toMatchObject({
      group: "ABC",
      collapsed: true,
      internalValue: 15,
      outgoingValue: 7,
      incomingValue: 2
    })
  })

  it("expands selected groups without losing their member sequence", () => {
    const result = aggregateAdjacencyFlow(groupedNodes, groupedEdges, {
      expandedGroups: ["ABC"]
    })
    expect(result.nodes.map((node) => node.id)).toEqual([
      "A",
      "B",
      "C",
      "group:DEF"
    ])
    expect(result.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "A", target: "B", value: 10 }),
        expect.objectContaining({ source: "B", target: "C", value: 5 }),
        expect.objectContaining({ source: "C", target: "group:DEF", value: 7 }),
        expect.objectContaining({ source: "group:DEF", target: "C", value: 2 })
      ])
    )
  })

  it("can omit summary self-flows and reports invalid edges", () => {
    const result = aggregateAdjacencyFlow(
      groupedNodes,
      [...groupedEdges, { source: "missing", target: "A", value: 3 }],
      { includeInternalFlows: false }
    )
    expect(result.edges.every((edge) => edge.source !== edge.target)).toBe(true)
    expect(result.omittedEdgeCount).toBe(1)
    expect(
      result.nodes.find((node) => node.label === "ABC")?.internalValue
    ).toBe(15)
  })
})
