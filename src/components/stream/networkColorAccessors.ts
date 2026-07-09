/**
 * Node / edge / particle color resolution for StreamNetworkFrame.
 * Pure helpers — maps and theme values are passed in.
 */
import { DEFAULT_COLORS } from "../charts/shared/colorUtils"
import type { Datum } from "../charts/shared/datumTypes"
import type { RealtimeEdge, RealtimeNode } from "./networkTypes"

export function resolveNetworkEdgeEndpoint(
  endpoint: RealtimeNode | string | undefined,
  nodes: Map<string, RealtimeNode> | undefined
): RealtimeNode | null {
  if (!endpoint) return null
  if (typeof endpoint === "object") return endpoint
  return nodes?.get(endpoint) ?? null
}

export function resolveNetworkNodeColor(options: {
  node: RealtimeNode
  colorBy?: string | ((node: RealtimeNode) => unknown)
  colorScheme?: string | string[] | Record<string, string>
  nodeColorMap: Map<string, string>
  colorIndexRef: { current: number }
}): string {
  const { node, colorBy, colorScheme, nodeColorMap, colorIndexRef } = options
  if (typeof colorBy === "function") return String(colorBy(node))
  if (typeof colorBy === "string" && node.data) {
    const val = node.data[colorBy]
    if (val !== undefined) {
      if (!nodeColorMap.has(String(val))) {
        const colors = Array.isArray(colorScheme)
          ? colorScheme
          : DEFAULT_COLORS
        nodeColorMap.set(
          String(val),
          colors[colorIndexRef.current++ % colors.length]
        )
      }
      return nodeColorMap.get(String(val))!
    }
  }
  if (nodeColorMap.has(node.id)) {
    return nodeColorMap.get(node.id)!
  }
  const colors = Array.isArray(colorScheme) ? colorScheme : DEFAULT_COLORS
  const color = colorBy
    ? colors[colorIndexRef.current++ % colors.length]
    : colors[0]
  nodeColorMap.set(node.id, color)
  return color
}

export function resolveNetworkEdgeColor(options: {
  edge: RealtimeEdge
  edgeColorBy?: string | ((edge: RealtimeEdge) => string)
  getNodeColor: (node: RealtimeNode) => string
  resolveEndpoint: (
    endpoint: RealtimeNode | string | undefined
  ) => RealtimeNode | null
  fallback: string
}): string {
  const { edge, edgeColorBy, getNodeColor, resolveEndpoint, fallback } =
    options
  if (typeof edgeColorBy === "function") return edgeColorBy(edge)
  const sourceNode = resolveEndpoint(edge.source)
  const targetNode = resolveEndpoint(edge.target)

  if (edgeColorBy === "target" && targetNode) {
    return getNodeColor(targetNode)
  }
  if (sourceNode) {
    return getNodeColor(sourceNode)
  }
  return fallback
}

export function resolveNetworkParticleColor(options: {
  edge: RealtimeEdge
  particleStyleColor?: string | ((edge: RealtimeEdge, node: RealtimeNode) => string)
  particleColorBy?: string
  hasExplicitParticleColorBy: boolean
  getEdgeColor: (edge: RealtimeEdge) => string
  getNodeColor: (node: RealtimeNode) => string
  resolveEndpoint: (
    endpoint: RealtimeNode | string | undefined
  ) => RealtimeNode | null
  fallback: string
}): string {
  const {
    edge,
    particleStyleColor,
    particleColorBy,
    hasExplicitParticleColorBy,
    getEdgeColor,
    getNodeColor,
    resolveEndpoint,
    fallback
  } = options

  if (typeof particleStyleColor === "function") {
    const sourceNode = resolveEndpoint(edge.source)
    if (sourceNode) {
      return particleStyleColor(edge, sourceNode)
    }
    return fallback
  }
  if (!hasExplicitParticleColorBy) {
    return getEdgeColor(edge)
  }
  const colorByMode = particleColorBy
  const sourceNode = resolveEndpoint(edge.source)
  const targetNode = resolveEndpoint(edge.target)

  if (colorByMode === "target" && targetNode) {
    return getNodeColor(targetNode)
  }
  if (sourceNode) {
    return getNodeColor(sourceNode)
  }
  return fallback
}

/** Sync scene fills into the node color map; fill gaps from palette. */
export function syncNetworkNodeColorMap(options: {
  sceneNodes: ReadonlyArray<{ id?: string; style?: { fill?: unknown } }>
  nodes: Iterable<RealtimeNode>
  nodeColorMap: Map<string, string>
  colorScheme?: string | string[] | Record<string, string>
}): number {
  const { sceneNodes, nodes, nodeColorMap, colorScheme } = options
  for (const sceneNode of sceneNodes) {
    if (sceneNode.id && typeof sceneNode.style?.fill === "string") {
      nodeColorMap.set(sceneNode.id, sceneNode.style.fill)
    }
  }
  const colors = Array.isArray(colorScheme) ? colorScheme : DEFAULT_COLORS
  const layoutNodes = Array.from(nodes)
  for (let i = 0; i < layoutNodes.length; i++) {
    const node = layoutNodes[i]
    if (!nodeColorMap.has(node.id)) {
      nodeColorMap.set(node.id, colors[i % colors.length])
    }
  }
  return layoutNodes.length
}

export function networkEdgeFallbackColor(theme: {
  colors?: { border?: string; secondary?: string; primary?: string }
} | null | undefined): string {
  return (
    theme?.colors?.border ||
    theme?.colors?.secondary ||
    theme?.colors?.primary ||
    "#999"
  )
}

export type { Datum }
