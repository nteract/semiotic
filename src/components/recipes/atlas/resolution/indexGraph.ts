import { stronglyConnectedComponents } from "../directedGraph"
import type { PreparedNetworkResolution } from "./types"
import { compareIds } from "./identity"

export type ResolutionSource = PreparedNetworkResolution["source"]
export type SourceEdge = ResolutionSource["edges"][number]

export function indexGraph(source: ResolutionSource) {
  const nodes = [...source.nodes].sort((a, b) => compareIds(a.id, b.id))
  const edges = [...source.edges].sort((a, b) => compareIds(a.id, b.id))
  const outgoing = new Map(nodes.map(({ id }) => [id, [] as SourceEdge[]]))
  const incoming = new Map(nodes.map(({ id }) => [id, [] as SourceEdge[]]))
  const neighbors = new Map(nodes.map(({ id }) => [id, new Set<string>()]))
  const successors = new Map(nodes.map(({ id }) => [id, new Set<string>()]))
  const predecessors = new Map(nodes.map(({ id }) => [id, new Set<string>()]))
  for (const edge of edges) {
    outgoing.get(edge.source)!.push(edge)
    incoming.get(edge.target)!.push(edge)
    neighbors.get(edge.source)!.add(edge.target)
    neighbors.get(edge.target)!.add(edge.source)
    successors.get(edge.source)!.add(edge.target)
    predecessors.get(edge.target)!.add(edge.source)
  }
  const components = stronglyConnectedComponents({ nodes, edges }).sort(
    (a, b) => compareIds(a[0], b[0])
  )
  const cyclicNodes = new Set(components.filter((c) => c.length > 1).flat())
  for (const edge of edges) {
    if (edge.source === edge.target) cyclicNodes.add(edge.source)
  }
  return {
    nodes,
    edges,
    outgoing,
    incoming,
    neighbors,
    successors,
    predecessors,
    components,
    cyclicNodes
  }
}

export type GraphIndex = ReturnType<typeof indexGraph>

/** Connected pieces of an induced weak projection, retaining isolated vertices. */
export function connectedParts(
  ids: readonly string[],
  graph: GraphIndex
): string[][] {
  const unseen = new Set(ids)
  const parts: string[][] = []
  for (const start of [...ids].sort(compareIds)) {
    if (!unseen.delete(start)) continue
    const part = [start]
    for (let i = 0; i < part.length; i++) {
      for (const neighbor of graph.neighbors.get(part[i])!) {
        if (unseen.delete(neighbor)) part.push(neighbor)
      }
    }
    parts.push(part.sort(compareIds))
  }
  return parts
}
