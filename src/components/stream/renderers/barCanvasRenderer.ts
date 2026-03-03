import type { SceneNode, RectSceneNode } from "../types"
import type { StreamRendererFn } from "./types"

/**
 * Canvas bar renderer.
 * Renders RectSceneNode as filled rectangles. Used for time-binned bar charts.
 */
export const barCanvasRenderer: StreamRendererFn = (ctx, nodes, scales, layout) => {
  const rectNodes = nodes.filter((n): n is RectSceneNode => n.type === "rect")

  for (const node of rectNodes) {
    if (node.style.opacity != null) {
      ctx.globalAlpha = node.style.opacity
    }

    ctx.fillStyle = node.style.fill || "#007bff"
    ctx.fillRect(node.x, node.y, node.w, node.h)

    if (node.style.stroke) {
      ctx.strokeStyle = node.style.stroke
      ctx.lineWidth = node.style.strokeWidth || 1
      ctx.strokeRect(node.x, node.y, node.w, node.h)
    }

    ctx.globalAlpha = 1
  }
}
