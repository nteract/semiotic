/**
 * Harvest annotation anchors from an XY scene graph.
 * Every mark with a `pointId` becomes a `{ pointId, x, y, r }` record so
 * `{ pointId }` annotations resolve regardless of mark type.
 */

import type { SceneNode } from "./types"
import { symbolRadius } from "./symbolPath"
import { glyphHitGeometry } from "./glyphDef"

export type AnnotationAnchor = {
  pointId?: string
  x: number
  y: number
  r: number
}

export function collectAnnotationAnchors(
  scene: SceneNode[] | undefined
): AnnotationAnchor[] | undefined {
  if (!scene) return undefined
  const anchors: AnnotationAnchor[] = []
  for (const n of scene) {
    if (n.type === "point") {
      anchors.push(n)
    } else if (n.type === "symbol") {
      anchors.push({ pointId: n.pointId, x: n.x, y: n.y, r: symbolRadius(n.size) })
    } else if (n.type === "glyph") {
      const geometry = glyphHitGeometry(n.glyph, n.size)
      anchors.push({
        pointId: n.pointId,
        x: n.x + geometry.centerDx,
        y: n.y + geometry.centerDy,
        r: geometry.radius
      })
    }
  }
  return anchors
}
