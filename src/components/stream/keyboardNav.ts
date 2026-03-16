/**
 * Keyboard navigation utilities for Stream Frames.
 *
 * Extracts navigable data points from the scene graph, sorts them
 * spatially, and provides an index-based iteration API for arrow-key
 * navigation. Reuses the existing hover/tooltip system — keyboard
 * focus sets the same HoverData state that mouse hover does.
 */

import type { HoverData } from "../realtime/types"

export interface NavPoint {
  x: number
  y: number
  datum: any
}

/**
 * Extract navigable data points from XY scene nodes.
 * Points/rects yield one point each. Lines/areas yield their path points
 * paired with the underlying data. Sorted left-to-right by x.
 */
export function extractXYNavPoints(scene: any[]): NavPoint[] {
  const points: NavPoint[] = []

  for (const node of scene) {
    switch (node.type) {
      case "point":
        points.push({ x: node.x, y: node.y, datum: node.datum })
        break

      case "line": {
        const line = node
        const data = Array.isArray(line.datum) ? line.datum : []
        for (let i = 0; i < line.path.length && i < data.length; i++) {
          points.push({ x: line.path[i][0], y: line.path[i][1], datum: data[i] })
        }
        break
      }

      case "area": {
        const area = node
        const data = Array.isArray(area.datum) ? area.datum : []
        for (let i = 0; i < area.topPath.length && i < data.length; i++) {
          points.push({ x: area.topPath[i][0], y: area.topPath[i][1], datum: data[i] })
        }
        break
      }

      case "rect":
        points.push({
          x: node.x + node.w / 2,
          y: node.y + node.h / 2,
          datum: node.datum
        })
        break

      case "heatcell":
        points.push({
          x: node.x + node.w / 2,
          y: node.y + node.h / 2,
          datum: node.datum
        })
        break
    }
  }

  points.sort((a, b) => a.x - b.x || a.y - b.y)
  return points
}

/**
 * Extract navigable points from ordinal scene nodes.
 * Sorted left-to-right (horizontal) or top-to-bottom (vertical).
 */
export function extractOrdinalNavPoints(scene: any[]): NavPoint[] {
  const points: NavPoint[] = []

  for (const node of scene) {
    if (node.type === "rect" && node.x != null) {
      points.push({ x: node.x + node.w / 2, y: node.y + node.h / 2, datum: node.datum })
    } else if (node.type === "point") {
      points.push({ x: node.x, y: node.y, datum: node.datum })
    } else if (node.type === "wedge" && node.cx != null) {
      // Pie/donut wedge — use center of arc
      const midAngle = ((node.startAngle || 0) + (node.endAngle || 0)) / 2
      const r = ((node.innerRadius || 0) + (node.outerRadius || 50)) / 2
      points.push({ x: node.cx + Math.cos(midAngle) * r, y: node.cy + Math.sin(midAngle) * r, datum: node.datum })
    }
  }

  points.sort((a, b) => a.x - b.x || a.y - b.y)
  return points
}

/**
 * Extract navigable points from network scene nodes.
 * Node-only (edges are not individually navigable).
 */
export function extractNetworkNavPoints(scene: any[]): NavPoint[] {
  const points: NavPoint[] = []

  for (const node of scene) {
    if (node.type === "circle" && node.cx != null) {
      points.push({ x: node.cx, y: node.cy, datum: node.datum })
    } else if (node.type === "rect" && node.x != null) {
      points.push({ x: node.x + node.w / 2, y: node.y + node.h / 2, datum: node.datum })
    } else if (node.type === "arc" && node.cx != null) {
      points.push({ x: node.cx, y: node.cy, datum: node.datum })
    }
  }

  points.sort((a, b) => a.x - b.x || a.y - b.y)
  return points
}

/**
 * Compute the next focus index given a key and current index.
 * Returns -1 to clear focus.
 */
export function nextIndex(
  key: string,
  current: number,
  total: number
): number | null {
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return current < total - 1 ? current + 1 : current
    case "ArrowLeft":
    case "ArrowUp":
      return current > 0 ? current - 1 : current
    case "Home":
      return 0
    case "End":
      return total - 1
    case "Escape":
      return -1
    default:
      return null // unhandled key
  }
}

/**
 * Convert a NavPoint to HoverData for the tooltip system.
 */
export function navPointToHover(point: NavPoint): HoverData {
  const rawDatum = point.datum || {}
  return {
    ...(typeof rawDatum === "object" && rawDatum !== null && !Array.isArray(rawDatum) ? rawDatum : {}),
    data: rawDatum,
    x: point.x,
    y: point.y,
    time: point.x,
    value: point.y,
  }
}
