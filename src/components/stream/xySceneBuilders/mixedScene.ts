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
import type { XYSceneContext } from "./types"
import { emitPointNodes } from "./emitPointNodes"
import { buildAreaGroup, buildLineGroup } from "./seriesGroup"
import { buildRibbonScene } from "./ribbonScene"

export function buildMixedScene(ctx: XYSceneContext, data: Datum[]): SceneNode[] {
  const groups = ctx.groupData(data)
  const nodes: SceneNode[] = buildRibbonScene(ctx, data, groups)
  const areaGroups = ctx.config.areaGroups || new Set<string>()

  const baseline = ctx.scales.y.domain()[0] as number
  for (const group of groups) {
    nodes.push(areaGroups.has(group.key) ? buildAreaGroup(ctx, group, baseline) : buildLineGroup(ctx, group))
  }

  emitPointNodes(ctx, groups, nodes)

  return nodes
}
