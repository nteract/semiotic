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

type StyleFn = (datum: Datum) => NetworkMarkStyle

function wrapSelectionStyle(
  baseStyle: StyleFn | undefined,
  selection: SelectionHookResult | null,
  config: SelectionStyleConfig | undefined,
  matches: (datum: Datum, predicate: SelectionHookResult["predicate"]) => boolean
): StyleFn | undefined {
  if (!baseStyle || !selection) return baseStyle
  return datum => {
    const style = { ...baseStyle(datum) }
    if (!selection.isActive) return style
    if (matches(datum, selection.predicate)) return Object.assign(style, config?.selectedStyle)
    const opacity = config?.unselectedOpacity ?? DEFAULT_SELECTION_OPACITY
    return Object.assign(style, { opacity, fillOpacity: opacity, strokeOpacity: opacity }, config?.unselectedStyle)
  }
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
  return wrapSelectionStyle(baseStyle, selectionHook, config,
    (datum, predicate) => predicate(unwrapNetworkDatum(datum)))
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
  return wrapSelectionStyle(baseStyle, selectionHook, config, (datum, predicate) => {
    let hasEndpoints = false
    for (const endpoint of [datum.source, datum.target]) {
      if (endpoint && typeof endpoint === "object") {
        hasEndpoints = true
        if (predicate(unwrapNetworkDatum(endpoint))) return true
      }
    }
    return !hasEndpoints && predicate(unwrapNetworkDatum(datum))
  })
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

export { inferNodesFromEdges } from "./inferNodesFromEdges"

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
    } else if (edgeColorBy === "source" || edgeColorBy === "target") {
      const endpoint = d[edgeColorBy]
      if (endpoint && typeof endpoint === "object") {
        style.fill = colorBy
          ? getColor(endpoint.data || endpoint, colorBy, colorScale)
          : nodeStyleFn(endpoint, endpoint.index).fill
      }
    } else if (edgeColorBy === "gradient") {
      style.fill = "#999"
      style.fillOpacity = edgeOpacity * 0.7
    }

    return style
  }
}
