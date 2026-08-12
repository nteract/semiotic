import type {
  OrdinalSceneNode,
  WedgeSceneNode,
  BoxplotSceneNode,
  ViolinSceneNode,
  ConnectorSceneNode,
  TrapezoidSceneNode
} from "./ordinalTypes"
import type { SceneDatum, PointSceneNode, RectSceneNode, SymbolSceneNode, GlyphSceneNode } from "./types"
import type { Quadtree } from "d3-quadtree"
import { hitTestRect as sharedHitTestRect, normalizeAngle, getHitRadius } from "./hitTestUtils"
import { symbolRadius } from "./symbolPath"
import { glyphHitGeometry } from "./glyphDef"
import { findHitPointInQuadtree } from "./quadtreeHitTest"

export interface OrdinalHitResult {
  /** Scene mark that supplied this hit (used for presentation metadata). */
  node?: OrdinalSceneNode
  datum: SceneDatum
  x: number
  y: number
  distance: number
  category?: string
  stats?: import("./ordinalTypes").DistributionStats
}

export function findNearestOrdinalNode(
  scene: OrdinalSceneNode[],
  px: number,
  py: number,
  maxDistance: number = 30,
  pointQuadtree?: Quadtree<PointSceneNode> | null,
  maxPointRadius = 0
): OrdinalHitResult | null {
  let best: OrdinalHitResult | null = null
  let bestConnector: OrdinalHitResult | null = null

  // Fast path: quadtree-accelerated point hit test for swarm plots.
  // Uses `visit()` rather than `find()` so variable-size points (where a
  // farther point with a larger r can still be a valid hit) aren't missed.
  // When a quadtree is provided, it's authoritative for points — whether
  // it returns a hit or null, the linear point scan below is skipped so
  // large swarms stay O(log n) for point testing.
  if (pointQuadtree) {
    const hit = findHitPointInQuadtree(pointQuadtree, px, py, maxDistance, maxPointRadius)
    if (hit && hit.node.interactive !== false) {
      best = {
        node: hit.node,
        datum: hit.node.datum,
        x: hit.node.x,
        y: hit.node.y,
        distance: hit.distance
      }
    }
  }

  for (const node of scene) {
    let result: OrdinalHitResult | null = null

    switch (node.type) {
      case "rect":
        // Skip non-interactive rects (e.g. swimlane track backgrounds —
        // emitted with `datum: null` so they paint behind data items
        // without stealing hover/click from them).
        if (node.datum == null) break
        result = hitTestRect(node, px, py)
        break
      case "point":
        if (node.interactive === false) break
        // Quadtree visit was authoritative — skip redundant linear scan.
        if (pointQuadtree) break
        result = hitTestPoint(node, px, py, maxDistance)
        break
      case "symbol":
        result = hitTestSymbol(node, px, py, maxDistance)
        break
      case "glyph":
        result = hitTestGlyph(node, px, py, maxDistance)
        break
      case "wedge":
        if (node.datum === null) break
        result = hitTestWedge(node, px, py)
        break
      case "boxplot":
        result = hitTestBoxplot(node, px, py)
        break
      case "violin":
        result = hitTestViolin(node, px, py)
        break
      case "connector":
        result = hitTestConnector(node, px, py, maxDistance)
        break
      case "trapezoid":
        result = hitTestTrapezoid(node, px, py)
        break
    }

    // Type-specific testers already account for the rendered geometry. A
    // second maxDistance cap would make large linear-scan marks behave
    // differently from the quadtree path.
    if (result) {
      result.node = node
      if (node.type === "connector") {
        if (!bestConnector || result.distance < bestConnector.distance) {
          bestConnector = result
        }
      } else if (!best || result.distance < best.distance) {
        best = result
      }
    }
  }

  // Connector geometry paints behind every built-in piece renderer. Keep it
  // as a fallback so a segment crossing or terminating under a mark cannot
  // steal that mark's hover/click/cursor target.
  return best ?? bestConnector ?? hitTestFilledConnectorGroup(scene, px, py)
}

function hitTestRect(node: RectSceneNode, px: number, py: number): OrdinalHitResult | null {
  const r = sharedHitTestRect(px, py, node)
  if (r.hit) {
    return {
      datum: node.datum,
      x: r.cx,
      y: node.y,
      distance: 0,
      category: node.group
    }
  }
  return null
}

