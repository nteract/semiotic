import type { RectSceneNode } from "../types"
import type { StreamRendererFn } from "./types"
import { renderRectPulse } from "./renderPulse"
import { resolveCSSColor } from "./resolveCSSColor"
import { parseCanvasColor } from "./colorUtils"

/**
 * Build a CanvasGradient that runs from the bar's tip (opposite the baseline)
 * toward its base, honoring `fillGradient.colorStops` or the opacity-based
 * `{ topOpacity, bottomOpacity }` shape. Mirrors AreaChart's direction so
 * the same `gradientFill` input yields analogous output across chart types.
 * Returns null if the config can't resolve (e.g., fewer than 2 color stops).
 */
function buildBarGradient(
  ctx: CanvasRenderingContext2D,
  node: RectSceneNode,
  baseFill: string
): CanvasGradient | null {
  const fg = node.fillGradient
  if (!fg) return null

  const edge = node.roundedEdge  // tip edge — set unconditionally by the scene builder
  // tip → base coordinates along the value axis. Default = top-to-bottom
  // (matches positive vertical bars) when orientation is unknown.
  let x0 = node.x, y0 = node.y, x1 = node.x, y1 = node.y + node.h
  if (edge === "bottom") { y0 = node.y + node.h; y1 = node.y }
  else if (edge === "right") { x0 = node.x + node.w; y0 = node.y; x1 = node.x; y1 = node.y }
  else if (edge === "left")  { x0 = node.x; y0 = node.y; x1 = node.x + node.w; y1 = node.y }
  // "top" and undefined both use the default initialised above.

  if ("colorStops" in fg) {
    // Filter out non-finite offsets before the count check so we don't build
    // a gradient with < 2 usable stops (which renders as a flat/transparent
    // fill and violates the "can't resolve" contract).
    const validStops = fg.colorStops
      .filter(s => Number.isFinite(s.offset))
      .map(s => ({ offset: Math.max(0, Math.min(1, s.offset)), color: s.color }))
    if (validStops.length < 2) return null
    const grad = ctx.createLinearGradient(x0, y0, x1, y1)
    for (const s of validStops) grad.addColorStop(s.offset, s.color)
    return grad
  }
  // Opacity form. Normalize via canvas so named colors ("steelblue"), hsl(),
  // etc. all produce opacity-faded gradients that match the bar's actual fill.
  const grad = ctx.createLinearGradient(x0, y0, x1, y1)
  const [r, g, b] = parseCanvasColor(ctx, baseFill)
  grad.addColorStop(0, `rgba(${r},${g},${b},${fg.topOpacity})`)
  grad.addColorStop(1, `rgba(${r},${g},${b},${fg.bottomOpacity})`)
  return grad
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
    } else if (node.roundedTop && node.roundedTop > 0) {
      // Rounded corners on the end away from the baseline
      const solid = (typeof node.style.fill === "string" ? resolveCSSColor(ctx, node.style.fill) : node.style.fill)
        || resolveCSSColor(ctx, "var(--semiotic-primary, #007bff)")!
      // Skip gradient construction entirely when the resolved fill is a
      // CanvasPattern — feeding the fallback color into the opacity branch
      // would silently replace the pattern with a solid-color gradient.
      const grad = typeof solid === "string" ? buildBarGradient(ctx, node, solid) : null
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
      const solid = (typeof node.style.fill === "string" ? resolveCSSColor(ctx, node.style.fill) : node.style.fill)
        || resolveCSSColor(ctx, "var(--semiotic-primary, #007bff)")!
      // Skip gradient construction entirely when the resolved fill is a
      // CanvasPattern — feeding the fallback color into the opacity branch
      // would silently replace the pattern with a solid-color gradient.
      const grad = typeof solid === "string" ? buildBarGradient(ctx, node, solid) : null
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
