import { describe, it, expect, vi } from "vitest"
import {
  buildNetworkEdgeHitIndex,
  queryNetworkEdgeHitIndex
} from "./networkEdgeHitIndex"
import { findNearestNetworkNode } from "./NetworkCanvasHitTester"
import {
  prepareNetworkCustomEdgeHits,
  preparedNetworkCustomEdgeHits
} from "./networkFrameCursorInteraction"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import type { NetworkSceneEdge } from "./networkTypes"

const line = (x: number): NetworkSceneEdge => ({
  type: "line",
  x1: x,
  y1: 0,
  x2: x + 10,
  y2: 0,
  style: { stroke: "navy" },
  datum: { x }
})

describe("committed network edge index", () => {
  it("reuses unchanged/color-only scenes and refreshes retained path, fill, width and ordering changes", () => {
    const edge: NetworkSceneEdge = {
      type: "curved",
      pathD: "M-500,0 C-500,500 500,500 500,0",
      style: { stroke: "navy", fill: "none" },
      datum: {}
    }
    const edges = [edge, line(900)]
    const index = buildNetworkEdgeHitIndex(edges)
    expect(buildNetworkEdgeHitIndex(edges)).toBe(index)
    edge.style.stroke = "red"
    expect(buildNetworkEdgeHitIndex(edges)).toBe(index)
    const exact = vi.fn(() => edge)
    expect(queryNetworkEdgeHitIndex(index, 0, 25, 5, exact)).toBeNull()
    expect(exact).not.toHaveBeenCalled()
    edge.style.fill = "red"
    const filled = buildNetworkEdgeHitIndex(edges)
    expect(filled).not.toBe(index)
    expect(queryNetworkEdgeHitIndex(filled, 0, 25, 5, exact)).toBe(edge)
    edge.style.strokeWidth = 800
    expect(buildNetworkEdgeHitIndex(edges)).toBe(filled)
    expect(queryNetworkEdgeHitIndex(filled, 0, -300, 5, exact)).toBe(edge)
    edge.pathD = "M0,0 L100,0"
    const moved = buildNetworkEdgeHitIndex(edges)
    expect(moved).not.toBe(filled)
    edges.reverse()
    expect(buildNetworkEdgeHitIndex(edges)).not.toBe(moved)
    edge.interactive = false
    expect(
      queryNetworkEdgeHitIndex(buildNetworkEdgeHitIndex(edges), 0, 0, 5, exact)
    ).toBeNull()
  })
  it("prunes spatially shuffled edges, preserving the last exact hit", () => {
    const edges = Array.from({ length: 4500 }, (_, i) =>
      line(((i * 193) % 4500) * 100)
    )
    edges.push(line(0))
    const index = buildNetworkEdgeHitIndex(edges)
    const exact = vi.fn((edge: NetworkSceneEdge) => edge)
    expect(queryNetworkEdgeHitIndex(index, 5, 0, 5, exact)).toBe(edges.at(-1))
    expect(exact).toHaveBeenCalledTimes(1)
    expect(
      findNearestNetworkNode([], edges, 5, 0, 12, null, 0, true, 1, index)?.mark
    ).toBe(edges.at(-1))
    exact.mockClear()
    expect(queryNetworkEdgeHitIndex(index, -1000, 0, 5, exact)).toBeNull()
    expect(exact).not.toHaveBeenCalled()
  })

  it("retains node priority, empty/decorative scenes, camera tolerance and thick strokes", () => {
    const edges = [line(0)]
    const query = (x: number, y: number, k = 1) =>
      findNearestNetworkNode(
        [],
        edges,
        x,
        y,
        12,
        null,
        0,
        true,
        k,
        buildNetworkEdgeHitIndex(edges)
      )
    expect(query(5, 16, 0.3)?.mark).toBe(edges[0])
    expect(query(5, 16, 1)).toBeNull()
    edges[0].style.strokeWidth = 200
    expect(query(5, 90)?.mark).toBe(edges[0])
    const node = {
      type: "circle" as const,
      cx: 5,
      cy: 0,
      r: 4,
      style: {},
      datum: { id: "node" }
    }
    expect(
      findNearestNetworkNode(
        [node],
        edges,
        5,
        0,
        12,
        null,
        0,
        true,
        1,
        buildNetworkEdgeHitIndex(edges)
      )?.mark
    ).toBe(node)
    edges[0].interactive = false
    expect(query(5, 0)).toBeNull()
    expect(
      queryNetworkEdgeHitIndex(
        buildNetworkEdgeHitIndex([]),
        0,
        0,
        5,
        () => true
      )
    ).toBeNull()
  })

  it("falls back to live records between a restyle/geometry revision and its paint", () => {
    const store = new NetworkPipelineStore({
      chartType: "force",
      customNetworkLayout: () => ({
        sceneEdges: [line(0)],
        sceneNodes: [],
        restyleEdge: () => ({ strokeWidth: 200 })
      })
    })
    store.buildScene([400, 300])
    prepareNetworkCustomEdgeHits(store)
    expect(preparedNetworkCustomEdgeHits(store)).toBeDefined()
    store.restyleScene(null)
    expect(preparedNetworkCustomEdgeHits(store)).toBeUndefined()
    expect(findNearestNetworkNode([], store.sceneEdges, 5, 90)?.type).toBe(
      "edge"
    )
    prepareNetworkCustomEdgeHits(store)
    expect(preparedNetworkCustomEdgeHits(store)).toBeDefined()
    store.sceneEdges = [line(300)]
    expect(preparedNetworkCustomEdgeHits(store)).toBeUndefined()
    prepareNetworkCustomEdgeHits(store)
    const index = preparedNetworkCustomEdgeHits(store)
    expect(
      findNearestNetworkNode(
        [],
        store.sceneEdges,
        305,
        0,
        12,
        null,
        0,
        true,
        1,
        index
      )?.type
    ).toBe("edge")
    store.updateConfig({ layoutConfig: { revision: 2 } })
    expect(preparedNetworkCustomEdgeHits(store)).toBeUndefined()
    store.lastCustomLayoutResult!.edgeHitTesting = false
    prepareNetworkCustomEdgeHits(store)
    expect(preparedNetworkCustomEdgeHits(store)).toBeUndefined()
  })
})