function hitTestPoint(node: PointSceneNode, px: number, py: number, maxDistance: number = 30): OrdinalHitResult | null {
  const dx = px - node.x
  const dy = py - node.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const hitR = getHitRadius(node.r, maxDistance)
  if (dist <= hitR) {
    return {
      datum: node.datum,
      x: node.x,
      y: node.y,
      distance: dist
    }
  }
  return null
}

/** Glyph hit-test as a circle of the symbol's effective radius. */
function hitTestSymbol(node: SymbolSceneNode, px: number, py: number, maxDistance: number = 30): OrdinalHitResult | null {
  const dx = px - node.x
  const dy = py - node.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const hitR = getHitRadius(symbolRadius(node.size), maxDistance)
  if (dist <= hitR) {
    return { datum: node.datum, x: node.x, y: node.y, distance: dist }
  }
  return null
}

/** Composite-glyph hit-test as a circle over the drawn (anchor-offset) bounds. */
function hitTestGlyph(node: GlyphSceneNode, px: number, py: number, maxDistance: number = 30): OrdinalHitResult | null {
  if (node.datum == null) return null
  const geometry = glyphHitGeometry(node.glyph, node.size)
  const cx = node.x + geometry.centerDx
  const cy = node.y + geometry.centerDy
  const dx = px - cx
  const dy = py - cy
  const dist = Math.sqrt(dx * dx + dy * dy)
  const hitR = getHitRadius(geometry.radius, maxDistance)
  if (dist <= hitR) {
    return { datum: node.datum, x: cx, y: cy, distance: dist }
  }
  return null
}

function hitTestWedge(node: WedgeSceneNode, px: number, py: number): OrdinalHitResult | null {
  // Convert to polar coordinates relative to center
  const dx = px - node.cx
  const dy = py - node.cy
  const dist = Math.sqrt(dx * dx + dy * dy)

  // Check radius bounds
  if (dist < node.innerRadius || dist > node.outerRadius) return null

  // Check angle bounds
  // atan2 returns [-π, π], normalize to [0, 2π]
  const angle = normalizeAngle(Math.atan2(dy, dx))

  // Normalize start/end angles to [0, 2π]
  const start = normalizeAngle(node.startAngle)
  const end = normalizeAngle(node.endAngle)

  // Check if angle is within the arc
  const inArc = start <= end
    ? angle >= start && angle <= end
    : angle >= start || angle <= end

  if (!inArc) return null

  // Return centroid position for tooltip
  const midAngle = (node.startAngle + node.endAngle) / 2
  const midRadius = (node.innerRadius + node.outerRadius) / 2
  return {
    datum: node.datum,
    x: node.cx + Math.cos(midAngle) * midRadius,
    y: node.cy + Math.sin(midAngle) * midRadius,
    distance: 0,
    category: node.category
  }
}

function hitTestBoxplot(node: BoxplotSceneNode, px: number, py: number): OrdinalHitResult | null {
  const halfWidth = node.columnWidth / 2

  if (node.projection === "vertical") {
    const left = node.x - halfWidth
    const right = node.x + halfWidth
    const top = Math.min(node.minPos, node.maxPos)
    const bottom = Math.max(node.minPos, node.maxPos)

    if (px >= left && px <= right && py >= top && py <= bottom) {
      return {
        datum: node.datum,
        x: node.x,
        y: node.medianPos,
        distance: 0,
        category: node.category,
        stats: node.stats
      }
    }
  } else {
    const top = node.y - halfWidth
    const bottom = node.y + halfWidth
    const left = Math.min(node.minPos, node.maxPos)
    const right = Math.max(node.minPos, node.maxPos)

    if (px >= left && px <= right && py >= top && py <= bottom) {
      return {
        datum: node.datum,
        x: node.medianPos,
        y: node.y,
        distance: 0,
        category: node.category,
        stats: node.stats
      }
    }
  }

  return null
}

function hitTestViolin(node: ViolinSceneNode, px: number, py: number): OrdinalHitResult | null {
  if (!node.bounds) return null

  const { x, y, width, height } = node.bounds

  if (px >= x && px <= x + width && py >= y && py <= y + height) {
    // Return center of bounds for tooltip positioning
    return {
      datum: node.datum,
      x: x + width / 2,
      y: y + height / 2,
      distance: 0,
      category: node.category,
      stats: node.stats
    }
  }

  return null
}

