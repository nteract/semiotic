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

  // Compute the gap-derived default width once. OHLC uses it as bodyWidth
  // (body rect). Range uses it as the basis for dot radius (bodyWidth/2),
  // additionally capped by the renderer to fit vertically at small heights.
  let bodyWidth = cs.bodyWidth ?? 0
  if (cs.bodyWidth == null) {
    const sortedX = data
      .map(d => ctx.getX(d))
      .filter(x => x != null && !Number.isNaN(x))
      .sort((a, b) => a - b)
    if (sortedX.length > 1) {
      let minGap = Infinity
      let previousX = ctx.scales.x(sortedX[0])
      for (let i = 1; i < sortedX.length; i++) {
        const x = ctx.scales.x(sortedX[i])
        const gap = Math.abs(x - previousX)
        if (gap > 0 && gap < minGap) minGap = gap
        previousX = x
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
    if (!isRangeMode && (open == null || Number.isNaN(open) || close == null || Number.isNaN(close))) continue

    const isUp = close >= open
    const overlay = ctx.config.pointStyle?.(d) ?? {}
    const overlayFill = typeof overlay.fill === "string" ? overlay.fill : undefined
    const overlayStroke = typeof overlay.stroke === "string" ? overlay.stroke : undefined

    const node: CandlestickSceneNode = {
      type: "candlestick",
      x: ctx.scales.x(xVal),
      openY: ctx.scales.y(open),
      closeY: ctx.scales.y(close),
      highY: ctx.scales.y(high),
      lowY: ctx.scales.y(low),
      bodyWidth,
      upColor: overlayFill && isUp ? overlayFill : upColor,
      downColor: overlayFill && !isUp ? overlayFill : downColor,
      wickColor: overlayStroke ?? (isRangeMode ? overlayFill ?? wickColor : wickColor),
      wickWidth,
      isUp,
      style: {
        cursor: cs.cursor,
        ...overlay,
      },
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
