import type { Datum } from "../../charts/shared/datumTypes"
/**
 * Realtime swarm chart scene builder.
 *
 * Simple point scatter with category-based coloring from barColors config.
 *
 * Consumed by: PipelineStore.buildSceneNodes (chartType "swarm")
 */
import type { PointSceneNode } from "../types"
import type { XYSceneContext } from "./types"

export function buildSwarmScene(
  ctx: XYSceneContext,
  data: Datum[]
): PointSceneNode[] {
  const nodes: PointSceneNode[] = []
  const swarm = ctx.config.swarmStyle || {}
  const radius = swarm.radius ?? 3
  // Default swarm fill: user swarmStyle.fill > theme primary > hardcoded #007bff.
  const defaultFill =
    swarm.fill ?? ctx.config.themeSemantic?.primary ?? "#007bff"
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

    // Reuse StreamXYFrame's per-datum point-style channel for advanced swarm
    // encodings. The callback is the final layer: chart-level primitives and
    // category colors remain useful defaults, while a datum can override fill,
    // outline, opacity, or radius without dropping down to StreamXYFrame.
    const { r: styleR, ...restStyle } = ctx.config.pointStyle?.(d) ?? {}
    const node: PointSceneNode = {
      type: "point",
      x,
      y,
      r: styleR ?? radius,
      style: { fill, opacity, stroke, strokeWidth, ...restStyle },
      datum: d
    }

    if (ctx.getPointId) node.pointId = String(ctx.getPointId(d))
    nodes.push(node)
  }

  return nodes
}
