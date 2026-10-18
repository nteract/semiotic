import {
  buildNetworkHitTree,
  queryNetworkHitTree,
  type NetworkHitBranch
} from "./networkHitTree"
import type { NetworkRectNode, NetworkSceneNode } from "./networkTypes"

/** Spatial candidates for committed rectangular scenes (HTML cards, treemaps). */
export interface NetworkRectHitIndex {
  nodes: NetworkSceneNode[]
  root: NetworkHitBranch
  paintOrder: boolean
}

export function buildNetworkRectHitIndex(
  nodes: NetworkSceneNode[]
): NetworkRectHitIndex | undefined {
  // Invalid or imprecise bounds retain the existing live hit-test fallback.
  if (
    !nodes.length ||
    nodes.some(
      (node) =>
        node.type !== "rect" ||
        ![
          node.x,
          node.y,
          node.w,
          node.h,
          node.x + node.w,
          node.y + node.h
        ].every(
          (value) =>
            Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER
        )
    )
  )
    return
  const rects = nodes as NetworkRectNode[]
  return {
    nodes,
    root: buildNetworkHitTree(
      rects.map((node, order) => ({
        x0: node.x,
        y0: node.y,
        x1: node.x + node.w,
        y1: node.y + node.h,
        radius: 0,
        order
      }))
    ),
    paintOrder: rects.some((node) => !!node._hitPath)
  }
}

export function queryNetworkRectHitIndex(
  index: NetworkRectHitIndex,
  x: number,
  y: number
): NetworkRectNode[] {
  const matches: number[] = []
  queryNetworkHitTree(index.root, x, y, 0, (order) => {
    matches.push(order)
    return null
  })
  // Preserve tie-breaking and exact-path display-list order, including peers
  // with identical centers. Bounds only reject; the existing hit test decides.
  return matches
    .sort((a, b) => a - b)
    .map((order) => index.nodes[order] as NetworkRectNode)
}