function hitTestConnector(
  node: ConnectorSceneNode,
  px: number,
  py: number,
  maxDistance: number
): OrdinalHitResult | null {
  const strokeWidth = node.style.strokeWidth ?? 1
  if (strokeWidth <= 0 || node.style.stroke === "none") return null

  const nearest = nearestPointOnSegment(
    px,
    py,
    node.x1,
    node.y1,
    node.x2,
    node.y2
  )
  if (!nearest) return null

  // Thin connectors need the same caller-provided hover/touch tolerance as
  // other line-like marks, while a wide visible stroke remains hittable across
  // its full painted width even when hoverRadius is smaller.
  if (nearest.distance > Math.max(maxDistance, strokeWidth / 2)) return null
  return {
    datum: node.datum,
    x: nearest.x,
    y: nearest.y,
    distance: nearest.distance,
    category: node.group
  }
}

function hitTestFilledConnectorGroup(
  scene: OrdinalSceneNode[],
  px: number,
  py: number
): OrdinalHitResult | null {
  const groups = new Map<string, ConnectorSceneNode[]>()
  for (const node of scene) {
    if (node.type !== "connector") continue
    const key = node.group || "_default"
    const segments = groups.get(key)
    if (segments) segments.push(node)
    else groups.set(key, [node])
  }

  for (const segments of groups.values()) {
    const first = segments[0]
    if (
      segments.length < 2 ||
      !first.style.fill ||
      first.style.fill === "none"
    ) continue
    const points: [number, number][] = [
      [first.x1, first.y1],
      ...segments.map(segment => [segment.x2, segment.y2] as [number, number])
    ]
    if (!pointInPolygon(points, px, py)) continue
    const center = polygonCenter(points)
    return {
      node: first,
      datum: first.datum,
      x: center.x,
      y: center.y,
      distance: 0,
      category: first.group
    }
  }
  return null
}

function hitTestTrapezoid(
  node: TrapezoidSceneNode,
  px: number,
  py: number
): OrdinalHitResult | null {
  if (node.points.length < 3) return null

  const edgeDistance = polygonEdgeDistance(node.points, px, py)
  const inside = pointInPolygon(node.points, px, py)
  const strokeWidth = node.style.strokeWidth ?? 1
  const paintedStroke = Boolean(
    node.style.stroke && node.style.stroke !== "none" && strokeWidth > 0
  )
  if (!inside && (!paintedStroke || edgeDistance > strokeWidth / 2)) return null

  const center = polygonCenter(node.points)
  return {
    datum: node.datum,
    x: center.x,
    y: center.y,
    distance: inside ? 0 : edgeDistance,
    category: node.category
  }
}

function polygonCenter(points: [number, number][]): { x: number; y: number } {
  const sum = points.reduce(
    (center, point) => ({ x: center.x + point[0], y: center.y + point[1] }),
    { x: 0, y: 0 }
  )
  return { x: sum.x / points.length, y: sum.y / points.length }
}

function nearestPointOnSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { x: number; y: number; distance: number } | null {
  const dx = x2 - x1
  const dy = y2 - y1
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return null
  const projection = ((px - x1) * dx + (py - y1) * dy) / lengthSquared
  const t = Math.max(0, Math.min(1, projection))
  const x = x1 + t * dx
  const y = y1 + t * dy
  return { x, y, distance: Math.hypot(px - x, py - y) }
}

function polygonEdgeDistance(
  points: [number, number][],
  px: number,
  py: number
): number {
  let minimum = Infinity
  for (let index = 0; index < points.length; index++) {
    const start = points[index]
    const end = points[(index + 1) % points.length]
    const nearest = nearestPointOnSegment(
      px,
      py,
      start[0],
      start[1],
      end[0],
      end[1]
    )
    if (nearest && nearest.distance < minimum) minimum = nearest.distance
  }
  return minimum
}

function pointInPolygon(
  points: [number, number][],
  px: number,
  py: number
): boolean {
  // Treat the boundary as part of the filled shape. This also avoids the
  // horizontal-edge ambiguity in the ray-crossing test below.
  if (polygonEdgeDistance(points, px, py) <= Number.EPSILON * 16) return true

  let inside = false
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
    const [x1, y1] = points[index]
    const [x2, y2] = points[previous]
    const crosses = (y1 > py) !== (y2 > py) &&
      px < ((x2 - x1) * (py - y1)) / (y2 - y1) + x1
    if (crosses) inside = !inside
  }
  return inside
}
