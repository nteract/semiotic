/**
 * Waterfall chart scene builder.
 *
 * Builds cumulative delta bars from time-series data. Each bar's base starts
 * where the previous bar ended. Positive/negative deltas get distinct colors.
 *
 * Dependencies: SceneGraph (buildRectNode)
 * Consumed by: PipelineStore.buildSceneNodes (chartType "waterfall")
 */
import type { Datum } from "../../charts/shared/datumTypes"
import type { RectSceneNode, StreamLayout, Style } from "../types"
import { buildRectNode } from "../SceneGraph"
import type { XYSceneContext } from "./types"

export function buildWaterfallScene(ctx: XYSceneContext, data: Datum[], layout: StreamLayout): RectSceneNode[] {
  const nodes: RectSceneNode[] = []
  const scales = ctx.scales
  const ws = ctx.config.waterfallStyle

  const arr = data.filter(d => {
    const v = ctx.getY(d)
    const t = ctx.getX(d)
    return v != null && !Number.isNaN(v) && t != null && isFinite(t as number)
  })
  if (arr.length === 0) return nodes

  // Status-aware defaults: gains/losses map to the theme's success/danger
  // roles. A custom theme that omits them keeps the hardcoded status green/red.
  const positiveColor = ws?.positiveColor ?? ctx.config.themeSemantic?.success ?? "#28a745"
  const negativeColor = ws?.negativeColor ?? ctx.config.themeSemantic?.danger ?? "#dc3545"
  const gap = ws?.gap ?? 1
  const barStroke = ws?.stroke
  const barStrokeWidth = ws?.strokeWidth
  const barOpacity = ws?.opacity
  let baseline = 0

  for (let i = 0; i < arr.length; i++) {
    const d = arr[i]
    const t = ctx.getX(d)
    const delta = ctx.getY(d)
    const cumEnd = baseline + delta

    let barWidthTime: number
    if (i < arr.length - 1) {
      barWidthTime = ctx.getX(arr[i + 1]) - t
    } else if (i > 0) {
      barWidthTime = t - ctx.getX(arr[i - 1])
    } else {
      barWidthTime = 0
    }

    const rawX0 = scales.x(t)
    const rawX1 = barWidthTime !== 0 ? scales.x(t + barWidthTime) : rawX0 + layout.width / 10
    const x0 = Math.min(rawX0, rawX1) + gap / 2
    const x1 = Math.max(rawX0, rawX1) - gap / 2
    const barWidth = x1 - x0
    if (barWidth <= 0) {
      baseline = cumEnd
      continue
    }

    const yBaseline = scales.y(baseline)
    const yTop = scales.y(cumEnd)
    const rectY = Math.min(yBaseline, yTop)
    const rectH = Math.abs(yBaseline - yTop)

    const fill = delta >= 0 ? positiveColor : negativeColor
    const rectStyle: Style = { fill, stroke: barStroke, strokeWidth: barStrokeWidth }
    if (barOpacity != null) rectStyle.opacity = barOpacity
    nodes.push(buildRectNode(
      x0, rectY, barWidth, rectH,
      rectStyle,
      { ...d, baseline, cumEnd, delta, _connectorStroke: ws?.connectorStroke, _connectorWidth: ws?.connectorWidth }
    ))

    baseline = cumEnd
  }

  return nodes
}
