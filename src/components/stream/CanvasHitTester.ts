import type { SceneNode, PointSceneNode, RectSceneNode, LineSceneNode, HeatcellSceneNode, StreamScales } from "./types"
import type { RingBuffer } from "../realtime/RingBuffer"

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
 */
export function findNearestNode(
  scene: SceneNode[],
  px: number,
  py: number,
  maxDistance: number = 30
): HitResult | null {
  let best: HitResult | null = null

  for (const node of scene) {
    let result: HitResult | null = null

    switch (node.type) {
      case "point":
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
        // Areas are hit-tested by finding nearest x on the top path
        result = hitTestAreaPath(node, px, py)
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
  if (px >= node.x && px <= node.x + node.w && py >= node.y && py <= node.y + node.h) {
    // Center of rect
    const cx = node.x + node.w / 2
    const cy = node.y + node.h / 2
    return { node, datum: node.datum, x: cx, y: cy, distance: 0 }
  }
  return null
}

function hitTestHeatcell(node: HeatcellSceneNode, px: number, py: number): HitResult | null {
  if (px >= node.x && px <= node.x + node.w && py >= node.y && py <= node.y + node.h) {
    const cx = node.x + node.w / 2
    const cy = node.y + node.h / 2
    return { node, datum: node.datum, x: cx, y: cy, distance: 0 }
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
 * Port from RealtimeFrame.tsx:225-252.
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
