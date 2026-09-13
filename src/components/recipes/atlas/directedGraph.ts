import type { AtlasEdge, NetworkAtlasSource } from "./types"

export function graphAdjacency(source: NetworkAtlasSource) {
  const outgoing = new Map(
    source.nodes.map((node) => [node.id, [] as AtlasEdge[]])
  )
  const incoming = new Map(
    source.nodes.map((node) => [node.id, [] as AtlasEdge[]])
  )
  for (const edge of source.edges) {
    outgoing.get(edge.source)!.push(edge)
    incoming.get(edge.target)!.push(edge)
  }
  return { outgoing, incoming }
}

/** Iterative DFS avoids a JavaScript stack limit on deep dependency chains. */
export function postorder(
  adjacency: readonly number[][],
  roots: readonly number[]
) {
  const visited = new Set<number>()
  const result: number[] = []
  for (const root of roots) {
    if (visited.has(root)) continue
    visited.add(root)
    const stack = [{ node: root, next: 0 }]
    while (stack.length) {
      const frame = stack[stack.length - 1]
      const child = adjacency[frame.node][frame.next++]
      if (child === undefined) {
        result.push(frame.node)
        stack.pop()
      } else if (!visited.has(child)) {
        visited.add(child)
        stack.push({ node: child, next: 0 })
      }
    }
  }
  return result
}

/** SCC membership organizes feedback; it does not imply node-level dominance. */
export function stronglyConnectedComponents(
  source: NetworkAtlasSource
): string[][] {
  const ids = source.nodes.map((node) => node.id).sort()
  const index = new Map(ids.map((id, i) => [id, i]))
  const outgoing = ids.map(() => [] as number[])
  const incoming = ids.map(() => [] as number[])
  for (const edge of source.edges) {
    const from = index.get(edge.source)!
    const to = index.get(edge.target)!
    outgoing[from].push(to)
    incoming[to].push(from)
  }
  const assigned = new Set<number>()
  const components: string[][] = []
  for (const start of postorder(
    outgoing,
    ids.map((_, i) => i)
  ).reverse()) {
    if (assigned.has(start)) continue
    const members: string[] = []
    const stack = [start]
    assigned.add(start)
    while (stack.length) {
      const node = stack.pop()!
      members.push(ids[node])
      for (const parent of incoming[node]) {
        if (!assigned.has(parent)) {
          assigned.add(parent)
          stack.push(parent)
        }
      }
    }
    components.push(members.sort())
  }
  return components.sort((a, b) => a[0].localeCompare(b[0]))
}
