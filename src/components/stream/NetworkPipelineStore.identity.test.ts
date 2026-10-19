import { describe, expect, it } from "vitest"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import {
  savePreviousEdgePositions,
  snapshotEdgePositions
} from "./networkEdgeTransitions"

const makeStore = () =>
  new NetworkPipelineStore({
    chartType: "force",
    edgeIdentity: "id",
    customNetworkLayout: () => ({ sceneNodes: [], sceneEdges: [] })
  })
const edges = [
  {
    id: "one",
    source: "A",
    target: "B",
    sourceEndpoint: { kind: "part", partId: "x" },
    value: 2
  },
  {
    id: "two",
    source: "A",
    target: "B",
    sourceEndpoint: { kind: "part", partId: "x" },
    value: 3
  }
]
describe("explicit network edge identity", () => {
  it("rekeys retained bounded data atomically when enabling IDs or changing accessors", () => {
    const store = new NetworkPipelineStore({ chartType: "force", customNetworkLayout: () => ({ sceneNodes: [], sceneEdges: [] }) })
    store.ingestBounded([], edges, [500, 300])
    store.updateConfig({ edgeIdentity: "id" })
    store.ingestEdge({ ...edges[0], value: 10 })
    expect([...store.edges.values()].map(e => e.value)).toEqual([10, 3])
    expect(() => store.updateConfig({ edgeIdAccessor: () => "same" })).toThrow("IDENTITY_DUPLICATE_EDGE")
    expect(store.removeEdge("one")).toBe(true)
    expect([...store.edges.values()].map(e => e.data?.id)).toEqual(["two"])
  })
  it("preserves exact duplicates through bounded/push/update/remove without aggregation", () => {
    for (const bounded of [true, false]) {
      const store = makeStore()
      if (bounded) store.ingestBounded([], edges, [500, 300])
      else edges.forEach((e) => store.ingestEdge(e))
      expect(store.edges.size).toBe(2)
      store.ingestEdge({ ...edges[0], value: 7 })
      expect([...store.edges.values()].map((e) => e.value)).toEqual([7, 3])
      store.updateEdgeById("two", (data) => ({ ...data, value: 9 }))
      expect([...store.edges.values()].map((e) => e.value)).toEqual([7, 9])
      expect(store.removeEdge("one")).toBe(true)
      expect([...store.edges.values()].map((e) => e.data?.id)).toEqual(["two"])
      expect(store.removeNode("A")).toBe(true)
      expect(store.edges.size).toBe(0)
    }
  })
  it("validates IDs and updates before altering accepted topology", () => {
    const store = makeStore()
    store.ingestBounded([], edges, [500, 300])
    expect(() =>
      store.ingestBounded([], [edges[0], edges[0]], [500, 300])
    ).toThrow("DUPLICATE_EDGE")
    expect(store.edges.size).toBe(2)
    expect(() => store.ingestEdge({ source: "X", target: "Y" })).toThrow(
      "IDENTITY_EDGE_ID"
    )
    expect([...store.nodes.keys()]).toEqual(["A", "B"])
    expect(() =>
      store.updateEdgeById("one", (data) => ({ ...data, id: "two" }))
    ).toThrow("IDENTITY_EDGE_UPDATE")
    expect(() => store.ingestEdge({ ...edges[0], target: "C" })).toThrow(
      "IDENTITY_EDGE_UPDATE"
    )
    expect(store.nodes.has("C")).toBe(false)
  })
  it("keeps transition geometry attached to IDs after input reorder", () => {
    const store = makeStore()
    store.ingestBounded([], edges, [500, 300])
    const before = [...store.edges.values()]
    before[0].y0 = 10
    before[1].y0 = 40
    const snapshots = snapshotEdgePositions(before)
    store.ingestBounded([], [...edges].reverse(), [500, 300])
    savePreviousEdgePositions(store.edges.values(), snapshots)
    const after = [...store.edges.values()]
    expect(after[0]._prevY0).toBe(40)
    expect(after[1]._prevY0).toBe(10)
  })
  it("leaves legacy pair accumulation unchanged", () => {
    const store = new NetworkPipelineStore({ chartType: "force" })
    edges.forEach((e) => store.ingestEdge(e))
    expect(store.edges.size).toBe(1)
    expect([...store.edges.values()][0].value).toBe(5)
  })
})
