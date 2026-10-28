import type { Datum } from "../charts/shared/datumTypes"
import type { DistributionStats } from "./ordinalTypes"

export interface NavPoint {
  x: number
  y: number
  datum: Datum | null
  /** Logical identity for aggregates whose datum is rebuilt during layout. */
  semanticKey?: string
  /** Network scene identity and optional authored navigation parent. */
  navId?: string
  navParentId?: string
  /** Shape hint for focus ring rendering */
  shape?: "circle" | "rect" | "wedge" | "geoarea" | "path"
  /** Width of rect-shaped elements (bars, sankey nodes) */
  w?: number
  /** Height of rect-shaped elements */
  h?: number
  /** SVG path (plot-relative) for a geoarea focus ring — the shape is
   *  outlined instead of drawing a circle at the centroid. */
  pathData?: string
  /** Distribution hover metadata, shared with pointer tooltips. */
  stats?: DistributionStats
  category?: string
  /** Group identifier for graph navigation (series name, category, node id) */
  group?: string
  /**
   * Data reading order. When set on the points being compared, it replaces
   * geometric x-then-y sorting so keyboard order follows the scene instead
   * of bar length or screen position.
   */
  readingOrder?: number
  /** Index in NavGraph.flat — set by buildNavGraph for O(1) lookup */
  _flatIndex?: number
  /** Index within its group — set by buildNavGraph for O(1) resolvePosition */
  _groupIndex?: number
}

// ── Navigation Graph ─────────────────────────────────────────────────────

/**
 * A navigation graph that organizes NavPoints into groups (series/categories)
 * and positions within each group, enabling 2D keyboard navigation.
 *
 * ArrowRight/Left = next/prev within the current group (e.g. along a line series)
 * ArrowUp/Down = switch to the nearest point in an adjacent group (e.g. switch series)
 */
export interface NavGraph {
  /** All points in flat order (for PageUp/Down, Home/End) */
  flat: NavPoint[]
  /** Group names in stable order */
  groups: string[]
  /** Points per group, in position order */
  byGroup: Map<string, NavPoint[]>
  /** Precomputed node id → flat index lookup (for network navigation) */
  idToIdx: Map<string, number>
}

export interface NavPosition {
  /** Index into NavGraph.flat */
  flatIndex: number
  /** Current group name */
  group: string
  /** Index within the current group */
  indexInGroup: number
}

/**
 * Build a navigation graph from grouped NavPoints.
 * Points within each group follow `readingOrder` when every point sets it, and
 * otherwise x then y. Groups with a reading order follow first appearance.
 * Groups without one stay in top-to-bottom order.
 */
export function buildNavGraph(points: NavPoint[]): NavGraph {
  const ordered = points.every(point => point.readingOrder != null)
  const spatial = (a: NavPoint, b: NavPoint) => a.x - b.x || a.y - b.y
  if (ordered) points = points.slice().sort((a, b) => a.readingOrder! - b.readingOrder! || spatial(a, b))

  const byGroup = new Map<string, NavPoint[]>()

  for (const p of points) {
    const g = p.group ?? "_default"
    let arr = byGroup.get(g)
    if (!arr) {
      arr = []
      byGroup.set(g, arr)
    }
    arr.push(p)
  }

  // Sort within each group, then stamp group indices
  for (const arr of byGroup.values()) {
    if (!ordered) arr.sort(spatial)
    for (let i = 0; i < arr.length; i++) {
      arr[i]._groupIndex = i
    }
  }

  // Ordered input is globally sorted once; each group retains that order.
  const groups = Array.from(byGroup.keys())
  if (!ordered) groups.sort((a, b) => byGroup.get(a)![0].y - byGroup.get(b)![0].y)
  const flat = ordered ? points : Array.from(byGroup.values()).flat().sort(spatial)

  // Stamp flat index on each point for O(1) lookup and build id→index map
  const idToIdx = new Map<string, number>()
  for (let i = 0; i < flat.length; i++) {
    flat[i]._flatIndex = i
    const id = flat[i].navId ?? flat[i].datum?.id
    if (id != null) idToIdx.set(String(id), i)
    const datumId = flat[i].datum?.id
    if (datumId != null && !idToIdx.has(String(datumId)))
      idToIdx.set(String(datumId), i)
  }

  return { flat, groups, byGroup, idToIdx }
}

