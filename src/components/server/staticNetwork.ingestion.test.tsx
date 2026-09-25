import type { Datum } from "../charts/shared/datumTypes"
import type { NetworkPipelineConfig } from "../stream/networkTypes"
import { NetworkPipelineStore } from "../stream/NetworkPipelineStore"
import { renderNetworkToStaticSVG } from "./renderToStaticSVG"
import { buildRealtimeEdges, buildRealtimeNodes } from "./staticNetwork"

describe("network ingestion across browser and static renderers", () => {
  it.each(["force", "sankey", "chord"] as const)(
    "%s preserves custom edge rows and infers missing nodes beside supplied nodes",
    (chartType) => {
      const nodes = [{ key: "0", label: "Authored zero", x: 20, y: 30 }]
      const edges = [
        { from: 0, to: 1, mass: 4, label: "First flow" },
        { from: 1, to: 2, mass: null, label: "Missing weight" },
        { from: 1, to: 2, mass: "invalid", label: "Invalid weight" }
      ]
      const config: NetworkPipelineConfig = {
        chartType,
        nodeIDAccessor: "key",
        sourceAccessor: (datum) => datum.from,
        targetAccessor: "to",
        valueAccessor: "mass",
        transition: { duration: 0 },
        iterations: 20,
        showLabels: false
      }
      const liveNodes = new Map<string, Datum>()
      const staticNodes = new Map<string, Datum>()
      const liveEdges = new Map<string, Datum>()
      const staticEdges = new Map<string, Datum>()
      const nodeStyle = (target: Map<string, Datum>) => (node: Datum) => {
        target.set(node.id, node.data!)
        return { fill: "#123456" }
      }
      const edgeStyle = (target: Map<string, Datum>) => (edge: Datum) => {
        target.set(edge._edgeKey!, edge.data!)
        return { fill: "#abcdef" }
      }
      const store = new NetworkPipelineStore({
        ...config,
        nodeStyle: nodeStyle(liveNodes),
        edgeStyle: edgeStyle(liveEdges)
      })
      store.ingestBounded(nodes, edges, [400, 300])
      store.buildScene([400, 300])
      const svg = renderNetworkToStaticSVG({
        ...config,
        nodes,
        edges,
        size: [400, 300],
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        nodeStyle: nodeStyle(staticNodes),
        edgeStyle: edgeStyle(staticEdges)
      })
      expect(svg).not.toMatch(/NaN|Infinity/)
      expect([...staticNodes.keys()]).toEqual(["0", "1", "2"])
      expect(staticNodes).toEqual(liveNodes)
      expect(staticNodes.get("0")).toBe(nodes[0])
      expect(staticNodes.get("1")).toEqual({ id: "1" })
      expect(staticEdges).toEqual(liveEdges)
      for (const row of staticEdges.values()) expect(edges).toContain(row)
    }
  )

  it("normalizes missing IDs, duplicates, and non-finite weights before static layout", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    try {
      const last = { id: 0, label: "Latest", x: 12, y: 34 }
      expect(
        buildRealtimeNodes([{ id: 0 }, last, {}], { chartType: "force" })
      ).toMatchObject([{ id: "0", data: last, x: 12, y: 34 }])
      const edges = buildRealtimeEdges(
        [
          { source: 0, target: 1, value: 0 },
          { source: 1, target: 2, value: null },
          { source: 1, target: 2, value: Infinity },
          { target: 2, value: 100 }
        ],
        { chartType: "force" }
      )
      expect(
        edges.map((edge) => [edge.source, edge.target, edge.value])
      ).toEqual([
        ["0", "1", 0],
        ["1", "2", 1],
        ["1", "2", 1]
      ])
      expect(warn).toHaveBeenCalledTimes(3)
    } finally {
      warn.mockRestore()
    }
  })
})
