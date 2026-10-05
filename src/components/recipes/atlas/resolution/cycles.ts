import type { CycleLedger } from "./types"

/** Forget direction but keep every edge ID, parallel record, self-loop and isolate. */
export function cycleRank(
  nodeIds: readonly string[],
  edges: readonly { source: string; target: string }[]
): number {
  const adjacency = new Map(nodeIds.map((id) => [id, [] as string[]]))
  if (adjacency.size !== nodeIds.length)
    throw new Error("Duplicate cycle-account vertex")
  for (const edge of edges) {
    if (!adjacency.has(edge.source) || !adjacency.has(edge.target))
      throw new Error("Dangling cycle-account edge")
    adjacency.get(edge.source)!.push(edge.target)
    adjacency.get(edge.target)!.push(edge.source)
  }
  const seen = new Set<string>()
  let components = 0
  for (const id of nodeIds) {
    if (seen.has(id)) continue
    components++
    const stack = [id]
    seen.add(id)
    while (stack.length) {
      for (const neighbor of adjacency.get(stack.pop()!)!) {
        if (!seen.has(neighbor)) {
          seen.add(neighbor)
          stack.push(neighbor)
        }
      }
    }
  }
  return edges.length - nodeIds.length + components
}

export function cycleLedger(
  sourceRank: number,
  internalRank: number,
  boundaryRank: number
): CycleLedger {
  if (sourceRank !== internalRank + boundaryRank)
    throw new Error("Cycle account does not balance")
  return {
    convention: "undirected-multigraph-keep-edge-ids/v1",
    sourceRank,
    internalRank,
    boundaryRank,
    identityChecked: true
  }
}
