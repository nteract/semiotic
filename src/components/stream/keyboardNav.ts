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
        if (node.interactive === false) break
        points.push({ x: node.x, y: node.y, datum: node.datum, shape: "circle", group: "_default" })
        break

      case "symbol":
        if (node.size <= 0) break
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

      case "line": {
        const line = node
        const data = Array.isArray(line.datum) ? line.datum : []
        const group = line.group ?? "_default"
        for (let i = 0; i < line.path.length && i < data.length; i++) {
          points.push({ x: line.path[i][0], y: line.path[i][1], datum: data[i], shape: "circle", group })
        }
        break
      }

      case "area": {
        if (node.interactive === false) break
        const area = node
        const data = Array.isArray(area.datum) ? area.datum : []
        const group = area.group ?? "_default"
        for (let i = 0; i < area.topPath.length && i < data.length; i++) {
          points.push({ x: area.topPath[i][0], y: area.topPath[i][1], datum: data[i], shape: "circle", group })
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

export { extractOrdinalNavPoints } from "./ordinalKeyboardNav"

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
