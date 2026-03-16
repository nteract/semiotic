import type { SceneNode, PointSceneNode, RectSceneNode, LineSceneNode, AreaSceneNode, HeatcellSceneNode, CandlestickSceneNode, StreamScales } from "./types"
import type { RingBuffer } from "../realtime/RingBuffer"
import type { Quadtree } from "d3-quadtree"
import { hitTestRect as sharedHitTestRect } from "./hitTestUtils"

export interface HitResult {
  node: SceneNode
  datum: any
  x: number
  y: number
  distance: number
}

/**
 * Find the nearest scene node to the given pixel coordinates.
 * Dispatches to type-specific hit testers for optimal performance.
 *
 * When a quadtree spatial index is provided (for scatter/bubble charts with
 * many points), point hit testing uses O(log n) quadtree.find() instead of
 * iterating all nodes. Non-point node types (line, rect, area, etc.) still
 * use the linear scan.
 */
export function findNearestNode(
  scene: SceneNode[],
  px: number,
  py: number,
  maxDistance: number = 30,
  pointQuadtree?: Quadtree<PointSceneNode> | null
): HitResult | null {
  let best: HitResult | null = null
  let quadtreeHitConfirmed = false

  // Fast path: use quadtree for point nodes when available
  if (pointQuadtree) {
    // Use maxDistance as the quadtree search radius.
    // Callers should set maxDistance to account for point radius + hit tolerance.
    const found = pointQuadtree.find(px, py, maxDistance)
    if (found) {
      const result = hitTestPoint(found, px, py)
      if (result && result.distance < maxDistance) {
        best = result
        quadtreeHitConfirmed = true
      }
    }
  }

  for (const node of scene) {
    let result: HitResult | null = null

    switch (node.type) {
      case "point":
        // Skip linear point scan only when quadtree confirmed a hit
        if (pointQuadtree && quadtreeHitConfirmed) break
        result = hitTestPoint(node, px, py)
        break
      case "line":
        result = hitTestLine(node, px, py)
        break
      case "rect":
        result = hitTestRect(node, px, py)
        break
      case "heatcell":
        result = hitTestHeatcell(node, px, py)
        break
      case "area":
        // Skip non-interactive areas (e.g. decorative bounds bands)
        if (node.interactive === false) break
        // Areas are hit-tested by finding nearest x on the top path
        result = hitTestAreaPath(node, px, py)
        break
      case "candlestick":
        result = hitTestCandlestick(node, px, py)
        break
    }

    if (result && result.distance < maxDistance) {
      if (!best || result.distance < best.distance) {
        best = result
      }
    }
  }

  return best
}

function hitTestPoint(node: PointSceneNode, px: number, py: number): HitResult | null {
  const dx = px - node.x
  const dy = py - node.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  // Hit radius includes the point's visual radius plus a tolerance
  if (dist > node.r + 5) return null
  return { node, datum: node.datum, x: node.x, y: node.y, distance: dist }
}

function hitTestLine(node: LineSceneNode, px: number, py: number): HitResult | null {
  if (node.path.length === 0) return null

  // Binary search for nearest x in the path
  const idx = binarySearchPath(node.path, px)
  if (idx < 0) return null

  const [nx, ny] = node.path[idx]
  const dx = px - nx
  const dy = py - ny
  const dist = Math.sqrt(dx * dx + dy * dy)

  // For line data, the datum is the array; return the index as well
  const datum = Array.isArray(node.datum) && node.datum[idx]
    ? node.datum[idx]
    : node.datum

  return { node, datum, x: nx, y: ny, distance: dist }
}

function hitTestRect(node: RectSceneNode, px: number, py: number): HitResult | null {
  const r = sharedHitTestRect(px, py, node)
  if (r.hit) {
    return { node, datum: node.datum, x: r.cx, y: r.cy, distance: 0 }
  }
  return null
}

function hitTestHeatcell(node: HeatcellSceneNode, px: number, py: number): HitResult | null {
  const r = sharedHitTestRect(px, py, node)
  if (r.hit) {
    return { node, datum: node.datum, x: r.cx, y: r.cy, distance: 0 }
  }
  return null
}

function hitTestCandlestick(node: CandlestickSceneNode, px: number, py: number): HitResult | null {
  const halfBody = node.bodyWidth / 2
  // Hit the body area (wider target)
  const bodyTop = Math.min(node.openY, node.closeY)
  const bodyBottom = Math.max(node.openY, node.closeY)
  const bodyHeight = Math.max(bodyBottom - bodyTop, 1)

  if (px >= node.x - halfBody - 3 && px <= node.x + halfBody + 3 &&
      py >= node.highY - 3 && py <= node.lowY + 3) {
    // Hover target: center of the body
    const cy = bodyTop + bodyHeight / 2
    const dx = px - node.x
    const dy = py - cy
    return { node, datum: node.datum, x: node.x, y: cy, distance: Math.sqrt(dx * dx + dy * dy) }
  }
  return null
}

function hitTestAreaPath(node: { type: "area"; topPath: [number, number][]; datum: any }, px: number, py: number): HitResult | null {
  if (node.topPath.length === 0) return null
  const idx = binarySearchPath(node.topPath, px)
  if (idx < 0) return null

  const [nx, ny] = node.topPath[idx]
  const dx = px - nx
  const dy = py - ny
  const dist = Math.sqrt(dx * dx + dy * dy)

  return { node: node as SceneNode, datum: node.datum, x: nx, y: ny, distance: dist }
}

/**
 * Binary search for the nearest point by x-coordinate in a sorted path.
 */
function binarySearchPath(path: [number, number][], targetX: number): number {
  if (path.length === 0) return -1

  let lo = 0
  let hi = path.length - 1

  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (path[mid][0] < targetX) lo = mid + 1
    else hi = mid
  }

  // Check if lo-1 is closer
  if (lo > 0) {
    const dLo = Math.abs(path[lo][0] - targetX)
    const dPrev = Math.abs(path[lo - 1][0] - targetX)
    if (dPrev <= dLo) return lo - 1
  }

  return lo
}

/**
 * Binary search for nearest point by time value in a RingBuffer.
 */
export function findNearestIndex(
  buf: RingBuffer<Record<string, any>>,
  targetTime: number,
  getTime: (d: Record<string, any>) => number
): number {
  if (buf.size === 0) return -1

  let lo = 0
  let hi = buf.size - 1

  while (lo < hi) {
    const mid = (lo + hi) >> 1
    const t = getTime(buf.get(mid)!)
    if (t < targetTime) lo = mid + 1
    else hi = mid
  }

  if (lo > 0) {
    const tLo = getTime(buf.get(lo)!)
    const tPrev = getTime(buf.get(lo - 1)!)
    if (Math.abs(tPrev - targetTime) <= Math.abs(tLo - targetTime)) {
      return lo - 1
    }
  }

  return lo
}
