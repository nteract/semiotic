import type { OrdinalSceneNode, WedgeSceneNode, BoxplotSceneNode, ViolinSceneNode } from "./ordinalTypes"
import type { PointSceneNode, RectSceneNode, HoverData } from "./types"

export interface OrdinalHitResult {
  datum: any
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
  maxDistance: number = 30
): OrdinalHitResult | null {
  let best: OrdinalHitResult | null = null

  for (const node of scene) {
    let result: OrdinalHitResult | null = null

    switch (node.type) {
      case "rect":
        result = hitTestRect(node, px, py)
        break
      case "point":
        result = hitTestPoint(node, px, py)
        break
      case "wedge":
        result = hitTestWedge(node, px, py)
        break
      case "boxplot":
        result = hitTestBoxplot(node, px, py)
        break
      case "violin":
        result = hitTestViolin(node, px, py)
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

function hitTestRect(node: RectSceneNode, px: number, py: number): OrdinalHitResult | null {
  if (px >= node.x && px <= node.x + node.w && py >= node.y && py <= node.y + node.h) {
    return {
      datum: node.datum,
      x: node.x + node.w / 2,
      y: node.y,
      distance: 0,
      category: node.group
    }
  }
  return null
}

function hitTestPoint(node: PointSceneNode, px: number, py: number): OrdinalHitResult | null {
  const dx = px - node.x
  const dy = py - node.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const hitR = Math.max(node.r, 5) // minimum hit target
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

function hitTestWedge(node: WedgeSceneNode, px: number, py: number): OrdinalHitResult | null {
  // Convert to polar coordinates relative to center
  const dx = px - node.cx
  const dy = py - node.cy
  const dist = Math.sqrt(dx * dx + dy * dy)

  // Check radius bounds
  if (dist < node.innerRadius || dist > node.outerRadius) return null

  // Check angle bounds
  // atan2 returns [-π, π], normalize to [0, 2π]
  let angle = Math.atan2(dy, dx)
  if (angle < 0) angle += Math.PI * 2

  // Normalize start/end angles to [0, 2π]
  let start = node.startAngle % (Math.PI * 2)
  let end = node.endAngle % (Math.PI * 2)
  if (start < 0) start += Math.PI * 2
  if (end < 0) end += Math.PI * 2

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
  const statsWithN = node.stats ? {
    ...node.stats,
    n: Array.isArray(node.datum) ? node.datum.length : 0,
    mean: (node.stats.q1 + node.stats.median + node.stats.q3) / 3  // approximate from quartiles
  } : undefined

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
        stats: statsWithN
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
        stats: statsWithN
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
