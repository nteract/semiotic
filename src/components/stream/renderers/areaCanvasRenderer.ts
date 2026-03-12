import type { SceneNode, AreaSceneNode } from "../types"
import type { StreamRendererFn } from "./types"

/** Parse a CSS color string to [r, g, b]. Handles #hex and rgb(). */
function parseColor(color: string): [number, number, number] {
  if (color.startsWith("#")) {
    const hex = color.length === 4
      ? color[1] + color[1] + color[2] + color[2] + color[3] + color[3]
      : color.slice(1, 7)
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ]
  }
  const m = color.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (m) return [+m[1], +m[2], +m[3]]
  return [78, 121, 167] // fallback: #4e79a7
}

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
    const fillColor = node.style.fill || "#4e79a7"
    if (node.fillGradient) {
      // Vertical gradient: topOpacity at the line, bottomOpacity at the baseline
      const topY = Math.min(...node.topPath.map(p => p[1]))
      const bottomY = Math.max(...node.bottomPath.map(p => p[1]))
      const grad = ctx.createLinearGradient(0, topY, 0, bottomY)
      grad.addColorStop(0, fillColor)
      grad.addColorStop(1, fillColor)
      ctx.fillStyle = grad
      // Use separate alpha stops via two-pass approach:
      // Canvas gradients interpolate color+alpha together, so we set color stops
      // with the same color and vary globalAlpha isn't possible per-stop.
      // Instead, use rgba color stops.
      const parsed = parseColor(fillColor)
      const topAlpha = node.fillGradient.topOpacity
      const bottomAlpha = node.fillGradient.bottomOpacity
      const grad2 = ctx.createLinearGradient(0, topY, 0, bottomY)
      grad2.addColorStop(0, `rgba(${parsed[0]},${parsed[1]},${parsed[2]},${topAlpha})`)
      grad2.addColorStop(1, `rgba(${parsed[0]},${parsed[1]},${parsed[2]},${bottomAlpha})`)
      ctx.fillStyle = grad2
      ctx.globalAlpha = 1
    } else {
      const fillOpacity = node.style.fillOpacity ?? 0.7
      ctx.globalAlpha = fillOpacity
      ctx.fillStyle = fillColor
    }
    ctx.fill()

    // Pulse overlay — brightened fill flash when aggregated value changes
    if (node._pulseIntensity && node._pulseIntensity > 0) {
      ctx.beginPath()
      ctx.moveTo(node.topPath[0][0], node.topPath[0][1])
      for (let i = 1; i < node.topPath.length; i++) {
        ctx.lineTo(node.topPath[i][0], node.topPath[i][1])
      }
      for (let i = node.bottomPath.length - 1; i >= 0; i--) {
        ctx.lineTo(node.bottomPath[i][0], node.bottomPath[i][1])
      }
      ctx.closePath()
      ctx.globalAlpha = node._pulseIntensity * 0.35
      ctx.fillStyle = node._pulseColor || "rgba(255,255,255,0.6)"
      ctx.fill()
    }

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
