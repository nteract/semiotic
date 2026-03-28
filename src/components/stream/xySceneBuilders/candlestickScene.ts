/**
 * Candlestick (OHLC) scene builder.
 *
 * Renders open-high-low-close bars with auto-width sizing based on data spacing.
 *
 * Consumed by: PipelineStore.buildSceneNodes (chartType "candlestick")
 */
import type { SceneNode, CandlestickSceneNode, StreamLayout } from "../types"
import type { XYSceneContext } from "./types"

export function buildCandlestickScene(ctx: XYSceneContext, data: Record<string, any>[], layout: StreamLayout): SceneNode[] {
  if (!ctx.getOpen || !ctx.getHigh || !ctx.getLow || !ctx.getClose || !ctx.scales) return []

  const nodes: SceneNode[] = []
  const cs = ctx.config.candlestickStyle || {}
  const upColor = cs.upColor || "#28a745"
  const downColor = cs.downColor || "#dc3545"
  const wickColor = cs.wickColor || "#333"
  const wickWidth = cs.wickWidth || 1

  const sortedX = data
    .map(d => ctx.getX(d))
    .filter(x => x != null && !Number.isNaN(x))
    .sort((a, b) => a - b)

  let bodyWidth = cs.bodyWidth || 6
  if (!cs.bodyWidth && sortedX.length > 1) {
    let minGap = Infinity
    for (let i = 1; i < sortedX.length; i++) {
      const gap = Math.abs(ctx.scales.x(sortedX[i]) - ctx.scales.x(sortedX[i - 1]))
      if (gap > 0 && gap < minGap) minGap = gap
    }
    if (minGap !== Infinity) {
      bodyWidth = Math.max(2, Math.min(minGap * 0.6, 20))
    }
  }

  for (const d of data) {
    const xVal = ctx.getX(d)
    if (xVal == null || Number.isNaN(xVal)) continue

    const open = ctx.getOpen(d)
    const high = ctx.getHigh(d)
    const low = ctx.getLow(d)
    const close = ctx.getClose(d)
    if ([open, high, low, close].some(v => v == null || Number.isNaN(v))) continue

    const isUp = close >= open

    nodes.push({
      type: "candlestick",
      x: ctx.scales.x(xVal),
      openY: ctx.scales.y(open),
      closeY: ctx.scales.y(close),
      highY: ctx.scales.y(high),
      lowY: ctx.scales.y(low),
      bodyWidth,
      upColor,
      downColor,
      wickColor,
      wickWidth,
      isUp,
      datum: d
    } as CandlestickSceneNode)
  }

  return nodes
}
