/**
 * Network-analysis kit — pure graph algorithms for network visualizations.
 *
 * These are the primitives most network charts end up hand-rolling: adjacency,
 * breadth-first distances, shortest paths, ego networks, degree / betweenness /
 * closeness centrality, clustering coefficient, and the "spatial problem"
 * detector (nodes drawn closer than their graph distance warrants). They pair
 * naturally with `ForceDirectedGraph`, `NetworkCustomChart`, and the layout
 * recipes: size nodes by centrality, highlight an ego network on hover, trace a
 * shortest path, or diagnose a misleading layout.
 *
 * All functions are pure and dependency-free. Edges are treated as undirected.
 */

export interface GraphNode {
  id: string
}

export interface GraphEdge {
  source: string
  target: string
  value?: number
}

export interface Point {
  x: number
  y: number
}

/** Build an undirected adjacency map: node id → set of neighbor ids. */
export function buildAdjacency(
  nodes: ReadonlyArray<GraphNode>,
  edges: ReadonlyArray<GraphEdge>
): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>()
  for (const n of nodes) adj.set(n.id, new Set())
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, new Set())
    if (!adj.has(e.target)) adj.set(e.target, new Set())
    adj.get(e.source)!.add(e.target)
    adj.get(e.target)!.add(e.source)
  }
  return adj
}

/** Degree (neighbor count) per node id. */
export function degree(
  nodes: ReadonlyArray<GraphNode>,
  edges: ReadonlyArray<GraphEdge>
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const n of nodes) out[n.id] = 0
  for (const e of edges) {
    out[e.source] = (out[e.source] || 0) + 1
    out[e.target] = (out[e.target] || 0) + 1
  }
  return out
}

/** Breadth-first hop distance from `start` to every reachable node. */
export function bfsDistances(
  adjacency: Map<string, Set<string>>,
  start: string
): Record<string, number> {
  const dist: Record<string, number> = { [start]: 0 }
  const queue: string[] = [start]
  let head = 0
  while (head < queue.length) {
    const cur = queue[head]
    head += 1
    for (const nb of adjacency.get(cur) || []) {
      if (dist[nb] === undefined) {
        dist[nb] = dist[cur] + 1
        queue.push(nb)
      }
    }
  }
  return dist
}

/**
 * Unweighted shortest path between two node ids (BFS). Returns the path as an
 * ordered list of ids (inclusive of both ends), or `[]` if unreachable.
 */
export function shortestPath(
  nodes: ReadonlyArray<GraphNode>,
  edges: ReadonlyArray<GraphEdge>,
  source: string,
  target: string
): string[] {
  if (source === target) return source ? [source] : []
  const adj = buildAdjacency(nodes, edges)
  const prev: Record<string, string | null> = { [source]: null }
  const queue: string[] = [source]
  let head = 0
  while (head < queue.length) {
    const cur = queue[head]
    head += 1
    if (cur === target) break
    for (const nb of adj.get(cur) || []) {
      if (prev[nb] === undefined) {
        prev[nb] = cur
        queue.push(nb)
      }
    }
  }
  if (prev[target] === undefined) return []
  const path: string[] = []
  let cur: string | null = target
  while (cur != null) {
    path.unshift(cur)
    cur = prev[cur]
  }
  return path
}

/**
 * The ego network of a node: itself plus every node within `depth` hops.
 * Returns the set of member ids (use it to highlight neighbors on hover).
 */
export function egoNetwork(
  nodes: ReadonlyArray<GraphNode>,
  edges: ReadonlyArray<GraphEdge>,
  id: string,
  depth = 1
): Set<string> {
  const adj = buildAdjacency(nodes, edges)
  if (!adj.has(id)) return new Set()
  const dist = bfsDistances(adj, id)
  const out = new Set<string>()
  for (const key in dist) if (dist[key] <= depth) out.add(key)
  return out
}

/**
 * Betweenness centrality (Brandes' algorithm, unweighted, undirected). Higher
 * scores mark bridge nodes that many shortest paths pass through. Raw scores;
 * wrap with {@link normalizeScores} for a 0–1 encoding (e.g. node size).
 */
export function betweenness(
  nodes: ReadonlyArray<GraphNode>,
  edges: ReadonlyArray<GraphEdge>
): Record<string, number> {
  const adj = buildAdjacency(nodes, edges)
  const cb: Record<string, number> = {}
  for (const n of nodes) cb[n.id] = 0

  for (const s of nodes.map((n) => n.id)) {
    const stack: string[] = []
    const pred: Record<string, string[]> = {}
    const sigma: Record<string, number> = {}
    const dist: Record<string, number> = {}
    for (const n of nodes) {
      pred[n.id] = []
      sigma[n.id] = 0
      dist[n.id] = -1
    }
    sigma[s] = 1
    dist[s] = 0
    const queue: string[] = [s]
    let head = 0
    while (head < queue.length) {
      const v = queue[head]
      head += 1
      stack.push(v)
      for (const w of adj.get(v) || []) {
        if (dist[w] < 0) {
          dist[w] = dist[v] + 1
          queue.push(w)
        }
        if (dist[w] === dist[v] + 1) {
          sigma[w] += sigma[v]
          pred[w].push(v)
        }
      }
    }
    const delta: Record<string, number> = {}
    for (const n of nodes) delta[n.id] = 0
    while (stack.length) {
      const w = stack.pop()!
      for (const v of pred[w]) {
        delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w])
      }
      if (w !== s) cb[w] += delta[w]
    }
  }
  // Undirected: each pair counted twice.
  for (const id in cb) cb[id] /= 2
  return cb
}

