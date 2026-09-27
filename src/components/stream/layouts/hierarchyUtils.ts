/**
 * Shared utilities for hierarchy layout plugins.
 *
 * CSS color parsing, contrast text, depth palette, and accessor resolution
 * used across tree, treemap, and circlepack scene builders.
 *
 * Consumed by: hierarchyLayoutPlugin.ts, hierarchySceneBuilders.ts
 */
import type { NetworkPipelineConfig } from "../networkTypes"
import type { Datum } from "../../charts/shared/datumTypes"

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
      return [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)) as [number, number, number]
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
  accessor: string | ((d: Datum) => Datum[]) | undefined
): ((d: Datum) => Datum[]) | undefined {
  if (!accessor) return undefined
  if (typeof accessor === "function") return accessor
  return (d: Datum) => d[accessor]
}

export function resolveNodeId(
  d: Datum,
  config: NetworkPipelineConfig,
  index: number
): string {
  const accessor = config.nodeIDAccessor
  const data = d.data
  return String(
    typeof accessor === "function" ? accessor(data)
      : typeof accessor === "string" && data[accessor] !== undefined ? data[accessor]
        : data.name !== undefined ? data.name
          : data.id !== undefined ? data.id
            : `node-${index}`
  )
}

export function resolveLabelFn(
  nodeLabel: string | ((d: Datum) => string) | undefined
): ((d: Datum) => string) | null {
  if (!nodeLabel) return null
  // In hierarchy layouts the original datum is nested under the scene
  // node's `.data` (the node itself only carries layout coords + id/depth/
  // value). Unwrap before calling a user accessor so a `nodeLabel`
  // function reads the same datum fields as colorBy/nodeStyle/tooltip —
  // matching the `d.data || d` convention used everywhere else in the
  // family. The string form already checks `d.data` first below.
  if (typeof nodeLabel === "function") {
    const fn = nodeLabel
    return (d: Datum) => fn(d.data ?? d)
  }
  return (d: Datum) => d.data?.[nodeLabel] || d[nodeLabel] || d.id
}

/** Each node contributes its own nonnegative value; parents also sum descendants. */
export function resolveHierarchySum(
  accessor: string | ((d: Datum) => number) = "value"
): (d: Datum) => number {
  const read =
    typeof accessor === "function" ? accessor : (d: Datum) => d[accessor]
  return (d) => {
    const raw = read(d)
    const value = typeof raw === "string" ? Number(raw) : raw
    return Number.isFinite(value) && value > 0 ? value : 0
  }
}

/**
 * Preserve authored IDs and suffix repeated occurrences in source traversal order.
 * Reserve every authored ID first so generated suffixes cannot steal a later ID.
 * Call before value sorting: resizing or editing measures must not swap identity.
 */
export function uniqueHierarchyIds(rawIds: readonly string[]): string[] {
  // Zero reserves an authored ID that has not been visited yet. Positive
  // entries reserve assigned IDs and track the next suffix for repeated ones.
  const nextSuffix = new Map(rawIds.map((id) => [id, 0]))
  return rawIds.map((rawId) => {
    let suffix = nextSuffix.get(rawId)!
    let id = rawId
    // Zero denotes the first occurrence, which keeps its authored ID.
    while (suffix > 0 && nextSuffix.has(id)) {
      id = `${rawId}__${suffix++}`
    }
    nextSuffix.set(rawId, suffix || 1)
    nextSuffix.set(id, 1)
    return id
  })
}
