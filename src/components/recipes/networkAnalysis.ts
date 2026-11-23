import { findProximityProblems, hopDistances } from "./networkProximity"
import { adjacencyMap } from "./directedReachability"
import { idDictionary } from "./atlas/ids"

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
  const prev = new Map<string, string | null>([[source, null]])
  for (const cur of prev.keys()) {
    if (cur === target) break
    for (const nb of adj.get(cur) || []) {
      if (!prev.has(nb)) prev.set(nb, cur)
    }
  }
  if (!prev.has(target)) return []
  const path: string[] = []
  let cur: string | null = target
  while (cur != null) {
    path.push(cur)
    cur = prev.get(cur) ?? null
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
  const cb: Record<string, number> = Object.fromEntries(nodes.map(({ id }) => [id, 0]))

  for (const { id: s } of nodes) {
    const pred = idDictionary<string[]>()
    const sigma = idDictionary<number>()
    const dist = idDictionary<number>()
    const delta = idDictionary<number>()
    for (const n of nodes) {
      pred[n.id] = []
      sigma[n.id] = 0
      dist[n.id] = -1
      delta[n.id] = 0
    }
    sigma[s] = 1
    dist[s] = 0
    const queue: string[] = [s]
    let head = 0
    while (head < queue.length) {
      const v = queue[head]
      head += 1
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
    while (queue.length) {
      const w = queue.pop()!
      for (const v of pred[w]) {
        delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w])
      }
      if (w !== s) cb[w] += delta[w]
    }
  }
  // Undirected: each pair counted twice.
  for (const id of Object.keys(cb)) cb[id] /= 2
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
  return Object.fromEntries(nodes.map(({ id }) => {
    const distances = hopDistances(adj, id)
    let sum = 0
    for (const hops of distances.values()) sum += hops
    return [id, sum > 0 ? (distances.size - 1) / sum : 0]
  }))
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
  return Object.fromEntries(nodes.map(({ id }) => {
    const neighbors = adj.get(id)!
    const k = neighbors.size
    if (k < 2) return [id, 0]
    let links = 0
    for (const neighbor of neighbors) {
      for (const other of adj.get(neighbor)!) if (neighbors.has(other)) links++
    }
    return [id, links / (k * (k - 1))]
  }))
}

/** Rescale a score map to 0–1 by its maximum (for size/opacity encodings). */
export function normalizeScores(scores: Record<string, number>): Record<string, number> {
  let max = 0
  for (const id of Object.keys(scores)) if (scores[id] > max) max = scores[id]
  return Object.fromEntries(Object.entries(scores).map(([id, value]) => [id, max > 0 ? value / max : 0]))
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
