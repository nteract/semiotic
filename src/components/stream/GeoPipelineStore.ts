import {
  geoMercator,
  geoEqualEarth,
  geoAlbersUsa,
  geoOrthographic,
  geoNaturalEarth1,
  geoEquirectangular,
  geoPath as d3GeoPath,
  geoGraticule,
  geoDistance,
  geoInterpolate
} from "d3-geo"
import type { GeoProjection, GeoPath, GeoPermissibleObjects } from "d3-geo"
import type { ZoomTransform } from "d3-zoom"
import { scaleLinear } from "d3-scale"
import { quadtree as d3Quadtree, type Quadtree } from "d3-quadtree"
import type {
  GeoPipelineConfig,
  GeoScales,
  GeoSceneNode,
  GeoAreaSceneNode,
  GeoLineSceneNode,
  ProjectionProp,
  ProjectionName,
  GraticuleConfig,
  DistanceCartogramConfig
} from "./geoTypes"
import type {
  PointSceneNode,
  Style,
  StreamLayout
} from "./types"
import { RingBuffer } from "../realtime/RingBuffer"
import { computeEasing, computeRawProgress, lerp } from "./pipelineTransitionUtils"
import { computeDecayOpacity } from "./pipelineDecay"
import type { ActiveTransition } from "./pipelineTransitionUtils"
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

