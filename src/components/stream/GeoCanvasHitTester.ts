import type { GeoAreaSceneNode, GeoSceneNode } from "./geoTypes"
import type { PointSceneNode, LineSceneNode } from "./types"
import type { Quadtree } from "d3-quadtree"

export interface GeoHitResult {
  node: GeoSceneNode
  distance: number
}

/**
 * Hit test geo scene nodes.
 *
 * Strategy:
 * 1. Points first (topmost visual layer) — quadtree if available, else linear scan
 * 2. Geo areas via ctx.isPointInPath(Path2D) — reverse order for top-layer-wins
 * 3. Lines via closest-segment distance
 *
 * The `hitCtx` parameter is a shared offscreen canvas context used for
 * isPointInPath checks without polluting the visible canvas.
 */
export function findNearestGeoNode(
  nodes: GeoSceneNode[],
  mouseX: number,
  mouseY: number,
  maxDistance: number,
  hitCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  pointQuadtree?: Quadtree<PointSceneNode>
): GeoHitResult | null {
  // ── 1. Point nodes ──────────────────────────────────────────────

  const pointNodes = nodes.filter(
    (n): n is PointSceneNode => n.type === "point"
  )

  if (pointQuadtree && pointNodes.length > 0) {
    const candidate = pointQuadtree.find(mouseX, mouseY, maxDistance) ?? null
    if (candidate) {
      const dx = candidate.x - mouseX
      const dy = candidate.y - mouseY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= (candidate.r || 4) + 4) {
        return { node: candidate, distance: dist }
      }
    }
  }

  // Linear scan fallback for points
  let bestPoint: PointSceneNode | null = null
  let bestPointDist = maxDistance

  for (const node of pointNodes) {
    const dx = node.x - mouseX
    const dy = node.y - mouseY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const hitRadius = (node.r || 4) + 4
    if (dist <= hitRadius && dist < bestPointDist) {
      bestPoint = node
      bestPointDist = dist
    }
  }

  if (bestPoint) {
    return { node: bestPoint, distance: bestPointDist }
  }

  // ── 2. Geo area nodes (reverse order = top layer wins) ─────────

  const geoAreas = nodes.filter(
    (n): n is GeoAreaSceneNode => n.type === "geoarea" && n.interactive !== false
  )

  for (let i = geoAreas.length - 1; i >= 0; i--) {
    const node = geoAreas[i]

    // Quick bounds check
    const [[x0, y0], [x1, y1]] = node.bounds
    if (mouseX < x0 || mouseX > x1 || mouseY < y0 || mouseY > y1) continue

    // isPointInPath with Path2D (lazily cached to avoid re-parsing per mouse event)
    if (!node._cachedPath2D) {
      node._cachedPath2D = new Path2D(node.pathData)
    }
    if (hitCtx.isPointInPath(node._cachedPath2D, mouseX, mouseY)) {
      return { node, distance: 0 }
    }
  }

  // ── 3. Line nodes ──────────────────────────────────────────────

  const lineNodes = nodes.filter(
    (n): n is LineSceneNode => n.type === "line"
  )

  let bestLine: LineSceneNode | null = null
  let bestLineDist = maxDistance

  for (const node of lineNodes) {
    const { path } = node
    for (let j = 0; j < path.length - 1; j++) {
      const [ax, ay] = path[j]
      const [bx, by] = path[j + 1]
      const dist = pointToSegmentDistance(mouseX, mouseY, ax, ay, bx, by)
      const hitWidth = Math.max((node.style.strokeWidth || 2) + 4, 5)
      if (dist <= hitWidth && dist < bestLineDist) {
        bestLine = node
        bestLineDist = dist
      }
    }
  }

  if (bestLine) {
    return { node: bestLine, distance: bestLineDist }
  }

  return null
}

/** Distance from point (px, py) to line segment (ax,ay)-(bx,by) */
function pointToSegmentDistance(
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
