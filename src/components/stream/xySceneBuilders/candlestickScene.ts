import type { Datum } from "../../charts/shared/datumTypes"
/**
 * Candlestick (OHLC) scene builder.
 *
 * Renders open-high-low-close bars with auto-width sizing based on data spacing.
 *
 * Consumed by: PipelineStore.buildSceneNodes (chartType "candlestick")
 */
import type { CandlestickSceneNode, StreamLayout } from "../types"
import type { XYSceneContext } from "./types"

export function buildCandlestickScene(ctx: XYSceneContext, data: Datum[], layout: StreamLayout): CandlestickSceneNode[] {
  if (!ctx.getHigh || !ctx.getLow || !ctx.scales) return []

  // Range mode: detected by PipelineStore when both open/close accessors are missing.
  // If only one of open/close is provided (invalid config), return empty.
  const isRangeMode = ctx.config.candlestickRangeMode ?? false
  if (!isRangeMode && (!ctx.getOpen || !ctx.getClose)) return []

  const nodes: CandlestickSceneNode[] = []
  const cs = ctx.config.candlestickStyle || {}
  const rangeColor = cs.rangeColor || "#6366f1"
  const upColor = isRangeMode ? rangeColor : (cs.upColor || "#28a745")
  const downColor = isRangeMode ? rangeColor : (cs.downColor || "#dc3545")
  const wickColor = isRangeMode ? rangeColor : (cs.wickColor || "#333")
  const wickWidth = cs.wickWidth || (isRangeMode ? 2 : 1)

  const sortedX = data
    .map(d => ctx.getX(d))
    .filter(x => x != null && !Number.isNaN(x))
    .sort((a, b) => a - b)

  // Compute the gap-derived default width once. OHLC uses it as bodyWidth
  // (body rect). Range uses it as the basis for dot radius (bodyWidth/2),
  // additionally capped by the renderer to fit vertically at small heights.
  let bodyWidth = cs.bodyWidth ?? 0
  if (cs.bodyWidth == null) {
    if (sortedX.length > 1) {
      let minGap = Infinity
      for (let i = 1; i < sortedX.length; i++) {
        const gap = Math.abs(ctx.scales.x(sortedX[i]) - ctx.scales.x(sortedX[i - 1]))
        if (gap > 0 && gap < minGap) minGap = gap
      }
      bodyWidth = minGap !== Infinity ? Math.max(2, Math.min(minGap * 0.6, 20)) : 6
    } else {
      bodyWidth = 6
    }
  }

  for (const d of data) {
    const xVal = ctx.getX(d)
    if (xVal == null || Number.isNaN(xVal)) continue

    const high = ctx.getHigh(d)
    const low = ctx.getLow(d)
    if (high == null || Number.isNaN(high) || low == null || Number.isNaN(low)) continue

    // In range mode: open/close mirror high/low (no body distinction)
    const open = isRangeMode ? high : ctx.getOpen!(d)
    const close = isRangeMode ? low : ctx.getClose!(d)
    if (!isRangeMode && [open, close].some(v => v == null || Number.isNaN(v))) continue

    const isUp = close >= open

    const node: CandlestickSceneNode = {
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
      datum: d,
    }
    if (isRangeMode) {
      node.isRange = true
      // Endpoint bulb radius: scales with the gap-derived bodyWidth, capped by
      // canvas height so short (sparkline) rows don't get marble-sized dots,
      // floored at 2px. Computing it here keeps Canvas and SVG geometry equal.
      node.dotRadius = Math.max(2, Math.min(bodyWidth / 2, layout.height * 0.12))
    }
    nodes.push(node as CandlestickSceneNode)
  }

  return nodes
}
