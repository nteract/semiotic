import { findProximityProblems, hopDistances } from "./networkProximity"
import { adjacencyMap } from "./directedReachability"
import { hasOwn, ownValue, setOwnValue, idDictionary } from "./atlas/ids"

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
 * All functions are pure. Edges are treated as undirected.
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

export {
  buildDirectedAdjacency,
  reachableFrom,
} from "./directedReachability"

/** Build an undirected adjacency map: node id → set of neighbor ids. */
export function buildAdjacency(
  nodes: ReadonlyArray<GraphNode>,
  edges: ReadonlyArray<GraphEdge>
): Map<string, Set<string>> {
  return adjacencyMap(nodes, edges, false)
}

/** Degree (neighbor count) per node id. */
export function degree(
  nodes: ReadonlyArray<GraphNode>,
  edges: ReadonlyArray<GraphEdge>
): Record<string, number> {
  return Object.fromEntries(Array.from(buildAdjacency(nodes, edges), ([id, neighbors]) => [id, neighbors.size]))
}

/** Breadth-first hop distance from `start` to every reachable node. */
export function bfsDistances(
  adjacency: Map<string, Set<string>>,
  start: string
): Record<string, number> {
  return Object.fromEntries(hopDistances(adjacency, start))
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
  const prev = idDictionary<string | null>()
  prev[source] = null
  const queue: string[] = [source]
  let head = 0
  while (head < queue.length) {
    const cur = queue[head]
    head += 1
    if (cur === target) break
    for (const nb of adj.get(cur) || []) {
      if (!hasOwn(prev, nb)) {
        prev[nb] = cur
        queue.push(nb)
      }
    }
  }
  if (!hasOwn(prev, target)) return []
  const path: string[] = []
  let cur: string | null = target
  while (cur != null) {
    path.push(cur)
    cur = prev[cur]
  }
  return path.reverse()
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
  const adjacency = buildAdjacency(nodes, edges)
  return adjacency.has(id) && depth >= 0
    ? new Set(hopDistances(adjacency, id, depth).keys())
    : new Set()
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
  for (const n of nodes) setOwnValue(cb, n.id, 0)

  for (const s of nodes.map((n) => n.id)) {
    const stack: string[] = []
    const pred = idDictionary<string[]>()
    const sigma = idDictionary<number>()
    const dist = idDictionary<number>()
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
    const delta = idDictionary<number>()
    for (const n of nodes) delta[n.id] = 0
    while (stack.length) {
      const w = stack.pop()!
      for (const v of pred[w]) {
        delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w])
      }
      if (w !== s) setOwnValue(cb, w, (ownValue(cb, w) ?? 0) + delta[w])
    }
  }
  // Undirected: each pair counted twice.
  for (const id of Object.keys(cb)) setOwnValue(cb, id, cb[id] / 2)
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
    const distances = Object.values(dist)
    const sum = distances.reduce((total, hops) => total + hops, 0)
    setOwnValue(out, n.id, sum > 0 ? (distances.length - 1) / sum : 0)
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
      setOwnValue(out, n.id, 0)
      continue
    }
    let links = 0
    for (let i = 0; i < nb.length; i += 1) {
      for (let j = i + 1; j < nb.length; j += 1) {
        if (adj.get(nb[i])?.has(nb[j])) links += 1
      }
    }
    setOwnValue(out, n.id, (2 * links) / (k * (k - 1)))
  }
  return out
}

/** Rescale a score map to 0–1 by its maximum (for size/opacity encodings). */
export function normalizeScores(scores: Record<string, number>): Record<string, number> {
  let max = 0
  for (const id of Object.keys(scores)) if (scores[id] > max) max = scores[id]
  const out: Record<string, number> = {}
  for (const id of Object.keys(scores)) {
    setOwnValue(out, id, max > 0 ? scores[id] / max : 0)
  }
  return out
}

export interface ProximityProblemOptions {
  /** Minimum graph-hop distance for a pair to count as "far". @default 3 */
  minHops?: number
  /** First distance to check in position units. Defaults to half the median nearest distinct position distance. */
  startThreshold?: number
  /** Fallback distance in position units. Defaults to 90% of typical spacing, or an explicit startThreshold. */
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

/** Find spatially close nodes separated by at least the requested number of graph hops. */
export function proximityProblem(
  nodes: ReadonlyArray<GraphNode>,
  edges: ReadonlyArray<GraphEdge>,
  positions: Record<string, Point>,
  options: ProximityProblemOptions = {}
): ProximityProblemResult {
  return findProximityProblems(nodes, buildAdjacency(nodes, edges), positions, options)
}
