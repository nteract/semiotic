/**
 * Pure geo pipeline helpers — projection resolution, accessors, themed defaults,
 * clipped route projection, and flow-style arc/offset builders.
 * Extracted from GeoPipelineStore so the store class stays orchestration-only.
 */

import {
  geoClipRectangle,
  geoMercator,
  geoEqualEarth,
  geoAlbersUsa,
  geoOrthographic,
  geoNaturalEarth1,
  geoEquirectangular
} from "d3-geo"
import type { GeoProjection, GeoStream } from "d3-geo"
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

export function geoAccessor<T>(accessor: string | ((datum: Datum) => T) | undefined, fallback: string) {
  if (typeof accessor === "function") return accessor
  const key = accessor || fallback
  return (datum: Datum): T => datum[key]
}

export function geoCoordinates(config: GeoPipelineConfig) {
  const longitude = geoAccessor<number>(config.xAccessor, "lon")
  const latitude = geoAccessor<number>(config.yAccessor, "lat")
  return (datum: Datum): Position => [longitude(datum), latitude(datum)]
}

export function makeLineDataAccessor(
  acc: string | ((d: Datum) => Datum[]) | undefined
): (d: Datum) => Datum[] {
  if (!acc) return (d: Datum) => d.coordinates || d.data || []
  return geoAccessor<Datum[]>(acc, "coordinates")
}

export function resolveGeoStyle<TDatum extends object>(
  styleProp: Style | ((d: TDatum) => Style) | undefined,
  datum: TDatum,
  defaults: Style
): Style {
  // Always return a fresh object. Transition / decay mutate `node.style.opacity`
  // in place on a specific scene node; without a per-call copy, a shared defaults
  // object would leak that mutation across every node that had no user style.
  return { ...defaults, ...(typeof styleProp === "function" ? styleProp(datum) : styleProp) }
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

type Position = [number, number]

function lineFragments<T>(transform: (sink: GeoStream) => GeoStream, position: (d: T) => Position) {
  let paths: Position[][] = []
  let path: Position[] = []
  const stream = transform({
    polygonStart() {}, polygonEnd() {},
    lineStart() { path = [] }, point(x, y) { path.push([x, y]) },
    lineEnd() {
      if (path.some(([x, y]) => x !== path[0][0] || y !== path[0][1])) paths.push(path)
    }
  })
  return (coordinates: T[]) => {
    paths = []
    stream.lineStart()
    for (const datum of coordinates) stream.point(...position(datum))
    stream.lineEnd()
    return paths
  }
}

/** Stream whole routes so clipping preserves endpoints on both sides of a seam. */
export function createGeoLineProjector(
  projection: GeoProjection, straight: boolean,
  position: (d: Datum) => Position, cartogram = false
) {
  const extent = projection.clipExtent?.()
  const postclip = cartogram && projection.postclip?.()
  const angle = cartogram && projection.clipAngle?.()
  const precision = projection.precision()
  try {
    if (postclip) projection.postclip(sink => sink)
    if (angle) projection.clipAngle(0)
    if (straight) projection.precision(0)
    return lineFragments(sink => projection.stream(sink), position)
  } finally {
    if (straight) projection.precision(precision)
    if (angle) projection.clipAngle(angle)
    if (postclip) {
      if (extent) projection.clipExtent(extent)
      else projection.postclip(postclip)
    }
  }
}

export function clipStyledGeoLine(projection: GeoProjection, width: number, height: number) {
  const [[x0, y0], [x1, y1]] = projection.clipExtent?.() ?? [[0, 0], [width, height]]
  return lineFragments<Position>(
    geoClipRectangle(Math.max(0, x0), Math.max(0, y0), Math.min(width, x1), Math.min(height, y1)),
    point => point
  )
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
  const dist = Math.hypot(dx, dy)
  if (dist === 0) return [start, end]

  // Quadratic Bézier with its control point offset along the right-hand normal.
  const bend = Math.min(0.3, 80 / dist)
  const path: Position[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const offset = 2 * t * (1 - t) * bend
    path.push([start[0] + dx * t - dy * offset, start[1] + dy * t + dx * offset])
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
  const offset = strokeWidth / 2 + 1
  return screenPath.map(([x, y], index) => {
    const before = screenPath[Math.max(0, index - 1)]
    const after = screenPath[Math.min(screenPath.length - 1, index + 1)]
    const dx = after[0] - before[0]
    const dy = after[1] - before[1]
    const length = Math.hypot(dx, dy) || 1
    return [x + offset * dy / length, y - offset * dx / length]
  })
}
