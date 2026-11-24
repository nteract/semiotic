/**
 * Keyboard navigation utilities for Stream Frames.
 *
 * Supports two navigation modes:
 * - **Flat**: ArrowRight/Left and ArrowUp/Down both advance linearly (geo, simple charts)
 * - **Graph**: ArrowRight/Left navigates within a series/group, ArrowUp/Down switches
 *   between series/groups at a similar position (XY lines, stacked bars, networks)
 *
 * Reuses the existing hover/tooltip system — keyboard focus sets the same
 * HoverData state that mouse hover does.
 */

import type { HoverData } from "../realtime/types"
import type { GlyphSceneNode, SceneNode, RectSceneNode, HeatcellSceneNode } from "./types"
import type { OrdinalSceneNode } from "./ordinalTypes"
import { glyphHitGeometry } from "./glyphDef"
import { normalizeHoverDatum } from "./hoverUtils"

export { buildNavGraph, resolvePosition, nextGraphIndex, nextIndex } from "./navigationGraph"
export type { NavGraph, NavPoint, NavPosition } from "./navigationGraph"
export { extractNetworkNavPoints, nextNetworkIndex } from "./networkKeyboardNav"
import type { NavPoint } from "./navigationGraph"

// ── XY Extraction ────────────────────────────────────────────────────────

function rectNavPoint({ x, y, w, h, datum }: RectSceneNode | HeatcellSceneNode, group: string, semanticKey?: string): NavPoint {
  return { x: x + w / 2, y: y + h / 2, w, h, datum, shape: "rect", group, semanticKey }
}

export function navPath(path: [number, number][]) {
  return `M${path.map(point => point.join(",")).join("L")}`
}

export function glyphNavPoint(node: GlyphSceneNode, group?: string): NavPoint {
  const geometry = glyphHitGeometry(node.glyph, node.size)
  return {
    x: node.x + geometry.centerDx, y: node.y + geometry.centerDy,
    w: geometry.halfWidth * 2, h: geometry.halfHeight * 2,
    datum: node.datum, shape: "rect", group
  }
}

/**
 * Extract navigable data points from XY scene nodes.
 * Lines/areas carry a `group` field identifying the series.
 * ArrowRight/Left = within series, ArrowUp/Down = switch series.
 */
export function extractXYNavPoints(scene: SceneNode[]): NavPoint[] {
  const points: NavPoint[] = []

  for (const node of scene) {
    if (node.datum == null) continue
    switch (node.type) {
      case "point":
      case "symbol":
        if (node.type === "point" ? node.interactive === false : node.size <= 0) break
        points.push({ x: node.x, y: node.y, datum: node.datum, semanticKey: node.pointId, shape: "circle", group: "_default" })
        break

      case "glyph": {
        if (node.size <= 0 || node.datum == null) break
        // Focus ring hugs the drawn pictogram bounds (anchor-aware).
        points.push(glyphNavPoint(node, "_default"))
        break
      }

      case "line":
      case "area": {
        if (node.type === "area" && node.interactive === false) break
        const path = node.type === "line" ? node.path : node.topPath
        const data = Array.isArray(node.datum) ? node.datum : []
        const group = node.group ?? "_default"
        for (let i = 0; i < path.length && i < data.length; i++) {
          points.push({ x: path[i][0], y: path[i][1], datum: data[i], semanticKey: node.pathIds?.[i], shape: "circle", group })
        }
        break
      }

      case "rect": {
        // A restyle or a data push rebuilds every histogram bin datum, so
        // focus finds its bin again by stack segment and bin start.
        const binStart = node.datum?.binStart
        const key = Number.isFinite(binStart) ? JSON.stringify(["bin", node.group ?? null, binStart]) : undefined
        points.push(rectNavPoint(node, node.group ?? "_default", key))
        break
      }

      case "candlestick": {
        if (node.datum == null) break
        const top = node.isRange ? node.highY : Math.min(node.openY, node.closeY)
        const bottom = node.isRange ? node.lowY : Math.max(node.openY, node.closeY)
        points.push({
          x: node.x, y: (top + bottom) / 2, datum: normalizeHoverDatum(node.datum),
          shape: "rect", w: node.bodyWidth, h: Math.abs(bottom - top), group: "_default"
        })
        break
      }

      case "heatcell":
        points.push(rectNavPoint(node, "_default"))
        break
    }
  }

  points.sort((a, b) => a.x - b.x || a.y - b.y)
  return points
}

// ── Ordinal Extraction ───────────────────────────────────────────────────

/**
 * Extract navigable points from ordinal scene nodes.
 * Bars use `node.group` (stack/group key) falling back to `datum.category`.
 * ArrowRight/Left walks that group in scene order; ArrowUp/Down switches groups.
 * Wedges keep angular order via start angle, including a start angle of 0.
 * Funnel and bar-funnel steps that were one group per step share `_funnel`.
 */
