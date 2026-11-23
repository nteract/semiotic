import { quadtree } from "d3-quadtree"
import type { GraphNode, Point, ProximityProblemOptions, ProximityProblemResult } from "./networkAnalysis"
import { ownValue } from "./atlas/ids"

type Location = Point & { ids: string[] }

// Every pair in the group is at most two hops apart if one vertex touches them all.
function hasCoveringHub(ids: string[], adjacency: Map<string, Set<string>>) {
  if (ids.length === 1) return true
  let seed = ids[0]
  for (const id of ids) {
    if (adjacency.get(id)!.size < adjacency.get(seed)!.size) seed = id
  }
  function covers(hub: string) {
    const neighbors = adjacency.get(hub)!
    return neighbors.size >= ids.length - 1 && ids.every(id => id === hub || neighbors.has(id))
  }
  if (covers(seed)) return true
  for (const neighbor of adjacency.get(seed)!) if (covers(neighbor)) return true
  return false
}

function shareNeighbor(left: Set<string>, right: Set<string>) {
  const [smaller, larger] = left.size <= right.size ? [left, right] : [right, left]
  for (const id of smaller) if (larger.has(id)) return true
  return false
}

export function hopDistances(adjacency: Map<string, Set<string>>, start: string, maxHops = Infinity) {
  const distances = new Map([[start, 0]])
  for (const [id, depth] of distances) {
    if (depth + 1 > maxHops) break
    for (const neighbor of adjacency.get(id) ?? []) {
      if (!distances.has(neighbor)) distances.set(neighbor, depth + 1)
    }
  }
  return distances
}

export function findProximityProblems(
  nodes: readonly GraphNode[],
  adjacency: Map<string, Set<string>>,
  positions: Record<string, Point>,
  options: ProximityProblemOptions
): ProximityProblemResult {
  const locations = new Map<string, Location>()
  for (const { id } of nodes) {
    const point = ownValue(positions, id)
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue
    const key = `${point.x},${point.y}`
    const location = locations.get(key)
    if (location) location.ids.push(id)
    else locations.set(key, { x: point.x, y: point.y, ids: [id] })
  }
  const points = Array.from(locations.values())
  const tree = quadtree(points, p => p.x, p => p.y)
  let spacing = 0
  if (options.startThreshold == null && points.length > 1) {
    const distances = points.map(point => {
      tree.remove(point)
      const nearest = tree.find(point.x, point.y)!
      tree.add(point)
      return Math.hypot(nearest.x - point.x, nearest.y - point.y)
    }).sort((a, b) => a - b)
    const middle = (distances.length - 1) / 2
    spacing = (distances[Math.floor(middle)] + distances[Math.ceil(middle)]) / 2
  }
  const minHops = options.minHops ?? 3
  const maxNearHops = Math.ceil(minHops) - 1
  const compact = new Set(maxNearHops >= 2 ? points.filter(point => hasCoveringHub(point.ids, adjacency)) : [])
  const maxDistance = options.maxThreshold ?? options.startThreshold ?? spacing * 0.9
  let threshold = Math.min(options.startThreshold ?? spacing / 2, maxDistance)
  const problemIds = new Set<string>()
  function inspect(radius: number) {
    for (const point of points) {
      const { x, y, ids } = point
      for (const id of ids) {
        // A flagged node needs no further search: each unflagged peer will check its own neighborhood.
        if (problemIds.has(id)) continue
        const neighbors = adjacency.get(id)!
        let extendedNeighborhood: Map<string, number> | undefined
        tree.visit((cell, x0, y0, x1, y1) => {
          if (x0 > x + radius || x1 < x - radius || y0 > y + radius || y1 < y - radius) return true
          if (cell.length) return false
          const candidate = cell.data
          if (candidate === point && compact.has(point)) return false
          const distance = Math.hypot(candidate.x - x, candidate.y - y)
          if (distance >= radius && distance !== 0) return false
          for (const other of candidate.ids) {
            if (other === id || (maxNearHops >= 1 && neighbors.has(other))) continue
            if (maxNearHops >= 2 && shareNeighbor(neighbors, adjacency.get(other)!)) continue
            if (maxNearHops > 2) {
              extendedNeighborhood ??= hopDistances(adjacency, id, maxNearHops)
              if (extendedNeighborhood.has(other)) continue
            }
            problemIds.add(id)
            problemIds.add(other)
          }
          return false
        })
      }
    }
  }
  inspect(threshold)
  if (!problemIds.size && maxDistance > threshold) {
    threshold = maxDistance
    inspect(threshold)
  }
  return { problemIds, threshold, minHops }
}
