/**
 * Keyboard navigation utilities for Stream Frames.
 *
 * Supports two navigation modes:
 * - **Flat**: ArrowRight/Left and ArrowUp/Down both advance linearly (geo, simple charts)
 * - **Graph**: ArrowRight/Left navigates within a series/group, ArrowUp/Down switches
 *   between series/groups at a similar position (XY lines, stacked bars, networks)
 *
 * Reuses the existing hover/tooltip system — keyboard focus sets the same
 * HoverData state that mouse hover does.
 */

import type { HoverData } from "../realtime/types"

export interface NavPoint {
  x: number
  y: number
  datum: any
  /** Shape hint for focus ring rendering */
  shape?: "circle" | "rect" | "wedge"
  /** Width of rect-shaped elements (bars, sankey nodes) */
  w?: number
  /** Height of rect-shaped elements */
  h?: number
  /** Group identifier for graph navigation (series name, category, node id) */
  group?: string
  /** Index in NavGraph.flat — set by buildNavGraph for O(1) lookup */
  _flatIndex?: number
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
 * Points within each group are sorted by x then y.
 * Groups are sorted by their first-point y position (top to bottom).
 */
export function buildNavGraph(points: NavPoint[]): NavGraph {
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

  // Sort within each group by x then y
  for (const arr of byGroup.values()) {
    arr.sort((a, b) => a.x - b.x || a.y - b.y)
  }

  // Sort groups by first point's y position (top-to-bottom ordering)
  const groups = Array.from(byGroup.keys()).sort((a, b) => {
    const aPoints = byGroup.get(a)!
    const bPoints = byGroup.get(b)!
    const aY = aPoints.length > 0 ? aPoints[0].y : 0
    const bY = bPoints.length > 0 ? bPoints[0].y : 0
    return aY - bY
  })

  // Build flat list: all groups interleaved by x position
  const flat = Array.from(byGroup.values()).flat()
  flat.sort((a, b) => a.x - b.x || a.y - b.y)

  // Stamp flat index on each point for O(1) lookup
  for (let i = 0; i < flat.length; i++) {
    flat[i]._flatIndex = i
  }

  return { flat, groups, byGroup }
}

/**
 * Resolve the current NavPosition from a flat index.
 * Clamps to valid range if the index is stale (e.g. scene changed between key presses).
 */
export function resolvePosition(graph: NavGraph, flatIndex: number): NavPosition {
  if (graph.flat.length === 0) {
    return { flatIndex: -1, group: "_default", indexInGroup: -1 }
  }
  const clamped = Math.max(0, Math.min(flatIndex, graph.flat.length - 1))
  const point = graph.flat[clamped]
  const group = point.group ?? "_default"
  const groupPoints = graph.byGroup.get(group) ?? []
  // Use _flatIndex equality for O(1) lookup within group
  const idx = groupPoints.findIndex(p => p._flatIndex === clamped)
  return { flatIndex: clamped, group, indexInGroup: idx >= 0 ? idx : 0 }
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
function findNearestInGroup(graph: NavGraph, targetGroup: string, ref: NavPoint): number {
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

// ── XY Extraction ────────────────────────────────────────────────────────

/**
 * Extract navigable data points from XY scene nodes.
 * Lines/areas carry a `group` field identifying the series.
 * ArrowRight/Left = within series, ArrowUp/Down = switch series.
 */
export function extractXYNavPoints(scene: any[]): NavPoint[] {
  const points: NavPoint[] = []

  for (const node of scene) {
    switch (node.type) {
      case "point":
        points.push({ x: node.x, y: node.y, datum: node.datum, shape: "circle", group: node.group ?? "_default" })
        break

      case "line": {
        const line = node
        const data = Array.isArray(line.datum) ? line.datum : []
        const group = line.group ?? "_default"
        for (let i = 0; i < line.path.length && i < data.length; i++) {
          points.push({ x: line.path[i][0], y: line.path[i][1], datum: data[i], shape: "circle", group })
        }
        break
      }

      case "area": {
        const area = node
        const data = Array.isArray(area.datum) ? area.datum : []
        const group = area.group ?? "_default"
        for (let i = 0; i < area.topPath.length && i < data.length; i++) {
          points.push({ x: area.topPath[i][0], y: area.topPath[i][1], datum: data[i], shape: "circle", group })
        }
        break
      }

      case "rect":
        points.push({
          x: node.x + node.w / 2,
          y: node.y + node.h / 2,
          datum: node.datum,
          shape: "rect",
          w: node.w,
          h: node.h,
          group: node.group ?? "_default"
        })
        break

      case "heatcell":
        points.push({
          x: node.x + node.w / 2,
          y: node.y + node.h / 2,
          datum: node.datum,
          shape: "rect",
          w: node.w,
          h: node.h,
          group: "_default"
        })
        break
    }
  }

  points.sort((a, b) => a.x - b.x || a.y - b.y)
  return points
}

// ── Ordinal Extraction ───────────────────────────────────────────────────

/**
 * Extract navigable points from ordinal scene nodes.
 * Bars use `node.group` (stack/group key) falling back to `datum.category`.
 * ArrowRight/Left = across categories, ArrowUp/Down = within stacked segments.
 */
export function extractOrdinalNavPoints(scene: any[]): NavPoint[] {
  const points: NavPoint[] = []

  for (const node of scene) {
    if (node.type === "rect" && node.x != null) {
      // Group by node.group (set by stacking/grouping) falling back to category.
      const category = node.datum?.category ?? ""
      points.push({
        x: node.x + node.w / 2,
        y: node.y + node.h / 2,
        datum: node.datum,
        shape: "rect",
        w: node.w,
        h: node.h,
        group: node.group ?? category
      })
    } else if (node.type === "point") {
      points.push({ x: node.x, y: node.y, datum: node.datum, shape: "circle", group: node.group ?? "_default" })
    } else if (node.type === "wedge" && node.cx != null) {
      const midAngle = ((node.startAngle || 0) + (node.endAngle || 0)) / 2
      const r = ((node.innerRadius || 0) + (node.outerRadius || 50)) / 2
      points.push({
        x: node.cx + Math.cos(midAngle) * r,
        y: node.cy + Math.sin(midAngle) * r,
        datum: node.datum,
        shape: "wedge",
        group: "_default"
      })
    }
  }

  points.sort((a, b) => a.x - b.x || a.y - b.y)
  return points
}

// ── Network Extraction ───────────────────────────────────────────────────

/**
 * Extract navigable points from network scene nodes.
 * Each node's group is its own id, enabling neighbor traversal via edges.
 */
export function extractNetworkNavPoints(scene: any[]): NavPoint[] {
  const points: NavPoint[] = []

  for (const node of scene) {
    if (node.type === "circle" && node.cx != null) {
      points.push({ x: node.cx, y: node.cy, datum: node.datum, shape: "circle", group: node.datum?.id ?? "_default" })
    } else if (node.type === "rect" && node.x != null) {
      points.push({
        x: node.x + node.w / 2,
        y: node.y + node.h / 2,
        datum: node.datum,
        shape: "rect",
        w: node.w,
        h: node.h,
        group: node.datum?.id ?? "_default"
      })
    } else if (node.type === "arc" && node.cx != null) {
      points.push({ x: node.cx, y: node.cy, datum: node.datum, shape: "circle", group: node.datum?.id ?? "_default" })
    }
  }

  points.sort((a, b) => a.x - b.x || a.y - b.y)
  return points
}

/**
 * Network-specific navigation: ArrowRight/Left cycles through neighbors
 * connected by edges. Enter follows the currently highlighted edge.
 *
 * Returns the flat index of the target node, -1 to clear, or null for unhandled keys.
 */
export function nextNetworkIndex(
  key: string,
  pos: NavPosition,
  graph: NavGraph,
  edges: any[],
  neighborIndexRef: { current: number }
): number | null {
  const currentPoint = graph.flat[pos.flatIndex]
  const nodeId = currentPoint.datum?.id

  if (!nodeId) {
    // Fallback to flat navigation if no id
    return nextGraphIndex(key, pos, graph)
  }

  // Build O(1) id → flatIndex lookup
  const idToIdx = new Map<string, number>()
  for (let i = 0; i < graph.flat.length; i++) {
    const id = graph.flat[i].datum?.id
    if (id != null) idToIdx.set(id, i)
  }

  // Collect neighbor ids
  const neighborIds: string[] = []
  for (const edge of edges) {
    const srcId = typeof edge.source === "object" ? edge.source.id : edge.source
    const tgtId = typeof edge.target === "object" ? edge.target.id : edge.target
    if (srcId === nodeId && tgtId) neighborIds.push(tgtId)
    else if (tgtId === nodeId && srcId) neighborIds.push(srcId)
  }

  switch (key) {
    case "ArrowRight":
    case "ArrowDown": {
      if (neighborIds.length === 0) return pos.flatIndex
      const next = (neighborIndexRef.current + 1) % neighborIds.length
      const targetId = neighborIds[next]
      const targetIdx = idToIdx.get(targetId) ?? -1
      if (targetIdx >= 0) neighborIndexRef.current = next
      return targetIdx >= 0 ? targetIdx : pos.flatIndex
    }

    case "ArrowLeft":
    case "ArrowUp": {
      if (neighborIds.length === 0) return pos.flatIndex
      const prev = (neighborIndexRef.current - 1 + neighborIds.length) % neighborIds.length
      const targetId = neighborIds[prev]
      const targetIdx = idToIdx.get(targetId) ?? -1
      if (targetIdx >= 0) neighborIndexRef.current = prev
      return targetIdx >= 0 ? targetIdx : pos.flatIndex
    }

    case "Enter": {
      // Follow the currently highlighted neighbor
      if (neighborIds.length === 0) return pos.flatIndex
      const idx = Math.max(0, Math.min(neighborIndexRef.current, neighborIds.length - 1))
      const targetId = neighborIds[idx]
      const targetIdx = idToIdx.get(targetId) ?? -1
      if (targetIdx >= 0) {
        neighborIndexRef.current = -1 // reset for new node
        return targetIdx
      }
      return pos.flatIndex
    }

    default:
      // PageUp/Down, Home/End, Escape handled by generic handler
      return nextGraphIndex(key, pos, graph)
  }
}

// ── Geo Extraction ───────────────────────────────────────────────────────

/**
 * Extract navigable points from geo scene nodes.
 * Flat navigation only (no meaningful grouping for geo).
 */
export function extractGeoNavPoints(scene: any[]): NavPoint[] {
  const points: NavPoint[] = []

  for (const node of scene) {
    if (node.type === "point" && node.x != null) {
      points.push({ x: node.x, y: node.y, datum: node.datum, shape: "circle" })
    } else if (node.type === "geoarea" && node.centroid) {
      points.push({
        x: node.centroid[0],
        y: node.centroid[1],
        datum: node.datum,
        shape: "circle"
      })
    }
  }

  points.sort((a, b) => a.x - b.x || a.y - b.y)
  return points
}

// ── Legacy flat navigation ───────────────────────────────────────────────

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

/**
 * Convert a NavPoint to HoverData for the tooltip system.
 */
export function navPointToHover(point: NavPoint): HoverData {
  const rawDatum = point.datum || {}
  return {
    ...(typeof rawDatum === "object" && rawDatum !== null && !Array.isArray(rawDatum) ? rawDatum : {}),
    data: rawDatum,
    x: point.x,
    y: point.y,
    time: point.x,
    value: point.y,
  }
}
