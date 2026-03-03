import type { SceneNode, LineSceneNode } from "../types"
import type { StreamRendererFn } from "./types"

/**
 * Canvas line renderer.
 * Renders LineSceneNode paths using moveTo/lineTo.
 * For bounded mode with curve interpolation, the path coordinates
 * are already computed by PipelineStore (via d3-shape curves when applicable).
 * For streaming mode, uses direct lineTo for maximum performance.
 */
export const lineCanvasRenderer: StreamRendererFn = (ctx, nodes, scales, layout) => {
  const lineNodes = nodes.filter((n): n is LineSceneNode => n.type === "line")

  for (const node of lineNodes) {
    if (node.path.length < 2) continue

    ctx.beginPath()
    ctx.strokeStyle = node.style.stroke || "#007bff"
    ctx.lineWidth = node.style.strokeWidth || 2

    if (node.style.strokeDasharray) {
      ctx.setLineDash(node.style.strokeDasharray.split(/[\s,]+/).map(Number))
    } else {
      ctx.setLineDash([])
    }

    if (node.style.opacity != null) {
      ctx.globalAlpha = node.style.opacity
    }

    const [startX, startY] = node.path[0]
    ctx.moveTo(startX, startY)
    for (let i = 1; i < node.path.length; i++) {
      ctx.lineTo(node.path[i][0], node.path[i][1])
    }
    ctx.stroke()

    // Fill area under line if fillOpacity is set
    if (node.style.fill && node.style.fillOpacity && node.style.fillOpacity > 0) {
      ctx.globalAlpha = node.style.fillOpacity
      ctx.fillStyle = node.style.fill
      // Close path to bottom
      const lastX = node.path[node.path.length - 1][0]
      const firstX = node.path[0][0]
      ctx.lineTo(lastX, layout.height)
      ctx.lineTo(firstX, layout.height)
      ctx.closePath()
      ctx.fill()
    }

    ctx.globalAlpha = 1
    ctx.setLineDash([])
  }
}
