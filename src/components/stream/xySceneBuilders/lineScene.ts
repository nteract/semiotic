/**
 * Line scene builder — produces LineSceneNode[] from grouped data.
 *
 * Handles: color thresholds from annotations, bounds/envelope areas,
 * and curve type attachment for canvas interpolation.
 *
 * Dependencies: SceneGraph (buildLineNode), boundsScene (buildBoundsForGroup)
 * Consumed by: PipelineStore.buildSceneNodes (chartType "line")
 */
import type { SceneNode } from "../types"
import { buildLineNode } from "../SceneGraph"
import type { XYSceneContext } from "./types"
import { buildBoundsForGroup } from "./boundsScene"
import { emitPointNodes } from "./emitPointNodes"

export function buildLineScene(ctx: XYSceneContext, data: Record<string, any>[]): SceneNode[] {
  const groups = ctx.groupData(data)
  const nodes: SceneNode[] = []

  // Extract color thresholds from annotations (if any)
  const colorThresholds = ctx.config.annotations
    ?.filter((a: any) => a.type === "threshold" && a.color)
    .map((a: any) => ({
      value: a.value as number,
      color: a.color as string,
      thresholdType: (a.thresholdType || "greater") as "greater" | "lesser"
    }))

  // Build bounds areas first so they render behind lines
  if (ctx.getBounds) {
    for (const g of groups) {
      const boundsNode = buildBoundsForGroup(ctx, g.data, g.key)
      if (boundsNode) nodes.push(boundsNode)
    }
  }

  for (const g of groups) {
    const style = ctx.resolveLineStyle(g.key, g.data[0])
    const lineNode = buildLineNode(g.data, ctx.scales, ctx.getX, ctx.getY, style, g.key)
    if (colorThresholds && colorThresholds.length > 0) {
      lineNode.colorThresholds = colorThresholds
    }
    if (ctx.config.curve && ctx.config.curve !== "linear") {
      lineNode.curve = ctx.config.curve
    }
    nodes.push(lineNode)
  }

  emitPointNodes(ctx, groups, nodes)

  return nodes
}
