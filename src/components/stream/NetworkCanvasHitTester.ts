import type {
  NetworkSceneNode,
  NetworkSceneEdge,
  NetworkCircleNode,
  NetworkRectNode,
  NetworkArcNode
} from "./networkTypes"
import { hitTestRect as sharedHitTestRect, normalizeAngle, getHitRadius } from "./hitTestUtils"
import { symbolRadius } from "./symbolPath"
import { glyphHitGeometry } from "./glyphDef"
import { findHitPointInQuadtree } from "./quadtreeHitTest"
import type { Quadtree } from "d3-quadtree"
import type { SceneDatum } from "./types"

export interface NetworkHitResult {
  /** Scene node/edge that supplied this hit (used for presentation metadata). */
  mark?: NetworkSceneNode | NetworkSceneEdge
  type: "node" | "edge"
  datum: SceneDatum
  x: number
  y: number
  distance: number
}

/** A coincident hierarchy leaf must remain reachable over its enclosing parent. */
function preferDeeperNode(
  candidate: NetworkCircleNode | NetworkRectNode,
  current?: NetworkSceneNode | NetworkSceneEdge
): boolean {
  return (candidate.depth ?? -1) > (
    (current as { depth?: number } | undefined)?.depth ?? -1
  )
}

/** A containing child owns its visible interior; peers use nearest-center hits. */
function preferCircleHit(
  candidate: NetworkCircleNode,
  current: NetworkCircleNode,
  distance: number,
  currentDistance: number
): boolean {
  const inside = distance <= candidate.r
  const currentInside = currentDistance <= current.r
  if (inside !== currentInside) return inside
  if (inside && currentInside) {
    const radiusDifference = current.r - candidate.r
    if (radiusDifference && Math.hypot(candidate.cx - current.cx, candidate.cy - current.cy) <= Math.abs(radiusDifference) + 1e-6) {
      return radiusDifference > 0
    }
  }
  return distance < currentDistance || (
    distance === currentDistance && preferDeeperNode(candidate, current)
  )
}

// Flat canvas scenes paint each mark family in this order.
const NODE_PAINT_LAYER = { rect: 0, circle: 1, arc: 2, symbol: 3, glyph: 4 }

/**
 * Hit test against network scene nodes and edges.
 *
 * Checks nodes first (they're on top), then edges.
 */
export function findNearestNetworkNode(
  sceneNodes: NetworkSceneNode[],
  sceneEdges: NetworkSceneEdge[],
  px: number,
  py: number,
  maxDistance = 12,
  nodeQuadtree?: Quadtree<NetworkCircleNode> | null,
  maxNodeRadius = 0,
  includeEdges = true,
  viewScale = 1
): NetworkHitResult | null {
  // Nested treemap cells and packed circles prefer the containing child.
  let bestNode: NetworkHitResult | null = null
  // Exact paths belong to a display list: all marks in that list compete in
  // paint order, including ordinary rects/circles painted over a path. Scenes
  // without paths retain nearest-circle and smallest-treemap-cell semantics.
  const paintOrder = sceneNodes.some((node) => node.type === "rect" && node._hitPath)
  if (paintOrder) nodeQuadtree = null

  // Fast path: when a circle-node quadtree is available (large force/orbit
  // graphs) query it instead of scanning every circle. It returns the nearest
  // circle using the same containment and nearest-center rules as the linear
  // scan, so the merge with rect/arc/edge results is unchanged, and
  // the scan below then skips circle nodes (the quadtree visit is authoritative).
  if (nodeQuadtree) {
    const hit = findHitPointInQuadtree(
      nodeQuadtree, px, py, maxDistance, maxNodeRadius,
      (n) => n.cx, (n) => n.cy, (n) => n.r,
      preferCircleHit
    )
    if (hit) {
      bestNode = hitResult("node", hit.node, hit.node.cx, hit.node.cy, hit.distance)
    }
  }

  for (const node of sceneNodes) {
    // Circles are handled by the quadtree fast path above.
    if (nodeQuadtree && node.type === "circle") continue
    const result = hitTestNode(node, px, py, maxDistance)
    if (!result) continue

    if (!bestNode || paintOrder) {
      bestNode = result
      continue
    }
    const current = bestNode.mark as NetworkSceneNode
    const preferred = node.type !== current.type
      ? NODE_PAINT_LAYER[node.type] > NODE_PAINT_LAYER[current.type]
      : node.type === "rect"
        ? preferRectHit(node, current as NetworkRectNode)
        : node.type === "circle"
          ? preferCircleHit(node, current as NetworkCircleNode, result.distance, bestNode.distance)
          : result.distance < bestNode.distance
    if (preferred) bestNode = result
  }

  if (bestNode) return bestNode
  if (!includeEdges) return null

  // Edges paint in array order; the last-painted semantic edge owns overlap.
  // Decorative geometry must never produce an empty tooltip or observation.
  for (let index = sceneEdges.length - 1; index >= 0; index--) {
    const edge = sceneEdges[index]
    if (edge.datum == null || edge.interactive === false) continue
    const result = hitTestEdge(edge, px, py, 5 / viewScale)
    if (result) {
      return result
    }
  }

  return null
}

