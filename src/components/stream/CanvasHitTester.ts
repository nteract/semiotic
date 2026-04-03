import type { SceneNode, PointSceneNode, RectSceneNode, LineSceneNode, AreaSceneNode, HeatcellSceneNode, CandlestickSceneNode, StreamScales } from "./types"
import type { RingBuffer } from "../realtime/RingBuffer"
import type { Quadtree } from "d3-quadtree"
import { hitTestRect as sharedHitTestRect, getHitRadius } from "./hitTestUtils"

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
      const result = hitTestPoint(found, px, py, maxDistance)
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
        result = hitTestPoint(node, px, py, maxDistance)
        break
      case "line":
        result = hitTestLine(node, px, py, maxDistance)
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

/**
 * Interpolate Y at a given X pixel by finding the bracketing segment.
 * Returns null if px is outside the path range or beyond maxXDistance.
 */
function interpolatePathAtX(path: [number, number][], px: number, maxXDistance: number): number | null {
  if (path.length === 0) return null
  const idx = binarySearchPath(path, px)
  if (idx < 0) return null
  if (Math.abs(path[idx][0] - px) > maxXDistance) return null

  // Find the bracketing segment: try idx-1→idx and idx→idx+1
  // Pick the one where px falls between the two x values
  let lo = idx
  let hi = idx
  if (idx > 0 && path[idx][0] >= px) {
    lo = idx - 1
    hi = idx
  } else if (idx < path.length - 1) {
    lo = idx
    hi = idx + 1
  }

  const [x0, y0] = path[lo]
  const [x1, y1] = path[hi]
  if (x1 === x0) return y0

  const t = Math.max(0, Math.min(1, (px - x0) / (x1 - x0)))
  return y0 + t * (y1 - y0)
}

/**
 * Find all line/area nodes at a given X pixel coordinate.
 * For each node, interpolates the Y value at px using the path data.
 * Used for multi-point tooltip (show all series values at the hovered X).
 */
export function findAllNodesAtX(
  scene: SceneNode[],
  px: number,
  maxXDistance: number = 30
): Array<{ node: SceneNode; datum: any; x: number; y: number; group?: string; color?: string }> {
  const results: Array<{ node: SceneNode; datum: any; x: number; y: number; group?: string; color?: string }> = []

  for (const node of scene) {
    if (node.type === "line") {
      const lineNode = node as LineSceneNode
      if (lineNode.path.length < 2) continue
      const interpY = interpolatePathAtX(lineNode.path, px, maxXDistance)
      if (interpY === null) continue
      const idx = binarySearchPath(lineNode.path, px)
      const datum = Array.isArray(lineNode.datum) && lineNode.datum[idx] ? lineNode.datum[idx] : lineNode.datum
      results.push({ node, datum, x: lineNode.path[idx][0], y: interpY, group: lineNode.group, color: lineNode.style.stroke })
    } else if (node.type === "area") {
      const areaNode = node as AreaSceneNode
      if (areaNode.interactive === false) continue
      if (areaNode.topPath.length < 2) continue
      const interpY = interpolatePathAtX(areaNode.topPath, px, maxXDistance)
      if (interpY === null) continue
      const idx = binarySearchPath(areaNode.topPath, px)
      const datum = Array.isArray(areaNode.datum) && areaNode.datum[idx] ? areaNode.datum[idx] : areaNode.datum
      const areaColor = typeof areaNode.style.stroke === "string" ? areaNode.style.stroke : typeof areaNode.style.fill === "string" ? areaNode.style.fill : undefined
      results.push({ node, datum, x: areaNode.topPath[idx][0], y: interpY, group: areaNode.group, color: areaColor })
    }
  }

  return results
}

function hitTestPoint(node: PointSceneNode, px: number, py: number, maxDistance: number = 30): HitResult | null {
  const dx = px - node.x
  const dy = py - node.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const hitR = getHitRadius(node.r, maxDistance)
  if (dist > hitR) return null
  return { node, datum: node.datum, x: node.x, y: node.y, distance: dist }
}

function hitTestLine(node: LineSceneNode, px: number, py: number, maxDistance: number = 30): HitResult | null {
  if (node.path.length === 0) return null

  // Binary search for nearest x in the path
  const idx = binarySearchPath(node.path, px)
  if (idx < 0) return null

  const [nx, ny] = node.path[idx]

  // Also check perpendicular distance to the segment around the nearest point
  // for more accurate hit testing on non-horizontal lines
  let dist: number
  if (node.path.length > 1) {
    // Check segments adjacent to the found index
    let minSegDist = Infinity
    const startSeg = Math.max(0, idx - 1)
    const endSeg = Math.min(node.path.length - 2, idx)
    for (let i = startSeg; i <= endSeg; i++) {
      const [ax, ay] = node.path[i]
      const [bx, by] = node.path[i + 1]
      const segDist = pointToSegmentDist(px, py, ax, ay, bx, by)
      if (segDist < minSegDist) minSegDist = segDist
    }
    dist = minSegDist
  } else {
    const ddx = px - nx
    const ddy = py - ny
    dist = Math.sqrt(ddx * ddx + ddy * ddy)
  }

  // Use the larger of stroke-based tolerance and caller's maxDistance
  const strokeWidth = (node.style as any)?.strokeWidth ?? (node.style as any)?.lineWidth ?? 1
  const tolerance = Math.max(5, strokeWidth / 2 + 2, maxDistance)
  if (dist > tolerance) return null

  // For line data, the datum is the array; return the index as well
  const datum = Array.isArray(node.datum) && node.datum[idx]
    ? node.datum[idx]
    : node.datum

  return { node, datum, x: nx, y: ny, distance: dist }
}

/** Distance from point (px, py) to line segment (ax,ay)-(bx,by) */
function pointToSegmentDist(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): number {
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2)
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const projX = ax + t * dx
  const projY = ay + t * dy
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2)
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

  // Extract the specific data point at the hit index (like hitTestLine does)
  const datum = Array.isArray(node.datum) && node.datum[idx]
    ? node.datum[idx]
    : node.datum

  return { node: node as SceneNode, datum, x: nx, y: ny, distance: dist }
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
