import { postorder } from "./directedGraph"
import type { DominatorResult, RequiredPathsSpec } from "./dependencyTypes"
import type { NetworkAtlasSource } from "./types"

/**
 * Original-graph immediate dominators, using iterative reverse-postorder
 * intersection (Cooper, Harvey and Kennedy). Multiple declared roots connect
 * to a private numeric sentinel; it is never a canonical node or factual edge.
 * Algorithm reference: https://hdl.handle.net/1911/96345
 */
export function buildRequiredPaths(
  source: NetworkAtlasSource,
  spec: RequiredPathsSpec
): DominatorResult {
  const ids = source.nodes.map((node) => node.id).sort()
  const index = new Map(ids.map((id, i) => [id, i]))
  const synthetic = ids.length
  const outgoing = Array.from({ length: ids.length + 1 }, () => [] as number[])
  const incoming = outgoing.map(() => [] as number[])
  const connect = (from: number, to: number) => {
    outgoing[from].push(to)
    incoming[to].push(from)
  }
  for (const edge of source.edges)
    connect(index.get(edge.source)!, index.get(edge.target)!)
  for (const root of spec.roots) connect(synthetic, index.get(root)!)
  const order = postorder(outgoing, [synthetic]).reverse()
  const rank = new Map(order.map((node, i) => [node, i]))
  const parents = new Map([[synthetic, synthetic]])
  const intersect = (left: number, right: number) => {
    while (left !== right) {
      if (rank.get(left)! > rank.get(right)!) left = parents.get(left)!
      else right = parents.get(right)!
    }
    return left
  }
  let changed = true
  while (changed) {
    changed = false
    for (const node of order.slice(1)) {
      const known = incoming[node].filter((parent) => parents.has(parent))
      const parent = known.reduce(intersect)
      if (parents.get(node) !== parent) {
        parents.set(node, parent)
        changed = true
      }
    }
  }
  return {
    ...spec,
    roots: [...new Set(spec.roots)].sort(),
    status: source.nodes.some(
      (node) => node.completeness && node.completeness !== "known"
    )
      ? "incomplete"
      : "exact",
    immediateDominatorByNode: Object.fromEntries(
      ids.flatMap((id, i) =>
        parents.has(i)
          ? [[id, parents.get(i) === synthetic ? null : ids[parents.get(i)!]]]
          : []
      )
    ),
    reachableNodeIds: ids.filter((_, i) => parents.has(i)),
    unreachableNodeIds: ids.filter((_, i) => !parents.has(i))
  }
}
