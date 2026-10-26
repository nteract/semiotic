import type { AtlasEdge, PreparedNetworkAtlas } from "./types"

/** Relations on admitted root-to-target walks, including alternatives and cycles. */
export function targetRelations(
  atlas: PreparedNetworkAtlas,
  target: string
): AtlasEdge[] {
  const reachable = new Set(atlas.requiredPaths?.reachableNodeIds ?? [])
  if (!reachable.has(target)) return []
  const incoming = new Map<string, string[]>()
  for (const edge of atlas.source.edges) {
    if (!reachable.has(edge.source) || !reachable.has(edge.target)) continue
    const sources = incoming.get(edge.target) ?? []
    sources.push(edge.source)
    incoming.set(edge.target, sources)
  }
  const ancestors = new Set([target])
  const queue = [target]
  for (let i = 0; i < queue.length; i++) {
    for (const source of incoming.get(queue[i]) ?? []) {
      if (ancestors.has(source)) continue
      ancestors.add(source)
      queue.push(source)
    }
  }
  return atlas.source.edges.filter(
    (edge) =>
      reachable.has(edge.source) &&
      ancestors.has(edge.source) &&
      ancestors.has(edge.target)
  )
}

/** Original root-reachable relations removed by excluding the selected nodes. */
export function removalReferences(
  atlas: PreparedNetworkAtlas,
  avoiding: ReadonlySet<string>,
  relations: readonly AtlasEdge[] = atlas.source.edges
): string[] {
  const reachable = new Set(atlas.requiredPaths?.reachableNodeIds ?? [])
  return relations
    .filter(
      (edge) =>
        reachable.has(edge.source) &&
        reachable.has(edge.target) &&
        (avoiding.has(edge.source) || avoiding.has(edge.target))
    )
    .map((edge) => edge.id)
}
