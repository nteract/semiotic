import type { SceneNode, HeatcellSceneNode } from "../types"
import type { StreamRendererFn } from "./types"

/**
 * Canvas heatmap renderer.
 * Renders HeatcellSceneNode as filled rectangles with color encoding.
 */
export const heatmapCanvasRenderer: StreamRendererFn = (ctx, nodes, scales, layout) => {
  const heatNodes = nodes.filter((n): n is HeatcellSceneNode => n.type === "heatcell")

  for (const node of heatNodes) {
    // Apply decay opacity if present (stored as style.opacity by applyDecay)
    const nodeStyle = (node as any).style
    if (nodeStyle?.opacity != null) {
      ctx.globalAlpha = nodeStyle.opacity
    }

    ctx.fillStyle = node.fill
    ctx.fillRect(node.x, node.y, node.w, node.h)

    // Cell border
    ctx.strokeStyle = "#fff"
    ctx.lineWidth = 1
    ctx.strokeRect(node.x, node.y, node.w, node.h)

    // Pulse overlay
    if (node._pulseIntensity && node._pulseIntensity > 0) {
      ctx.globalAlpha = node._pulseIntensity * 0.3
      ctx.fillStyle = node._pulseColor || "rgba(255,255,255,0.6)"
      ctx.fillRect(node.x, node.y, node.w, node.h)
    }

    ctx.globalAlpha = 1
  }
}
