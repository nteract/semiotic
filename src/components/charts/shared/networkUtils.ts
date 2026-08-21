import type { Datum } from "./datumTypes"
import type { NetworkMarkStyle } from "../../stream/networkTypes"
/**
 * Shared utilities for network and hierarchy chart HOCs.
 *
 * Pure functions (not hooks) — called inside useMemo by chart components.
 */
import { getColor } from "./colorUtils"
import type { Accessor } from "./types"
import type {
  SelectionHookResult,
  SelectionStyleConfig,
} from "./selectionUtils"
import { DEFAULT_SELECTION_OPACITY } from "./selectionUtils"

function unwrapNetworkDatum(datum: Datum): Datum {
  return datum.data && typeof datum.data === "object"
    ? datum.data
    : datum
}

function applyNetworkSelectionStyle(
  style: NetworkMarkStyle,
  matches: boolean,
  config?: SelectionStyleConfig,
): NetworkMarkStyle {
  if (matches) {
    if (config?.selectedStyle) Object.assign(style, config.selectedStyle)
    return style
  }

  const dimOpacity = config?.unselectedOpacity ?? DEFAULT_SELECTION_OPACITY
  style.opacity = dimOpacity
  style.fillOpacity = dimOpacity
  style.strokeOpacity = dimOpacity
  if (config?.unselectedStyle) Object.assign(style, config.unselectedStyle)
  return style
}

/** Apply shared/legend selection to a network node's raw user datum. */
export function wrapNetworkNodeStyleWithSelection(
  baseStyle: undefined,
  selectionHook: SelectionHookResult | null,
  config?: SelectionStyleConfig,
): undefined
export function wrapNetworkNodeStyleWithSelection(
  baseStyle: (datum: Datum) => NetworkMarkStyle,
  selectionHook: SelectionHookResult | null,
  config?: SelectionStyleConfig,
): (datum: Datum) => NetworkMarkStyle
export function wrapNetworkNodeStyleWithSelection(
  baseStyle: ((datum: Datum) => NetworkMarkStyle) | undefined,
  selectionHook: SelectionHookResult | null,
  config?: SelectionStyleConfig,
): ((datum: Datum) => NetworkMarkStyle) | undefined
export function wrapNetworkNodeStyleWithSelection(
  baseStyle: ((datum: Datum) => NetworkMarkStyle) | undefined,
  selectionHook: SelectionHookResult | null,
  config?: SelectionStyleConfig,
): ((datum: Datum) => NetworkMarkStyle) | undefined {
  if (!baseStyle) return undefined
  if (!selectionHook) return baseStyle

  return (datum: Datum) => {
    const style = { ...baseStyle(datum) }
    if (!selectionHook.isActive) return style
    return applyNetworkSelectionStyle(
      style,
      selectionHook.predicate(unwrapNetworkDatum(datum)),
      config,
    )
  }
}

/**
 * Apply shared/legend selection to a network edge. When endpoint nodes are
 * available, either endpoint may keep the edge emphasized; otherwise the
 * predicate falls back to the edge payload.
 */
export function wrapNetworkEdgeStyleWithSelection(
  baseStyle: undefined,
  selectionHook: SelectionHookResult | null,
  config?: SelectionStyleConfig,
): undefined
export function wrapNetworkEdgeStyleWithSelection(
  baseStyle: (datum: Datum) => NetworkMarkStyle,
  selectionHook: SelectionHookResult | null,
  config?: SelectionStyleConfig,
): (datum: Datum) => NetworkMarkStyle
export function wrapNetworkEdgeStyleWithSelection(
  baseStyle: ((datum: Datum) => NetworkMarkStyle) | undefined,
  selectionHook: SelectionHookResult | null,
  config?: SelectionStyleConfig,
): ((datum: Datum) => NetworkMarkStyle) | undefined
export function wrapNetworkEdgeStyleWithSelection(
  baseStyle: ((datum: Datum) => NetworkMarkStyle) | undefined,
  selectionHook: SelectionHookResult | null,
  config?: SelectionStyleConfig,
): ((datum: Datum) => NetworkMarkStyle) | undefined {
  if (!baseStyle) return undefined
  if (!selectionHook) return baseStyle

  return (datum: Datum) => {
    const style = { ...baseStyle(datum) }
    if (!selectionHook.isActive) return style

    const edgeDatum = unwrapNetworkDatum(datum)
    const source = typeof datum.source === "object"
      ? unwrapNetworkDatum(datum.source)
      : null
    const target = typeof datum.target === "object"
      ? unwrapNetworkDatum(datum.target)
      : null
    const matches = source || target
      ? (source ? selectionHook.predicate(source) : false) ||
        (target ? selectionHook.predicate(target) : false)
      : selectionHook.predicate(edgeDatum)
    return applyNetworkSelectionStyle(style, matches, config)
  }
}

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
