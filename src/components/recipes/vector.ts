/**
 * 2D vector kit — the handful of point/vector operations every hand-built
 * custom layout re-derives when it positions marks in Cartesian space:
 * add/subtract two points, scale one, take a magnitude, normalize to a unit
 * direction. A radial network spoke, an edge offset normal to its tangent, a
 * leader line — all of them open with three or four of these one-liners.
 *
 * Pure / SSR-safe, dependency-free. Operates on the shared {@link Point}
 * (`{ x, y }`) used across the radial and edge-router kits, so results compose
 * directly with `polarToXY`, `boxEdgeAnchors`, `curvedEdgePath`, and the cubic
 * helpers in `edgeRouter`.
 */

import type { Point } from "./radialCoords"

export type { Point }

/** Component-wise sum `a + b`. */
export function addPoints(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y }
}

/** Component-wise difference `a - b` (the vector from `b` to `a`). */
export function subtractPoints(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y }
}

/** Scale a point/vector by a scalar `k`. */
export function scalePoint(a: Point, k: number): Point {
  return { x: a.x * k, y: a.y * k }
}

/** Euclidean length of the vector from the origin to `a`. */
export function pointMagnitude(a: Point): number {
  return Math.hypot(a.x, a.y)
}

/**
 * The unit vector in the direction of `a`. A zero-length vector returns `a`
 * unchanged (its magnitude is treated as 1) so callers never divide by zero —
 * the common "tangent of a degenerate edge" case stays finite.
 */
export function normalizePoint(a: Point): Point {
  const m = pointMagnitude(a) || 1
  return { x: a.x / m, y: a.y / m }
}