function preferRectHit(candidate: NetworkRectNode, current: NetworkRectNode): boolean {
  const area = candidate.w * candidate.h
  const currentArea = current.w * current.h
  return area < currentArea || (area === currentArea && preferDeeperNode(candidate, current))
}

function hitResult(
  type: "node" | "edge",
  mark: NetworkSceneNode | NetworkSceneEdge,
  x: number,
  y: number,
  distance = 0
): NetworkHitResult {
  return { type, mark, datum: mark.datum, x, y, distance }
}

// ── Node hit testing ────────────────────────────────────────────────────

function hitTestNode(
  node: NetworkSceneNode,
  px: number,
  py: number,
  maxDistance: number
): NetworkHitResult | null {
  if (!node.datum) return null
  switch (node.type) {
    case "circle":
      // Projected ground ellipses hit exactly; perspective tokens retain
      // the same radius tolerance as ordinary point marks.
      if (node.pathD && !node._perspectiveToken) {
        return hitTestOutline(node as NetworkCircleNode & { pathD: string }, px, py, node.cx, node.cy)
      }
      return hitTestPoint(node, px, py, node.cx, node.cy, node.r, maxDistance)
    case "rect": {
      const hit = hitTestRect(node, px, py)
      if (!hit || !node._hitPath) return hit
      const region = node._hitPath
      const [tx, ty, sx, sy] = region.transform
      const path = getEdgePath2D(region), ctx = getHitContext()
      if (!path || !ctx || sx === 0 || sy === 0) return null
      const x = (px - tx) / sx, y = (py - ty) / sy
      if (region.fill && ctx.isPointInPath(path, x, y)) return hit
      if (region.strokeWidth > 0) {
        const previousWidth = ctx.lineWidth
        ctx.lineWidth = region.strokeWidth
        const inStroke = ctx.isPointInStroke(path, x, y)
        ctx.lineWidth = previousWidth
        if (inStroke) return hit
      }
      return null
    }
    case "arc":
      return hitTestArc(node, px, py)
    case "symbol":
      return hitTestPoint(node, px, py, node.cx, node.cy, symbolRadius(node.size), maxDistance)
    case "glyph": {
      // The anchor can offset a composite glyph's visual center.
      const geometry = glyphHitGeometry(node.glyph, node.size)
      return hitTestPoint(node, px, py, node.cx + geometry.centerDx, node.cy + geometry.centerDy, geometry.radius, maxDistance)
    }
    default:
      return null
  }
}

/** Shared circular tolerance for circles, symbols, and composite glyphs. */
function hitTestPoint(
  node: NetworkSceneNode,
  px: number,
  py: number,
  cx: number,
  cy: number,
  radius: number,
  maxDistance: number
): NetworkHitResult | null {
  const dx = px - cx
  const dy = py - cy
  const dist = Math.sqrt(dx * dx + dy * dy)
  const tolerance = getHitRadius(radius, maxDistance)
  if (dist <= tolerance) {
    return hitResult("node", node, cx, cy, dist)
  }
  return null
}

/** Exact fill test for a projected (perspective) outline. */
function hitTestOutline(
  node: (NetworkCircleNode | NetworkArcNode) & { pathD: string },
  px: number,
  py: number,
  x: number,
  y: number
): NetworkHitResult | null {
  const path = getEdgePath2D(node)
  const ctx = getHitContext()
  if (!path || !ctx || !ctx.isPointInPath(path, px, py)) return null
  return hitResult("node", node, x, y)
}

function hitTestRect(
  node: NetworkRectNode,
  px: number,
  py: number
): NetworkHitResult | null {
  const r = sharedHitTestRect(px, py, node)
  if (r.hit) {
    return hitResult("node", node, r.cx, r.cy)
  }
  return null
}

