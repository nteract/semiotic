import type { GeoAreaSceneNode, GeoLineSceneNode, GeoSceneNode } from "./geoTypes"
import type { PointSceneNode, GlyphSceneNode } from "./types"
import type { Quadtree } from "d3-quadtree"
import { getHitRadius } from "./hitTestUtils"
import { findHitPointInQuadtree } from "./quadtreeHitTest"
import { glyphHitGeometry } from "./glyphDef"

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
  pointQuadtree?: Quadtree<PointSceneNode> | null,
  maxPointRadius = 0,
  lineMaxDistance = maxDistance
): GeoHitResult | null {
  // ── 1. Point nodes ──────────────────────────────────────────────

  if (pointQuadtree) {
    // Visit every candidate within the widened search radius so variable-size
    // points don't miss hits (quadtree.find's nearest-only behavior would
    // shadow a farther, larger point that still contains the cursor).
    const hit = findHitPointInQuadtree(pointQuadtree, mouseX, mouseY, maxDistance, maxPointRadius)
    if (hit) return hit
  } else {
    // Linear scan when no spatial index is available
    let bestPoint: PointSceneNode | null = null
    let bestPointDist = maxDistance

    for (const node of nodes) {
      if (node.type !== "point") continue
      const dx = node.x - mouseX
      const dy = node.y - mouseY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const hitRadius = getHitRadius(node.r, maxDistance)
      if (dist <= hitRadius && dist < bestPointDist) {
        bestPoint = node
        bestPointDist = dist
      }
    }

    if (bestPoint) {
      return { node: bestPoint, distance: bestPointDist }
    }
  }

  // ── 1b. Glyph nodes (projected pictograms — above areas, like points) ──

  let bestGlyph: GlyphSceneNode | null = null
  let bestGlyphDist = maxDistance

  for (const node of nodes) {
    if (node.type !== "glyph") continue
    if (node.datum == null) continue
    const geometry = glyphHitGeometry(node.glyph, node.size)
    const dx = node.x + geometry.centerDx - mouseX
    const dy = node.y + geometry.centerDy - mouseY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const hitRadius = getHitRadius(geometry.radius, maxDistance)
    if (dist <= hitRadius && dist < bestGlyphDist) {
      bestGlyph = node
      bestGlyphDist = dist
    }
  }

  if (bestGlyph) {
    return { node: bestGlyph, distance: bestGlyphDist }
  }

  // ── 2. Geo area nodes (reverse order = top layer wins) ─────────

  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i]
    if (node.type !== "geoarea") continue
    const area = node as GeoAreaSceneNode
    if (area.interactive === false) continue

    // Quick bounds check
    const [[x0, y0], [x1, y1]] = area.bounds
    if (mouseX < x0 || mouseX > x1 || mouseY < y0 || mouseY > y1) continue

    // isPointInPath with Path2D (lazily cached to avoid re-parsing per mouse event)
    if (!area._cachedPath2D) {
      area._cachedPath2D = new Path2D(area.pathData)
    }
    if (hitCtx.isPointInPath(area._cachedPath2D, mouseX, mouseY)) {
      return { node: area, distance: 0 }
    }
  }

  // ── 3. Line nodes ──────────────────────────────────────────────

  let bestLine: GeoLineSceneNode | null = null
  let bestLineDist = lineMaxDistance

  for (const node of nodes) {
    if (node.type !== "line") continue
    const line = node as GeoLineSceneNode
    const { path } = line
    const hitWidth = Math.max((line.style.strokeWidth || 2) + 4, 5, lineMaxDistance)
    for (let j = 0; j < path.length - 1; j++) {
      const [ax, ay] = path[j]
      const [bx, by] = path[j + 1]
      const dist = pointToSegmentDistance(mouseX, mouseY, ax, ay, bx, by)
      if (dist <= hitWidth && dist < bestLineDist) {
        bestLine = line
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
