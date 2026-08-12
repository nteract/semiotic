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
  const adjacency = new Map<string, Set<string>>()
  for (const node of nodes) adjacency.set(node.id, new Set())
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set())
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set())
    adjacency.get(edge.source)!.add(edge.target)
  }
  return adjacency
}

/** Return nodes reachable from start by breadth-first traversal. */
export function reachableFrom(
  adjacency: Map<string, Set<string>>,
  start: string,
  options: { includeStart?: boolean } = {}
): Set<string> {
  const reached = new Set<string>()
  const queue = [...(adjacency.get(start) ?? [])]
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]
    if (reached.has(current)) continue
    reached.add(current)
    queue.push(...(adjacency.get(current) ?? []))
  }
  if (options.includeStart) reached.add(start)
  return reached
}
