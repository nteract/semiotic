import type { SceneNode, RectSceneNode } from "../types"
import type { StreamRendererFn } from "./types"

/**
 * Canvas bar renderer.
 * Renders RectSceneNode as filled rectangles. Supports icon/isotype mode
 * where an image is stamped repeatedly to fill the bar instead of a solid fill.
 */
export const barCanvasRenderer: StreamRendererFn = (ctx, nodes, scales, layout) => {
  const rectNodes = nodes.filter((n): n is RectSceneNode => n.type === "rect")

  for (const node of rectNodes) {
    if (node.style.opacity != null) {
      ctx.globalAlpha = node.style.opacity
    }

    if (node.style.icon) {
      // Icon/isotype mode: stamp the image to fill the bar
      drawIconBar(ctx, node)
    } else {
      // Standard solid fill
      ctx.fillStyle = node.style.fill || "#007bff"
      ctx.fillRect(node.x, node.y, node.w, node.h)

      if (node.style.stroke) {
        ctx.strokeStyle = node.style.stroke
        ctx.lineWidth = node.style.strokeWidth || 1
        ctx.strokeRect(node.x, node.y, node.w, node.h)
      }
    }

    // Pulse overlay
    if (node._pulseIntensity && node._pulseIntensity > 0) {
      ctx.globalAlpha = node._pulseIntensity * 0.3
      ctx.fillStyle = node._pulseColor || "rgba(255,255,255,0.6)"
      ctx.fillRect(node.x, node.y, node.w, node.h)
    }

    ctx.globalAlpha = 1
  }
}

function drawIconBar(ctx: CanvasRenderingContext2D, node: RectSceneNode): void {
  const icon = node.style.icon!
  const padding = node.style.iconPadding || 2

  // Determine icon size: fit within the bar width
  const iconSize = Math.min(node.w, node.w) - padding
  if (iconSize <= 0) return

  // Determine if bar is primarily vertical or horizontal
  const isVerticalBar = node.h > node.w

  ctx.save()
  ctx.beginPath()
  ctx.rect(node.x, node.y, node.w, node.h)
  ctx.clip()

  if (isVerticalBar) {
    // Stamp icons from bottom to top
    const step = iconSize + padding
    const startY = node.y + node.h - iconSize
    const centerX = node.x + (node.w - iconSize) / 2

    for (let y = startY; y >= node.y - iconSize; y -= step) {
      ctx.drawImage(icon, centerX, y, iconSize, iconSize)
    }
  } else {
    // Stamp icons from left to right
    const step = iconSize + padding
    const centerY = node.y + (node.h - iconSize) / 2

    for (let x = node.x; x < node.x + node.w; x += step) {
      ctx.drawImage(icon, x, centerY, iconSize, iconSize)
    }
  }

  ctx.restore()
}
