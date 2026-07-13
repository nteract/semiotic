import type { CustomLayoutSelection } from "./customLayoutSelection"
import type { NetworkLayoutResult } from "./networkCustomLayout"
import type { NetworkSceneEdge, NetworkSceneNode } from "./networkTypes"
import type { Style } from "./types"

export function snapshotNetworkCustomStyles(
  nodes: NetworkSceneNode[],
  edges: NetworkSceneEdge[]
): WeakMap<object, Style> {
  const baseStyles = new WeakMap<object, Style>()
  for (const node of nodes) baseStyles.set(node, node.style)
  for (const edge of edges) baseStyles.set(edge, edge.style)
  return baseStyles
}

interface NetworkRestyleInput {
  nodes: NetworkSceneNode[]
  edges: NetworkSceneEdge[]
  restyle: NetworkLayoutResult["restyle"]
  restyleEdge: NetworkLayoutResult["restyleEdge"]
  baseStyles: WeakMap<object, Style>
  selection: CustomLayoutSelection | null
}

export function restyleNetworkCustomScene({
  nodes,
  edges,
  restyle,
  restyleEdge,
  baseStyles,
  selection
}: NetworkRestyleInput): boolean {
  const hasCustomRestyle = Boolean(restyle || restyleEdge)
  if (restyle) {
    for (const node of nodes) {
      const base = baseStyles.get(node) ?? node.style
      const patch = restyle(node, selection)
      node.style = patch ? { ...base, ...patch } : base
    }
  }
  if (restyleEdge) {
    for (const edge of edges) {
      const base = baseStyles.get(edge) ?? edge.style
      const patch = restyleEdge(edge, selection)
      edge.style = patch ? { ...base, ...patch } : base
    }
  }
  return hasCustomRestyle
}
