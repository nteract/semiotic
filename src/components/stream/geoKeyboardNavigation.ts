"use client"
import type { HoverData } from "../realtime/types"
import type { GeoPipelineStore } from "./GeoPipelineStore"
import type { GeoSceneNode } from "./geoTypes"
import type { GeoFeatureLike } from "./geoFrameHelpers"
import type { NavPoint } from "./navigationGraph"
import { glyphNavPoint, navPath } from "./keyboardNav"
import { normalizeHoverDatum } from "./hoverUtils"
import { polygonFocusAnchor } from "./geoPolygonFocus"
import { useGraphKeyboardNavigation, type KeyboardInteractionParams } from "./graphKeyboardNavigation"

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
      points.push(glyphNavPoint(node))
    } else if (node.type === "line") {
      if (node.continuation || node.datum == null || node.path.length < 2) continue
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
            pathData: navPath(node.path)
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
      const [x, y] = polygonFocusAnchor(node.focusPath ?? node.pathData, node.centroid) ?? node.centroid
      points.push({
        x, y,
        datum: node.datum,
        shape: "geoarea",
        pathData: node.pathData,
      })
    }
  }

  points.sort((a, b) => a.x - b.x || a.y - b.y)
  return points
}

function geoPointToHover(point: NavPoint): HoverData {
  const rawDatum = point.datum as GeoFeatureLike | null
  return {
    ...(rawDatum || {}),
    ...(rawDatum?.properties || {}),
    data: rawDatum,
    properties: rawDatum?.properties,
    x: point.x,
    y: point.y,
    __semioticHoverData: true
  }
}

export function useGeoKeyboardNavigation(
  params: KeyboardInteractionParams<GeoPipelineStore, GeoSceneNode>
) {
  return useGraphKeyboardNavigation({
    ...params,
    extractPoints: extractGeoNavPoints,
    toHover: geoPointToHover,
    navigation: "linear"
  })
}
