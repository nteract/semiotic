import type { SceneNode, PointSceneNode } from "../types"
import { resolveCSSColor } from "./resolveCSSColor"
import type { StreamRendererFn } from "./types"
import { renderCirclePulse } from "./renderPulse"

/**
 * Canvas point renderer.
 * Renders PointSceneNode as circles. Used by Scatterplot, BubbleChart, SwarmChart,
 * and showPoints on LineChart, AreaChart, and StackedAreaChart.
 * Supports pulse glow effect via _pulseIntensity/_pulseColor fields.
 */
export const pointCanvasRenderer: StreamRendererFn = (ctx, nodes, scales, layout) => {
  const pointNodes = nodes.filter((n): n is PointSceneNode => n.type === "point")
  if (pointNodes.length === 0) return

  ctx.save()
  try {
    for (const node of pointNodes) {
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)

      const alpha = node.style.opacity ?? node.style.fillOpacity
      if (alpha != null) {
        ctx.globalAlpha = alpha
      }

      ctx.fillStyle = (typeof node.style.fill === 'string' ? resolveCSSColor(ctx, node.style.fill) : node.style.fill) || "#4e79a7"
      ctx.fill()

      if (node.style.stroke) {
        ctx.strokeStyle = (typeof node.style.stroke === 'string' ? resolveCSSColor(ctx, node.style.stroke) : node.style.stroke) || node.style.stroke
        ctx.lineWidth = node.style.strokeWidth || 1
        ctx.stroke()
      }

      // Pulse glow ring
      renderCirclePulse(ctx, node)

      ctx.globalAlpha = 1
    }
  } finally {
    ctx.restore()
  }
}
