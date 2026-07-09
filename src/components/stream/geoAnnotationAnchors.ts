/**
 * Harvest annotation anchors from a geo scene graph.
 * Point marks pass through; glyph marks contribute drawn-bounds center + radius
 * so `{ pointId }` annotations resolve against pictograms too.
 */

import type { GeoSceneNode } from "./geoTypes"
import type { GlyphSceneNode, PointSceneNode, SceneNode } from "./types"
import { glyphHitGeometry } from "./glyphDef"

export type GeoAnnotationAnchor = {
  pointId?: string
  x: number
  y: number
  r: number
}

export function collectGeoAnnotationAnchors(
  scene: (GeoSceneNode | SceneNode)[] | undefined
): GeoAnnotationAnchor[] | undefined {
  if (!scene) return undefined
  const anchors: GeoAnnotationAnchor[] = []
  for (const n of scene) {
    if (n.type === "point") {
      anchors.push(n as PointSceneNode)
    } else if (n.type === "glyph") {
      const g = n as GlyphSceneNode
      const geometry = glyphHitGeometry(g.glyph, g.size)
      anchors.push({
        pointId: g.pointId,
        x: g.x + geometry.centerDx,
        y: g.y + geometry.centerDy,
        r: geometry.radius
      })
    }
  }
  return anchors
}
