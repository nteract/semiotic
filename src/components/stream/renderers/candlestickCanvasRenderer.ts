import type { SceneNode, StreamScales, StreamLayout, CandlestickSceneNode } from "../types"
import type { StreamRendererFn } from "./types"

export const candlestickCanvasRenderer: StreamRendererFn = (
  ctx: CanvasRenderingContext2D,
  nodes: SceneNode[],
  _scales: StreamScales,
  _layout: StreamLayout
) => {
  for (const node of nodes) {
    if (node.type !== "candlestick") continue
    const n = node as CandlestickSceneNode

    ctx.save()

    // Apply decay opacity if present
    const decayOpacity = n._decayOpacity
    if (decayOpacity != null && decayOpacity !== 1) {
      ctx.globalAlpha = decayOpacity
    }

    // Draw wick (high-low line)
    ctx.beginPath()
    ctx.moveTo(n.x, n.highY)
    ctx.lineTo(n.x, n.lowY)
    ctx.strokeStyle = n.wickColor
    ctx.lineWidth = n.wickWidth
    ctx.stroke()

    if (n.isRange) {
      // Range/dumbbell mode: draw endpoint dots instead of body
      const dotRadius = Math.max(n.wickWidth * 2, 4)
      ctx.fillStyle = n.wickColor
      ctx.beginPath()
      ctx.arc(n.x, n.highY, dotRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(n.x, n.lowY, dotRadius, 0, Math.PI * 2)
      ctx.fill()
    } else if (n.bodyWidth > 0) {
      // Candlestick mode: draw body rect
      const bodyTop = Math.min(n.openY, n.closeY)
      const bodyHeight = Math.abs(n.openY - n.closeY)
      const bodyColor = n.isUp ? n.upColor : n.downColor

      ctx.fillStyle = bodyColor
      ctx.fillRect(n.x - n.bodyWidth / 2, bodyTop, n.bodyWidth, Math.max(bodyHeight, 1))
      ctx.strokeStyle = bodyColor
      ctx.lineWidth = 1
      ctx.strokeRect(n.x - n.bodyWidth / 2, bodyTop, n.bodyWidth, Math.max(bodyHeight, 1))
    }
    // When bodyWidth === 0 and not range mode, skip body entirely (user explicitly set width to 0)

    ctx.restore()
  }
}
