import type { HeatcellSceneNode } from "../types"
import type { StreamRendererFn } from "./types"
import { renderRectPulse } from "./renderPulse"
import { resolveCSSColor } from "./resolveCSSColor"
import { resolveCanvasPaint } from "./canvasRenderHelpers"
import { parseCanvasColor } from "./colorUtils"

/**
 * Returns a contrasting text color (black or white) based on the
 * relative luminance of the background color.
 */
function contrastTextColor(ctx: CanvasRenderingContext2D, fillColor: string): string {
  const [r, g, b] = parseCanvasColor(ctx, fillColor)
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
export const heatmapCanvasRenderer: StreamRendererFn = (ctx, nodes, _scales, _layout) => {
  const heatNodes = nodes.filter((n): n is HeatcellSceneNode => n.type === "heatcell")

  ctx.save()
  try {
    const fontFamily = resolveCSSColor(ctx, "var(--semiotic-font-family, sans-serif)") || "sans-serif"
    for (const node of heatNodes) {
    // Apply decay opacity if present (stored as style.opacity by applyDecay)
    const nodeStyle = node.style
    if (nodeStyle?.opacity != null) {
      ctx.globalAlpha = nodeStyle.opacity
    }

    const resolvedFill = resolveCanvasPaint(ctx, node.fill, "#4e79a7")
    ctx.fillStyle = resolvedFill
    ctx.fillRect(node.x, node.y, node.w, node.h)

    // Cell border — explicit scene style wins; zero suppresses the stroke.
    // The fallback stays theme-aware so direct StreamXYFrame heatmaps retain
    // their existing light/dark surface separator.
    const borderWidth = Math.max(0, nodeStyle?.strokeWidth ?? 1)
    if (borderWidth > 0) {
      ctx.strokeStyle = resolveCSSColor(
        ctx,
        nodeStyle?.stroke ?? "var(--semiotic-surface, #fff)"
      )!
      ctx.lineWidth = borderWidth
      ctx.strokeRect(node.x, node.y, node.w, node.h)
    }

    // Pulse overlay
    renderRectPulse(ctx, node)

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

      ctx.fillStyle = contrastTextColor(
        ctx,
        typeof resolvedFill === "string" ? resolvedFill : "#4e79a7"
      )
      ctx.font = `${fontSize}px ${fontFamily}`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(formatted, centerX, centerY)
    }
    }
  } finally {
    ctx.restore()
  }
}
