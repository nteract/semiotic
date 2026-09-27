import type { ProcessSankeyEdge } from "./algorithm"

const lowerBound = (values: readonly number[], value: number): number => {
  let lo = 0, hi = values.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (values[mid] < value) lo = mid + 1
    else hi = mid
  }
  return lo
}

class Counts {
  readonly coordinates: number[]
  readonly tree: Int32Array
  constructor(coordinates: number[]) {
    this.coordinates = [...new Set(coordinates)].sort((a, b) => a - b)
    this.tree = new Int32Array(this.coordinates.length + 1)
  }
  add(value: number, delta: number) {
    for (let i = lowerBound(this.coordinates, value) + 1; i < this.tree.length; i += i & -i) this.tree[i] += delta
  }
  below(value: number) {
    let count = 0
    for (let i = lowerBound(this.coordinates, value); i > 0; i -= i & -i) count += this.tree[i]
    return count
  }
}

interface Route {
  edge: ProcessSankeyEdge
  source: number
  target: number
  pair: number
  reverse: number
  sourceNode: number
  targetNode: number
}

function candidate(a: ProcessSankeyEdge, b: ProcessSankeyEdge) {
  return a.source !== b.source && a.target !== b.target &&
    a.source !== b.target && a.target !== b.source &&
    Math.max(a.startTime, b.startTime) < Math.min(a.endTime, b.endTime)
}

/** Exact temporal crossings with O(E log V) storage, never a graph-sized pair table. */
export class ProcessSankeyCrossings {
  private readonly routes: Route[] = []
  private readonly outgoing: number[][]
  private readonly incoming: number[][]
  private readonly nodeCount: number
  private readonly events: Array<{ time: number; route: number; delta: number }>
  private readonly smallPairs: Array<[number, number]> | null
  readonly work: number

  constructor(edges: readonly ProcessSankeyEdge[], slotForNode: ReadonlyMap<string, number>, private readonly size: number) {
    this.outgoing = Array.from({ length: size }, () => [])
    this.incoming = Array.from({ length: size }, () => [])
    const pairs = new Map<string, number>()
    const nodeIds = new Map<string, number>()
    for (const id of slotForNode.keys()) nodeIds.set(id, nodeIds.size)
    this.nodeCount = nodeIds.size
    for (const edge of edges) {
      const source = slotForNode.get(edge.source), target = slotForNode.get(edge.target)
      if (source === undefined || target === undefined || !(edge.startTime < edge.endTime)) continue
      const sourceNode = nodeIds.get(edge.source)!, targetNode = nodeIds.get(edge.target)!
      const key = `${sourceNode}:${targetNode}`
      if (!pairs.has(key)) pairs.set(key, pairs.size)
      const index = this.routes.length
      this.routes.push({ edge, source, target, sourceNode, targetNode, pair: pairs.get(key)!, reverse: -1 })
      this.outgoing[source].push(index)
      this.incoming[target].push(index)
    }
    for (const route of this.routes) route.reverse = pairs.get(`${route.targetNode}:${route.sourceNode}`) ?? -1
    this.events = this.routes.flatMap((route, i) => [
      { time: route.edge.startTime, route: i, delta: 1 },
      { time: route.edge.endTime, route: i, delta: -1 },
    ]).sort((a, b) => a.time - b.time || a.delta - b.delta || a.route - b.route)
    // A constant-size kernel keeps exhaustive small-graph search inexpensive.
    // Large graphs always use the sweep, regardless of the number of slots.
    this.smallPairs = this.routes.length <= 80 ? [] : null
    if (this.smallPairs) {
      for (let i = 0; i < this.routes.length; i++) {
        for (let j = i + 1; j < this.routes.length; j++) {
          if (candidate(this.routes[i].edge, this.routes[j].edge)) this.smallPairs.push([i, j])
        }
      }
    }
    this.work = this.smallPairs?.length ?? Infinity
  }

  private crossing(a: Route, b: Route, positions: ArrayLike<number>) {
    return (positions[a.source] - positions[b.source]) * (positions[a.target] - positions[b.target]) < 0 ? 1 : 0
  }

  count(positions: ArrayLike<number>): number {
    if (this.smallPairs) {
      let result = 0
      for (const [a, b] of this.smallPairs) result += this.crossing(this.routes[a], this.routes[b], positions)
      return result
    }
    const columns: number[][] = Array.from({ length: this.size + 1 }, () => [])
    for (const route of this.routes) {
      const s = positions[route.source], t = positions[route.target]
      for (let i = s + 1; i <= this.size; i += i & -i) columns[i].push(t)
    }
    const grid = columns.map((column) => new Counts(column))
    // Cross-endpoint exclusions only ask whether the other endpoint is above
    // or below the shared node. Four counters per node suffice; no second
    // collection of range trees or incident-pair enumeration is necessary.
    const neighbors = new Int32Array(this.nodeCount * 4)
    const pairCounts = new Int32Array(this.routes.length)
    const prefix = (x: number, y: number) => {
      let count = 0
      for (let i = x; i > 0; i -= i & -i) count += grid[i].below(y)
      return count
    }
    let result = 0
    for (const event of this.events) {
      const route = this.routes[event.route]
      const s = positions[route.source], t = positions[route.target]
      if (event.delta === 1) {
        result += prefix(s, this.size) - prefix(s, t + 1) + prefix(this.size, t) - prefix(s + 1, t)
        // Cross-endpoint sharing is excluded by the public crossing contract.
        // Equal source/target lanes were already excluded by strict rectangles.
        if (s !== t) {
          result -= neighbors[route.sourceNode * 4 + (s < t ? 1 : 0)]
          result -= neighbors[route.targetNode * 4 + (s < t ? 2 : 3)]
          if (route.reverse >= 0) result += pairCounts[route.reverse]
        }
      }
      for (let i = s + 1; i <= this.size; i += i & -i) grid[i].add(t, event.delta)
      if (s !== t) {
        neighbors[route.sourceNode * 4 + (s < t ? 3 : 2)] += event.delta
        neighbors[route.targetNode * 4 + (s < t ? 0 : 1)] += event.delta
      }
      pairCounts[route.pair] += event.delta
    }
    return result
  }

  /** Only pairs on opposite sides of an adjacent source/target swap can change. */
  swapDelta(first: number, second: number, positions: ArrayLike<number>) {
    let delta = 0, evaluations = 0
    const moved = (slot: number) => positions[slot === first ? second : slot === second ? first : slot]
    const visit = (a: number, b: number) => {
      const left = this.routes[a], right = this.routes[b]
      if (!candidate(left.edge, right.edge)) return
      evaluations++
      const after = (moved(left.source) - moved(right.source)) * (moved(left.target) - moved(right.target)) < 0 ? 1 : 0
      delta += after - this.crossing(left, right, positions)
    }
    for (const a of this.outgoing[first]) for (const b of this.outgoing[second]) visit(a, b)
    for (const a of this.incoming[first]) for (const b of this.incoming[second]) {
      const left = this.routes[a], right = this.routes[b]
      if ((left.source === first && right.source === second) || (left.source === second && right.source === first)) continue
      visit(a, b)
    }
    return { delta, evaluations }
  }
}
