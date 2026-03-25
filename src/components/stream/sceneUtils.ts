import type { SceneNode } from "./types"

/**
 * Extract a display color from a scene node's style.
 * For lines/areas, prefers stroke (the visible line color).
 * For points/rects, prefers fill.
 * For heatcells, reads the top-level `fill` field (style is optional).
 * For candlesticks, uses `upColor`/`downColor` based on direction.
 * Returns null if no color can be resolved (e.g. CanvasPattern fill with no stroke).
 */
export function resolveNodeColor(node: SceneNode | null): string | null {
  if (!node) return null

  // Heatcell: top-level fill field, style is optional
  if (node.type === "heatcell") {
    return node.fill || null
  }

  // Candlestick: directional colors, style is optional
  if (node.type === "candlestick") {
    return node.isUp ? node.upColor : node.downColor
  }

  const { style } = node
  if (!style) return null
  const fill = typeof style.fill === "string" ? style.fill : null
  if (node.type === "line" || node.type === "area") {
    return style.stroke || fill || null
  }
  return fill || style.stroke || null
}
