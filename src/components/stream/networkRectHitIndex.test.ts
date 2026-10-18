import { describe, expect, it } from "vitest"
import {
  buildNetworkRectHitIndex,
  queryNetworkRectHitIndex
} from "./networkRectHitIndex"
import { findNearestNetworkNode } from "./NetworkCanvasHitTester"
import { resolveNetworkPointerHit } from "./networkFrameInteraction"
import {
  prepareNetworkCustomHits,
  preparedNetworkCustomHits
} from "./networkFrameCursorInteraction"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import type { NetworkRectNode, NetworkSceneNode } from "./networkTypes"

const rect = (x: number, y = 0, w = 20, h = 20): NetworkRectNode => ({
  type: "rect",
  x,
  y,
  w,
  h,
  style: { fill: "transparent" },
  datum: { x, y }
})

describe("committed rectangle hit index", () => {
  it("matches the linear hit test across shuffled, overlapping and coincident rectangles", () => {
    const nodes = Array.from({ length: 3000 }, (_, i) =>
      rect(((i * 193) % 100) * 30, Math.floor(i / 100) * 30)
    )
    nodes.push(rect(0, 0, 200, 200), rect(0), { ...rect(0), depth: 2 })
    const index = buildNetworkRectHitIndex(nodes)!
    for (const [x, y] of [
      [0, 0],
      [20, 20],
      [-1, 0],
      [3000, 0],
      [19, 21],
      [150, 150],
      [500, 500],
      [2950, 880]
    ]) {
      expect(
        findNearestNetworkNode(
          nodes,
          [],
          x,
          y,
          12,
          null,
          0,
          true,
          1,
          undefined,
          index
        )
      ).toEqual(findNearestNetworkNode(nodes, [], x, y))
    }
    expect(queryNetworkRectHitIndex(index, 2950, 880)).toHaveLength(1)
    expect(queryNetworkRectHitIndex(index, 10, -100)).toEqual([])
    expect(
      findNearestNetworkNode(
        nodes,
        [],
        10,
        10,
        12,
        null,
        0,
        true,
        1,
        undefined,
        index
      )?.mark
    ).toBe(nodes.at(-1))
  })

  it("keeps exact-path paint order even when the path's bounds miss the query", () => {
    const small = rect(0),
      large = rect(0, 0, 100, 100)
    const path: NetworkRectNode = {
      ...rect(200),
      _hitPath: {
        pathD: "M200,0h20v20h-20Z",
        transform: [0, 0, 1, 1],
        fill: true,
        strokeWidth: 0
      }
    }
    const nodes = [small, large, path]
    const index = buildNetworkRectHitIndex(nodes)!
    expect(
      findNearestNetworkNode(
        nodes,
        [],
        10,
        10,
        12,
        null,
        0,
        true,
        1,
        undefined,
        index
      )?.mark
    ).toBe(large)
    // Without a display list, smallest containing rectangle wins instead.
    const plain = [small, large]
    expect(
      findNearestNetworkNode(
        plain,
        [],
        10,
        10,
        12,
        null,
        0,
        true,
        1,
        undefined,
        buildNetworkRectHitIndex(plain)
      )?.mark
    ).toBe(small)
  })

  it("leaves mixed/invalid scenes on the live fallback and ignores mismatched indexes", () => {
    const nodes = [rect(0)]
    const index = buildNetworkRectHitIndex(nodes)
    const mixed: NetworkSceneNode[] = [
      ...nodes,
      {
        type: "circle",
        cx: 10,
        cy: 10,
        r: 5,
        style: {},
        datum: { id: "circle" }
      }
    ]
    expect(buildNetworkRectHitIndex(mixed)).toBeUndefined()
    expect(
      buildNetworkRectHitIndex([{ ...rect(0), x: Infinity }])
    ).toBeUndefined()
    expect(buildNetworkRectHitIndex([rect(1e100)])).toBeUndefined()
    expect(buildNetworkRectHitIndex([])).toBeUndefined()
    expect(
      findNearestNetworkNode(
        mixed,
        [],
        10,
        10,
        12,
        null,
        0,
        true,
        1,
        undefined,
        index
      )?.mark
    ).toBe(mixed[1])
  })

  it.each([0.3, 1, 2])(
    "shares screen inversion and node priority with hover/click at k=%s",
    (k) => {
      const nodes = [rect(0)]
      const result = resolveNetworkPointerHit({
        clientX: 30 + 10 * k,
        clientY: 40 + 10 * k,
        canvasRect: { left: 0, top: 0 } as DOMRect,
        margin: { left: 10, top: 10 },
        adjustedWidth: 400,
        adjustedHeight: 300,
        sceneNodes: nodes,
        sceneEdges: [
          {
            type: "line",
            x1: 0,
            y1: 10,
            x2: 100,
            y2: 10,
            style: {},
            datum: { id: "edge" }
          }
        ],
        rectIndex: buildNetworkRectHitIndex(nodes),
        nodeQuadtree: null,
        maxNodeRadius: 0,
        viewTransform: { x: 20, y: 30, k }
      })
      expect(result).toMatchObject({
        kind: "hit",
        mark: nodes[0],
        hover: { nodeOrEdge: "node", data: nodes[0].datum }
      })
    }
  )

  it("invalidates on restyle, geometry and array replacement, independently of edge policy", () => {
    const store = new NetworkPipelineStore({
      chartType: "force",
      customNetworkLayout: () => ({
        sceneNodes: [rect(0)],
        sceneEdges: [],
        edgeHitTesting: false,
        restyle: () => ({ fill: "red" })
      })
    })
    store.buildScene([400, 300])
    prepareNetworkCustomHits(store)
    expect(preparedNetworkCustomHits(store)?.rectIndex).toBeDefined()
    store.restyleScene(null)
    expect(preparedNetworkCustomHits(store)?.rectIndex).toBeUndefined()
    prepareNetworkCustomHits(store)
    expect(
      queryNetworkRectHitIndex(preparedNetworkCustomHits(store)!.rectIndex!, 10, 10)
    ).toEqual(store.sceneNodes)
    store.sceneNodes = [rect(300)]
    expect(preparedNetworkCustomHits(store)?.rectIndex).toBeUndefined()
    prepareNetworkCustomHits(store)
    expect(
      queryNetworkRectHitIndex(preparedNetworkCustomHits(store)!.rectIndex!, 305, 5)
    ).toEqual(store.sceneNodes)
    store.updateConfig({ layoutConfig: { revision: 2 } })
    expect(preparedNetworkCustomHits(store)?.rectIndex).toBeUndefined()
  })
})
