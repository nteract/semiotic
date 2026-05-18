import type {
  NetworkSceneNode,
  NetworkSceneEdge,
  NetworkCircleNode,
  NetworkRectNode,
  NetworkArcNode,
  NetworkBezierEdge
} from "./networkTypes"
import { hitTestRect as sharedHitTestRect, normalizeAngle, getHitRadius } from "./hitTestUtils"

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
    const result = hitTestNode(node, px, py, maxDistance)
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

  // Check edges if no node hit. Decorative edges (e.g. ProcessSankey's
  // gradient stubs) carry `interactive: false` to opt out — they paint
  // but shouldn't intercept hover.
  for (const edge of sceneEdges) {
    if ((edge as { interactive?: boolean }).interactive === false) continue
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
  py: number,
  maxDistance: number = 30
): NetworkHitResult | null {
  switch (node.type) {
    case "circle":
      return hitTestCircle(node, px, py, maxDistance)
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
  py: number,
  maxDistance: number = 30
): NetworkHitResult | null {
  const dx = px - node.cx
  const dy = py - node.cy
  const dist = Math.sqrt(dx * dx + dy * dy)
  const tolerance = getHitRadius(node.r, maxDistance)

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

  const path = getEdgePath2D(edge)
  const ctx = getHitContext()
  if (!path || !ctx) return null

  // Hit position is the pointer position for every bezier edge, regardless
  // of which chart produced it. The earlier code reached into
  // `edge.datum.source/target/y0/y1` (d3-sankey edge shape) to position
  // the tooltip at the ribbon midpoint — fine for SankeyDiagram, but
  // `customNetworkLayout` consumers (ProcessSankey) emit a different datum
  // and y0/y1 came back `undefined`, so the returned `y` was NaN. The
  // FlippingTooltip drops non-finite positions, silently swallowing the
  // tooltip on the band/ribbon interior — only the stroke fallback (which
  // already used `px, py`) fired, producing the "tooltip works on border
  // but not on body" symptom. Aligning bezier with line/ribbon/curved
  // keeps the hit-test contract uniform across scene-edge types.
  try {
    if (ctx.isPointInPath(path, px, py)) {
      return {
        type: "edge",
        datum: edge.datum,
        x: px,
        y: py,
        distance: 0
      }
    }

    // Also check isPointInStroke with a generous hit tolerance for thin bezier curves
    const prevLineWidth = ctx.lineWidth
    ctx.lineWidth = 10
    const inStroke = ctx.isPointInStroke(path, px, py)
    ctx.lineWidth = prevLineWidth
    if (inStroke) {
      return {
        type: "edge",
        datum: edge.datum,
        x: px,
        y: py,
        distance: 4
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
  edge: { pathD: string; datum: any; _cachedPath2D?: Path2D; _cachedPath2DSource?: string },
  px: number,
  py: number
): NetworkHitResult | null {
  if (!edge.pathD) return null

  const path = getEdgePath2D(edge)
  const ctx = getHitContext()
  if (!path || !ctx) return null

  try {
    // Check filled area first (for wide ribbon edges)
    if (ctx.isPointInPath(path, px, py)) {
      return {
        type: "edge",
        datum: edge.datum,
        x: px,
        y: py,
        distance: 0
      }
    }

    // Also check stroke with generous hit tolerance for thin curved/ribbon edges
    const prevLineWidth = ctx.lineWidth
    ctx.lineWidth = 10
    const inStroke = ctx.isPointInStroke(path, px, py)
    ctx.lineWidth = prevLineWidth
    if (inStroke) {
      return {
        type: "edge",
        datum: edge.datum,
        x: px,
        y: py,
        distance: 4
      }
    }
  } catch {
    // Fallback — no hit
  }

  return null
}
