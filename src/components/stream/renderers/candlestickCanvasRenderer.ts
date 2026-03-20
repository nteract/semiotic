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

    // Draw body (open-close rect)
    const bodyTop = Math.min(n.openY, n.closeY)
    const bodyHeight = Math.abs(n.openY - n.closeY)
    const bodyColor = n.isUp ? n.upColor : n.downColor

    ctx.fillStyle = bodyColor
    ctx.fillRect(n.x - n.bodyWidth / 2, bodyTop, n.bodyWidth, Math.max(bodyHeight, 1))

    // Body border
    ctx.strokeStyle = bodyColor
    ctx.lineWidth = 1
    ctx.strokeRect(n.x - n.bodyWidth / 2, bodyTop, n.bodyWidth, Math.max(bodyHeight, 1))

    ctx.restore()
  }
}
