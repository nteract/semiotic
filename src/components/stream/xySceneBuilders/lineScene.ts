import type { Datum } from "../../charts/shared/datumTypes"
/**
 * Line scene builder — produces LineSceneNode[] from grouped data.
 *
 * Handles: color thresholds from annotations, ribbon envelopes
 * (boundsAccessor + band), and curve type attachment for canvas
 * interpolation.
 *
 * Dependencies: SceneGraph (buildLineNode), ribbonScene (buildRibbon*)
 * Consumed by: PipelineStore.buildSceneNodes (chartType "line")
 */
import type { SceneNode } from "../types"
import { buildLineNode } from "../SceneGraph"
import type { XYSceneContext } from "./types"
import { buildAggregateRibbons, buildPerSeriesRibbons, partitionRibbons } from "./ribbonScene"
import { emitPointNodes } from "./emitPointNodes"

export function buildLineScene(ctx: XYSceneContext, data: Datum[]): SceneNode[] {
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

  // Ribbons (bounds + band) paint first so they sit underneath the lines.
  // The PipelineStore composes both public envelope APIs into a single
  // resolvedRibbons array; scene-level dispatch only needs to know
  // whether each ribbon is per-series or aggregate.
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

  for (const g of groups) {
    const style = ctx.resolveLineStyle(g.key, g.data[0])
    const lineNode = buildLineNode(g.data, ctx.scales, ctx.getX, ctx.getY, style, g.key)
    if (colorThresholds && colorThresholds.length > 0) {
      lineNode.colorThresholds = colorThresholds
    }
    if (ctx.config.curve && ctx.config.curve !== "linear") {
      lineNode.curve = ctx.config.curve
    }
    if (ctx.config.lineGradient) {
      lineNode.strokeGradient = ctx.config.lineGradient
    }
    nodes.push(lineNode)
  }

  emitPointNodes(ctx, groups, nodes)

  return nodes
}
