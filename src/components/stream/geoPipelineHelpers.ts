/**
 * Pure geo pipeline helpers — projection resolution, accessors, themed defaults,
 * anti-meridian path splitting, and flow-style arc/offset builders.
 * Extracted from GeoPipelineStore so the store class stays orchestration-only.
 */

import {
  geoMercator,
  geoEqualEarth,
  geoAlbersUsa,
  geoOrthographic,
  geoNaturalEarth1,
  geoEquirectangular
} from "d3-geo"
import type { GeoProjection } from "d3-geo"
import type {
  GeoPipelineConfig,
  ProjectionProp,
  ProjectionName
} from "./geoTypes"
import type { Style } from "./types"
import type { Datum } from "../charts/shared/datumTypes"

// ── Projection resolution ────────────────────────────────────────────

const PROJECTION_MAP: Record<ProjectionName, () => GeoProjection> = {
  mercator: geoMercator,
  equalEarth: geoEqualEarth,
  albersUsa: geoAlbersUsa,
  orthographic: geoOrthographic,
  naturalEarth: geoNaturalEarth1,
  equirectangular: geoEquirectangular
}

export function resolveProjection(prop: ProjectionProp | undefined): GeoProjection {
  if (!prop) return geoEqualEarth()
  if (typeof prop === "string") {
    const factory = PROJECTION_MAP[prop]
    if (!factory) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`GeoFrame: Unknown projection "${prop}", falling back to equalEarth`)
      }
      return geoEqualEarth()
    }
    return factory()
  }
  if (typeof prop === "object" && "type" in prop) {
    const factory = PROJECTION_MAP[prop.type]
    const proj = factory ? factory() : geoEqualEarth()
    if (prop.rotate && "rotate" in proj) proj.rotate(prop.rotate as [number, number, number])
    if (prop.center && "center" in proj) proj.center(prop.center)
    return proj
  }
  // Already a d3 projection object
  return prop as GeoProjection
}

// ── Accessor helpers ─────────────────────────────────────────────────

export function makeGeoNumericAccessor(
  acc: string | ((d: Datum) => number) | undefined,
  fallback: string
): (d: Datum) => number {
  if (!acc) return (d: Datum) => d[fallback]
  if (typeof acc === "function") return acc
  return (d: Datum) => d[acc]
}

export function makeLineDataAccessor(
  acc: string | ((d: Datum) => any[]) | undefined
): (d: Datum) => any[] {
  if (!acc) return (d: Datum) => d.coordinates || d.data || []
  if (typeof acc === "function") return acc
  return (d: Datum) => d[acc]
}

export function resolveGeoStyle(
  styleProp: Style | ((d: Datum) => Style) | undefined,
  datum: any,
  defaults: Style
): Style {
  // Always return a fresh object. Transition / decay mutate `node.style.opacity`
  // in place on a specific scene node; without a per-call copy, a shared defaults
  // object would leak that mutation across every node that had no user style.
  if (!styleProp) return { ...defaults }
  if (typeof styleProp === "function") return { ...defaults, ...styleProp(datum) }
  return { ...defaults, ...styleProp }
}

// ── Default styles ───────────────────────────────────────────────────
//
// Each `themedDefault*` reads from `config.themeSemantic` so the scene
// builders inherit the active theme's colors before falling back to the
// hardcoded literals. When no theme is present (renderer used headless
// or in a test fixture without a ThemeProvider), the hardcoded values
// are retained as the ultimate fallback.

export function themedDefaultArea(config: GeoPipelineConfig): Style {
  return {
    // Area fill: theme surface (elevated chart region) > hardcoded light gray.
    fill: config.themeSemantic?.surface || "#e0e0e0",
    // Area stroke: theme border (chart chrome) > hardcoded #999.
    stroke: config.themeSemantic?.border || "#999",
    strokeWidth: 0.5,
    fillOpacity: 1
  }
}

export function themedDefaultPoint(config: GeoPipelineConfig): Style & { r?: number } {
  return {
    // Point fill: theme primary > hardcoded #4e79a7.
    fill: config.themeSemantic?.primary || "#4e79a7",
    r: 4,
    fillOpacity: 0.8
  }
}

export function themedDefaultLine(config: GeoPipelineConfig): Style {
  return {
    // Line stroke: theme primary > hardcoded #4e79a7.
    stroke: config.themeSemantic?.primary || "#4e79a7",
    strokeWidth: 1.5,
    fill: "none"
  }
}

// ── Anti-meridian line splitting ─────────────────────────────────

