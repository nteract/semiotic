import type { RectSceneNode } from "../types"
import type { StreamRendererFn } from "./types"
import { renderRectPulse } from "./renderPulse"
import { resolveCSSColor } from "./resolveCSSColor"
import { buildLinearFillGradient, resolveCanvasFill } from "./canvasRenderHelpers"
import { hasAnyCornerRadius, clampCornerRadii } from "./cornerRadii"

/**
 * Trace a rect path with per-corner radii. Shared shape utilities live
 * in `./cornerRadii.ts`; this function owns the canvas drawing language
 * (`beginPath` / `arcTo` / `closePath`). Sweep direction is CCW from
 * top-left so the resulting path matches the existing rounded path.
 */
function tracePerCornerPath(ctx: CanvasRenderingContext2D, node: RectSceneNode): void {
  const { x, y, w, h } = node
  const { tl, tr, br, bl } = clampCornerRadii(node)
  ctx.beginPath()
  ctx.moveTo(x + tl, y)
  ctx.lineTo(x + w - tr, y)
  if (tr > 0) ctx.arcTo(x + w, y, x + w, y + tr, tr)
  ctx.lineTo(x + w, y + h - br)
  if (br > 0) ctx.arcTo(x + w, y + h, x + w - br, y + h, br)
  ctx.lineTo(x + bl, y + h)
  if (bl > 0) ctx.arcTo(x, y + h, x, y + h - bl, bl)
  ctx.lineTo(x, y + tl)
  if (tl > 0) ctx.arcTo(x, y, x + tl, y, tl)
  ctx.closePath()
}

/**
 * Resolve the tip→base axis for a `RectSceneNode`. Mirrors AreaChart's
 * direction so the same `gradientFill` input yields analogous output
 * across chart types: the tip is opposite the baseline, the base is
 * the baseline edge.
 */
function barGradientAxis(node: RectSceneNode): { x0: number; y0: number; x1: number; y1: number } {
  // Default = top-to-bottom (matches positive vertical bars) when
  // orientation is unknown.
  switch (node.roundedEdge) {
    case "bottom": return { x0: node.x, y0: node.y + node.h, x1: node.x, y1: node.y }
    case "right":  return { x0: node.x + node.w, y0: node.y, x1: node.x, y1: node.y }
    case "left":   return { x0: node.x, y0: node.y, x1: node.x + node.w, y1: node.y }
    default:       return { x0: node.x, y0: node.y, x1: node.x, y1: node.y + node.h }
  }
}

/**
 * Canvas bar renderer.
 * Renders RectSceneNode as filled rectangles. Supports icon/isotype mode
 * where an image is stamped repeatedly to fill the bar instead of a solid fill.
 */
export const barCanvasRenderer: StreamRendererFn = (ctx, nodes, _scales, _layout) => {
  const rectNodes = nodes.filter((n): n is RectSceneNode => n.type === "rect")

  for (const node of rectNodes) {
    if (node.style.opacity != null) {
      ctx.globalAlpha = node.style.opacity
    }

    if (node.style.icon) {
      // Icon/isotype mode: stamp the image to fill the bar
      drawIconBar(ctx, node)
    } else if (node.cornerRadii && hasAnyCornerRadius(node.cornerRadii)) {
      // Explicit per-corner radii (swimlane's leading/trailing rounding).
      // Same fill resolution as the roundedTop branch so gradients still
      // flow tip→base along the bar axis.
      const solid = resolveCanvasFill(ctx, node.style.fill, resolveCSSColor(ctx, "var(--semiotic-primary, #007bff)")!)
      const axis = barGradientAxis(node)
      const grad = node.fillGradient && typeof solid === "string"
        ? buildLinearFillGradient(ctx, node.fillGradient, solid, axis.x0, axis.y0, axis.x1, axis.y1)
        : null
      ctx.fillStyle = grad || solid
      tracePerCornerPath(ctx, node)
      ctx.fill()
      if (node.style.stroke && node.style.stroke !== "none") {
        ctx.strokeStyle = resolveCSSColor(ctx, node.style.stroke) || node.style.stroke
        ctx.lineWidth = node.style.strokeWidth || 1
        ctx.stroke()
      }
    } else if (node.roundedTop && node.roundedTop > 0) {
      // Rounded corners on the end away from the baseline
      const solid = resolveCanvasFill(ctx, node.style.fill, resolveCSSColor(ctx, "var(--semiotic-primary, #007bff)")!)
      // Skip gradient construction entirely when the resolved fill is a
      // CanvasPattern — feeding the fallback color into the opacity branch
      // would silently replace the pattern with a solid-color gradient.
      const axis = barGradientAxis(node)
      const grad = node.fillGradient && typeof solid === "string"
        ? buildLinearFillGradient(ctx, node.fillGradient, solid, axis.x0, axis.y0, axis.x1, axis.y1)
        : null
      ctx.fillStyle = grad || solid
      const r = Math.min(node.roundedTop, node.w / 2, node.h / 2)
      ctx.beginPath()
      const { x, y, w, h } = node
      switch (node.roundedEdge) {
        case "right": // horizontal positive: round right edge
          ctx.moveTo(x, y)
          ctx.lineTo(x + w - r, y)
          ctx.arcTo(x + w, y, x + w, y + r, r)
          ctx.lineTo(x + w, y + h - r)
          ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
          ctx.lineTo(x, y + h)
          break
        case "left": // horizontal negative: round left edge
          ctx.moveTo(x + w, y)
          ctx.lineTo(x + r, y)
          ctx.arcTo(x, y, x, y + r, r)
          ctx.lineTo(x, y + h - r)
          ctx.arcTo(x, y + h, x + r, y + h, r)
          ctx.lineTo(x + w, y + h)
          break
        case "bottom": // vertical negative: round bottom edge
          ctx.moveTo(x, y)
          ctx.lineTo(x + w, y)
          ctx.lineTo(x + w, y + h - r)
          ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
          ctx.lineTo(x + r, y + h)
          ctx.arcTo(x, y + h, x, y + h - r, r)
          break
        default: // "top" — vertical positive: round top edge
          ctx.moveTo(x, y + h)
          ctx.lineTo(x, y + r)
          ctx.arcTo(x, y, x + r, y, r)
          ctx.lineTo(x + w - r, y)
          ctx.arcTo(x + w, y, x + w, y + r, r)
          ctx.lineTo(x + w, y + h)
          break
      }
      ctx.closePath()
      ctx.fill()

      if (node.style.stroke && node.style.stroke !== "none") {
        ctx.strokeStyle = resolveCSSColor(ctx, node.style.stroke) || node.style.stroke
        ctx.lineWidth = node.style.strokeWidth || 1
        ctx.stroke()
      }
    } else {
      // Standard solid fill — or gradient when fillGradient is set.
      const solid = resolveCanvasFill(ctx, node.style.fill, resolveCSSColor(ctx, "var(--semiotic-primary, #007bff)")!)
      // Skip gradient construction entirely when the resolved fill is a
      // CanvasPattern — feeding the fallback color into the opacity branch
      // would silently replace the pattern with a solid-color gradient.
      const axis = barGradientAxis(node)
      const grad = node.fillGradient && typeof solid === "string"
        ? buildLinearFillGradient(ctx, node.fillGradient, solid, axis.x0, axis.y0, axis.x1, axis.y1)
        : null
      ctx.fillStyle = grad || solid
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
