import type { SceneNode, HeatcellSceneNode } from "../types"
import type { StreamRendererFn } from "./types"

/**
 * Canvas heatmap renderer.
 * Renders HeatcellSceneNode as filled rectangles with color encoding.
 */
export const heatmapCanvasRenderer: StreamRendererFn = (ctx, nodes, scales, layout) => {
  const heatNodes = nodes.filter((n): n is HeatcellSceneNode => n.type === "heatcell")

  for (const node of heatNodes) {
    ctx.fillStyle = node.fill
    ctx.fillRect(node.x, node.y, node.w, node.h)

    // Cell border
    ctx.strokeStyle = "#fff"
    ctx.lineWidth = 1
    ctx.strokeRect(node.x, node.y, node.w, node.h)
  }
}
