import { quadtree as d3Quadtree, type Quadtree } from "d3-quadtree"
import type { PointSceneNode } from "./types"

/** Point scenes at or below this size are hit-tested by a linear scan. */
export const POINT_INDEX_THRESHOLD = 500

/** Optional quadtree over a scene's interactive points, plus their largest radius. */
export interface PointSpatialIndex {
  readonly quadtree: Quadtree<PointSceneNode> | null
  /** Largest visual point radius; widens the quadtree query for big marks. */
  readonly maxRadius: number
}

const EMPTY_INDEX: PointSpatialIndex = { quadtree: null, maxRadius: 0 }

function isInteractivePoint(node: { type: string }): node is PointSceneNode {
  return node.type === "point" && (node as PointSceneNode).interactive !== false
}

/** Index the interactive point nodes of a scene for hit testing. */
export function buildPointSpatialIndex(
  scene: readonly { type: string }[]
): PointSpatialIndex {
  let pointCount = 0
  let maxRadius = 0
  for (const node of scene) {
    if (isInteractivePoint(node)) {
      pointCount++
      if (node.r > maxRadius) maxRadius = node.r
    }
  }
  if (pointCount <= POINT_INDEX_THRESHOLD) return { quadtree: null, maxRadius }

  const points: PointSceneNode[] = new Array(pointCount)
  let index = 0
  for (const node of scene) {
    if (isInteractivePoint(node)) points[index++] = node
  }
  return {
    maxRadius,
    quadtree: d3Quadtree<PointSceneNode>()
      .x((node) => node.x)
      .y((node) => node.y)
      .addAll(points)
  }
}

/** XY indexes points only for the chart types whose data marks are points. */
export function buildXYPointSpatialIndex(
  chartType: string,
  scene: readonly { type: string }[]
): PointSpatialIndex {
  return chartType === "scatter" || chartType === "bubble" || chartType === "custom"
    ? buildPointSpatialIndex(scene)
    : EMPTY_INDEX
}

/**
 * A point index that is built on the first read after the scene changes.
 *
 * Building a quadtree costs more than rebuilding the scene it indexes, and
 * only a hit test reads it. A streaming chart with no pointer over it, a
 * resize, or a load in progress therefore never pays for one. Stores call
 * `invalidate()` wherever point geometry changes; readers call `resolve()`.
 */
export class LazyPointIndex {
  private index: PointSpatialIndex = EMPTY_INDEX
  private stale = false
  /** Builds performed so far. Tests and benchmarks use it to prove laziness. */
  buildCount = 0

  constructor(private readonly build: () => PointSpatialIndex) {}

  /** Point geometry changed: rebuild on the next read. Constant time. */
  invalidate(): void {
    this.stale = true
  }

  /** Drop the index and any pending rebuild (the scene is now empty). */
  clear(): void {
    this.stale = false
    this.index = EMPTY_INDEX
  }

  /** The index for the current scene, built now if it is out of date. */
  resolve(): PointSpatialIndex {
    if (this.stale) {
      this.stale = false
      this.index = this.build()
      this.buildCount++
    }
    return this.index
  }

  /** The most recently built index. Never builds; may describe an older scene. */
  get last(): PointSpatialIndex {
    return this.index
  }
}
