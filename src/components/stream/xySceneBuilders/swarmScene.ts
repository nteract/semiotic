/**
 * Realtime swarm chart scene builder.
 *
 * Simple point scatter with category-based coloring from barColors config.
 *
 * Consumed by: PipelineStore.buildSceneNodes (chartType "swarm")
 */
import type { SceneNode, PointSceneNode } from "../types"
import type { XYSceneContext } from "./types"

export function buildSwarmScene(ctx: XYSceneContext, data: Record<string, any>[]): SceneNode[] {
  const nodes: SceneNode[] = []
  const swarm = ctx.config.swarmStyle || {}
  const radius = swarm.radius ?? 3
  const defaultFill = swarm.fill ?? "#007bff"
  const opacity = swarm.opacity ?? 0.7
  const stroke = swarm.stroke
  const strokeWidth = swarm.strokeWidth

  for (const d of data) {
    const xVal = ctx.getX(d)
    const yVal = ctx.getY(d)
    if (yVal == null || Number.isNaN(yVal)) continue

    const x = ctx.scales.x(xVal)
    const y = ctx.scales.y(yVal)

    let fill = defaultFill
    if (ctx.getCategory) {
      const cat = ctx.getCategory(d)
      fill = ctx.config.barColors?.[cat] || fill
    }

    const node: PointSceneNode = {
      type: "point",
      x, y, r: radius,
      style: { fill, opacity, stroke, strokeWidth },
      datum: d
    }
    if (ctx.getPointId) node.pointId = String(ctx.getPointId(d))
    nodes.push(node)
  }

  return nodes
}
