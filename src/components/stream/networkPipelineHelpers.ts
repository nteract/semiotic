/**
 * Network pipeline pure helpers (node factory + bezier cache validation).
 */
import type { RealtimeNode, BezierCache } from "./networkTypes"

export function createNode(id: string): RealtimeNode {
  return {
    id,
    x0: 0,
    x1: 0,
    y0: 0,
    y1: 0,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    value: 0,
    createdByFrame: true
  }
}

/** Validate a value matches the `BezierCache` shape before assigning it
 *  to a `RealtimeEdge`. The particle pipeline reads
 *  `edge.bezier.points[i].x` etc. unguarded — a malformed bezier
 *  (e.g. `bezier: true`, missing points, non-finite coords) would
 *  crash the canvas frame loop. */
export function isValidBezierCache(value: unknown): value is BezierCache {
  if (!value || typeof value !== "object") return false
  const b = value as Partial<BezierCache>
  if (typeof b.circular !== "boolean") return false
  if (typeof b.halfWidth !== "number" || !Number.isFinite(b.halfWidth))
    return false
  if (b.circular) {
    if (!Array.isArray(b.segments) || b.segments.length === 0) return false
    for (const seg of b.segments) {
      if (!isFourFinitePoints(seg)) return false
    }
    return true
  }
  return isFourFinitePoints(b.points)
}

export function isFourFinitePoints(pts: unknown): boolean {
  if (!Array.isArray(pts) || pts.length !== 4) return false
  for (const p of pts) {
    if (!p || typeof p !== "object") return false
    const pp = p as { x?: unknown; y?: unknown }
    if (typeof pp.x !== "number" || !Number.isFinite(pp.x)) return false
    if (typeof pp.y !== "number" || !Number.isFinite(pp.y)) return false
  }
  return true
}
