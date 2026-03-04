import type { SceneNode, AreaSceneNode } from "../types"
import type { StreamRendererFn } from "./types"

/**
 * Canvas area renderer.
 * Renders AreaSceneNode as filled regions between topPath and bottomPath.
 * Supports both overlapping areas and stacked areas.
 */
export const areaCanvasRenderer: StreamRendererFn = (ctx, nodes, scales, layout) => {
  const areaNodes = nodes.filter((n): n is AreaSceneNode => n.type === "area")

  for (const node of areaNodes) {
    if (node.topPath.length < 2) continue

    ctx.beginPath()

    // Draw top path forward
    const [startX, startY] = node.topPath[0]
    ctx.moveTo(startX, startY)
    for (let i = 1; i < node.topPath.length; i++) {
      ctx.lineTo(node.topPath[i][0], node.topPath[i][1])
    }

    // Draw bottom path backward to close the area
    for (let i = node.bottomPath.length - 1; i >= 0; i--) {
      ctx.lineTo(node.bottomPath[i][0], node.bottomPath[i][1])
    }

    ctx.closePath()

    // Fill
    const fillOpacity = node.style.fillOpacity ?? 0.7
    ctx.globalAlpha = fillOpacity
    ctx.fillStyle = node.style.fill || "#4e79a7"
    ctx.fill()

    // Stroke on top
    if (node.style.stroke && node.style.stroke !== "none") {
      ctx.globalAlpha = 1
      ctx.strokeStyle = node.style.stroke
      ctx.lineWidth = node.style.strokeWidth || 2
      ctx.setLineDash([])

      // Only stroke the top path (not the baseline)
      ctx.beginPath()
      ctx.moveTo(node.topPath[0][0], node.topPath[0][1])
      for (let i = 1; i < node.topPath.length; i++) {
        ctx.lineTo(node.topPath[i][0], node.topPath[i][1])
      }
      ctx.stroke()
    }

    ctx.globalAlpha = 1
  }
}