function hitTestArc(
  node: NetworkArcNode,
  px: number,
  py: number
): NetworkHitResult | null {
  if (node.pathD) return hitTestOutline(node as NetworkArcNode & { pathD: string }, px, py, px, py)
  // Convert to polar coordinates relative to arc center
  const dx = px - node.cx
  const dy = py - node.cy
  const radius = Math.sqrt(dx * dx + dy * dy)

  // Check radius bounds
  if (radius < node.innerR - 2 || radius > node.outerR + 2) return null

  // Check angle bounds
  const angle = normalizeAngle(Math.atan2(dy, dx))

  const start = normalizeAngle(node.startAngle)
  const end = normalizeAngle(node.endAngle)

  const inArc = start <= end
    ? angle >= start && angle <= end
    : angle >= start || angle <= end

  if (inArc) {
    const midAngle = (node.startAngle + node.endAngle) / 2
    const midR = (node.innerR + node.outerR) / 2
    return hitResult("node", node, node.cx + midR * Math.cos(midAngle), node.cy + midR * Math.sin(midAngle))
  }

  return null
}

// ── Shared offscreen canvas for isPointInPath checks ────────────────────

let _hitCtx: CanvasRenderingContext2D | null = null

function getHitContext(): CanvasRenderingContext2D | null {
  if (!_hitCtx) {
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 1
    _hitCtx = canvas.getContext("2d")
  }
  return _hitCtx
}

/**
 * Lazily build (and cache) a Path2D for an edge. Re-parses only when `pathD`
 * actually changes — Path2D parsing is the dominant cost in network hit
 * testing for large sankey/chord scenes.
 */
function getEdgePath2D(
  edge: { pathD: string; _cachedPath2D?: Path2D; _cachedPath2DSource?: string }
): Path2D | null {
  if (edge._cachedPath2D && edge._cachedPath2DSource === edge.pathD) {
    return edge._cachedPath2D
  }
  try {
    edge._cachedPath2D = new Path2D(edge.pathD)
    edge._cachedPath2DSource = edge.pathD
    return edge._cachedPath2D
  } catch {
    return null
  }
}

// ── Edge hit testing ────────────────────────────────────────────────────

function hitTestEdge(
  edge: NetworkSceneEdge,
  px: number,
  py: number,
  tolerance: number
): NetworkHitResult | null {
  switch (edge.type) {
    case "bezier":
    case "ribbon":
    case "curved":
      return hitTestPathEdge(edge, px, py, tolerance)
    case "line":
      return hitTestLineEdge(edge, px, py, tolerance)
    default:
      return null
  }
}

function hitTestLineEdge(
  edge: Extract<NetworkSceneEdge, { type: "line" }>,
  px: number,
  py: number,
  tolerance: number
): NetworkHitResult | null {
  if (edge.style.stroke === "none" || (edge.style.strokeWidth ?? 1) <= 0) return null
  tolerance = Math.max(tolerance, (edge.style.strokeWidth ?? 1) / 2)
  // Point-to-line-segment distance
  const dx = edge.x2 - edge.x1
  const dy = edge.y2 - edge.y1
  const len2 = dx * dx + dy * dy

  if (len2 === 0) return null

  let t = ((px - edge.x1) * dx + (py - edge.y1) * dy) / len2
  t = Math.max(0, Math.min(1, t))

  const nearX = edge.x1 + t * dx
  const nearY = edge.y1 + t * dy
  const dist = Math.sqrt((px - nearX) ** 2 + (py - nearY) ** 2)

  if (dist <= tolerance) {
    return hitResult("edge", edge, nearX, nearY, dist)
  }

  return null
}

function hitTestPathEdge(
  edge: Exclude<NetworkSceneEdge, { type: "line" }>,
  px: number,
  py: number,
  tolerance: number
): NetworkHitResult | null {
  // Use pointer coordinates for every path edge; custom layout data need not
  // contain Sankey-specific endpoint coordinates for tooltip placement.
  if (!edge.pathD) return null

  const path = getEdgePath2D(edge)
  const ctx = getHitContext()
  if (!path || !ctx) return null

  try {
    // Canvas implicitly closes open paths for fill tests. Only filled bands
    // own that interior; an unfilled curved link owns its stroke alone.
    // Opacity is intentionally ignored so transparent semantic targets work.
    if (edge.style.fill && edge.style.fill !== "none" && ctx.isPointInPath(path, px, py)) {
      return hitResult("edge", edge, px, py)
    }

    if (edge.style.stroke === "none" || (edge.style.strokeWidth ?? 1) <= 0) return null
    // Retain pointer slop for thin edges and include the full painted stroke.
    const prevLineWidth = ctx.lineWidth
    let inStroke: boolean
    try {
      ctx.lineWidth = Math.max(tolerance * 2, edge.style.strokeWidth ?? 1)
      inStroke = ctx.isPointInStroke(path, px, py)
    } finally {
      ctx.lineWidth = prevLineWidth
    }
    if (inStroke) {
      return hitResult("edge", edge, px, py, 4)
    }
  } catch {
    // Fallback — no hit
  }

  return null
}
