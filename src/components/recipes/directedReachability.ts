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
  const queue: string[] = []
  // Mark on discovery: converging paths otherwise enqueue the same node once
  // per incoming edge. Iteration also avoids the argument limit of push(...set)
  // for a high-fanout node. Starting with successors preserves cyclic reachability
  // of `start` even when includeStart is false.
  const enqueue = (neighbors: Set<string> | undefined) => {
    if (!neighbors) return
    for (const neighbor of neighbors) {
      if (reached.has(neighbor)) continue
      reached.add(neighbor)
      queue.push(neighbor)
    }
  }
  enqueue(adjacency.get(start))
  for (let head = 0; head < queue.length; head++) {
    enqueue(adjacency.get(queue[head]))
  }
  if (options.includeStart) reached.add(start)
  return reached
}
