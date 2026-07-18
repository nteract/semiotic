import type { SceneNode, StreamScales, StreamLayout, CandlestickSceneNode } from "../types"
import type { StreamRendererFn } from "./types"
import { resolveCSSColor } from "./resolveCSSColor"

export const candlestickCanvasRenderer: StreamRendererFn = (
  ctx: CanvasRenderingContext2D,
  nodes: SceneNode[],
  _scales: StreamScales,
  layout: StreamLayout
) => {
  for (const node of nodes) {
    if (node.type !== "candlestick") continue
    const n = node as CandlestickSceneNode

    ctx.save()

    // Apply decay + transition opacity together. Decay is set by the decay
    // pipeline (streaming fade); style.opacity is driven by the transition
    // pipeline (enter/exit fades). Multiply so either can attenuate the mark.
    const decayOpacity = n._decayOpacity ?? 1
    const styleOpacity = n.style?.opacity ?? 1
    const alpha = decayOpacity * styleOpacity
    if (alpha !== 1) ctx.globalAlpha = alpha

    const wickColor = resolveCSSColor(ctx, n.wickColor) || n.wickColor

    // Compact sizes: the wick protrusion above/below the body is often <2px
    // and lands on subpixel boundaries, making it visually invisible. At those
    // heights we (a) bump the stroke width so each AA contribution reads as
    // ink, and (b) draw the wick AFTER the body so the full high-low line is
    // visible across the entire range, with the body showing as a thicker
    // middle segment. At normal heights we keep the traditional order (wick
    // behind, body covering the middle).
    const compact = layout.height < 60
    const effectiveWickWidth = compact ? Math.max(n.wickWidth, 2) : n.wickWidth

    const drawWick = () => {
      ctx.beginPath()
      ctx.moveTo(n.x, n.highY)
      ctx.lineTo(n.x, n.lowY)
      ctx.strokeStyle = wickColor
      ctx.lineWidth = effectiveWickWidth
      ctx.stroke()
    }

    if (!compact) drawWick()

    if (n.isRange) {
      // Range/dumbbell mode: endpoint bulbs. The radius is computed in the
      // scene builder (so canvas + SVG match); fall back to the same formula
      // for any node built before this field existed.
      const dotRadius = n.dotRadius ?? Math.max(2, Math.min(n.bodyWidth / 2, layout.height * 0.12))
      ctx.fillStyle = wickColor
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
      const rawBodyColor = n.isUp ? n.upColor : n.downColor
      const bodyColor = resolveCSSColor(ctx, rawBodyColor) || rawBodyColor

      ctx.fillStyle = bodyColor
      ctx.fillRect(n.x - n.bodyWidth / 2, bodyTop, n.bodyWidth, Math.max(bodyHeight, 1))
      ctx.strokeStyle = bodyColor
      ctx.lineWidth = 1
      ctx.strokeRect(n.x - n.bodyWidth / 2, bodyTop, n.bodyWidth, Math.max(bodyHeight, 1))
    }
    // When bodyWidth === 0 and not range mode, skip body entirely (user explicitly set width to 0)

    if (compact) drawWick()

    ctx.restore()
  }
}
