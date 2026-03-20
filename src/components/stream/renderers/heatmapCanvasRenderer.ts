import type { SceneNode, HeatcellSceneNode } from "../types"
import type { StreamRendererFn } from "./types"

/**
 * Parse a CSS color string to [R, G, B] (0–255).
 * Handles hex (#rgb, #rrggbb), rgb(), and falls back to mid-gray for unknowns.
 */
function parseColorToRGB(color: string): [number, number, number] {
  // #rrggbb
  if (color.startsWith("#")) {
    let hex = color.slice(1)
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
    }
    if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16)
      ]
    }
  }
  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgbMatch) {
    return [+rgbMatch[1], +rgbMatch[2], +rgbMatch[3]]
  }
  // Fallback: mid-gray (will produce black text)
  return [128, 128, 128]
}

/**
 * Returns a contrasting text color (black or white) based on the
 * relative luminance of the background color.
 */
function contrastTextColor(fillColor: string): string {
  const [r, g, b] = parseColorToRGB(fillColor)
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  return luminance > 128 ? "#000" : "#fff"
}

/**
 * Format a numeric value with reasonable default precision.
 */
function defaultFormat(v: number): string {
  if (Number.isInteger(v)) return String(v)
  if (Math.abs(v) >= 100) return v.toFixed(0)
  if (Math.abs(v) >= 1) return v.toFixed(1)
  return v.toPrecision(3)
}

/**
 * Canvas heatmap renderer.
 * Renders HeatcellSceneNode as filled rectangles with color encoding,
 * and optionally draws cell value text when showValues is enabled.
 */
export const heatmapCanvasRenderer: StreamRendererFn = (ctx, nodes, scales, layout) => {
  const heatNodes = nodes.filter((n): n is HeatcellSceneNode => n.type === "heatcell")

  ctx.save()
  try {
  for (const node of heatNodes) {
    // Apply decay opacity if present (stored as style.opacity by applyDecay)
    const nodeStyle = node.style
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

    // ── Cell value text ──────────────────────────────────────────────
    if (node.showValues && node.value != null) {
      // Skip text in very small cells where it would be illegible
      if (node.w < 20 || node.h < 20) continue

      const formatted = node.valueFormat
        ? node.valueFormat(node.value)
        : defaultFormat(node.value)

      // Scale font size with cell dimensions, clamped to 10–16px
      const fontSize = Math.max(10, Math.min(16, Math.min(node.w, node.h) * 0.3))

      const centerX = node.x + node.w / 2
      const centerY = node.y + node.h / 2

      ctx.fillStyle = contrastTextColor(node.fill)
      ctx.font = `${fontSize}px sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(formatted, centerX, centerY)
    }
  }
  } finally {
    ctx.restore()
  }
}
