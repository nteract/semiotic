import { quadtree as d3Quadtree, type Quadtree } from "d3-quadtree"
import type { OrdinalSceneNode } from "./ordinalTypes"
import type { PointSceneNode } from "./types"

const QUADTREE_THRESHOLD = 500

export interface OrdinalPointSpatialIndex {
  readonly maxRadius: number
  readonly quadtree: Quadtree<PointSceneNode> | null
}

/** Build the optional point-hit index for large ordinal point scenes. */
export function buildOrdinalPointSpatialIndex(
  scene: readonly OrdinalSceneNode[]
): OrdinalPointSpatialIndex {
  let pointCount = 0
  let maxRadius = 0
  for (const node of scene) {
    if (node.type === "point") {
      pointCount++
      if (node.r > maxRadius) maxRadius = node.r
    }
  }

  if (pointCount <= QUADTREE_THRESHOLD) {
    return { quadtree: null, maxRadius }
  }

  const points: PointSceneNode[] = new Array(pointCount)
  let index = 0
  for (const node of scene) {
    if (node.type === "point") points[index++] = node as PointSceneNode
  }
  return {
    maxRadius,
    quadtree: d3Quadtree<PointSceneNode>()
      .x((node) => node.x)
      .y((node) => node.y)
      .addAll(points)
  }
}
