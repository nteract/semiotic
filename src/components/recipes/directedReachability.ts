interface IdentifiedNode {
  id: string
}

interface DirectedEdge {
  source: string
  target: string
}

/** Build a successor map that follows source → target only. */
export function buildDirectedAdjacency(
  nodes: ReadonlyArray<IdentifiedNode>,
  edges: ReadonlyArray<DirectedEdge>
): Map<string, Set<string>> {
  return adjacencyMap(nodes, edges, true)
}

export function adjacencyMap(
  nodes: ReadonlyArray<IdentifiedNode>,
  edges: ReadonlyArray<DirectedEdge>,
  directed: boolean
): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>()
  for (const node of nodes) adjacency.set(node.id, new Set())
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set())
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set())
    if (!directed && edge.source === edge.target) continue
    adjacency.get(edge.source)!.add(edge.target)
    if (!directed) adjacency.get(edge.target)!.add(edge.source)
  }
  return adjacency
}

/** Return nodes reachable from start by breadth-first traversal. */
export function reachableFrom(
  adjacency: Map<string, Set<string>>,
  start: string,
  options: { includeStart?: boolean } = {}
): Set<string> {
  // Set iteration visits newly added successors once, in discovery order.
  const reached = new Set(adjacency.get(start))
  for (const id of reached) {
    for (const next of adjacency.get(id) ?? []) reached.add(next)
  }
  if (options.includeStart) reached.add(start)
  return reached
}
