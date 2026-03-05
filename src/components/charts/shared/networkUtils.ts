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
  data: Record<string, any> | null,
  childrenAccessor: string | ((d: any) => any[])
): Array<Record<string, any>> {
  if (!data) return []
  const nodes: Array<Record<string, any>> = []
  const traverse = (node: Record<string, any>) => {
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
  nodes: any[] | undefined,
  edges: any[],
  sourceAccessor: string | ((d: any) => string),
  targetAccessor: string | ((d: any) => string)
): Array<{ id: string }> {
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
  valueAccessor: string | ((d: any) => number)
): (d: Record<string, any>) => number {
  if (typeof valueAccessor === "function") return valueAccessor
  return (d: Record<string, any>) => d[valueAccessor] || 1
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
  edgeColorBy: "source" | "target" | "gradient" | ((d: any) => string)
  colorBy: Accessor<string> | undefined
  colorScale: ((v: string) => string) | undefined
  nodeStyleFn: (d: any, index?: number) => Record<string, any>
  edgeOpacity: number
  baseStyle?: Record<string, string | number>
}): (d: Record<string, any>) => Record<string, any> {
  return (d: Record<string, any>) => {
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
