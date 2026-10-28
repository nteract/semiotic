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
import type { SceneNode } from "./types"
import type { OrdinalSceneNode } from "./ordinalTypes"
import type { GeoSceneNode } from "./geoTypes"
import { glyphHitGeometry } from "./glyphDef"
import { normalizeHoverDatum } from "./hoverUtils"

export { buildNavGraph, resolvePosition, nextGraphIndex, nextIndex } from "./navigationGraph"
export type { NavGraph, NavPoint, NavPosition } from "./navigationGraph"
export { extractNetworkNavPoints, nextNetworkIndex } from "./networkKeyboardNav"
import type { NavPoint } from "./navigationGraph"

// ── XY Extraction ────────────────────────────────────────────────────────

/**
 * Extract navigable data points from XY scene nodes.
 * Lines/areas carry a `group` field identifying the series.
 * ArrowRight/Left = within series, ArrowUp/Down = switch series.
 */
export function extractXYNavPoints(scene: SceneNode[]): NavPoint[] {
  const points: NavPoint[] = []

  for (const node of scene) {
    switch (node.type) {
      case "point":
      case "symbol":
        if (node.type === "point" ? node.interactive === false : node.size <= 0) break
        points.push({ x: node.x, y: node.y, datum: node.datum, shape: "circle", group: "_default" })
        break

      case "glyph": {
        if (node.size <= 0 || node.datum == null) break
        // Focus ring hugs the drawn pictogram bounds (anchor-aware).
        const geometry = glyphHitGeometry(node.glyph, node.size)
        points.push({
          x: node.x + geometry.centerDx,
          y: node.y + geometry.centerDy,
          datum: node.datum,
          shape: "rect",
          w: geometry.halfWidth * 2,
          h: geometry.halfHeight * 2,
          group: "_default"
        })
        break
      }

      case "line":
      case "area": {
        if (node.type === "area" && node.interactive === false) break
        const path = node.type === "line" ? node.path : node.topPath
        const data = Array.isArray(node.datum) ? node.datum : []
        const group = node.group ?? "_default"
        for (let i = 0; i < path.length && i < data.length; i++) {
          points.push({ x: path[i][0], y: path[i][1], datum: data[i], shape: "circle", group })
        }
        break
      }

      case "rect": {
        // A restyle or a data push rebuilds every histogram bin datum, so
        // focus finds its bin again by stack segment and bin start.
        const binStart = node.datum?.binStart
        points.push({
          x: node.x + node.w / 2,
          y: node.y + node.h / 2,
          datum: node.datum,
          shape: "rect",
          w: node.w,
          h: node.h,
          semanticKey: typeof binStart === "number" && Number.isFinite(binStart)
            ? JSON.stringify(["bin", node.group ?? null, binStart])
            : undefined,
          group: node.group ?? "_default"
        })
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
        points.push({
          x: node.x + node.w / 2,
          y: node.y + node.h / 2,
          datum: node.datum,
          shape: "rect",
          w: node.w,
          h: node.h,
          group: "_default"
        })
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
      push({
        x: node.x + node.w / 2,
        y: node.y + node.h / 2,
        datum: node.datum,
        shape: "rect",
        w: node.w,
        h: node.h,
        semanticKey: node.datum.__aggregateValue !== undefined
          ? JSON.stringify([category, node.group ?? category])
          : undefined,
        group
      })
    } else if (node.type === "point" || node.type === "symbol") {
      if (node.type === "point" ? node.interactive === false : node.size <= 0) continue
      push({ x: node.x, y: node.y, datum: node.datum, shape: "circle", group: "_default" })
    } else if (node.type === "glyph") {
      if (node.size <= 0 || node.datum == null) continue
      const geometry = glyphHitGeometry(node.glyph, node.size)
      push({
        x: node.x + geometry.centerDx,
        y: node.y + geometry.centerDy,
        datum: node.datum,
        shape: "rect",
        w: geometry.halfWidth * 2,
        h: geometry.halfHeight * 2,
        group: "_default"
      })
    } else if (node.type === "boxplot") {
      if (node.datum == null) continue
      const vertical = node.projection === "vertical"
      push({
        x: vertical ? node.x : (node.q1Pos + node.q3Pos) / 2,
        y: vertical ? (node.q1Pos + node.q3Pos) / 2 : node.y,
        datum: normalizeHoverDatum(node.datum),
        shape: "rect",
        w: vertical ? node.columnWidth : Math.abs(node.q3Pos - node.q1Pos),
        h: vertical ? Math.abs(node.q3Pos - node.q1Pos) : node.columnWidth,
        stats: node.stats, category: node.category, group: "_default"
      })
    } else if (node.type === "violin" && node.bounds) {
      if (node.datum == null) continue
      const { x, y, width, height } = node.bounds
      push({
        x: x + width / 2, y: y + height / 2,
        datum: normalizeHoverDatum(node.datum),
        shape: "rect", w: width, h: height,
        stats: node.stats, category: node.category, group: "_default"
      })
    } else if (node.type === "trapezoid") {
      if (node.datum == null || node.points.length < 3) continue
      push({
        x: node.points.reduce((sum, point) => sum + point[0], 0) / node.points.length,
        y: node.points.reduce((sum, point) => sum + point[1], 0) / node.points.length,
        datum: normalizeHoverDatum(node.datum),
        shape: "path", pathData: `M${node.points.map((point) => point.join(",")).join("L")}Z`,
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
        readingOrder: node.startAngle,
        group: "_default"
      })
    }
  }

  points.sort((a, b) => (a.readingOrder ?? 0) - (b.readingOrder ?? 0) || a.x - b.x || a.y - b.y)
  return points
}

// ── Geo Extraction ───────────────────────────────────────────────────────

/**
 * Extract navigable points from geo scene nodes.
 * Flat navigation only (no meaningful grouping for geo).
 */
export function extractGeoNavPoints(scene: GeoSceneNode[]): NavPoint[] {
  const points: NavPoint[] = []

  for (const node of scene) {
    if (
      node.type === "point" &&
      node.x != null &&
      node.interactive !== false
    ) {
      points.push({ x: node.x, y: node.y, datum: node.datum, shape: "circle" })
    } else if (node.type === "glyph") {
      if (node.size <= 0 || node.datum == null) continue
      const geometry = glyphHitGeometry(node.glyph, node.size)
      points.push({
        x: node.x + geometry.centerDx,
        y: node.y + geometry.centerDy,
        datum: node.datum,
        shape: "rect",
        w: geometry.halfWidth * 2,
        h: geometry.halfHeight * 2,
      })
    } else if (node.type === "line") {
      if (node.datum == null || node.path.length < 2) continue
      // Half the drawn path length keeps the tooltip on curved/resampled flows.
      const lengths = node.path.slice(1).map((point, index) =>
        Math.hypot(point[0] - node.path[index][0], point[1] - node.path[index][1]))
      let remaining = lengths.reduce((sum, length) => sum + length, 0) / 2
      if (!Number.isFinite(remaining) || remaining <= 0) continue
      for (let index = 0; index < lengths.length; index++) {
        const length = lengths[index]
        if (length > 0 && remaining <= length) {
          const start = node.path[index]
          const end = node.path[index + 1]
          const ratio = remaining / length
          points.push({
            x: start[0] + (end[0] - start[0]) * ratio,
            y: start[1] + (end[1] - start[1]) * ratio,
            datum: normalizeHoverDatum(node.datum), shape: "path",
            pathData: `M${node.path.map((point) => point.join(",")).join("L")}`
          })
          break
        }
        remaining -= length
      }
    } else if (node.type === "geoarea" && node.centroid && node.interactive !== false) {
      // Skip non-interactive areas (e.g. the graticule, `datum: null`) so
      // keyboard nav lands only on hit-testable shapes — mirrors the
      // `interactive === false` skip in CanvasHitTester. Without this, the
      // new geoarea focus ring would outline the whole graticule mesh.
      // Navigate to the centroid (for the hover payload + label position) but
      // carry the path so the focus ring outlines the whole area, not a dot.
      points.push({
        x: node.centroid[0],
        y: node.centroid[1],
        datum: node.datum,
        shape: "geoarea",
        pathData: node.pathData,
      })
    }
  }

  points.sort((a, b) => a.x - b.x || a.y - b.y)
  return points
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
