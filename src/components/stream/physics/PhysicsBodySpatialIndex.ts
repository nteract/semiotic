import { quadtree as d3Quadtree, type Quadtree } from "d3-quadtree"
import type { PhysicsEngineAdapter } from "./PhysicsEngineAdapter"
import type { PhysicsBodyState } from "./PhysicsKernel"
import {
  bodyHitDistanceSquared,
  bodySearchRadius,
  type PhysicsQuadtreeLeaf
} from "./physicsPipelineHelpers"

/** Revision-keyed body index used by PhysicsPipelineStore hit testing. */
export class PhysicsBodySpatialIndex {
  private maxSearchRadius = 0
  private revision = -1
  private tree: Quadtree<PhysicsBodyState> | null = null

  hitTest(
    world: PhysicsEngineAdapter,
    revision: number,
    liveBodyOrder: readonly string[],
    x: number,
    y: number,
    radius = 0
  ): PhysicsBodyState | null {
    const tree = this.ensure(world, revision)
    if (!tree) return null

    let best: PhysicsBodyState | null = null
    let bestDistanceSquared = Number.POSITIVE_INFINITY
    const searchRadius = Math.max(0, radius) + this.maxSearchRadius
    const minX = x - searchRadius
    const maxX = x + searchRadius
    const minY = y - searchRadius
    const maxY = y + searchRadius

    tree.visit((node, x0, y0, x1, y1) => {
      if (x1 < minX || x0 > maxX || y1 < minY || y0 > maxY) return true
      if (node.length) return false
      let leaf: PhysicsQuadtreeLeaf | undefined = node as PhysicsQuadtreeLeaf
      while (leaf) {
        const body = leaf.data
        if (body) {
          const distanceSquared = bodyHitDistanceSquared(body, x, y, Math.max(0, radius))
          if (
            distanceSquared != null &&
            (distanceSquared < bestDistanceSquared ||
              (distanceSquared === bestDistanceSquared &&
                liveBodyOrder.indexOf(body.id) > liveBodyOrder.indexOf(best?.id ?? "")))
          ) {
            best = body
            bestDistanceSquared = distanceSquared
          }
        }
        leaf = leaf.next
      }
      return false
    })
    return best
  }

  private ensure(
    world: PhysicsEngineAdapter,
    revision: number
  ): Quadtree<PhysicsBodyState> | null {
    if (this.tree && this.revision === revision) return this.tree

    const bodies = world.readState()
    if (bodies.length === 0) {
      this.tree = null
      this.maxSearchRadius = 0
      this.revision = revision
      return null
    }

    this.maxSearchRadius = bodies.reduce(
      (max, body) => Math.max(max, bodySearchRadius(body)),
      0
    )
    this.tree = d3Quadtree<PhysicsBodyState>()
      .x((body) => body.x)
      .y((body) => body.y)
      .addAll(bodies)
    this.revision = revision
    return this.tree
  }
}
