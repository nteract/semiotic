/**
 * Edge-router kit — shared SVG-path builders for custom **network** layouts that
 * draw their own edges in `overlays` (or emit `sceneEdges` of type `curved`).
 * Every hand-built influence/lineage diagram re-derives bezier control points,
 * box exit/entry anchors, and a fan-out bend to keep parallel edges from
 * overlapping; this centralizes that geometry.
 *
 * Pure / SSR-safe. Complements the network `sceneEdges` `bezier` / `curved`
 * types and the annotation `connector: { type: "curve" }` option.
 */

export interface Point {
  x: number
  y: number
}

/** A box positioned by its **center** (what force/constraint layouts produce). */
export interface CenteredBox {
  cx: number
  cy: number
  width: number
  height: number
}

export type EdgeOrientation = "vertical" | "horizontal"

export interface CurvedEdgeOptions {
  /** Which axis the edge mainly travels along. `"vertical"` flows top↔bottom
   *  (control points share x); `"horizontal"` flows left↔right. @default "vertical" */
  orientation?: EdgeOrientation
  /** Cross-axis offset of the curve's midpoint, in px — fan parallel edges apart.
   *  Feed it {@link fanOutBend}. @default 0 */
  bend?: number
  /** Below this along-axis distance the endpoints are nearly side-by-side, so a
   *  straight S-curve would collapse; the router draws a sideways bow instead.
   *  @default 18 */
  minAlong?: number
}

/**
 * A smooth cubic-bezier edge between two points. For a top-to-bottom flow the
 * control points sit at the vertical midpoint (offset by `bend`), giving the
 * familiar S-curve; when the two ends are nearly level it falls back to a
 * quadratic side-bow so the edge stays visible. Generalizes the bespoke
 * "S-curve, with a short-hop side-bow for near-parallel pairs" router.
 */
export function curvedEdgePath(from: Point, to: Point, opts?: CurvedEdgeOptions): string {
  const orientation = opts?.orientation ?? "vertical"
  const bend = opts?.bend ?? 0
  const minAlong = opts?.minAlong ?? 18
  const m = (a: number, b: number) => (a + b) / 2

  if (orientation === "vertical") {
    if (Math.abs(to.y - from.y) < minAlong) {
      const side = from.x <= to.x ? 1 : -1
      const ctrlX = m(from.x, to.x) + side * (22 + Math.abs(bend))
      return `M${from.x},${from.y} Q${ctrlX},${m(from.y, to.y)} ${to.x},${to.y}`
    }
    const midY = m(from.y, to.y) + bend
    return `M${from.x},${from.y} C${from.x},${midY} ${to.x},${midY} ${to.x},${to.y}`
  }

  if (Math.abs(to.x - from.x) < minAlong) {
    const side = from.y <= to.y ? 1 : -1
    const ctrlY = m(from.y, to.y) + side * (22 + Math.abs(bend))
    return `M${from.x},${from.y} Q${m(from.x, to.x)},${ctrlY} ${to.x},${to.y}`
  }
  const midX = m(from.x, to.x) + bend
  return `M${from.x},${from.y} C${midX},${from.y} ${midX},${to.y} ${to.x},${to.y}`
}

/**
 * An orthogonal "elbow" edge — two right-angle bends through the midpoint of the
 * travel axis. The step-router alternative to {@link curvedEdgePath} for
 * dataflow/lineage diagrams that prefer rectilinear edges.
 */
export function orthogonalEdgePath(from: Point, to: Point, opts?: { orientation?: EdgeOrientation }): string {
  const orientation = opts?.orientation ?? "vertical"
  if (orientation === "vertical") {
    const midY = (from.y + to.y) / 2
    return `M${from.x},${from.y} L${from.x},${midY} L${to.x},${midY} L${to.x},${to.y}`
  }
  const midX = (from.x + to.x) / 2
  return `M${from.x},${from.y} L${midX},${from.y} L${midX},${to.y} L${to.x},${to.y}`
}

export interface BoxEdgeAnchorOptions {
  orientation?: EdgeOrientation
}

/**
 * Resolve where an edge leaves the source box and meets the target box. For a
 * vertical flow it exits the bottom-center and enters the top-center when the
 * target is below (and vice-versa); horizontal uses right/left centers. Removes
 * the per-recipe "compute startY/endY from half-heights and direction" block.
 */
