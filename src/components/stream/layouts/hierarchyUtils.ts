/**
 * Shared utilities for hierarchy layout plugins.
 *
 * CSS color parsing, contrast text, depth palette, and accessor resolution
 * used across tree, treemap, and circlepack scene builders.
 *
 * Consumed by: hierarchyLayoutPlugin.ts, hierarchySceneBuilders.ts
 */
import type { NetworkPipelineConfig, RealtimeNode } from "../networkTypes"

/** Depth-based color palette shared across all hierarchy scene builders */
export const DEPTH_PALETTE = [
  "#e8d5b7", "#b8d4e3", "#d4e3b8", "#e3c4d4",
  "#d4d4e3", "#e3d4b8", "#b8e3d4", "#e3b8b8"
]

/**
 * Parse a CSS color string (hex or rgb/rgba) into [r, g, b].
 * Falls back to mid-gray if the format is unrecognized.
 */
export function parseColor(color: string): [number, number, number] {
  if (color.startsWith("#")) {
    let hex = color.slice(1)
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
    if (hex.length === 6) {
      return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
    }
  }
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (m) return [+m[1], +m[2], +m[3]]
  return [128, 128, 128]
}

/**
 * Return a high-contrast text color (white or near-black) for the given background.
 * Uses perceived luminance (ITU-R BT.601).
 */
export function contrastTextColor(bgColor: string): string {
  const [r, g, b] = parseColor(bgColor)
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  return luminance > 150 ? "#222" : "#fff"
}

export function resolveChildrenAccessor(
  accessor: string | ((d: any) => any[]) | undefined
): ((d: any) => any[]) | undefined {
  if (!accessor) return undefined
  if (typeof accessor === "function") return accessor
  return (d: any) => d[accessor]
}

export function resolveNodeId(
  d: any,
  config: NetworkPipelineConfig,
  index: number
): string {
  const accessor = config.nodeIDAccessor
  if (typeof accessor === "function") {
    return String(accessor(d.data))
  }
  if (typeof accessor === "string" && d.data[accessor] !== undefined) {
    return String(d.data[accessor])
  }
  if (d.data.name !== undefined) return String(d.data.name)
  if (d.data.id !== undefined) return String(d.data.id)
  return `node-${index}`
}

export function resolveLabelFn(
  nodeLabel: string | ((d: any) => string) | undefined
): ((d: any) => string) | null {
  if (!nodeLabel) return null
  if (typeof nodeLabel === "function") return nodeLabel
  return (d: any) => d.data?.[nodeLabel] || d[nodeLabel] || d.id
}

export function resolveDefaultNodeSize(
  nodeSize: number | string | ((d: any) => number) | undefined
): number {
  if (typeof nodeSize === "number") return nodeSize
  return 5
}