/**
 * Closeness centrality: the inverse of the mean shortest-path distance to all
 * reachable nodes. Higher = more central. Raw scores; see {@link normalizeScores}.
 */
export function closeness(
  nodes: ReadonlyArray<GraphNode>,
  edges: ReadonlyArray<GraphEdge>
): Record<string, number> {
  const adj = buildAdjacency(nodes, edges)
  const out: Record<string, number> = {}
  for (const n of nodes) {
    const dist = bfsDistances(adj, n.id)
    let sum = 0
    let reach = 0
    for (const key in dist) {
      sum += dist[key]
      reach += 1
    }
    out[n.id] = sum > 0 ? (reach - 1) / sum : 0
  }
  return out
}

/**
 * Local clustering coefficient per node (0–1): the fraction of a node's
 * neighbor pairs that are themselves connected.
 */
export function clustering(
  nodes: ReadonlyArray<GraphNode>,
  edges: ReadonlyArray<GraphEdge>
): Record<string, number> {
  const adj = buildAdjacency(nodes, edges)
  const out: Record<string, number> = {}
  for (const n of nodes) {
    const nb = [...(adj.get(n.id) || [])]
    const k = nb.length
    if (k < 2) {
      out[n.id] = 0
      continue
    }
    let links = 0
    for (let i = 0; i < nb.length; i += 1) {
      for (let j = i + 1; j < nb.length; j += 1) {
        if (adj.get(nb[i])?.has(nb[j])) links += 1
      }
    }
    out[n.id] = (2 * links) / (k * (k - 1))
  }
  return out
}

/** Rescale a score map to 0–1 by its maximum (for size/opacity encodings). */
export function normalizeScores(scores: Record<string, number>): Record<string, number> {
  let max = 0
  for (const id in scores) if (scores[id] > max) max = scores[id]
  const out: Record<string, number> = {}
  for (const id in scores) out[id] = max > 0 ? scores[id] / max : 0
  return out
}

export interface ProximityProblemOptions {
  /** Minimum graph-hop distance for a pair to count as "far". @default 4 */
  minHops?: number
  /** Starting screen-distance threshold (in the units of `positions`). @default 0.08 */
  startThreshold?: number
  /** Cap the threshold search at this distance before relaxing `minHops`. @default 0.2 */
  maxThreshold?: number
}

export interface ProximityProblemResult {
  /** Ids drawn misleadingly close given their graph distance. */
  problemIds: Set<string>
  /** The screen-distance threshold at which offenders were found. */
  threshold: number
  /** The graph-hop distance used. */
  minHops: number
}

/**
 * The "spatial problem": find nodes drawn near each other on screen yet far
 * apart (or disconnected) in the graph — proximity pretending to be kinship,
 * the classic force-layout lie. `positions` is a map of node id → screen point
 * (any consistent coordinate space; distances are compared in those units).
 * The search escalates the distance threshold, then relaxes `minHops`, until at
 * least one offending pair is found.
 */
export function proximityProblem(
  nodes: ReadonlyArray<GraphNode>,
  edges: ReadonlyArray<GraphEdge>,
  positions: Record<string, Point>,
  options: ProximityProblemOptions = {}
): ProximityProblemResult {
  const adj = buildAdjacency(nodes, edges)
  const dist: Record<string, Record<string, number>> = {}
  for (const n of nodes) dist[n.id] = bfsDistances(adj, n.id)

  let minHops = options.minHops ?? 4
  let threshold = options.startThreshold ?? 0.08
  const maxThreshold = options.maxThreshold ?? 0.2
  const problemIds = new Set<string>()
  let guard = 0
  while (problemIds.size === 0 && guard < 40) {
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i].id
        const b = nodes[j].id
        const pa = positions[a]
        const pb = positions[b]
        if (!pa || !pb) continue
        const hops = dist[a][b] === undefined ? Infinity : dist[a][b]
        const dx = pa.x - pb.x
        const dy = pa.y - pb.y
        const screen = Math.sqrt(dx * dx + dy * dy)
        if (hops >= minHops && screen < threshold) {
          problemIds.add(a)
          problemIds.add(b)
        }
      }
    }
    if (problemIds.size === 0) {
      threshold += 0.02
      if (threshold > maxThreshold) {
        threshold = options.startThreshold ?? 0.08
        minHops = Math.max(2, minHops - 1)
      }
    }
    guard += 1
  }
  return { problemIds, threshold, minHops }
}
