import { stronglyConnectedComponents } from "./atlas/directedGraph"
/** Iterative Kosaraju traversal followed by sink-first DAG layering. */
export function ensembleCondensation(
  ids: readonly string[],
  outgoing: ReadonlyMap<string, ReadonlySet<string>>
) {
  const groups = stronglyConnectedComponents({
    nodes: ids.map((id) => ({ id })),
    edges: ids.flatMap((source) => [...outgoing.get(source)!].map((target) => ({ source, target }))),
  })
  const component = new Map<string, number>()
  groups.forEach((members, index) => members.forEach((id) => component.set(id, index)))
  const count = groups.length
  const parents = Array.from({ length: count }, () => new Set<number>())
  const children = Array.from({ length: count }, () => new Set<number>())
  for (const id of ids) {
    const source = component.get(id)!
    for (const target of outgoing.get(id)!) {
      const destination = component.get(target)!
      if (source === destination) continue
      children[source].add(destination)
      parents[destination].add(source)
    }
  }
  const remaining = children.map((set) => set.size)
  const queue = remaining.flatMap((size, i) => (size === 0 ? [i] : []))
  const sinkCount = queue.length
  const sourceCount = parents.filter((set) => set.size === 0).length
  const heights = new Int32Array(count)
  let maximum = 0
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]
    for (const parent of parents[current]) {
      heights[parent] = Math.max(heights[parent], heights[current] + 1)
      maximum = Math.max(maximum, heights[parent])
      if (--remaining[parent] === 0) queue.push(parent)
    }
  }
  return {
    sinkCount,
    sourceCount,
    layerCount: maximum + 1,
    layer: new Map(ids.map((id) => [id, maximum - heights[component.get(id)!]]))
  }
}
