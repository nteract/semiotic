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
 * `T` must expose `x`, `y`, and `r` — the standard `PointSceneNode` shape.
 */
export function findHitPointInQuadtree<T extends { x: number; y: number; r: number }>(
  qt: Quadtree<T>,
  px: number,
  py: number,
  maxDistance: number,
  maxPointRadius: number
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
        const dx = point.x - px
        const dy = point.y - py
        const dist = Math.sqrt(dx * dx + dy * dy)
        const hitR = getHitRadius(point.r, maxDistance)
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
