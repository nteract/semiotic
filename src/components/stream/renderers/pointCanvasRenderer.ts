import type { PointSceneNode } from "../types"
import type { StreamRendererFn } from "./types"
import { renderCirclePulse } from "./renderPulse"
import { resolveCanvasFill } from "./canvasRenderHelpers"

/**
 * Canvas point renderer.
 * Renders PointSceneNode as circles. Used by Scatterplot, BubbleChart, SwarmChart,
 * and showPoints on LineChart, AreaChart, and StackedAreaChart.
 * Supports pulse glow effect via _pulseIntensity/_pulseColor fields.
 */
export const pointCanvasRenderer: StreamRendererFn = (ctx, nodes, _scales, _layout) => {
  const pointNodes = nodes.filter((n): n is PointSceneNode => n.type === "point")
  if (pointNodes.length === 0) return

  ctx.save()
  try {
    // Preserve the incoming canvas alpha (e.g. a chart-wide staleness dim) and
    // multiply each node's own opacity into it, rather than clobbering it to 1
    // — otherwise only the first node honored the dim and the rest reset to
    // full. `ctx.restore()` puts the base alpha back when we're done.
    const baseAlpha = ctx.globalAlpha
    for (const node of pointNodes) {
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)

      const alpha = node.style.opacity ?? node.style.fillOpacity ?? 1
      ctx.globalAlpha = baseAlpha * alpha

      ctx.fillStyle = resolveCanvasFill(ctx, node.style.fill, "#4e79a7")
      ctx.fill()

      // `"none"` is truthy: without this guard canvas rejects `strokeStyle =
      // "none"`, silently keeps the default black, and still strokes — drawing a
      // black ring where SVG (stroke="none") paints nothing. Matches the
      // `!== "none"` guard every other canvas renderer already uses.
      if (node.style.stroke && node.style.stroke !== "none") {
        ctx.strokeStyle = resolveCanvasFill(ctx, node.style.stroke, node.style.stroke)
        ctx.lineWidth = node.style.strokeWidth || 1
        ctx.stroke()
      }

      // Pulse glow ring
      renderCirclePulse(ctx, node)
    }
  } finally {
    ctx.restore()
  }
}