export function boxEdgeAnchors(
  source: CenteredBox,
  target: CenteredBox,
  opts?: BoxEdgeAnchorOptions,
): { from: Point; to: Point } {
  const orientation = opts?.orientation ?? "vertical"
  if (orientation === "vertical") {
    const down = target.cy >= source.cy
    return {
      from: { x: source.cx, y: source.cy + (down ? source.height / 2 : -source.height / 2) },
      to: { x: target.cx, y: target.cy + (down ? -target.height / 2 : target.height / 2) },
    }
  }
  const right = target.cx >= source.cx
  return {
    from: { x: source.cx + (right ? source.width / 2 : -source.width / 2), y: source.cy },
    to: { x: target.cx + (right ? -target.width / 2 : target.width / 2), y: target.cy },
  }
}

export interface FanOutBendOptions {
  /** Total number of parallel edges, for a centered fan: edge `(count-1)/2`
   *  gets bend 0. Ignored when `modulo` is set. */
  count?: number
  /** Cross-axis spacing between adjacent fanned edges, in px. @default 5 */
  spread?: number
  /** Cycle bends through `modulo` evenly-spaced offsets centered on 0 — useful
   *  when you don't know the per-pair count and just want global variety. */
  modulo?: number
}

/**
 * A cross-axis bend offset that fans parallel edges apart so they don't overlap.
 * Pass an edge's index; with `count` it centers a fan (`0` at the middle edge),
 * with `modulo` it cycles through a fixed set of offsets. Feed the result to
 * {@link curvedEdgePath}'s `bend`.
 */
export function fanOutBend(index: number, opts?: FanOutBendOptions): number {
  const spread = opts?.spread ?? 5
  if (opts?.modulo && opts.modulo > 0) {
    return ((index % opts.modulo) - (opts.modulo - 1) / 2) * spread
  }
  const count = opts?.count ?? 1
  return (index - (count - 1) / 2) * spread
}

/** A cubic Bézier as its four control points (start, two handles, end). */
export interface CubicCurve {
  p0: Point
  p1: Point
  p2: Point
  p3: Point
}

/**
 * Evaluate the point on a cubic Bézier at parameter `t ∈ [0, 1]`. The companion
 * to {@link curvedEdgePath} / {@link cubicPath} for the case the path string
 * can't cover: *placing a mark along the curve* — a station node at `t = 0.5`,
 * an arrowhead at the end, a label at the third. `t = 0` is `p0`, `t = 1` is `p3`.
 */
export function cubicPoint(curve: CubicCurve, t: number): Point {
  const mt = 1 - t
  const a = mt * mt * mt
  const b = 3 * mt * mt * t
  const c = 3 * mt * t * t
  const d = t * t * t
  return {
    x: a * curve.p0.x + b * curve.p1.x + c * curve.p2.x + d * curve.p3.x,
    y: a * curve.p0.y + b * curve.p1.y + c * curve.p2.y + d * curve.p3.y,
  }
}

/**
 * The (unnormalized) tangent vector of a cubic Bézier at `t` — the curve's
 * derivative. Normalize it (e.g. with `normalizePoint` from the vector kit) to
 * orient an arrowhead or grow a branch normal to the curve. Points in the
 * direction of increasing `t`.
 */
export function cubicTangent(curve: CubicCurve, t: number): Point {
  const mt = 1 - t
  const a = 3 * mt * mt
  const b = 6 * mt * t
  const c = 3 * t * t
  return {
    x: a * (curve.p1.x - curve.p0.x) + b * (curve.p2.x - curve.p1.x) + c * (curve.p3.x - curve.p2.x),
    y: a * (curve.p1.y - curve.p0.y) + b * (curve.p2.y - curve.p1.y) + c * (curve.p3.y - curve.p2.y),
  }
}

/** Serialize a {@link CubicCurve} to an SVG `M…C…` path string. */
export function cubicPath(curve: CubicCurve): string {
  return `M${curve.p0.x},${curve.p0.y} C${curve.p1.x},${curve.p1.y} ${curve.p2.x},${curve.p2.y} ${curve.p3.x},${curve.p3.y}`
}