/**
 * Resolve the current NavPosition from a flat index.
 * Clamps to valid range if the index is stale (e.g. scene changed between key presses).
 */
export function resolvePosition(
  graph: NavGraph,
  flatIndex: number
): NavPosition {
  if (graph.flat.length === 0) {
    return { flatIndex: -1, group: "_default", indexInGroup: -1 }
  }
  const clamped = Math.max(0, Math.min(flatIndex, graph.flat.length - 1))
  const point = graph.flat[clamped]
  const group = point.group ?? "_default"
  // O(1) via stamped _groupIndex
  return { flatIndex: clamped, group, indexInGroup: point._groupIndex ?? 0 }
}

/**
 * Compute the next navigation position given a key press and current position.
 * Returns the flat index into graph.flat, -1 to clear, or null for unhandled keys.
 */
export function nextGraphIndex(
  key: string,
  pos: NavPosition,
  graph: NavGraph
): number | null {
  const { group, indexInGroup } = pos
  const groupPoints = graph.byGroup.get(group)!

  switch (key) {
    case "ArrowRight": {
      // Next within group
      if (indexInGroup < groupPoints.length - 1) {
        return groupPoints[indexInGroup + 1]._flatIndex!
      }
      return pos.flatIndex // at end, stay
    }

    case "ArrowLeft": {
      // Prev within group
      if (indexInGroup > 0) {
        return groupPoints[indexInGroup - 1]._flatIndex!
      }
      return pos.flatIndex // at start, stay
    }

    case "ArrowDown": {
      // Next group, nearest position
      const gi = graph.groups.indexOf(group)
      if (gi < graph.groups.length - 1) {
        const nextGroup = graph.groups[gi + 1]
        return findNearestInGroup(graph, nextGroup, groupPoints[indexInGroup])
      }
      return pos.flatIndex // at last group, stay
    }

    case "ArrowUp": {
      // Prev group, nearest position
      const gi = graph.groups.indexOf(group)
      if (gi > 0) {
        const prevGroup = graph.groups[gi - 1]
        return findNearestInGroup(graph, prevGroup, groupPoints[indexInGroup])
      }
      return pos.flatIndex // at first group, stay
    }

    case "PageDown": {
      const skip = Math.max(1, Math.floor(graph.flat.length * 0.1))
      return Math.min(pos.flatIndex + skip, graph.flat.length - 1)
    }

    case "PageUp": {
      const skip = Math.max(1, Math.floor(graph.flat.length * 0.1))
      return Math.max(pos.flatIndex - skip, 0)
    }

    case "Home":
      return 0

    case "End":
      return graph.flat.length - 1

    case "Escape":
      return -1

    default:
      return null
  }
}

/** Find the point in targetGroup nearest to the reference point by x. */
function findNearestInGroup(
  graph: NavGraph,
  targetGroup: string,
  ref: NavPoint
): number {
  const targetPoints = graph.byGroup.get(targetGroup)!
  let bestIdx = 0
  let bestDist = Math.abs(targetPoints[0].x - ref.x)
  for (let i = 1; i < targetPoints.length; i++) {
    const dist = Math.abs(targetPoints[i].x - ref.x)
    if (dist < bestDist) {
      bestDist = dist
      bestIdx = i
    }
  }
  return targetPoints[bestIdx]._flatIndex!
}

// ── Flat navigation ───────────────────────────────────────────────

/**
 * Compute the next focus index given a key and current index.
 * Returns -1 to clear focus. Returns null for unhandled keys.
 *
 * Used by Geo frame (flat navigation) and as fallback.
 */
export function nextIndex(
  key: string,
  current: number,
  total: number
): number | null {
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return current < total - 1 ? current + 1 : current
    case "ArrowLeft":
    case "ArrowUp":
      return current > 0 ? current - 1 : current
    case "PageDown": {
      const skip = Math.max(1, Math.floor(total * 0.1))
      return Math.min(current + skip, total - 1)
    }
    case "PageUp": {
      const skip = Math.max(1, Math.floor(total * 0.1))
      return Math.max(current - skip, 0)
    }
    case "Home":
      return 0
    case "End":
      return total - 1
    case "Escape":
      return -1
    default:
      return null
  }
}
