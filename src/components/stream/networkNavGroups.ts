import { findNearestSpatial } from "./networkSpatialNavigation"
import type { NavGraph } from "./navigationGraph"

/** Authored owner/part navigation, leaving ungrouped network behavior intact. */
export function groupedNetworkIndex(
  key: string,
  index: number,
  graph: NavGraph
): number | null | undefined {
  if (!graph.flat.some((p) => p.navParentId != null)) return undefined
  const parent = (i: number) => {
    const id = graph.flat[i]?.navParentId
    const candidate = id == null ? undefined : graph.idToIdx.get(id)
    // Invalid, self-referential or cyclic parents stay reachable as roots.
    if (candidate == null || candidate === i) return undefined
    const seen = new Set([i])
    let cursor: number | undefined = candidate
    while (cursor != null) {
      if (seen.has(cursor)) return undefined
      seen.add(cursor)
      const next: string | undefined = graph.flat[cursor].navParentId
      cursor = next == null ? undefined : graph.idToIdx.get(next)
    }
    return candidate
  }
  const parents = graph.flat.map((_, i) => parent(i))
  const roots = parents.flatMap((p, i) => (p == null ? [i] : []))
  const current = index < 0 ? roots[0] : index
  if (current == null) return -1
  const siblings = parents.flatMap((p, i) =>
    p === parents[current] ? [i] : []
  )
  if (key === "Escape") return index < 0 ? -1 : (parents[current] ?? -1)
  if (key === "Enter")
    return parents.findIndex((p) => p === current) >= 0
      ? parents.findIndex((p) => p === current)
      : current
  if (key === "Home") return siblings[0]
  if (key === "End") return siblings[siblings.length - 1]
  if (key === "PageDown" || key === "PageUp") {
    const offset = key === "PageDown" ? 10 : -10
    return siblings[
      Math.max(
        0,
        Math.min(siblings.length - 1, siblings.indexOf(current) + offset)
      )
    ]
  }
  if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(key))
    return null
  const direction = key.slice(5).toLowerCase() as
    "right" | "left" | "up" | "down"
  return (
    findNearestSpatial(graph, graph.flat[current], direction, siblings) ??
    current
  )
}
