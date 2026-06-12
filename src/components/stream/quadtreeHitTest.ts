import type { Quadtree, QuadtreeLeaf } from "d3-quadtree"
import { getHitRadius } from "./hitTestUtils"

export interface QuadtreeHit<T> {
  node: T
  distance: number
}

/**
 * Find the closest point whose own hit radius contains the cursor.
 *
 * Uses `quadtree.visit()` to enumerate every candidate within the widened
 * search radius (maxDistance extended by the largest point radius in the
 * scene). `quadtree.find()` alone is insufficient because it returns the
 * nearest candidate by center-to-center distance — a farther point with a
 * much larger visual radius can still be a valid hit that `find()` would
 * hide.
 *
 * By default `T` must expose `x`, `y`, and `r` (the standard `PointSceneNode`
 * shape). Pass `getX`/`getY`/`getR` accessors to index nodes that store their
 * center under different field names — e.g. network circle nodes use `cx`/`cy`.
 * The quadtree itself must be built with matching `.x()`/`.y()` accessors.
 */
export function findHitPointInQuadtree<T>(
  qt: Quadtree<T>,
  px: number,
  py: number,
  maxDistance: number,
  maxPointRadius: number,
  getX: (n: T) => number = (n) => (n as { x: number }).x,
  getY: (n: T) => number = (n) => (n as { y: number }).y,
  getR: (n: T) => number = (n) => (n as { r: number }).r
): QuadtreeHit<T> | null {
  const searchRadius = Math.max(maxDistance, maxPointRadius + 5, 12)
  const xMin = px - searchRadius
  const xMax = px + searchRadius
  const yMin = py - searchRadius
  const yMax = py + searchRadius

  let best: T | null = null
  let bestDist = Infinity

  qt.visit((rawNode, x0, y0, x1, y1) => {
    // Prune subtrees whose bounding box is outside the search region.
    if (x0 > xMax || x1 < xMin || y0 > yMax || y1 < yMin) return true

    // Leaf nodes in d3-quadtree are objects with `.data` and optional `.next`
    // (linked list for co-located points); internal nodes are array-like with
    // `.length === 4`. The absence of a numeric `length` distinguishes leaves.
    const node = rawNode
    if (!node.length) {
      let leaf: QuadtreeLeaf<T> | undefined = node
      do {
        const point = leaf.data
        const dx = getX(point) - px
        const dy = getY(point) - py
        const dist = Math.sqrt(dx * dx + dy * dy)
        const hitR = getHitRadius(getR(point), maxDistance)
        if (dist <= hitR && dist < bestDist) {
          best = point
          bestDist = dist
        }
        leaf = leaf.next
      } while (leaf)
    }
    return false
  })

  return best ? { node: best, distance: bestDist } : null
}