function resolveProjection(prop: ProjectionProp | undefined): GeoProjection {
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

function makeAccessor(acc: string | ((d: Datum) => number) | undefined, fallback: string): (d: Datum) => number {
  if (!acc) return (d: Datum) => d[fallback]
  if (typeof acc === "function") return acc
  return (d: Datum) => d[acc]
}

function makeLineDataAccessor(acc: string | ((d: Datum) => any[]) | undefined): (d: Datum) => any[] {
  if (!acc) return (d: Datum) => d.coordinates || d.data || []
  if (typeof acc === "function") return acc
  return (d: Datum) => d[acc]
}

function resolveStyle(
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

function themedDefaultArea(config: GeoPipelineConfig): Style {
  return {
    // Area fill: theme surface (elevated chart region) > hardcoded light gray.
    fill: config.themeSemantic?.surface || "#e0e0e0",
    // Area stroke: theme border (chart chrome) > hardcoded #999.
    stroke: config.themeSemantic?.border || "#999",
    strokeWidth: 0.5,
    fillOpacity: 1
  }
}

function themedDefaultPoint(config: GeoPipelineConfig): Style & { r?: number } {
  return {
    // Point fill: theme primary > hardcoded #4e79a7.
    fill: config.themeSemantic?.primary || "#4e79a7",
    r: 4,
    fillOpacity: 0.8
  }
}

function themedDefaultLine(config: GeoPipelineConfig): Style {
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
function splitAntiMeridianPath(
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
function buildArcPath(
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
function buildOffsetGeoPath(
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
function buildOffsetPath(
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

// ── GeoPipelineStore ─────────────────────────────────────────────────

export class GeoPipelineStore {
  config: GeoPipelineConfig

  // Scene output
  scene: GeoSceneNode[] = []
  scales: GeoScales | null = null
  version = 0

  // Spatial index for point hit testing (built when point count exceeds threshold)
  private static readonly QUADTREE_THRESHOLD = 500
  private _quadtree: Quadtree<PointSceneNode> | null = null
  /** Largest visual point radius in the current scene; used to widen quadtree
   *  hit-test radius when points are larger than the default maxDistance. */
  private _maxPointRadius = 0

  // Internal state
  private projection: GeoProjection | null = null
  private geoPath: GeoPath<any, GeoPermissibleObjects> | null = null

  // Base projection state (before zoom) — used to restore on zoom reset
  private baseScale: number = 0
  private baseTranslate: [number, number] = [0, 0]
  private baseRotation: [number, number, number] = [0, 0, 0]

  // Current zoom level for onZoom callbacks
  currentZoom = 1

  // Cartogram layout info — exposed for overlay rendering (concentric circles, etc.)
  cartogramLayout: {
    cx: number
    cy: number
    maxCost: number
    availableRadius: number
  } | null = null

  // Bounded data
  private areas: GeoJSON.Feature[] = []
  private pointData: Datum[] = []
  private lineData: Datum[] = []

  // Streaming buffer for points
  private pointBuffer: RingBuffer<Datum> | null = null
  private streaming = false

  // Timestamps for pulse
  lastIngestTime = 0
  private timestampBuffer: RingBuffer<number> | null = null

  // Transition state
  activeTransition: ActiveTransition | null = null
  private prevPositions: Map<string, [number, number]> | null = null
  private _hasRenderedOnce = false

  constructor(config: GeoPipelineConfig) {
    this.config = config
  }

  updateConfig(config: Partial<GeoPipelineConfig>): void {
    this.config = { ...this.config, ...config }
  }

  // ── Data ingestion ───────────────────────────────────────────────

  setAreas(features: GeoJSON.Feature[]): void {
    this.areas = features
  }

  setPoints(data: Datum[]): void {
    this.pointData = data
    this.streaming = false
  }

  setLines(data: Datum[]): void {
    // Defensive copy — `pushLine` / `pushManyLines` mutate
    // `lineData` in place (no ring buffer for lines), so taking the
    // user's array reference here would let a subsequent push leak
    // into the React-owned array passed via the `lines` prop.
    this.lineData = data.slice()
  }

  /** Initialize streaming mode with a ring buffer */
  initStreaming(windowSize = 500): void {
    this.pointBuffer = new RingBuffer<Datum>(windowSize)
    this.timestampBuffer = new RingBuffer<number>(windowSize)
    this.streaming = true
  }

  /** Push a single streaming point */
  pushPoint(datum: Datum): void {
    if (!this.pointBuffer) this.initStreaming()
    this.pointBuffer!.push(datum)
    this.timestampBuffer!.push(performance.now())
    this.lastIngestTime = performance.now()
  }

  /** Push multiple streaming points */
  pushMany(data: Datum[]): void {
    if (!this.pointBuffer) this.initStreaming()
    const now = performance.now()
    for (const d of data) {
      this.pointBuffer!.push(d)
      this.timestampBuffer!.push(now)
    }
    this.lastIngestTime = now
  }

  /** Append a single line/flow record (coordinates pre-resolved). Lines
   *  aren't ring-buffered — the bounded set is the geography.
   *  Mutates `lineData` in place to avoid the O(n) GC churn of an
   *  array spread per push. The mutation is invisible to callers
   *  because `setLines` defensive-copies on entry and `getLines`
   *  defensive-copies on exit. */
  pushLine(line: Datum): void {
    if (line == null || typeof line !== "object") return
    this.lineData.push(line)
    this.version++
  }

  /** Append multiple line/flow records in one pass. Same in-place
   *  mutation rationale as `pushLine`. Loops instead of
   *  `Array.prototype.push(...safe)` so very large batches don't
   *  blow the engine's argument-count limit (mirrors how `pushMany`
   *  for points iterates rather than spreads). */
  pushManyLines(lines: Datum[]): void {
    if (!Array.isArray(lines) || lines.length === 0) return
    const safe = lines.filter((l) => l != null && typeof l === "object")
    if (safe.length === 0) return
    for (const line of safe) this.lineData.push(line)
    this.version++
  }

  /** Remove line records by id. Requires `lineIdAccessor`. */
  removeLine(id: string | string[]): Datum[] {
    const { lineIdAccessor } = this.config
    if (!lineIdAccessor) {
      throw new Error("removeLine() requires lineIdAccessor to be configured")
    }
    const getId = typeof lineIdAccessor === "function"
      ? lineIdAccessor
      : (d: Datum) => d[lineIdAccessor as string]
    const ids = new Set(Array.isArray(id) ? id : [id])
    const removed: Datum[] = []
    this.lineData = this.lineData.filter((d) => {
      if (ids.has(String(getId(d)))) {
        removed.push(d)
        return false
      }
      return true
    })
    if (removed.length > 0) this.version++
    return removed
  }

  /** Read the current line/flow set (post-push, pre-projection).
   *  Defensive copy — `pushLine` / `pushManyLines` mutate
   *  `lineData` in place, so returning by reference would let
   *  callers observe ingest-side mutations on a snapshot they
   *  thought was stable. */
  getLines(): Datum[] {
    return this.lineData.slice()
  }

  /**
   * Remove points by ID. Requires pointIdAccessor to be configured.
   * Returns the removed items.
   */
  removePoint(id: string | string[]): Datum[] {
    const { pointIdAccessor } = this.config
    if (!pointIdAccessor) {
      throw new Error("removePoint() requires pointIdAccessor to be configured")
    }
    const getId = typeof pointIdAccessor === "function"
      ? pointIdAccessor
      : (d: Datum) => d[pointIdAccessor as string]
    const ids = new Set(Array.isArray(id) ? id : [id])

    if (this.streaming && this.pointBuffer) {
      const predicate = (item: Datum) => ids.has(String(getId(item)))
      // Compact timestamp buffer in lockstep
      if (this.timestampBuffer && this.timestampBuffer.size > 0) {
        const oldTimestamps = this.timestampBuffer.toArray()
        const removeSet = new Set<number>()
        this.pointBuffer.forEach((item, i) => { if (predicate(item)) removeSet.add(i) })
        this.timestampBuffer.clear()
        for (let i = 0; i < oldTimestamps.length; i++) {
          if (!removeSet.has(i)) this.timestampBuffer.push(oldTimestamps[i])
        }
      }
      const removed = this.pointBuffer.remove(predicate)
      if (removed.length > 0) this.version++
      return removed
    } else {
      const removed: Datum[] = []
      this.pointData = this.pointData.filter(d => {
        if (ids.has(String(getId(d)))) {
          removed.push(d)
          return false
        }
        return true
      })
      if (removed.length > 0) this.version++
      return removed
    }
  }

  clear(): void {
    this.areas = []
    this.pointData = []
    this.lineData = []
    this.pointBuffer = null
    this.timestampBuffer = null
    this.scene = []
    this.scales = null
    this._hasRenderedOnce = false
    this.activeTransition = null
    this.prevPositions = null
    this._quadtree = null
    this._maxPointRadius = 0
    this.version++
  }

  // ── Projection pipeline ──────────────────────────────────────────

  computeScene(layout: StreamLayout): void {
    const { config } = this

    // Step 1: Resolve projection
    this.projection = resolveProjection(config.projection)
    this.geoPath = d3GeoPath(this.projection)

    // Step 2: Compute bounds and fit projection
    this.fitProjection(layout)

    // Rebuild geoPath after fitting
    this.geoPath = d3GeoPath(this.projection)

    // Step 3: Build scales object
    const proj = this.projection
    this.scales = {
      projection: proj,
      geoPath: this.geoPath,
      projectedPoint: (lon: number, lat: number) => {
        const result = proj([lon, lat])
        return result as [number, number] | null
      },
      invertedPoint: (px: number, py: number) => {
        if (!proj.invert) return null
        const result = proj.invert([px, py])
        return result as [number, number] | null
      }
    }

    // Step 4: Build scene nodes
    const prevScene = this.scene
    this.scene = this.buildSceneNodes(layout)
    this.rebuildQuadtree()

    // Step 5: Apply distance cartogram transform
    if (config.projectionTransform) {
      this.applyCartogramTransform(config.projectionTransform, layout)
    }

    // Step 6: Apply realtime encodings
    if (config.decay && this.streaming) {
      this.applyDecay()
    }
    if (config.pulse && this.streaming) {
      this.applyPulse()
    }

    // Step 7: Intro animation — synthesize center-origin prev scene on first render
    if (config.transition && !this._hasRenderedOnce && this.scene.length > 0 && config.introAnimation) {
      const cx = layout.width / 2
      const cy = layout.height / 2
      const syntheticPrev = this.scene
        .filter(n => n.type === "point")
        .map(n => ({ ...n, x: cx, y: cy }))
      if (syntheticPrev.length > 0) {
        this.startTransition(syntheticPrev as any)
      }
    }
    this._hasRenderedOnce = true

    // Step 8: Data-change transition
    if (config.transition && prevScene.length > 0) {
      this.startTransition(prevScene)
    }

    this.version++
  }

  // ── Fit projection ─────────────────────────────────────────────

  private fitProjection(layout: StreamLayout): void {
    const proj = this.projection!
    const config = this.config

    // Collect all geo features for bounds
    const allFeatures: GeoJSON.Feature[] = [...this.areas]

    // Add point coordinates as a synthetic feature
    const xAcc = makeAccessor(config.xAccessor, "lon")
    const yAcc = makeAccessor(config.yAccessor, "lat")
    const points = this.getPoints()

    if (points.length > 0) {
      const coords: [number, number][] = points.map(d => [xAcc(d), yAcc(d)])
      allFeatures.push({
        type: "Feature",
        properties: {},
        geometry: { type: "MultiPoint", coordinates: coords }
      })
    }

    // Add line coordinates
    const lineDataAcc = makeLineDataAccessor(config.lineDataAccessor)
    for (const line of this.lineData) {
      const coords = lineDataAcc(line)
      if (coords && coords.length > 0) {
        const lineCoords: [number, number][] = coords.map((d: Datum) => [xAcc(d), yAcc(d)])
        allFeatures.push({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: lineCoords }
        })
      }
    }

    if (allFeatures.length === 0) return

    // Use projectionExtent override or auto-fit
    if (config.projectionExtent) {
      const [[lonMin, latMin], [lonMax, latMax]] = config.projectionExtent
      const syntheticFeature: GeoJSON.Feature = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [[[lonMin, latMin], [lonMax, latMin], [lonMax, latMax], [lonMin, latMax], [lonMin, latMin]]]
        }
      }
      proj.fitExtent(
        [[0, 0], [layout.width, layout.height]],
        syntheticFeature
      )
    } else if (proj.clipAngle && (proj.clipAngle() ?? 0) > 0) {
      // Clipped projections (e.g. orthographic): size the globe to fill the
      // viewport rather than fitting to data bounds, which would crop the
      // edges (e.g. Antarctic graticule lines).
      const pad = config.fitPadding ?? 0
      const dim = Math.min(layout.width, layout.height)
      const radius = dim / 2 - dim * pad
      proj.scale(radius)
      proj.translate([layout.width / 2, layout.height / 2])
    } else {
      // Auto-fit to all data
      const collection: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: allFeatures
      }
      const pad = config.fitPadding ?? 0
      const px = layout.width * pad
      const py = layout.height * pad
      proj.fitExtent(
        [[px, py], [layout.width - px, layout.height - py]],
        collection
      )
    }

    // Save base projection state for zoom reference
    this.baseScale = proj.scale()
    this.baseTranslate = proj.translate() as [number, number]
    this.baseRotation = (proj.rotate?.() ?? [0, 0, 0]) as [number, number, number]
  }

  /**
   * Apply a d3-zoom transform to the projection.
   * Called on zoom end — updates projection scale/translate and rebuilds scene.
   */
  applyZoomTransform(transform: ZoomTransform, layout: StreamLayout): void {
    const proj = this.projection
    if (!proj) return

    // Apply zoom transform to the base projection state
    proj.scale(this.baseScale * transform.k)
    proj.translate([
      this.baseTranslate[0] * transform.k + transform.x,
      this.baseTranslate[1] * transform.k + transform.y
    ])

    this.currentZoom = transform.k

    // Rebuild geoPath and scene with new projection
    this.geoPath = d3GeoPath(proj)

    // Rebuild scales
    this.scales = {
      projection: proj,
      geoPath: this.geoPath,
      projectedPoint: (lon: number, lat: number) => {
        const result = proj([lon, lat])
        return result as [number, number] | null
      },
      invertedPoint: (px: number, py: number) => {
        if (!proj.invert) return null
        const result = proj.invert([px, py])
        return result as [number, number] | null
      }
    }

    // Rebuild scene nodes with zoomed projection (skip re-fitting)
    this.scene = this.buildSceneNodes(layout)
    this.rebuildQuadtree()

    // Apply cartogram transform if configured
    if (this.config.projectionTransform) {
      this.applyCartogramTransform(this.config.projectionTransform, layout)
    }

    this.version++
  }

  /**
   * Apply zoom as scale-only (no translate shift).
   * Used in drag-rotate mode to prevent globe drift on zoom.
   */
  applyZoomScale(k: number, layout: StreamLayout): void {
    const proj = this.projection
    if (!proj) return

    proj.scale(this.baseScale * k)
    // Keep translate at base center — no shift
    proj.translate(this.baseTranslate)

    this.currentZoom = k

    this.geoPath = d3GeoPath(proj)
    this.scales = {
      projection: proj,
      geoPath: this.geoPath,
      projectedPoint: (lon: number, lat: number) => {
        const result = proj([lon, lat])
        return result as [number, number] | null
      },
      invertedPoint: (px: number, py: number) => {
        if (!proj.invert) return null
        const result = proj.invert([px, py])
        return result as [number, number] | null
      }
    }

    this.scene = this.buildSceneNodes(layout)
    this.rebuildQuadtree()
    if (this.config.projectionTransform) {
      this.applyCartogramTransform(this.config.projectionTransform, layout)
    }
    this.version++
  }

  /**
   * Apply a rotation to the projection and rebuild the scene.
   * Called during drag-rotate gestures (orthographic globe spinning).
   */
  applyRotation(rotation: [number, number, number], layout: StreamLayout): void {
    const proj = this.projection
    if (!proj || !proj.rotate) return

    proj.rotate(rotation)

    // Rebuild geoPath and scales
    this.geoPath = d3GeoPath(proj)
    this.scales = {
      projection: proj,
      geoPath: this.geoPath,
      projectedPoint: (lon: number, lat: number) => {
        const result = proj([lon, lat])
        return result as [number, number] | null
      },
      invertedPoint: (px: number, py: number) => {
        if (!proj.invert) return null
        const result = proj.invert([px, py])
        return result as [number, number] | null
      }
    }

    // Rebuild scene
    this.scene = this.buildSceneNodes(layout)
    this.rebuildQuadtree()
    if (this.config.projectionTransform) {
      this.applyCartogramTransform(this.config.projectionTransform, layout)
    }
    this.version++
  }

  /**
   * Set the projection rotation without rebuilding the scene.
   * Use when rotation will be followed by another operation that rebuilds
   * (e.g., applyZoomScale), to avoid redundant scene builds.
   */
  setRotation(rotation: [number, number, number]): void {
    const proj = this.projection
    if (!proj || !proj.rotate) return
    proj.rotate(rotation)
  }

  /** Get current rotation (for external tracking) */
  getRotation(): [number, number, number] {
    return (this.projection?.rotate?.() ?? this.baseRotation) as [number, number, number]
  }

  /** Get the current base projection state (for zoom reset) */
  getBaseProjectionState(): { scale: number; translate: [number, number] } {
    return { scale: this.baseScale, translate: [...this.baseTranslate] as [number, number] }
  }

  // ── Build scene nodes ──────────────────────────────────────────

  getPoints(): Datum[] {
    if (this.streaming && this.pointBuffer) {
      return this.pointBuffer.toArray()
    }
    return this.pointData
  }

  /**
   * Build (or clear) the quadtree spatial index for point scene nodes.
   * Only built when the point count exceeds QUADTREE_THRESHOLD; below that
   * a linear scan is faster than indexing overhead. Also tracks the largest
   * point radius so the hit tester can widen its query when symbols are big.
   */
  private rebuildQuadtree(): void {
    let maxR = 0
    let pointCount = 0
    for (const node of this.scene) {
      if (node.type === "point") {
        pointCount++
        if (node.r > maxR) maxR = node.r
      }
    }
    this._maxPointRadius = maxR

    if (pointCount <= GeoPipelineStore.QUADTREE_THRESHOLD) {
      this._quadtree = null
      return
    }

    const points: PointSceneNode[] = new Array(pointCount)
    let i = 0
    for (const node of this.scene) {
      if (node.type === "point") points[i++] = node
    }
    this._quadtree = d3Quadtree<PointSceneNode>()
      .x(n => n.x)
      .y(n => n.y)
      .addAll(points)
  }

  /** Quadtree spatial index for point hit testing, or null when below threshold. */
  get quadtree(): Quadtree<PointSceneNode> | null {
    return this._quadtree
  }

  /** Largest visual point radius in the current scene. */
  get maxPointRadius(): number {
    return this._maxPointRadius
  }

  private buildSceneNodes(layout: StreamLayout): GeoSceneNode[] {
    const nodes: GeoSceneNode[] = []
    const { config } = this
    const proj = this.projection!
    const path = this.geoPath!
    const xAcc = makeAccessor(config.xAccessor, "lon")
    const yAcc = makeAccessor(config.yAccessor, "lat")

    // Resolve themed defaults once per scene build. Cheap to precompute,
    // expensive to rebuild per-feature for large GeoJSON inputs.
    const areaDefault = themedDefaultArea(config)
    const lineDefault = themedDefaultLine(config)
    const pointDefault = themedDefaultPoint(config)

    // Graticule (drawn first, behind everything)
    if (config.graticule) {
      const gratConfig: GraticuleConfig = config.graticule === true
        ? {}
        : config.graticule
      const generator = geoGraticule()
      if (gratConfig.step) generator.step(gratConfig.step)

      const pathData = path(generator()) || ""
      if (pathData) {
        nodes.push({
          type: "geoarea",
          pathData,
          centroid: [layout.width / 2, layout.height / 2],
          bounds: [[0, 0], [layout.width, layout.height]],
          screenArea: 0,
          style: {
            fill: "none",
            stroke: gratConfig.stroke || "#e0e0e0",
            strokeWidth: gratConfig.strokeWidth || 0.5,
            strokeDasharray: gratConfig.strokeDasharray || "2,2"
          },
          datum: null,
          interactive: false
        })
      }
    }

    // Areas (choropleth polygons)
    for (const feature of this.areas) {
      const pathData = path(feature)
      if (!pathData) continue

      const centroid = path.centroid(feature)
      const featureBounds = path.bounds(feature)
      const featureArea = path.area(feature)

      const style = resolveStyle(config.areaStyle, feature, areaDefault)

      nodes.push({
        type: "geoarea",
        pathData,
        centroid: centroid as [number, number],
        bounds: featureBounds as [[number, number], [number, number]],
        screenArea: featureArea,
        style,
        datum: feature,
        interactive: true
      })
    }

    // Lines
    const lineDataAcc = makeLineDataAccessor(config.lineDataAccessor)

    for (const line of this.lineData) {
      const coords = lineDataAcc(line)
      if (!coords || coords.length < 2) continue

      // Project lon/lat coords directly into a screen path, skipping unprojectable points.
      // For "geo" lines, densify along great-circle arcs between each pair of points.
      let screenPath: [number, number][] = []

      if (config.lineType === "geo") {
        // We need lineCoords to compute geoDistance/geoInterpolate, but we
        // project on the fly to avoid a second array allocation.
        const lineCoords: [number, number][] = new Array(coords.length)
        for (let i = 0; i < coords.length; i++) {
          lineCoords[i] = [xAcc(coords[i]), yAcc(coords[i])]
        }
        for (let i = 0; i < lineCoords.length - 1; i++) {
          const start = lineCoords[i]
          const end = lineCoords[i + 1]
          const dist = geoDistance(start, end) || 0
          const steps = Math.max(2, Math.ceil(dist / (Math.PI / 180)))
          const interpolate = geoInterpolate(start, end)
          for (let s = 0; s <= steps; s++) {
            if (i > 0 && s === 0) continue // avoid duplicate at segment joins
            const projected = proj(interpolate(s / steps) as [number, number])
            if (projected != null) screenPath.push(projected as [number, number])
          }
        }
      } else {
        // Straight-line segments in projected space — fused project + filter.
        for (let i = 0; i < coords.length; i++) {
          const d = coords[i]
          const projected = proj([xAcc(d), yAcc(d)])
          if (projected != null) screenPath.push(projected as [number, number])
        }
      }

      if (screenPath.length < 2) continue

      const style = resolveStyle(config.lineStyle, line, lineDefault) as Style
      const resolvedStrokeWidth =
        typeof style.strokeWidth === "number" ? style.strokeWidth : 1

      // Apply flow style transformation (only for simple 2-point source→target flows;
      // multi-point polylines keep their full geometry).
      if (coords.length === 2 && screenPath.length >= 2 && config.flowStyle === "arc") {
        screenPath = buildArcPath(screenPath[0], screenPath[screenPath.length - 1])
      } else if (coords.length === 2 && screenPath.length >= 2 && config.flowStyle === "offset") {
        if (config.lineType === "geo") {
          // Offset each point along its local normal to preserve great-circle curvature
          screenPath = buildOffsetGeoPath(screenPath, resolvedStrokeWidth)
        } else {
          screenPath = buildOffsetPath(screenPath[0], screenPath[screenPath.length - 1], line, this.lineData, resolvedStrokeWidth)
        }
      }

      // Split lines that wrap around the anti-meridian into separate segments.
      // Each segment that doesn't span the full viewport is rendered independently.
      // Lines that jump across the projection edge (>40% of viewport width between
      // consecutive points) are split and each segment fades at the clipped end.
      const segments = splitAntiMeridianPath(screenPath, layout.width)

      if (segments.length <= 1) {
        // No anti-meridian crossing — render as a single line
        const lineNode: GeoLineSceneNode = {
          type: "line",
          path: screenPath.length >= 2 ? screenPath : segments[0] || screenPath,
          style,
          datum: line
        }
        nodes.push(lineNode)
      } else {
        // Anti-meridian crossing detected — render each segment with edge fade
        for (const segment of segments) {
          if (segment.length < 2) continue
          const lineNode: GeoLineSceneNode = {
            type: "line",
            path: segment,
            style: { ...style, _edgeFade: true } as any,
            datum: line
          }
          nodes.push(lineNode)
        }
      }
    }

    // Points
    const points = this.getPoints()
    const pointIdAcc = config.pointIdAccessor
      ? (typeof config.pointIdAccessor === "function"
        ? config.pointIdAccessor
        : (d: Datum) => d[config.pointIdAccessor as string])
      : null

    // For projections with a clip angle (e.g. orthographic), cull points
    // on the far side. geoProjection still returns screen coords for
    // backface points — we must check angular distance ourselves.
    const clipAngle = proj.clipAngle ? (proj.clipAngle() ?? 0) : 0
    const clipRadians = clipAngle > 0 ? (clipAngle * Math.PI) / 180 : null
    const rotation = proj.rotate ? proj.rotate() : [0, 0, 0]
    const center = typeof proj.center === "function" ? proj.center() : [0, 0]
    const projCenter: [number, number] = [
      (center[0] ?? 0) - rotation[0],
      (center[1] ?? 0) - rotation[1]
    ]

    for (let i = 0; i < points.length; i++) {
      const d = points[i]
      const lon = xAcc(d)
      const lat = yAcc(d)

      // Backface culling: skip points beyond the clip angle
      if (clipRadians != null) {
        const dist = geoDistance([lon, lat], projCenter)
        if (dist > clipRadians) continue
      }

      const projected = proj([lon, lat])
      if (!projected) continue

      const baseStyle = config.pointStyle
        ? config.pointStyle(d)
        : { ...pointDefault }

      const r = (baseStyle as any).r || 4

      const pointNode: PointSceneNode = {
        type: "point",
        x: projected[0],
        y: projected[1],
        r,
        style: baseStyle,
        datum: d,
        pointId: pointIdAcc ? String(pointIdAcc(d)) : undefined
      }
      nodes.push(pointNode)
    }

    return nodes
  }

  // ── Distance cartogram transform ──────────────────────────────

  private applyCartogramTransform(
    transform: DistanceCartogramConfig,
    layout: StreamLayout
  ): void {
    const pointNodes = this.scene.filter(
      (n): n is PointSceneNode => n.type === "point"
    )
    if (pointNodes.length < 2) return

    const strength = transform.strength ?? 1
    if (strength === 0) return

    const idAcc = transform.centerAccessor
      ? (typeof transform.centerAccessor === "function"
        ? transform.centerAccessor
        : (d: Datum) => d[transform.centerAccessor as string])
      : (d: Datum) => d.id

    const costAcc = typeof transform.costAccessor === "function"
      ? transform.costAccessor
      : (d: Datum) => d[transform.costAccessor as string]

    // Find center node
    const centerNode = pointNodes.find(
      n => n.datum && String(idAcc(n.datum)) === String(transform.center)
    )
    if (!centerNode) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`GeoFrame: Distance cartogram center "${transform.center}" not found in point data`)
      }
      return
    }

    const cx = centerNode.x
    const cy = centerNode.y

    // Compute max cost for scaling
    const costs = pointNodes
      .map(n => (n.datum ? costAcc(n.datum) : NaN))
      .filter(c => isFinite(c) && c >= 0)
    const maxCost = Math.max(...costs, 1)

    const availableRadius = Math.min(layout.width, layout.height) / 2

    const costScale = scaleLinear().domain([0, maxCost]).range([0, availableRadius])

    // Expose layout info for overlay rendering
    this.cartogramLayout = { cx, cy, maxCost, availableRadius }

    // Warn about areas in cartogram mode
    if (this.areas.length > 0 && process.env.NODE_ENV !== "production") {
      console.warn(
        "GeoFrame: Distance cartogram does not support area rendering. " +
        "Areas will be ignored. Remove areas or set projectionTransform " +
        "to null to render them."
      )
    }

    // Filter out area nodes in cartogram mode
    this.scene = this.scene.filter(n => n.type !== "geoarea" || !(n as GeoAreaSceneNode).interactive)

    for (const node of pointNodes) {
      if (node === centerNode) continue
      if (!node.datum) continue

      const angle = Math.atan2(node.y - cy, node.x - cx)
      const geoDist = Math.sqrt((node.x - cx) ** 2 + (node.y - cy) ** 2)
      const cost = costAcc(node.datum)
      const costDist = isFinite(cost) ? costScale(cost) : geoDist

      const dist = geoDist + (costDist - geoDist) * strength

      node.x = cx + Math.cos(angle) * dist
      node.y = cy + Math.sin(angle) * dist
    }

    // Re-center the cartogram so the center node is always at the
    // viewport center. Without this, fitProjection moves the center
    // as new points arrive, causing the cartogram to "bounce around."
    const viewCx = layout.width / 2
    const viewCy = layout.height / 2
    const offsetX = viewCx - centerNode.x
    const offsetY = viewCy - centerNode.y

    if (Math.abs(offsetX) > 0.5 || Math.abs(offsetY) > 0.5) {
      for (const node of pointNodes) {
        node.x += offsetX
        node.y += offsetY
      }
    }

    // Update cartogramLayout to reflect the re-centered position
    this.cartogramLayout = { cx: viewCx, cy: viewCy, maxCost, availableRadius }

    // Reposition lines connecting repositioned points
    const lineNodes = this.scene.filter(
      (n): n is GeoLineSceneNode => n.type === "line"
    )
    if (lineNodes.length > 0 && transform.lineMode !== "fractional") {
      // Build position lookup from repositioned points
      const posMap = new Map<string, [number, number]>()
      for (const pn of pointNodes) {
        if (pn.pointId) posMap.set(pn.pointId, [pn.x, pn.y])
      }

      for (const ln of lineNodes) {
        const src = ln.datum?.source
        const tgt = ln.datum?.target
        if (src && tgt) {
          const srcPos = posMap.get(String(src))
          const tgtPos = posMap.get(String(tgt))
          if (srcPos && tgtPos) {
            ln.path = [srcPos, tgtPos]
          }
        }
      }
    }
  }

  // ── Decay ──────────────────────────────────────────────────────

  private applyDecay(): void {
    const decay = this.config.decay
    if (!decay || !this.pointBuffer) return

    const bufferSize = this.pointBuffer.size
    if (bufferSize === 0) return

    // Points get per-node decay
    const pointNodes = this.scene.filter(
      (n): n is PointSceneNode => n.type === "point"
    )

    for (let i = 0; i < pointNodes.length; i++) {
      const opacity = computeDecayOpacity(decay, i, bufferSize)
      pointNodes[i]._decayOpacity = opacity
      pointNodes[i].style = { ...pointNodes[i].style, opacity }
    }
  }

  // ── Pulse ──────────────────────────────────────────────────────

  private applyPulse(): void {
    const pulse = this.config.pulse
    if (!pulse || !this.timestampBuffer) return

    const duration = pulse.duration ?? 500
    const now = performance.now()

    const pointNodes = this.scene.filter(
      (n): n is PointSceneNode => n.type === "point"
    )

    const timestamps = this.timestampBuffer.toArray()

    for (let i = 0; i < pointNodes.length && i < timestamps.length; i++) {
      const elapsed = now - timestamps[i]
      if (elapsed < duration) {
        const intensity = 1 - elapsed / duration
        pointNodes[i]._pulseIntensity = intensity
        pointNodes[i]._pulseColor = pulse.color || "rgba(255,255,255,0.6)"
        pointNodes[i]._pulseGlowRadius = pulse.glowRadius ?? 4
      }
    }
  }

  get hasActivePulses(): boolean {
    if (!this.timestampBuffer || this.timestampBuffer.size === 0) return false
    const duration = this.config.pulse?.duration ?? 500
    const newest = this.timestampBuffer.toArray()[this.timestampBuffer.size - 1]
    return performance.now() - newest < duration
  }

  // ── Transition ─────────────────────────────────────────────────

  private startTransition(prevScene: GeoSceneNode[]): void {
    const duration = (this.config.transition?.duration ?? 300)
    if (duration <= 0) return

    // Snapshot previous positions
    const prevPos = new Map<string, [number, number]>()
    for (const node of prevScene) {
      if (node.type === "point" && node.pointId) {
        prevPos.set(node.pointId, [node.x, node.y])
      }
    }

    // Set targets and restore previous positions
    const pointNodes = this.scene.filter(
      (n): n is PointSceneNode => n.type === "point"
    )
    let hasMovement = false
    for (const node of pointNodes) {
      if (node.pointId) {
        const prev = prevPos.get(node.pointId)
        if (prev) {
          node._targetX = node.x
          node._targetY = node.y
          node.x = prev[0]
          node.y = prev[1]
          if (Math.abs(prev[0] - node._targetX) > 0.5 ||
              Math.abs(prev[1] - node._targetY) > 0.5) {
            hasMovement = true
          }
        }
      }
    }

    if (hasMovement) {
      this.activeTransition = {
        startTime: performance.now(),
        duration
      }
    }
  }

  /**
   * Cancel any pending intro animation set up by the most recent
   * `computeScene` call. After this, the next paint shows the scene
   * in its final state directly. See `PipelineStore.cancelIntroAnimation`
   * for the full rationale — Stream Frames call this when they detect
   * SSR hydration so the canvas takeover doesn't re-animate from
   * blank after the server already painted the chart.
   */
  cancelIntroAnimation(): void {
    this.activeTransition = null
  }

  advanceTransition(now: number): boolean {
    if (!this.activeTransition) return false

    const rawT = computeRawProgress(now, this.activeTransition)
    const t = computeEasing(rawT)

    const pointNodes = this.scene.filter(
      (n): n is PointSceneNode => n.type === "point"
    )

    for (const node of pointNodes) {
      if (node._targetX != null && node._targetY != null) {
        const startX = node.x
        const startY = node.y
        node.x = lerp(startX, node._targetX, t)
        node.y = lerp(startY, node._targetY, t)
      }
    }

    if (rawT >= 1) {
      // Snap to targets
      for (const node of pointNodes) {
        if (node._targetX != null) {
          node.x = node._targetX
          node.y = node._targetY!
          node._targetX = undefined
          node._targetY = undefined
        }
      }
      this.activeTransition = null
      return false
    }

    return true
  }
}
