import type {
  NetworkSceneNode,
  NetworkSceneEdge,
  NetworkCircleNode,
  NetworkRectNode,
  NetworkArcNode,
  NetworkBezierEdge
} from "./networkTypes"
import { hitTestRect as sharedHitTestRect, normalizeAngle } from "./hitTestUtils"

export interface NetworkHitResult {
  type: "node" | "edge"
  datum: any
  x: number
  y: number
  distance: number
}

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
  maxDistance = 30
): NetworkHitResult | null {
  // Check nodes — for nested rects (treemap) we want the smallest
  // containing rect, so we track rect hits by area separately.
  let bestNode: NetworkHitResult | null = null
  let bestDist = maxDistance
  let bestRectArea = Infinity

  for (const node of sceneNodes) {
    const result = hitTestNode(node, px, py)
    if (!result) continue

    if (node.type === "rect") {
      // For rects: prefer the smallest area (deepest cell)
      const area = (node as NetworkRectNode).w * (node as NetworkRectNode).h
      if (area < bestRectArea) {
        bestNode = result
        bestRectArea = area
      }
    } else if (result.distance < bestDist) {
      bestNode = result
      bestDist = result.distance
    }
  }

  if (bestNode) return bestNode

  // Check edges if no node hit
  for (const edge of sceneEdges) {
    const result = hitTestEdge(edge, px, py)
    if (result && result.distance < bestDist) {
      bestNode = result
      bestDist = result.distance
    }
  }

  return bestNode
}

// ── Node hit testing ────────────────────────────────────────────────────

function hitTestNode(
  node: NetworkSceneNode,
  px: number,
  py: number
): NetworkHitResult | null {
  switch (node.type) {
    case "circle":
      return hitTestCircle(node, px, py)
    case "rect":
      return hitTestRect(node, px, py)
    case "arc":
      return hitTestArc(node, px, py)
    default:
      return null
  }
}

function hitTestCircle(
  node: NetworkCircleNode,
  px: number,
  py: number
): NetworkHitResult | null {
  const dx = px - node.cx
  const dy = py - node.cy
  const dist = Math.sqrt(dx * dx + dy * dy)
  const tolerance = Math.max(node.r, 5) + 5

  if (dist <= tolerance) {
    return {
      type: "node",
      datum: node.datum,
      x: node.cx,
      y: node.cy,
      distance: dist
    }
  }
  return null
}

function hitTestRect(
  node: NetworkRectNode,
  px: number,
  py: number
): NetworkHitResult | null {
  const r = sharedHitTestRect(px, py, node)
  if (r.hit) {
    return {
      type: "node",
      datum: node.datum,
      x: r.cx,
      y: r.cy,
      distance: 0
    }
  }
  return null
}

function hitTestArc(
  node: NetworkArcNode,
  px: number,
  py: number
): NetworkHitResult | null {
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
    return {
      type: "node",
      datum: node.datum,
      x: node.cx + midR * Math.cos(midAngle),
      y: node.cy + midR * Math.sin(midAngle),
      distance: 0
    }
  }

  return null
}

// ── Shared offscreen canvas for isPointInPath checks ────────────────────

let _hitCanvas: HTMLCanvasElement | null = null
let _hitCtx: CanvasRenderingContext2D | null = null

function getHitContext(): CanvasRenderingContext2D | null {
  if (!_hitCtx) {
    _hitCanvas = document.createElement("canvas")
    _hitCanvas.width = 1
    _hitCanvas.height = 1
    _hitCtx = _hitCanvas.getContext("2d")
  }
  return _hitCtx
}

// ── Edge hit testing ────────────────────────────────────────────────────

function hitTestEdge(
  edge: NetworkSceneEdge,
  px: number,
  py: number
): NetworkHitResult | null {
  switch (edge.type) {
    case "bezier":
      return hitTestBezierEdge(edge, px, py)
    case "line":
      return hitTestLineEdge(edge, px, py)
    case "ribbon":
      return hitTestPathEdge(edge, px, py)
    case "curved":
      return hitTestPathEdge(edge, px, py)
    default:
      return null
  }
}

function hitTestBezierEdge(
  edge: NetworkBezierEdge,
  px: number,
  py: number
): NetworkHitResult | null {
  // Use Path2D for approximate point-in-path testing
  if (!edge.pathD) return null

  try {
    const path = new Path2D(edge.pathD)
    const ctx = getHitContext()
    if (!ctx) return null

    if (ctx.isPointInPath(path, px, py)) {
      // Return midpoint of the band as hover position
      const sourceNode = typeof edge.datum?.source === "object" ? edge.datum.source : null
      const targetNode = typeof edge.datum?.target === "object" ? edge.datum.target : null

      const midX = sourceNode && targetNode
        ? (sourceNode.x1 + targetNode.x0) / 2
        : px
      const midY = edge.datum
        ? (edge.datum.y0 + edge.datum.y1) / 2
        : py

      return {
        type: "edge",
        datum: edge.datum,
        x: midX,
        y: midY,
        distance: 0
      }
    }
  } catch {
    // Path2D may not be supported in all environments
  }

  return null
}

function hitTestLineEdge(
  edge: { type: "line"; x1: number; y1: number; x2: number; y2: number; datum: any },
  px: number,
  py: number
): NetworkHitResult | null {
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

  const tolerance = 5
  if (dist <= tolerance) {
    return {
      type: "edge",
      datum: edge.datum,
      x: nearX,
      y: nearY,
      distance: dist
    }
  }

  return null
}

function hitTestPathEdge(
  edge: { pathD: string; datum: any },
  px: number,
  py: number
): NetworkHitResult | null {
  if (!edge.pathD) return null

  try {
    const path = new Path2D(edge.pathD)
    const ctx = getHitContext()
    if (!ctx) return null

    if (ctx.isPointInPath(path, px, py)) {
      return {
        type: "edge",
        datum: edge.datum,
        x: px,
        y: py,
        distance: 0
      }
    }
  } catch {
    // Fallback — no hit
  }

  return null
}
