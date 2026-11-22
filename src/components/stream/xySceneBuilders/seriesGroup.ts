import type { Datum } from "../../charts/shared/datumTypes"
import { seriesSelectionDatum } from "../../store/selectionProvenance"
import { buildAreaNode, buildLineNode } from "../SceneGraph"
import type { AreaSceneNode, LineSceneNode } from "../types"
import { resolveAreaGradient, resolveAreaGradientSpan } from "./areaGradient"
import type { XYSceneContext } from "./types"

type SeriesGroup = { key: string; data: Datum[] }

function applyStroke(ctx: XYSceneContext, node: LineSceneNode | AreaSceneNode) {
  const { curve, lineGradient } = ctx.config
  if (curve && curve !== "linear") node.curve = curve
  if (lineGradient) node.strokeGradient = lineGradient
}

export function buildLineGroup(ctx: XYSceneContext, { key, data }: SeriesGroup) {
  const style = ctx.resolveLineStyle(key, seriesSelectionDatum(data))
  const node = buildLineNode(data, ctx.scales, ctx.getX, ctx.getY, style, key, ctx.getPointId)
  applyStroke(ctx, node)
  return node
}

export function buildAreaGroup(ctx: XYSceneContext, { key, data }: SeriesGroup, baseline: number) {
  const style = ctx.resolveAreaStyle(key, seriesSelectionDatum(data))
  const getY0 = ctx.getY0
  const node = buildAreaNode(data, ctx.scales, ctx.getX, ctx.getY, baseline, style, key,
    getY0 && (d => getY0(d) ?? baseline), ctx.getPointId)
  const gradient = resolveAreaGradient(ctx.config.gradientFill)
  if (gradient) {
    node.fillGradient = gradient
    const span = resolveAreaGradientSpan(gradient, ctx.scales.y)
    if (span) node.fillGradientSpan = span
  }
  applyStroke(ctx, node)
  return node
}
