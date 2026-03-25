import type { SceneNode } from "./types"

/**
 * Extract a display color from a scene node's style.
 * For lines/areas, prefers stroke (the visible line color).
 * For points/rects/heatcells, prefers fill.
 * Returns null if no color can be resolved (e.g. CanvasPattern fill with no stroke).
 */
export function resolveNodeColor(node: SceneNode | null): string | null {
  if (!node) return null
  const { style } = node
  if (!style) return null
  const fill = typeof style.fill === "string" ? style.fill : null
  if (node.type === "line" || node.type === "area") {
    return style.stroke || fill || null
  }
  return fill || style.stroke || null
}
