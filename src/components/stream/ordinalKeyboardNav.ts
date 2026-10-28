import type { OrdinalSceneNode } from "./ordinalTypes"
import type { NavPoint } from "./navigationGraph"
import { glyphHitGeometry } from "./glyphDef"
import { normalizeHoverDatum } from "./hoverUtils"

// ── Ordinal Extraction ───────────────────────────────────────────────────

/**
 * Extract navigable points from ordinal scene nodes.
 * Bars use `node.group` (stack/group key) falling back to `datum.category`.
 * ArrowRight/Left = across categories, ArrowUp/Down = within stacked segments.
 */
export function extractOrdinalNavPoints(scene: OrdinalSceneNode[]): NavPoint[] {
  const points: NavPoint[] = []

  for (const node of scene) {
    if (node.type === "rect" && node.x != null) {
      // Skip non-interactive rects (e.g. swimlane track backgrounds —
      // emitted with `datum: null` so arrow-key navigation lands on
      // real data segments, not empty track tiles with no tooltip).
      if (node.datum == null) continue
      // Group by node.group (set by stacking/grouping) falling back to category.
      const category = node.datum?.category ?? ""
      points.push({
        x: node.x + node.w / 2,
        y: node.y + node.h / 2,
        datum: node.datum,
        shape: "rect",
        w: node.w,
        h: node.h,
        semanticKey: node.datum.__aggregateValue !== undefined
          ? JSON.stringify([category, node.group ?? category])
          : undefined,
        group: node.group ?? category
      })
    } else if (node.type === "point") {
      if (node.interactive === false) continue
      points.push({ x: node.x, y: node.y, datum: node.datum, shape: "circle", group: "_default" })
    } else if (node.type === "symbol") {
      if (node.size <= 0) continue
      points.push({ x: node.x, y: node.y, datum: node.datum, shape: "circle", group: "_default" })
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
        group: "_default"
      })
    } else if (node.type === "boxplot") {
      if (node.datum == null) continue
      const vertical = node.projection === "vertical"
      points.push({
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
      points.push({
        x: x + width / 2, y: y + height / 2,
        datum: normalizeHoverDatum(node.datum),
        shape: "rect", w: width, h: height,
        stats: node.stats, category: node.category, group: "_default"
      })
    } else if (node.type === "trapezoid") {
      if (node.datum == null || node.points.length < 3) continue
      points.push({
        x: node.points.reduce((sum, point) => sum + point[0], 0) / node.points.length,
        y: node.points.reduce((sum, point) => sum + point[1], 0) / node.points.length,
        datum: normalizeHoverDatum(node.datum),
        shape: "path", pathData: `M${node.points.map((point) => point.join(",")).join("L")}Z`,
        category: node.category, group: "_default"
      })
    } else if (node.type === "connector") {
      if (node.datum == null || (node.style.strokeWidth ?? 1) <= 0 || node.style.stroke === "none") continue
      if (node.x1 === node.x2 && node.y1 === node.y2) continue
      points.push({
        x: (node.x1 + node.x2) / 2, y: (node.y1 + node.y2) / 2,
        datum: normalizeHoverDatum(node.datum),
        shape: "path", pathData: `M${node.x1},${node.y1}L${node.x2},${node.y2}`,
        category: node.group, group: node.group ?? "_default"
      })
    } else if (node.type === "wedge" && node.cx != null) {
      if (node.datum === null) continue
      const midAngle = ((node.startAngle || 0) + (node.endAngle || 0)) / 2
      const r = ((node.innerRadius || 0) + (node.outerRadius || 50)) / 2
      points.push({
        x: node.cx + Math.cos(midAngle) * r,
        y: node.cy + Math.sin(midAngle) * r,
        datum: node.datum,
        shape: "wedge",
        group: "_default"
      })
    }
  }

  points.sort((a, b) => a.x - b.x || a.y - b.y)
  return points
}

