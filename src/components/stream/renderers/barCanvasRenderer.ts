import type { SceneNode, RectSceneNode } from "../types"
import type { StreamRendererFn } from "./types"
import { renderRectPulse } from "./renderPulse"
import { resolveCSSColor } from "./resolveCSSColor"

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
    } else if (node.roundedTop) {
      // Rounded corners on the end away from the baseline
      ctx.fillStyle = (typeof node.style.fill === "string" ? resolveCSSColor(ctx, node.style.fill) : node.style.fill) || "#007bff"
      const r = Math.min(node.roundedTop, node.w / 2, node.h / 2)
      ctx.beginPath()
      if (node.roundedEdge === "right") {
        // Horizontal: round the right edge (value end)
        ctx.moveTo(node.x, node.y)                              // top-left
        ctx.lineTo(node.x + node.w - r, node.y)                 // top edge
        ctx.arcTo(node.x + node.w, node.y, node.x + node.w, node.y + r, r) // top-right
        ctx.lineTo(node.x + node.w, node.y + node.h - r)        // right side down
        ctx.arcTo(node.x + node.w, node.y + node.h, node.x + node.w - r, node.y + node.h, r) // bottom-right
        ctx.lineTo(node.x, node.y + node.h)                     // bottom edge
        ctx.closePath()
      } else {
        // Vertical: round the top edge (value end)
        ctx.moveTo(node.x, node.y + node.h)                     // bottom-left
        ctx.lineTo(node.x, node.y + r)                           // left side up
        ctx.arcTo(node.x, node.y, node.x + r, node.y, r)       // top-left
        ctx.lineTo(node.x + node.w - r, node.y)                 // top edge
        ctx.arcTo(node.x + node.w, node.y, node.x + node.w, node.y + r, r) // top-right
        ctx.lineTo(node.x + node.w, node.y + node.h)            // right side down
        ctx.closePath()
      }
      ctx.fill()

      if (node.style.stroke && node.style.stroke !== "none") {
        ctx.strokeStyle = resolveCSSColor(ctx, node.style.stroke) || node.style.stroke
        ctx.lineWidth = node.style.strokeWidth || 1
        ctx.stroke()
      }
    } else {
      // Standard solid fill
      ctx.fillStyle = (typeof node.style.fill === "string" ? resolveCSSColor(ctx, node.style.fill) : node.style.fill) || "#007bff"
      ctx.fillRect(node.x, node.y, node.w, node.h)

      if (node.style.stroke && node.style.stroke !== "none") {
        ctx.strokeStyle = resolveCSSColor(ctx, node.style.stroke) || node.style.stroke
        ctx.lineWidth = node.style.strokeWidth || 1
        ctx.strokeRect(node.x, node.y, node.w, node.h)
      }
    }

    // Pulse overlay
    renderRectPulse(ctx, node)

    ctx.globalAlpha = 1
  }
}

function drawIconBar(ctx: CanvasRenderingContext2D, node: RectSceneNode): void {
  const icon = node.style.icon!
  const padding = node.style.iconPadding || 2

  // Determine icon size: fit within the bar width
  const iconSize = Math.min(node.w, node.h) - padding
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
