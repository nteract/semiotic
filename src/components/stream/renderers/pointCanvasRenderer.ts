import type { SceneNode, PointSceneNode } from "../types"
import type { StreamRendererFn } from "./types"

/**
 * Canvas point renderer.
 * Renders PointSceneNode as circles. Used for Scatterplot, BubbleChart, and SwarmChart.
 * Supports pulse glow effect via _pulseIntensity/_pulseColor fields.
 */
export const pointCanvasRenderer: StreamRendererFn = (ctx, nodes, scales, layout) => {
  const pointNodes = nodes.filter((n): n is PointSceneNode => n.type === "point")

  for (const node of pointNodes) {
    ctx.beginPath()
    ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)

    const alpha = node.style.opacity ?? node.style.fillOpacity
    if (alpha != null) {
      ctx.globalAlpha = alpha
    }

    ctx.fillStyle = node.style.fill || "#4e79a7"
    ctx.fill()

    if (node.style.stroke) {
      ctx.strokeStyle = node.style.stroke
      ctx.lineWidth = node.style.strokeWidth || 1
      ctx.stroke()
    }

    // Pulse glow ring
    if (node._pulseIntensity && node._pulseIntensity > 0) {
      const glowRadius = 4
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.r + glowRadius * node._pulseIntensity, 0, Math.PI * 2)
      ctx.strokeStyle = node._pulseColor || "rgba(255,255,255,0.6)"
      ctx.lineWidth = 2 * node._pulseIntensity
      ctx.globalAlpha = node._pulseIntensity * 0.5
      ctx.stroke()
    }

    ctx.globalAlpha = 1
  }
}
