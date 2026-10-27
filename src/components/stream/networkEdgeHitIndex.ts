import {
  buildNetworkHitTree,
  queryNetworkHitTree,
  type NetworkHitBranch
} from "./networkHitTree"
import { getNetworkEdgeBounds } from "./networkEdgeHitBounds"
import type { NetworkSceneEdge } from "./networkTypes"
import type { PathBox } from "../geometry/svgPathBounds"

/** Exact curves stay inside their control hulls. Subdivision only rejects
 * candidates; it never replaces Canvas with a sampled/approximate hit. */
function cubicBoxes(
  edge: NetworkSceneEdge,
  box: PathBox | null
): PathBox[] | null {
  if (
    !box ||
    box.w < 256 ||
    box.h < 256 ||
    edge.type === "line" ||
    (edge.style.fill && edge.style.fill !== "none")
  )
    return null
  const tokens = edge.pathD.match(
    /[a-zA-Z]|[-+]?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?/g
  )
  // Optimize the common single absolute cubic. Every other SVG command,
  // subpath, implicit closure, and malformed prefix retains its general bound.
  if (!tokens || tokens.length !== 10 || tokens[0] !== "M" || tokens[3] !== "C")
    return null
  const points = [1, 4, 6, 8].map((i) => [
    Number(tokens[i]),
    Number(tokens[i + 1])
  ])
  const result: PathBox[] = []
  const split = (p: number[][], depth: number) => {
    const xs = p.map((v) => v[0]),
      ys = p.map((v) => v[1])
    const x = Math.min(...xs),
      y = Math.min(...ys),
      w = Math.max(...xs) - x,
      h = Math.max(...ys) - y
    if (!depth || w < 4 || h < 4) {
      result.push({ x, y, w, h })
      return
    }
    const left = [p[0]],
      right = [p[3]]
    // de Casteljau's triangle supplies both exact half-curve control hulls.
    while (p.length > 1) {
      p = p.slice(1).map((v, i) => [(v[0] + p[i][0]) / 2, (v[1] + p[i][1]) / 2])
      left.push(p[0])
      right.unshift(p[p.length - 1])
    }
    split(left, depth - 1)
    split(right, depth - 1)
  }
  split(points, 2)
  return result
}

function edgeRadius(edge: NetworkSceneEdge): number {
  const width = edge.style.strokeWidth ?? 1
  return Number.isFinite(width) ? Math.max(0, width / 2) : Infinity
}

/** Geometry/style snapshot owned by a committed custom scene, never raw callers. */
export interface NetworkEdgeHitIndex {
  edges: NetworkSceneEdge[]
  root: NetworkHitBranch
}

const retained = new WeakMap<
  NetworkSceneEdge[],
  { index: NetworkEdgeHitIndex; signatures: unknown[][] }
>()

function signature(edge: NetworkSceneEdge): unknown[] {
  return [
    edge,
    edge.datum != null && edge.interactive !== false,
    edge.style.strokeWidth,
    !!edge.style.fill && edge.style.fill !== "none",
    ...(edge.type === "line"
      ? [edge.x1, edge.y1, edge.x2, edge.y2]
      : [edge.pathD])
  ]
}

export function buildNetworkEdgeHitIndex(
  edges: NetworkSceneEdge[]
): NetworkEdgeHitIndex {
  // Scene notifications can repeat after a synchronous build. Colors, cursor
  // and opacity do not affect candidates, so ordinary restyles reuse the tree.
  const signatures = edges.map(signature)
  const previous = retained.get(edges)
  if (
    previous &&
    previous.signatures.length === signatures.length &&
    signatures.every(
      (row, i) =>
        row.length === previous.signatures[i].length &&
        row.every(
          (value, j) => j === 2 || Object.is(value, previous.signatures[i][j])
        )
    )
  ) {
    if (
      signatures.some((row, i) => !Object.is(row[2], previous.signatures[i][2]))
    ) {
      const refreshRadius = (node: NetworkHitBranch): number => {
        node.radius = node.children
          ? Math.max(0, ...node.children.map(refreshRadius))
          : edgeRadius(edges[node.order])
        return node.radius
      }
      refreshRadius(previous.index.root)
    }
    previous.signatures = signatures
    return previous.index
  }
  const entries: NetworkHitBranch[] = []
  edges.forEach((edge, order) => {
    if (edge.datum == null || edge.interactive === false) return
    const box =
      edge.type === "line"
        ? {
            x: Math.min(edge.x1, edge.x2),
            y: Math.min(edge.y1, edge.y2),
            w: Math.abs(edge.x2 - edge.x1),
            h: Math.abs(edge.y2 - edge.y1)
          }
        : getNetworkEdgeBounds(edge)
    const radius = edgeRadius(edge)
    for (const part of cubicBoxes(edge, box) ?? [box])
      entries.push({
        x0: part?.x ?? -Infinity,
        y0: part?.y ?? -Infinity,
        x1: part ? part.x + part.w : Infinity,
        y1: part ? part.y + part.h : Infinity,
        radius,
        order
      })
  })

  const index = { edges, root: buildNetworkHitTree(entries) }
  retained.set(edges, { index, signatures })
  return index
}

/**
 * Prune by bounds; Canvas remains the final authority. `hit` sees each candidate
 * once with its paint order. Returning a hit prunes earlier paint orders;
 * return null for candidates that still need to compete on distance.
 */
export function queryNetworkEdgeHitIndex<T>(
  index: NetworkEdgeHitIndex,
  x: number,
  y: number,
  tolerance: number,
  hit: (edge: NetworkSceneEdge, order: number) => T | null
): T | null {
  const visited = new Set<number>()
  return queryNetworkHitTree(index.root, x, y, tolerance, (order) => {
    if (visited.has(order)) return null
    visited.add(order)
    return hit(index.edges[order], order)
  })
}
