import type { SceneNode, PointSceneNode } from "../types"
import type { StreamRendererFn } from "./types"

/**
 * Canvas point renderer.
 * Renders PointSceneNode as circles. Used for Scatterplot, BubbleChart, and SwarmChart.
 */
export const pointCanvasRenderer: StreamRendererFn = (ctx, nodes, scales, layout) => {
  const pointNodes = nodes.filter((n): n is PointSceneNode => n.type === "point")

  for (const node of pointNodes) {
    ctx.beginPath()
    ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)

    if (node.style.opacity != null) {
      ctx.globalAlpha = node.style.opacity
    }

    ctx.fillStyle = node.style.fill || "#4e79a7"
    ctx.fill()

    if (node.style.stroke) {
      ctx.strokeStyle = node.style.stroke
      ctx.lineWidth = node.style.strokeWidth || 1
      ctx.stroke()
    }

    ctx.globalAlpha = 1
  }
}
