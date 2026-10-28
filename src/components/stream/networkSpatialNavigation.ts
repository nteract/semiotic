import type { NavGraph, NavPoint } from "./navigationGraph"

/** Shared spatial arrow movement for flat networks and authored sibling groups. */
export function findNearestSpatial(
  graph: NavGraph,
  from: NavPoint,
  direction: "right" | "left" | "up" | "down",
  candidates?: readonly number[]
): number | null {
  const horizontal = direction === "right" || direction === "left"
  const sign = direction === "right" || direction === "down" ? 1 : -1
  let best: number | null = null,
    distance = Infinity
  for (let j = 0; j < (candidates?.length ?? graph.flat.length); j++) {
    const i = candidates ? candidates[j] : j,
      point = graph.flat[i]
    const dx = point.x - from.x,
      dy = point.y - from.y
    const primary = (horizontal ? dx : dy) * sign
    const cross = horizontal ? dy : dx
    const square = dx * dx + dy * dy
    if (primary > 0 && primary >= Math.abs(cross) && square < distance) {
      best = i
      distance = square
    }
  }
  return best
}
