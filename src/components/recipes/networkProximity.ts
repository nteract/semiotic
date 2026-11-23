import { quadtree } from "d3-quadtree"
import type { GraphNode, Point, ProximityProblemOptions, ProximityProblemResult } from "./networkAnalysis"
import { ownValue } from "./atlas/ids"

type Location = Point & { ids: string[] }

export function nodesWithinHops(adjacency: Map<string, Set<string>>, start: string, maxHops: number) {
  const seen = new Set<string>()
  if (!adjacency.has(start) || !(maxHops >= 0)) return seen
  seen.add(start)
  let frontier = [start]
  for (let depth = 1; depth <= maxHops && frontier.length; depth++) {
    const next: string[] = []
    for (const id of frontier) {
      for (const neighbor of adjacency.get(id) ?? []) {
        if (seen.has(neighbor)) continue
        seen.add(neighbor)
        next.push(neighbor)
      }
    }
    frontier = next
  }
  return seen
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
  const maxDistance = options.maxThreshold ?? options.startThreshold ?? spacing * 0.9
  let threshold = Math.min(options.startThreshold ?? spacing / 2, maxDistance)
  const problemIds = new Set<string>()
  function inspect(radius: number) {
    for (const { x, y, ids } of points) {
      for (const id of ids) {
        // A flagged node needs no further search: each unflagged peer will check its own neighborhood.
        if (problemIds.has(id)) continue
        let nearby: Set<string> | undefined
        tree.visit((cell, x0, y0, x1, y1) => {
          if (x0 > x + radius || x1 < x - radius || y0 > y + radius || y1 < y - radius) return true
          if (cell.length) return false
          const candidate = cell.data
          const distance = Math.hypot(candidate.x - x, candidate.y - y)
          if (distance >= radius && distance !== 0) return false
          for (const other of candidate.ids) {
            if (other === id) continue
            nearby ??= nodesWithinHops(adjacency, id, Math.ceil(minHops) - 1)
            if (nearby.has(other)) continue
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
