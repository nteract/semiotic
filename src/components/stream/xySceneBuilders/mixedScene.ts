import type { Datum } from "../../charts/shared/datumTypes"
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
import { resolveAreaGradient } from "./areaGradient"
import { buildAggregateRibbons, buildPerSeriesRibbons, partitionRibbons } from "./ribbonScene"

export function buildMixedScene(ctx: XYSceneContext, data: Datum[]): SceneNode[] {
  const groups = ctx.groupData(data)
  const nodes: SceneNode[] = []
  const areaGroups = ctx.config.areaGroups || new Set<string>()

  // Ribbons (bounds + band) paint first so they sit behind both line and area marks.
  if (ctx.ribbons && ctx.ribbons.length > 0) {
    const { perSeries, aggregate } = partitionRibbons(ctx.ribbons)
    if (aggregate.length > 0) {
      nodes.push(...buildAggregateRibbons(ctx, data, aggregate))
    }
    if (perSeries.length > 0) {
      for (const g of groups) {
        nodes.push(...buildPerSeriesRibbons(ctx, g.data, g.key, perSeries))
      }
    }
  }

  const yDomain = ctx.scales.y.domain() as [number, number]
  const baseline = yDomain[0]

  const y0Get = ctx.getY0
    ? (d: Datum): number => {
        const value = ctx.getY0!(d)
        return value == null ? baseline : value
      }
    : undefined

  for (const g of groups) {
    if (areaGroups.has(g.key)) {
      // Render as area
      const style = ctx.resolveAreaStyle(g.key, g.data[0])
      const node = buildAreaNode(g.data, ctx.scales, ctx.getX, ctx.getY, baseline, style, g.key, y0Get)
      const fillGradient = resolveAreaGradient(ctx.config.gradientFill)
      if (fillGradient) {
        node.fillGradient = fillGradient
      }
      if (ctx.config.curve && ctx.config.curve !== "linear") {
        node.curve = ctx.config.curve
      }
      if (ctx.config.lineGradient) {
        node.strokeGradient = ctx.config.lineGradient
      }
      nodes.push(node)
    } else {
      // Render as line
      const style = ctx.resolveLineStyle(g.key, g.data[0])
      const lineNode = buildLineNode(g.data, ctx.scales, ctx.getX, ctx.getY, style, g.key)
      if (ctx.config.curve && ctx.config.curve !== "linear") {
        lineNode.curve = ctx.config.curve
      }
      if (ctx.config.lineGradient) {
        lineNode.strokeGradient = ctx.config.lineGradient
      }
      nodes.push(lineNode)
    }
  }

  emitPointNodes(ctx, groups, nodes)

  return nodes
}
