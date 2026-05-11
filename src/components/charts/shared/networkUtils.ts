import type { Datum } from "./datumTypes"
/**
 * Shared utilities for network and hierarchy chart HOCs.
 *
 * Pure functions (not hooks) — called inside useMemo by chart components.
 */
import { getColor } from "./colorUtils"
import type { Accessor } from "./types"

/**
 * Flatten a hierarchical data structure into an array of all nodes
 * by recursively traversing children.
 */
export function flattenHierarchy(
  data: Datum | null,
  childrenAccessor: string | ((d: Datum) => Datum[])
): Array<Datum> {
  if (!data) return []
  const nodes: Array<Datum> = []
  const traverse = (node: Datum) => {
    nodes.push(node)
    const children =
      typeof childrenAccessor === "function"
        ? childrenAccessor(node)
        : node[childrenAccessor]
    if (children && Array.isArray(children)) children.forEach(traverse)
  }
  traverse(data)
  return nodes
}

/**
 * Infer nodes from edges when a nodes array is not provided.
 * Extracts unique source/target IDs and returns `{ id }` objects.
 * Returns the provided nodes array if it's non-empty.
 */
export function inferNodesFromEdges(
  nodes: Datum[] | undefined,
  edges: Datum[],
  sourceAccessor: string | ((d: Datum) => string),
  targetAccessor: string | ((d: Datum) => string)
): Datum[] {
  if (nodes && nodes.length > 0) return nodes

  const nodeSet = new Set<string>()
  edges.forEach((edge) => {
    const sourceId =
      typeof sourceAccessor === "function"
        ? sourceAccessor(edge)
        : edge[sourceAccessor]
    const targetId =
      typeof targetAccessor === "function"
        ? targetAccessor(edge)
        : edge[targetAccessor]
    nodeSet.add(sourceId)
    nodeSet.add(targetId)
  })

  return Array.from(nodeSet).map((id) => ({ id }))
}

/**
 * Convert a valueAccessor prop into a hierarchy sum function.
 * Used by TreeDiagram, Treemap, and CirclePack for d3-hierarchy's `.sum()`.
 */
export function resolveHierarchySum(
  valueAccessor: string | ((d: Datum) => number)
): (d: Datum) => number {
  if (typeof valueAccessor === "function") return valueAccessor
  return (d: Datum) => d[valueAccessor] || 1
}

/**
 * Create an edge style function for Sankey/Chord edge coloring.
 * Handles edgeColorBy = "source" | "target" | "gradient" | function.
 */
export function createEdgeStyleFn({
  edgeColorBy,
  colorBy,
  colorScale,
  nodeStyleFn,
  edgeOpacity,
  baseStyle = {},
}: {
  edgeColorBy: "source" | "target" | "gradient" | ((d: Datum) => string)
  colorBy: Accessor<string> | undefined
  colorScale: ((v: string) => string) | undefined
  nodeStyleFn: (d: Datum, index?: number) => Datum
  edgeOpacity: number
  baseStyle?: Record<string, string | number>
}): (d: Datum) => Datum {
  return (d: Datum) => {
    const style: Record<string, string | number> = {
      fillOpacity: edgeOpacity,
      ...baseStyle,
    }

    if (typeof edgeColorBy === "function") {
      style.fill = edgeColorBy(d)
    } else if (edgeColorBy === "source") {
      const src = typeof d.source === "object" ? d.source : null
      if (colorBy && src) {
        style.fill = getColor(src.data || src, colorBy, colorScale)
      } else if (src) {
        style.fill = nodeStyleFn(src, src.index).fill
      }
    } else if (edgeColorBy === "target") {
      const tgt = typeof d.target === "object" ? d.target : null
      if (colorBy && tgt) {
        style.fill = getColor(tgt.data || tgt, colorBy, colorScale)
      } else if (tgt) {
        style.fill = nodeStyleFn(tgt, tgt.index).fill
      }
    } else if (edgeColorBy === "gradient") {
      style.fill = "#999"
      style.fillOpacity = edgeOpacity * 0.7
    }

    return style
  }
}
