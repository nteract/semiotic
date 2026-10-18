import { svgPathBounds, type PathBox } from "../geometry/svgPathBounds"
import type { NetworkSceneEdge } from "./networkTypes"

// Per-record ownership avoids retaining discarded layouts, sharing mutable
// style state, or adding enumerable cache fields to consumer scene records.
const bounds = new WeakMap<object, { source: string; box: PathBox | null }>()

export function getNetworkEdgeBounds(edge: { pathD: string }): PathBox | null {
  let cached = bounds.get(edge)
  if (!cached || cached.source !== edge.pathD) {
    cached = { source: edge.pathD, box: svgPathBounds(edge.pathD) }
    bounds.set(edge, cached)
  }
  return cached.box
}

/** Prepare retained custom-layout paths at scene commit, before first hover. */
export function prepareNetworkEdgeHitBounds(edges: NetworkSceneEdge[]): void {
  for (const edge of edges) {
    if (
      edge.type !== "line" &&
      edge.datum != null &&
      edge.interactive !== false
    )
      getNetworkEdgeBounds(edge)
  }
}

/** Reject distant pointers before constructing/testing an exact Canvas path. */
export function outsideNetworkEdgeBounds(
  edge: { pathD: string },
  x: number,
  y: number,
  padding: number
): boolean {
  const box = getNetworkEdgeBounds(edge)
  // Unsupported/malformed paths must still reach Canvas: a browser may accept
  // a prefix that our complete-path parser conservatively declines to bound.
  if (!box) return false
  return (
    x < box.x - padding ||
    x > box.x + box.w + padding ||
    y < box.y - padding ||
    y > box.y + box.h + padding
  )
}
