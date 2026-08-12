import { describe, expect, it } from "vitest"
import type {
  NetworkCircleNode,
  NetworkLineEdge,
  NetworkSceneEdge
} from "./networkTypes"
import { resolveNetworkPointerHit } from "./networkFrameInteraction"
import {
  refreshNetworkCursorInventory,
  rehitNetworkFrameCursor,
  type NetworkCursorInventory
} from "./networkFrameCursorInteraction"
import { sceneMarkCursor } from "./sceneCursor"
import type { NetworkPipelineStore } from "./NetworkPipelineStore"

const nodeCursor: NetworkCircleNode = {
  type: "circle",
  cx: 20,
  cy: 20,
  r: 8,
  style: { cursor: "pointer" },
  datum: { id: "node-cursor" }
}

const plainEdge: NetworkLineEdge = {
  type: "line",
  x1: 50,
  y1: 100,
  x2: 150,
  y2: 100,
  style: { stroke: "#999" },
  datum: { source: "a", target: "b" }
}

function resolveAtEdge(
  sceneEdges: NetworkSceneEdge[],
  includeEdges: boolean,
  sceneNodes: NetworkCircleNode[] = [nodeCursor]
) {
  return resolveNetworkPointerHit({
    clientX: 100,
    clientY: 100,
    canvasRect: { left: 0, top: 0 } as DOMRect,
    margin: { left: 0, top: 0 },
    adjustedWidth: 200,
    adjustedHeight: 200,
    sceneNodes,
    sceneEdges,
    nodeQuadtree: null,
    maxNodeRadius: 0,
    includeEdges
  })
}

function observedEdges(edges: NetworkSceneEdge[]) {
  let iterations = 0
  const proxy = new Proxy(edges, {
    get(target, property, receiver) {
      if (property === Symbol.iterator) {
        return function* iterator() {
          iterations += 1
          yield* target
        }
      }
      return Reflect.get(target, property, receiver)
    }
  })
  return { proxy, iterations: () => iterations }
}

describe("network cursor-only hit testing", () => {
  it("does not iterate edges when only nodes author cursors and hover is disabled", () => {
    const inventory: NetworkCursorInventory = { nodes: false, edges: false }
    expect(
      refreshNetworkCursorInventory(inventory, [nodeCursor], [plainEdge])
    ).toBe(true)
    expect(inventory).toEqual({ nodes: true, edges: false })

    const edges = observedEdges([plainEdge])
    const result = resolveAtEdge(edges.proxy, inventory.edges)

    expect(result.kind).toBe("miss")
    expect(edges.iterations()).toBe(0)
  })

  it("retains edge hit work when hover is enabled", () => {
    const inventory: NetworkCursorInventory = { nodes: false, edges: false }
    refreshNetworkCursorInventory(inventory, [nodeCursor], [plainEdge])
    const edges = observedEdges([plainEdge])

    const result = resolveAtEdge(edges.proxy, true)

    expect(result.kind).toBe("hit")
    if (result.kind === "hit") expect(result.mark).toBe(plainEdge)
    expect(edges.iterations()).toBe(1)
  })

  it("retains edge cursor hits and node-over-edge stacking with hover disabled", () => {
    const edgeCursor: NetworkLineEdge = {
      ...plainEdge,
      style: { stroke: "#999", cursor: "crosshair" }
    }
    const inventory: NetworkCursorInventory = { nodes: false, edges: false }
    refreshNetworkCursorInventory(inventory, [nodeCursor], [edgeCursor])
    const includeEdges = inventory.edges

    const edgeResult = resolveAtEdge([edgeCursor], includeEdges)
    expect(edgeResult.kind).toBe("hit")
    if (edgeResult.kind === "hit") {
      expect(edgeResult.mark).toBe(edgeCursor)
      expect(sceneMarkCursor(edgeResult.mark)).toBe("crosshair")
    }

    const coveringNode: NetworkCircleNode = {
      type: "circle",
      cx: 100,
      cy: 100,
      r: 12,
      style: { fill: "#4682b4" },
      datum: { id: "covering-node" }
    }
    const stackedResult = resolveAtEdge([edgeCursor], includeEdges, [
      coveringNode
    ])
    expect(stackedResult.kind).toBe("hit")
    if (stackedResult.kind === "hit") {
      expect(stackedResult.mark).toBe(coveringNode)
      expect(sceneMarkCursor(stackedResult.mark)).toBeUndefined()
    }
  })

  it("uses the cached edge inventory when re-hitting moving scenes", () => {
    const edgeCursor: NetworkLineEdge = {
      ...plainEdge,
      style: { stroke: "#999", cursor: "crosshair" }
    }
    const edges = observedEdges([edgeCursor])
    const canvas = document.createElement("canvas")
    canvas.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0
      }) as DOMRect
    const store = {
      sceneNodes: [nodeCursor],
      sceneEdges: edges.proxy
    } as unknown as NetworkPipelineStore
    const base = {
      canvas,
      pointer: {
        inside: true,
        clientX: 100,
        clientY: 100,
        pointerType: "mouse"
      },
      store,
      margin: { left: 0, top: 0 },
      width: 200,
      height: 200,
      geometryMoved: true
    }

    rehitNetworkFrameCursor({
      ...base,
      cursorInventory: { nodes: true, edges: false }
    })
    expect(edges.iterations()).toBe(0)
    expect(canvas.style.cursor).toBe("")

    rehitNetworkFrameCursor({
      ...base,
      cursorInventory: { nodes: false, edges: true }
    })
    expect(edges.iterations()).toBe(1)
    expect(canvas.style.cursor).toBe("crosshair")
  })
})
