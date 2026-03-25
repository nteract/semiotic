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
  /** Shape hint for focus ring rendering */
  shape?: "circle" | "rect" | "wedge"
  /** Width of rect-shaped elements (bars, sankey nodes) */
  w?: number
  /** Height of rect-shaped elements */
  h?: number
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
        points.push({ x: node.x, y: node.y, datum: node.datum, shape: "circle" })
        break

      case "line": {
        const line = node
        const data = Array.isArray(line.datum) ? line.datum : []
        for (let i = 0; i < line.path.length && i < data.length; i++) {
          points.push({ x: line.path[i][0], y: line.path[i][1], datum: data[i], shape: "circle" })
        }
        break
      }

      case "area": {
        const area = node
        const data = Array.isArray(area.datum) ? area.datum : []
        for (let i = 0; i < area.topPath.length && i < data.length; i++) {
          points.push({ x: area.topPath[i][0], y: area.topPath[i][1], datum: data[i], shape: "circle" })
        }
        break
      }

      case "rect":
        points.push({
          x: node.x + node.w / 2,
          y: node.y + node.h / 2,
          datum: node.datum,
          shape: "rect",
          w: node.w,
          h: node.h
        })
        break

      case "heatcell":
        points.push({
          x: node.x + node.w / 2,
          y: node.y + node.h / 2,
          datum: node.datum,
          shape: "rect",
          w: node.w,
          h: node.h
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
      points.push({
        x: node.x + node.w / 2,
        y: node.y + node.h / 2,
        datum: node.datum,
        shape: "rect",
        w: node.w,
        h: node.h
      })
    } else if (node.type === "point") {
      points.push({ x: node.x, y: node.y, datum: node.datum, shape: "circle" })
    } else if (node.type === "wedge" && node.cx != null) {
      // Pie/donut wedge — use center of arc
      const midAngle = ((node.startAngle || 0) + (node.endAngle || 0)) / 2
      const r = ((node.innerRadius || 0) + (node.outerRadius || 50)) / 2
      points.push({
        x: node.cx + Math.cos(midAngle) * r,
        y: node.cy + Math.sin(midAngle) * r,
        datum: node.datum,
        shape: "wedge"
      })
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
      points.push({ x: node.cx, y: node.cy, datum: node.datum, shape: "circle" })
    } else if (node.type === "rect" && node.x != null) {
      points.push({
        x: node.x + node.w / 2,
        y: node.y + node.h / 2,
        datum: node.datum,
        shape: "rect",
        w: node.w,
        h: node.h
      })
    } else if (node.type === "arc" && node.cx != null) {
      points.push({ x: node.cx, y: node.cy, datum: node.datum, shape: "circle" })
    }
  }

  points.sort((a, b) => a.x - b.x || a.y - b.y)
  return points
}

/**
 * Extract navigable points from geo scene nodes.
 * Points use their projected position; areas use their centroid.
 */
export function extractGeoNavPoints(scene: any[]): NavPoint[] {
  const points: NavPoint[] = []

  for (const node of scene) {
    if (node.type === "point" && node.x != null) {
      points.push({ x: node.x, y: node.y, datum: node.datum, shape: "circle" })
    } else if (node.type === "geoarea" && node.centroid) {
      points.push({
        x: node.centroid[0],
        y: node.centroid[1],
        datum: node.datum,
        shape: "circle"
      })
    }
  }

  points.sort((a, b) => a.x - b.x || a.y - b.y)
  return points
}

/**
 * Compute the next focus index given a key and current index.
 * Returns -1 to clear focus. Returns null for unhandled keys.
 *
 * Supports PageDown/PageUp for skip navigation (10% of total).
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
    case "PageDown": {
      const skip = Math.max(1, Math.floor(total * 0.1))
      return Math.min(current + skip, total - 1)
    }
    case "PageUp": {
      const skip = Math.max(1, Math.floor(total * 0.1))
      return Math.max(current - skip, 0)
    }
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
