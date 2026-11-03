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
  const category =
    typeof colorBy === "string" && node.data ? node.data[colorBy] : undefined
  const key = category === undefined ? node.id : String(category)
  if (nodeColorMap.has(key)) return nodeColorMap.get(key)!

  const colors = Array.isArray(colorScheme) ? colorScheme : DEFAULT_COLORS
  const color =
    category !== undefined || colorBy
      ? colors[colorIndexRef.current++ % colors.length]
      : colors[0]
  nodeColorMap.set(key, color)
  return color
}

/** Edges and particles share the same source/target color fallback. */
function resolveNetworkEndpointColor(
  {
    edge,
    getNodeColor,
    resolveEndpoint,
    fallback
  }: Parameters<typeof resolveNetworkEdgeColor>[0],
  colorBy: string | undefined
): string {
  const node =
    (colorBy === "target" && resolveEndpoint(edge.target)) ||
    resolveEndpoint(edge.source)
  return node ? getNodeColor(node) : fallback
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
  const { edge, edgeColorBy } = options
  if (typeof edgeColorBy === "function") return edgeColorBy(edge)
  return resolveNetworkEndpointColor(options, edgeColorBy)
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
  return resolveNetworkEndpointColor(options, particleColorBy)
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
  let count = 0
  for (const node of nodes) {
    if (!nodeColorMap.has(node.id)) {
      nodeColorMap.set(node.id, colors[count % colors.length])
    }
    count++
  }
  return count
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