/**
 * Detect screen-space jumps in a projected path that indicate the line
 * has wrapped around the edge of the projection (anti-meridian crossing).
 * Split the path at those jumps and return an array of continuous segments.
 *
 * A jump is detected when consecutive screen-space points are further apart
 * than `threshold` pixels (default: half the viewport width).
 */
export function splitAntiMeridianPath(
  screenPath: [number, number][],
  viewportWidth: number
): [number, number][][] {
  if (screenPath.length < 2) return [screenPath]

  const threshold = viewportWidth * 0.4
  const segments: [number, number][][] = []
  let current: [number, number][] = [screenPath[0]]

  for (let i = 1; i < screenPath.length; i++) {
    const prev = screenPath[i - 1]
    const curr = screenPath[i]
    const dx = Math.abs(curr[0] - prev[0])

    if (dx > threshold) {
      // Jump detected — end the current segment and start a new one
      if (current.length >= 2) {
        segments.push(current)
      }
      current = [curr]
    } else {
      current.push(curr)
    }
  }

  if (current.length >= 2) {
    segments.push(current)
  }

  return segments
}

// ── Flow style helpers ───────────────────────────────────────────────

/**
 * Build a quadratic arc path between two screen-space points.
 * The arc bulges perpendicular to the straight line (right of the
 * direction of travel in screen coords), with height proportional to distance.
 */
export function buildArcPath(
  start: [number, number],
  end: [number, number],
  segments: number = 24
): [number, number][] {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist === 0) return [start, end]

  // Perpendicular normal (right-hand in screen coords, y-down)
  const nx = -dy / dist
  const ny = dx / dist

  // Arc height proportional to distance (capped)
  const bulge = Math.min(dist * 0.3, 80)

  // Midpoint
  const mx = (start[0] + end[0]) / 2
  const my = (start[1] + end[1]) / 2

  // Control point for quadratic bezier
  const cx = mx + nx * bulge
  const cy = my + ny * bulge

  // Sample quadratic bezier
  const path: [number, number][] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const u = 1 - t
    const x = u * u * start[0] + 2 * u * t * cx + t * t * end[0]
    const y = u * u * start[1] + 2 * u * t * cy + t * t * end[1]
    path.push([x, y])
  }
  return path
}

/**
 * Build an offset version of a densified geo screen path.
 * Shifts each point along its local normal so the great-circle curvature
 * is preserved while visually separating overlapping flows.
 */
export function buildOffsetGeoPath(
  screenPath: [number, number][],
  strokeWidth: number
): [number, number][] {
  if (screenPath.length < 2) return screenPath
  const offset = strokeWidth / 2 + 1

  const result: [number, number][] = []
  for (let i = 0; i < screenPath.length; i++) {
    const p = screenPath[i]
    // Compute tangent direction at this point
    let dx: number, dy: number
    if (i === 0) {
      dx = screenPath[1][0] - p[0]
      dy = screenPath[1][1] - p[1]
    } else if (i === screenPath.length - 1) {
      dx = p[0] - screenPath[i - 1][0]
      dy = p[1] - screenPath[i - 1][1]
    } else {
      // Average of prev→current and current→next for smoother normals
      dx = screenPath[i + 1][0] - screenPath[i - 1][0]
      dy = screenPath[i + 1][1] - screenPath[i - 1][1]
    }
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    // Left-hand normal (same convention as buildOffsetPath)
    const nx = dy / len
    const ny = -dx / len
    result.push([p[0] + nx * offset, p[1] + ny * offset])
  }
  return result
}

/**
 * Build an offset path — shift a straight line perpendicular to its direction.
 * All flows are offset to their left by half their stroke width plus padding.
 * Bidirectional pairs (A->B and B->A) naturally separate because their
 * left-hand normals point to opposite sides.
 */
export function buildOffsetPath(
  start: [number, number],
  end: [number, number],
  _flow: any,
  _allFlows: any[],
  strokeWidth: number
): [number, number][] {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist === 0) return [start, end]

  // Left-hand normal in screen coords (y-down): (dy, -dx) points left of travel
  const nx = dy / dist
  const ny = -dx / dist

  // Every flow offsets to its own left by half its stroke width.
  // Opposite-direction flows naturally separate because their lefts
  // point to opposite sides.
  const offset = strokeWidth / 2 + 1

  return [
    [start[0] + nx * offset, start[1] + ny * offset],
    [end[0] + nx * offset, end[1] + ny * offset]
  ]
}
