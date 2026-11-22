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
import { buildLineGroup } from "./seriesGroup"
import type { XYSceneContext } from "./types"
import { buildRibbonScene } from "./ribbonScene"
import { emitPointNodes } from "./emitPointNodes"

interface ColorThresholdAnnotation extends Datum {
  type: "threshold"
  color: string
  value: number
  thresholdType?: "greater" | "lesser"
}

function isColorThresholdAnnotation(annotation: Datum): annotation is ColorThresholdAnnotation {
  return annotation.type === "threshold"
    && typeof annotation.color === "string"
    && typeof annotation.value === "number"
}

export function buildLineScene(ctx: XYSceneContext, data: Datum[]): SceneNode[] {
  const groups = ctx.groupData(data)
  const nodes: SceneNode[] = buildRibbonScene(ctx, data, groups)

  // Extract color thresholds from annotations (if any)
  const colorThresholds = ctx.config.annotations
    ?.filter(isColorThresholdAnnotation)
    .map((a) => ({
      value: a.value,
      color: a.color,
      thresholdType: a.thresholdType || "greater"
    }))

  for (const g of groups) {
    const lineNode = buildLineGroup(ctx, g)
    if (colorThresholds && colorThresholds.length > 0) {
      lineNode.colorThresholds = colorThresholds
    }
    nodes.push(lineNode)
  }

  emitPointNodes(ctx, groups, nodes)

  return nodes
}
