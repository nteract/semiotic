import type { LayoutMetrics, Point, RoutedConnection } from "./types"
import { flattened, distance } from "./routing"

function intersection(a: Point, b: Point, c: Point, d: Point): Point | null {
  const ax = b.x - a.x,
    ay = b.y - a.y,
    bx = d.x - c.x,
    by = d.y - c.y
  const denominator = ax * by - ay * bx
  if (Math.abs(denominator) < 1e-8) return null
  const t = ((c.x - a.x) * by - (c.y - a.y) * bx) / denominator
  const u = ((c.x - a.x) * ay - (c.y - a.y) * ax) / denominator
  return t >= 0 && t <= 1 && u >= 0 && u <= 1
    ? { x: a.x + t * ax, y: a.y + t * ay }
    : null
}
export function measureRoutes(
  edges: readonly RoutedConnection[],
  horizontal: boolean,
  alignmentIds: Set<string>
): { metrics: LayoutMetrics; partial: boolean } {
  let totalRouteLength = 0,
    bendCount = 0,
    alignmentError = 0,
    crossings = 0,
    comparisons = 0,
    channelCongestion = 0
  const paths = edges.map((e) => e.sections.flatMap(flattened))
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i],
      path = paths[i]
    if (alignmentIds.has(e.edgeId))
      alignmentError += Math.abs(
        horizontal
          ? e.source.anchor.y - e.target.anchor.y
          : e.source.anchor.x - e.target.anchor.x
      )
    for (let j = 1; j < path.length; j++) {
      totalRouteLength += distance(path[j - 1], path[j])
      if (
        j > 1 &&
        Math.abs(
          (path[j - 1].x - path[j - 2].x) * (path[j].y - path[j - 1].y) -
            (path[j - 1].y - path[j - 2].y) * (path[j].x - path[j - 1].x)
        ) > 1e-8
      )
        bendCount++
    }
  }
  // Sweep bounds before fine segments, with a disclosed cap for dense neighborhoods.
  const spread = (axis: "x" | "y") =>
    edges.length
      ? Math.max(...edges.map((e) => e.bounds[axis])) -
        Math.min(...edges.map((e) => e.bounds[axis]))
      : 0
  const axis = spread("x") >= spread("y") ? "x" : "y"
  const breadth = axis === "x" ? "width" : "height"
  const crossAxis = axis === "x" ? "y" : "x"
  const crossBreadth = axis === "x" ? "height" : "width"
  const ordered = edges
    .map((e, i) => ({ e, i }))
    .sort((a, b) => a.e.bounds[axis] - b.e.bounds[axis])
  let partial = false
  outer: for (let i = 0; i < ordered.length; i++)
    for (let j = i + 1; j < ordered.length; j++) {
      const a = ordered[i],
        b = ordered[j]
      if (b.e.bounds[axis] > a.e.bounds[axis] + a.e.bounds[breadth]) break
      if (
        a.e.bounds[crossAxis] >
          b.e.bounds[crossAxis] + b.e.bounds[crossBreadth] ||
        b.e.bounds[crossAxis] > a.e.bounds[crossAxis] + a.e.bounds[crossBreadth]
      )
        continue
      const hits = new Set<string>(),
        ap = paths[a.i],
        bp = paths[b.i]
      const sharedStubs = [a.e.source, a.e.target].flatMap((at) =>
        [b.e.source, b.e.target]
          .filter(
            (bt) =>
              distance(at.anchor, bt.anchor) < 1e-8 &&
              distance(at.escape, bt.escape) < 1e-8
          )
          .map(() => [at.anchor, at.escape] as const)
      )
      const inStub = (p: Point) =>
        sharedStubs.some(
          ([start, end]) =>
            Math.abs(
              distance(start, p) + distance(p, end) - distance(start, end)
            ) < 1e-7
        )
      for (let x = 1; x < ap.length; x++)
        for (let y = 1; y < bp.length; y++) {
          if (++comparisons > 2000000) {
            partial = true
            break outer
          }
          const hit = intersection(ap[x - 1], ap[x], bp[y - 1], bp[y])
          if (hit && !inStub(hit))
            hits.add(`${hit.x.toFixed(6)},${hit.y.toFixed(6)}`)
          const aa = ap[x - 1],
            ab = ap[x],
            ba = bp[y - 1],
            bb = bp[y]
          const vertical =
            Math.abs(aa.x - ab.x) < 1e-8 &&
            Math.abs(aa.x - ba.x) < 1e-8 &&
            Math.abs(aa.x - bb.x) < 1e-8
          const horizontal =
            Math.abs(aa.y - ab.y) < 1e-8 &&
            Math.abs(aa.y - ba.y) < 1e-8 &&
            Math.abs(aa.y - bb.y) < 1e-8
          if (vertical || horizontal) {
            const axis = vertical ? "y" : "x"
            const low = Math.max(
              Math.min(aa[axis], ab[axis]),
              Math.min(ba[axis], bb[axis])
            )
            const high = Math.min(
              Math.max(aa[axis], ab[axis]),
              Math.max(ba[axis], bb[axis])
            )
            if (
              high > low &&
              !inStub(
                vertical
                  ? { x: aa.x, y: (low + high) / 2 }
                  : { x: (low + high) / 2, y: aa.y }
              )
            )
              channelCongestion += high - low
          }
        }
      crossings += hits.size
    }
  return {
    metrics: {
      crossings,
      channelCongestion,
      alignmentError,
      totalRouteLength,
      bendCount,
      nodeDisplacement: 0,
      reorderedParts: 0,
      hardConstraintViolations: 0,
      routedEdgeCount: edges.length,
      omittedEdgeCount: 0,
      completedSweeps: 0
    },
    partial
  }
}
