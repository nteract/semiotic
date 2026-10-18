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

interface Branch {
  x0: number
  y0: number
  x1: number
  y1: number
  radius: number
  order: number
  children?: Branch[]
}

function edgeRadius(edge: NetworkSceneEdge): number {
  const width = edge.style.strokeWidth ?? 1
  return Number.isFinite(width) ? Math.max(0, width / 2) : Infinity
}

/** Geometry/style snapshot owned by a committed custom scene, never raw callers. */
export interface NetworkEdgeHitIndex {
  edges: NetworkSceneEdge[]
  root: Branch
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
      const refreshRadius = (node: Branch): number => {
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
  const entries: Branch[] = []
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
  const build = (items: Branch[]): Branch => {
    if (items.length === 1) return items[0]
    const node: Branch = {
      x0: Infinity,
      y0: Infinity,
      x1: -Infinity,
      y1: -Infinity,
      radius: 0,
      order: -1
    }
    for (const item of items) {
      node.x0 = Math.min(node.x0, item.x0)
      node.y0 = Math.min(node.y0, item.y0)
      node.x1 = Math.max(node.x1, item.x1)
      node.y1 = Math.max(node.y1, item.y1)
      node.radius = Math.max(node.radius, item.radius)
      node.order = Math.max(node.order, item.order)
    }
    if (items.length <= 8)
      node.children = items.sort((a, b) => b.order - a.order)
    else {
      const horizontal = node.x1 - node.x0 >= node.y1 - node.y0
      items.sort((a, b) =>
        horizontal ? a.x0 + a.x1 - (b.x0 + b.x1) : a.y0 + a.y1 - (b.y0 + b.y1)
      )
      const middle = items.length >> 1
      node.children = [
        build(items.slice(0, middle)),
        build(items.slice(middle))
      ].sort((a, b) => b.order - a.order)
    }
    return node
  }
  const index = { edges, root: build(entries) }
  retained.set(edges, { index, signatures })
  return index
}

/** Prune by bounds and paint order; Canvas remains the final authority. */
export function queryNetworkEdgeHitIndex<T>(
  index: NetworkEdgeHitIndex,
  x: number,
  y: number,
  tolerance: number,
  hit: (edge: NetworkSceneEdge) => T | null
): T | null {
  let result: T | null = null,
    order = -1
  const visit = (node: Branch) => {
    if (node.order <= order) return
    const padding = Math.max(tolerance, node.radius) * 10 + 1e-7
    if (
      x < node.x0 - padding ||
      x > node.x1 + padding ||
      y < node.y0 - padding ||
      y > node.y1 + padding
    )
      return
    if (node.children) node.children.forEach(visit)
    else {
      const candidate = hit(index.edges[node.order])
      if (candidate) {
        result = candidate
        order = node.order
      }
    }
  }
  visit(index.root)
  return result
}
