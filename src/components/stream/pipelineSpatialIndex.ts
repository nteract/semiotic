import { quadtree as d3Quadtree, type Quadtree } from "d3-quadtree"
import type { PipelineConfig } from "./pipelineConfig"
import type { PointSceneNode, SceneNode } from "./types"

/** Retained point-scene spatial index used by PipelineStore hit testing. */
export class PipelineSpatialIndex {
  private maxRadius = 0
  private tree: Quadtree<PointSceneNode> | null = null

  get quadtree(): Quadtree<PointSceneNode> | null {
    return this.tree
  }

  get maxPointRadius(): number {
    return this.maxRadius
  }

  clear(): void {
    this.tree = null
    this.maxRadius = 0
  }

  rebuild(chartType: PipelineConfig["chartType"], scene: SceneNode[]): void {
    if (chartType !== "scatter" && chartType !== "bubble" && chartType !== "custom") {
      this.clear()
      return
    }

    let pointCount = 0
    let maxRadius = 0
    for (const node of scene) {
      if (node.type === "point") {
        pointCount++
        if (node.r > maxRadius) maxRadius = node.r
      }
    }
    this.maxRadius = maxRadius
    if (pointCount <= 500) {
      this.tree = null
      return
    }

    const points: PointSceneNode[] = new Array(pointCount)
    let index = 0
    for (const node of scene) {
      if (node.type === "point") points[index++] = node
    }
    this.tree = d3Quadtree<PointSceneNode>()
      .x((node) => node.x)
      .y((node) => node.y)
      .addAll(points)
  }
}
