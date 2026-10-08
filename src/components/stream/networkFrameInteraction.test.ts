import { quadtree } from "d3-quadtree"
import { describe, expect, it } from "vitest"
import { resolveNetworkPointerHit } from "./networkFrameInteraction"
import type { NetworkCircleNode, NetworkSceneNode } from "./networkTypes"

const base = {
  canvasRect: new DOMRect(100, 50, 460, 340),
  margin: { left: 30, top: 20 },
  adjustedWidth: 400,
  adjustedHeight: 300,
  sceneEdges: [
    {
      type: "line" as const,
      x1: 100,
      y1: 100,
      x2: 600,
      y2: 100,
      style: {},
      datum: { id: "edge" }
    }
  ]
}

function pointNode(kind: string, radius: number): NetworkSceneNode {
  const common = { cx: 100, cy: 100, style: {}, datum: { id: "node" } }
  if (kind === "symbol") {
    return { ...common, type: "symbol", size: Math.PI * radius * radius }
  }
  if (kind === "glyph") {
    return {
      ...common,
      type: "glyph",
      size: radius * Math.SQRT2,
      glyph: { viewBox: [2, 2], parts: [{ d: "M0,0H2V2H0Z" }] }
    }
  }
  return { ...common, type: "circle", r: radius }
}

describe.each(["circle", "indexed circle", "symbol", "glyph"])(
  "%s node hit tolerance in screen pixels",
  (kind) => {
    it.each([
      { k: 0.25, radius: 1, boundary: 12 },
      { k: 1, radius: 1, boundary: 12 },
      { k: 3, radius: 1, boundary: 12 },
      { k: 0.25, radius: 20, boundary: 12 },
      { k: 1, radius: 20, boundary: 25 },
      { k: 3, radius: 20, boundary: 65 },
      // Zoomed-out large nodes need a wider quadtree search for the 5px slop.
      { k: 0.25, radius: 100, boundary: 30 },
      { k: 0.25, radius: 1, boundary: 24, hitRadius: 24 },
      { k: 1, radius: 1, boundary: 24, hitRadius: 24 },
      { k: 3, radius: 1, boundary: 24, hitRadius: 24 }
    ])(
      "hands off to the edge beyond $boundary pixels at zoom $k (radius=$radius, custom=$hitRadius)",
      ({ k, radius, boundary, hitRadius }) => {
        const node = pointNode(kind, radius)
        const nodeQuadtree =
          kind === "indexed circle"
            ? quadtree<NetworkCircleNode>()
                .x((n) => n.cx)
                .y((n) => n.cy)
                .add(node as NetworkCircleNode)
            : null
        const hit = (offset: number) =>
          resolveNetworkPointerHit({
            ...base,
            sceneNodes: [node],
            nodeQuadtree,
            maxNodeRadius: radius,
            hitRadius,
            // Keep the node at plot (100,100) after both zoom and translation.
            viewTransform: { k, x: 100 - 100 * k, y: 100 - 100 * k },
            clientX: 230 + offset,
            clientY: 170
          })

        const inside = hit(boundary - 1)
        expect(inside.kind).toBe("hit")
        if (inside.kind === "hit") {
          expect(inside.mark).toBe(node)
          expect(inside.hover).toMatchObject({
            data: { id: "node" },
            x: 100,
            y: 100,
            nodeOrEdge: "node"
          })
        }
        const outside = hit(boundary + 1)
        expect(outside.kind).toBe("hit")
        if (outside.kind === "hit") {
          expect(outside.mark).toBe(base.sceneEdges[0])
          expect(outside.hover.nodeOrEdge).toBe("edge")
        }
      }
    )
  }
)

describe("arc node radial padding in screen pixels", () => {
  it.each([0.25, 1, 3])("keeps two pixels of padding at zoom %s", (k) => {
    const node: NetworkSceneNode = {
      type: "arc",
      cx: 100,
      cy: 100,
      innerR: 20,
      outerR: 40,
      startAngle: 0,
      endAngle: Math.PI / 2,
      style: {},
      datum: { id: "arc" }
    }
    const hit = (screenRadius: number) =>
      resolveNetworkPointerHit({
        ...base,
        sceneNodes: [node],
        sceneEdges: [],
        nodeQuadtree: null,
        maxNodeRadius: 0,
        viewTransform: { k, x: 100 - 100 * k, y: 100 - 100 * k },
        clientX: 230 + screenRadius / Math.SQRT2,
        clientY: 170 + screenRadius / Math.SQRT2
      })
    expect(hit(40 * k + 1).kind).toBe("hit")
    expect(hit(40 * k + 3).kind).toBe("miss")
    expect(hit(20 * k - 1).kind).toBe("hit")
    expect(hit(20 * k - 3).kind).toBe("miss")
  })
})
