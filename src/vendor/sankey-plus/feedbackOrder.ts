interface IndexedNode {
  index: number
}

/**
 * Weighted Eades-style feedback ordering. Peel sinks to the right and sources
 * to the left; otherwise prefer the greatest outgoing minus incoming flow.
 * This is a heuristic, not a minimum feedback arc set. An indexed heap bounds
 * ordering to O((V + E) log(V + E)) time and O(V + E) space without enumerating
 * cycles. Canonical edge traversal also makes floating-point sums independent
 * of the input node/edge order.
 * Self-links do not influence the order and are always circular at the caller.
 */
export function feedbackOrder<N extends IndexedNode>(
  nodes: N[],
  links: { source: N; target: N; value: number }[],
  id: (node: N) => unknown
): Int32Array {
  const count = nodes.length
  const incoming = Array.from({ length: count }, () => [] as number[])
  const outgoing = Array.from({ length: count }, () => [] as number[])
  const inDegree = new Int32Array(count)
  const outDegree = new Int32Array(count)
  const balance = new Float64Array(count)
  const weights = new Float64Array(links.length)
  const rank = new Int32Array(count)
  const keys = nodes.map((node) => {
    const key = id(node)
    return `${typeof key}:${String(key)}`
  })
  let maxWeight = 0
  for (const link of links) {
    if (link.source.index !== link.target.index && Number.isFinite(link.value)) {
      maxWeight = Math.max(maxWeight, link.value)
    }
  }
  const compareKey = (a: number, b: number) =>
    keys[a] < keys[b] ? -1 : keys[a] > keys[b] ? 1 : 0
  const edgeOrder = links
    .map((_, i) => i)
    .sort(
      (a, b) =>
        compareKey(links[a].source.index, links[b].source.index) ||
        compareKey(links[a].target.index, links[b].target.index) ||
        links[a].value - links[b].value
    )
  edgeOrder.forEach((i) => {
    const link = links[i]
    const source = link.source.index
    const target = link.target.index
    if (source === target) return
    // Scaling preserves relative weights and avoids overflowing flow sums.
    const weight =
      Number.isFinite(link.value) && maxWeight > 0
        ? Math.max(0, link.value) / maxWeight
        : 0
    weights[i] = weight
    outgoing[source].push(i)
    incoming[target].push(i)
    outDegree[source]++
    inDegree[target]++
    balance[source] += weight
    balance[target] -= weight
  })

  const heap = nodes.map((node) => node.index)
  const positions = Int32Array.from(heap)
  const priority = (v: number) =>
    outDegree[v] === 0 ? 2 : inDegree[v] === 0 ? 1 : 0
  const before = (a: number, b: number) => {
    const pa = priority(a)
    const pb = priority(b)
    if (pa !== pb) return pa > pb
    if (pa === 0 && balance[a] !== balance[b]) return balance[a] > balance[b]
    return keys[a] < keys[b] || (keys[a] === keys[b] && a < b)
  }
  const swap = (a: number, b: number) => {
    const v = heap[a]
    heap[a] = heap[b]
    heap[b] = v
    positions[heap[a]] = a
    positions[v] = b
  }
  const repair = (v: number, heapifying = false) => {
    let p = positions[v]
    while (!heapifying && p > 0) {
      const parent = (p - 1) >>> 1
      if (!before(v, heap[parent])) break
      swap(p, parent)
      p = parent
    }
    while (p * 2 + 1 < heap.length) {
      let child = p * 2 + 1
      if (child + 1 < heap.length && before(heap[child + 1], heap[child]))
        child++
      if (!before(heap[child], v)) break
      swap(p, child)
      p = child
    }
  }
  for (let i = (heap.length >>> 1) - 1; i >= 0; i--) repair(heap[i], true)

  let left = 0
  let right = count - 1
  while (heap.length) {
    const v = heap[0]
    rank[v] = outDegree[v] === 0 ? right-- : left++
    const last = heap.pop()!
    positions[v] = -1
    if (heap.length) {
      heap[0] = last
      positions[last] = 0
      repair(last)
    }
    for (const i of outgoing[v]) {
      const target = links[i].target.index
      if (positions[target] < 0) continue
      inDegree[target]--
      balance[target] += weights[i]
      repair(target)
    }
    for (const i of incoming[v]) {
      const source = links[i].source.index
      if (positions[source] < 0) continue
      outDegree[source]--
      balance[source] -= weights[i]
      repair(source)
    }
  }
  return rank
}
