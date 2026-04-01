/**
 * Mixed scene builder — renders some series as areas and others as lines.
 *
 * Used when LineChart.fillArea is a string[] of series names.
 * Area groups get filled area rendering, the rest get line rendering.
 *
 * Dependencies: SceneGraph (buildLineNode, buildAreaNode)
 * Consumed by: PipelineStore.buildSceneNodes (chartType "mixed")
 */
import type { SceneNode } from "../types"
import { buildLineNode, buildAreaNode } from "../SceneGraph"
import type { XYSceneContext } from "./types"
import { emitPointNodes } from "./emitPointNodes"

export function buildMixedScene(ctx: XYSceneContext, data: Record<string, any>[]): SceneNode[] {
  const groups = ctx.groupData(data)
  const nodes: SceneNode[] = []
  const areaGroups = ctx.config.areaGroups || new Set<string>()

  const yDomain = ctx.scales.y.domain() as [number, number]
  const baseline = yDomain[0]

  for (const g of groups) {
    if (areaGroups.has(g.key)) {
      // Render as area
      const style = ctx.resolveAreaStyle(g.key, g.data[0])
      const node = buildAreaNode(g.data, ctx.scales, ctx.getX, ctx.getY, baseline, style, g.key)
      if (ctx.config.gradientFill) {
        node.fillGradient = ctx.config.gradientFill as any
      }
      if (ctx.config.curve && ctx.config.curve !== "linear") {
        node.curve = ctx.config.curve
      }
      nodes.push(node)
    } else {
      // Render as line
      const style = ctx.resolveLineStyle(g.key, g.data[0])
      const lineNode = buildLineNode(g.data, ctx.scales, ctx.getX, ctx.getY, style, g.key)
      if (ctx.config.curve && ctx.config.curve !== "linear") {
        lineNode.curve = ctx.config.curve
      }
      nodes.push(lineNode)
    }
  }

  emitPointNodes(ctx, groups, nodes)

  return nodes
}