export function extractOrdinalNavPoints(scene: OrdinalSceneNode[]): NavPoint[] {
  const points: NavPoint[] = []
  const push = (point: NavPoint) => {
    // Scene order, unless the caller already set an angular order.
    if (point.readingOrder == null) point.readingOrder = points.length
    points.push(point)
  }

  for (const node of scene) {
    if (node.type === "rect" && node.x != null) {
      // Skip non-interactive rects (e.g. swimlane track backgrounds —
      // emitted with `datum: null` so arrow-key navigation lands on
      // real data segments, not empty track tiles with no tooltip).
      if (node.datum == null) continue
      // Group by node.group (set by stacking/grouping) falling back to category.
      const category = node.datum?.category ?? ""
      const group = node.datum.__funnelNavGroup ?? node.group ?? category
      const datum = node.datum
      const aggregateKey = datum.__aggregateValue !== undefined
        ? [category, node.group ?? category]
        : datum.__funnelStep != null
          ? ["funnel", datum.__funnelStep, group]
          : datum.__barFunnelStep != null
            ? ["bar-funnel", datum.__barFunnelStep, group, datum.__barFunnelIsDropoff]
            : datum.bin != null && datum.count != null && Array.isArray(datum.range)
              ? ["bin", category, ...datum.range]
              : undefined
      push(rectNavPoint(node, group, aggregateKey && JSON.stringify(aggregateKey)))
    } else if (node.type === "point" || node.type === "symbol") {
      if (node.datum == null || (node.type === "point" ? node.interactive === false : node.size <= 0)) continue
      push({ x: node.x, y: node.y, datum: node.datum, shape: "circle", group: "_default" })
    } else if (node.type === "glyph") {
      if (node.size <= 0 || node.datum == null) continue
      push(glyphNavPoint(node, "_default"))
    } else if (node.type === "boxplot") {
      if (node.datum == null) continue
      const vertical = node.projection === "vertical"
      const center = (node.q1Pos + node.q3Pos) / 2
      const span = Math.abs(node.q3Pos - node.q1Pos)
      push({
        x: vertical ? node.x : center, y: vertical ? center : node.y,
        datum: normalizeHoverDatum(node.datum),
        shape: "rect",
        w: vertical ? node.columnWidth : span,
        h: vertical ? span : node.columnWidth,
        semanticKey: node.category != null ? JSON.stringify([node.type, node.category]) : undefined,
        stats: node.stats, category: node.category, group: "_default"
      })
    } else if (node.type === "violin" && node.bounds) {
      if (node.datum == null) continue
      const { x, y, width, height } = node.bounds
      push({
        x: x + width / 2, y: y + height / 2,
        datum: normalizeHoverDatum(node.datum),
        shape: "rect", w: width, h: height,
        semanticKey: node.category != null ? JSON.stringify([node.type, node.category]) : undefined,
        stats: node.stats, category: node.category, group: "_default"
      })
    } else if (node.type === "trapezoid") {
      if (node.datum == null || node.points.length < 3) continue
      push({
        x: node.points.reduce((sum, point) => sum + point[0], 0) / node.points.length,
        y: node.points.reduce((sum, point) => sum + point[1], 0) / node.points.length,
        datum: normalizeHoverDatum(node.datum),
        shape: "path", pathData: navPath(node.points) + "Z",
        category: node.category, group: "_default"
      })
    } else if (node.type === "connector") {
      if (node.datum == null || (node.style.strokeWidth ?? 1) <= 0 || node.style.stroke === "none") continue
      if (node.x1 === node.x2 && node.y1 === node.y2) continue
      push({
        x: (node.x1 + node.x2) / 2, y: (node.y1 + node.y2) / 2,
        datum: normalizeHoverDatum(node.datum),
        shape: "path", pathData: `M${node.x1},${node.y1}L${node.x2},${node.y2}`,
        readingOrder: scene.length + points.length,
        category: node.group, group: node.group ?? "_default"
      })
    } else if (node.type === "wedge" && node.cx != null) {
      if (node.datum === null) continue
      const midAngle = ((node.startAngle || 0) + (node.endAngle || 0)) / 2
      const r = ((node.innerRadius || 0) + (node.outerRadius || 50)) / 2
      push({
        x: node.cx + Math.cos(midAngle) * r,
        y: node.cy + Math.sin(midAngle) * r,
        datum: node.datum,
        shape: "wedge",
        semanticKey: node.category != null ? JSON.stringify([node.type, node.category]) : undefined,
        category: node.category,
        readingOrder: node.startAngle,
        group: "_default"
      })
    }
  }

  // Every point passes through push, which assigns its reading order.
  return points.sort((a, b) => a.readingOrder! - b.readingOrder! || a.x - b.x || a.y - b.y)
}

/**
 * Convert a NavPoint to HoverData for the tooltip system.
 */
export function navPointToHover(point: NavPoint): HoverData {
  const rawDatum = point.datum || {}
  return {
    data: rawDatum,
    ...(point.stats && { stats: point.stats }),
    ...(point.category != null && { category: point.category }),
    x: point.x,
    y: point.y,
    __semioticHoverData: true,
  }
}
