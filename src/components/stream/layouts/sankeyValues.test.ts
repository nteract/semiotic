import { NetworkPipelineStore } from "../NetworkPipelineStore"
import type { NetworkPipelineConfig } from "../networkTypes"
import "./sankeyLayoutPlugin"

const size: [number, number] = [600, 400]
function layout(
  edges: { source: string; target: string; value: number }[],
  config: Partial<NetworkPipelineConfig> = {}
) {
  const store = new NetworkPipelineStore({ chartType: "sankey", ...config })
  store.ingestBounded([], edges, size)
  store.buildScene(size)
  return store
}

describe("Sankey flow magnitudes", () => {
  it.each(["horizontal", "vertical"] as const)(
    "conserves a 100 = 50 + 50 split in %s layout",
    (orientation) => {
      const store = layout(
        [
          { source: "A", target: "B", value: 100 },
          { source: "B", target: "C", value: 50 },
          { source: "B", target: "D", value: 50 }
        ],
        { orientation }
      )
      const [incoming, ...outgoing] = [...store.edges.values()]
      expect(store.nodes.get("A")!.value).toBe(100)
      expect(store.nodes.get("B")!.value).toBe(100)
      expect(incoming.sankeyWidth).toBeCloseTo(
        outgoing.reduce((sum, edge) => sum + edge.sankeyWidth, 0)
      )
      expect(store.nodes.get("B")!.height).toBeCloseTo(incoming.sankeyWidth)
    }
  )

  it("keeps fractional values proportional and removes zero/negative flows on relayout", () => {
    const store = layout([
      { source: "A", target: "B", value: 0.1 },
      { source: "A", target: "C", value: 0.9 },
      { source: "A", target: "D", value: 0 },
      { source: "D", target: "A", value: -1 }
    ])
    const [small, large] = [...store.edges.values()]
    expect(large.sankeyWidth / small.sankeyWidth).toBeCloseTo(9)
    expect(store.nodes.get("A")!.value).toBe(1)
    expect(store.sceneEdges).toHaveLength(2)
    expect(store.sceneNodes.map((node) => node.id)).toEqual(["A", "B", "C"])
    store.updateEdge("A", "B", (d) => ({ ...d, value: 0 }))
    store.updateEdge("A", "C", (d) => ({ ...d, value: 0 }))
    store.runLayout(size)
    store.buildScene(size)
    expect(store.sceneEdges).toEqual([])
    expect(store.sceneNodes).toEqual([])
    expect(store.nodes.get("A")!.value).toBe(0)
  })

  it.each(["horizontal", "vertical"] as const)(
    "draws every circular band at its true width and fits the %s viewport",
    (orientation) => {
      const ids = ["A", "B", "C", "D", "E", "F"]
      const edges = ids.map((id, i) => ({
        source: id,
        target: id,
        value: i + 1
      }))
      edges.push(
        ...ids
          .slice(1)
          .map((id, i) => ({ source: ids[i], target: id, value: 1 }))
      )
      const store = layout(edges, { orientation })
      const circular = [...store.edges.values()].filter((edge) => edge.circular)
      expect(circular).toHaveLength(6)
      expect(store.sceneEdges).toHaveLength(edges.length)
      const scale = circular[0].sankeyWidth / circular[0].value
      for (const edge of circular) {
        expect(edge._circularStub).toBe(false)
        expect(edge._circularWidth).toBeCloseTo(edge.sankeyWidth)
        expect(edge.sankeyWidth / edge.value).toBeCloseTo(scale)
        const cpd = edge.circularPathData!
        const hw = edge.sankeyWidth / 2
        const breadth = orientation === "vertical" ? size[0] : size[1]
        const depth = orientation === "vertical" ? size[1] : size[0]
        expect(cpd.leftFullExtent - hw).toBeGreaterThanOrEqual(-1e-8)
        expect(cpd.rightFullExtent + hw).toBeLessThanOrEqual(depth + 1e-8)
        expect(cpd.verticalFullExtent - hw).toBeGreaterThanOrEqual(-1e-8)
        expect(cpd.verticalFullExtent + hw).toBeLessThanOrEqual(breadth + 1e-8)
        const mark = store.sceneEdges.find((mark) => mark.datum === edge)!
        if (mark.type !== "bezier") throw new Error("Expected Sankey band")
        expect(mark.pathD).not.toMatch(/NaN|Infinity/)
        expect(mark.pathD.match(/A/g)).toHaveLength(8)
      }
    }
  )
})

it("uses the full vertical extent of a tall acyclic Sankey without clipping", () => {
  const size: [number, number] = [400, 600]
  const store = new NetworkPipelineStore({ chartType: "sankey", orientation: "vertical" })
  store.ingestBounded([], [
    { source: "A", target: "B", value: 100 },
    { source: "B", target: "C", value: 50 },
    { source: "B", target: "D", value: 50 }
  ], size)
  store.buildScene(size)
  const rects = store.sceneNodes.filter((node) => node.type === "rect")
  expect(rects).toHaveLength(4)
  for (const rect of rects) {
    expect(rect.x).toBeGreaterThanOrEqual(0)
    expect(rect.y).toBeGreaterThanOrEqual(0)
    expect(rect.x + rect.w).toBeLessThanOrEqual(size[0])
    expect(rect.y + rect.h).toBeLessThanOrEqual(size[1])
  }
  const height = Math.max(...rects.map((rect) => rect.y + rect.h)) - Math.min(...rects.map((rect) => rect.y))
  expect(height).toBeGreaterThanOrEqual(size[1] * 0.95)
})
