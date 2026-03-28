/**
 * Waterfall chart scene builder.
 *
 * Builds cumulative delta bars from time-series data. Each bar's base starts
 * where the previous bar ended. Positive/negative deltas get distinct colors.
 *
 * Dependencies: SceneGraph (buildRectNode)
 * Consumed by: PipelineStore.buildSceneNodes (chartType "waterfall")
 */
import type { SceneNode, StreamLayout } from "../types"
import { buildRectNode } from "../SceneGraph"
import type { XYSceneContext } from "./types"

export function buildWaterfallScene(ctx: XYSceneContext, data: Record<string, any>[], layout: StreamLayout): SceneNode[] {
  const nodes: SceneNode[] = []
  const scales = ctx.scales
  const ws = ctx.config.waterfallStyle

  const arr = data.filter(d => {
    const v = ctx.getY(d)
    return v != null && !Number.isNaN(v)
  })
  if (arr.length === 0) return nodes

  const positiveColor = ws?.positiveColor ?? "#28a745"
  const negativeColor = ws?.negativeColor ?? "#dc3545"
  const gap = ws?.gap ?? 1
  const barStroke = ws?.stroke
  const barStrokeWidth = ws?.strokeWidth
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
    nodes.push(buildRectNode(
      x0, rectY, barWidth, rectH,
      { fill, stroke: barStroke, strokeWidth: barStrokeWidth },
      { ...d, baseline, cumEnd, delta, _connectorStroke: ws?.connectorStroke, _connectorWidth: ws?.connectorWidth }
    ))

    baseline = cumEnd
  }

  return nodes
}
