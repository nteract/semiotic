import {
  geoPath as d3GeoPath,
  geoGraticule,
  geoDistance,
  geoInterpolate
} from "d3-geo"
import type { GeoProjection, GeoPath, GeoPermissibleObjects } from "d3-geo"
import type { ZoomTransform } from "d3-zoom"
import { quadtree as d3Quadtree, type Quadtree } from "d3-quadtree"
import type {
  GeoPipelineConfig,
  GeoScales,
  GeoSceneNode,
  GeoLineSceneNode,
  GraticuleConfig,
  DistanceCartogramConfig
} from "./geoTypes"
import type {
  PointSceneNode,
  Style,
  StreamLayout
} from "./types"
import { RingBuffer } from "../realtime/RingBuffer"
import {
  computeEasing,
  computeRawProgress,
  lerp,
  now as getTimestamp
} from "./pipelineTransitionUtils"
import { computeDecayOpacity } from "./pipelineDecay"
import { computePulseIntensity, hasActivePulses as hasActivePulsesShared } from "./pipelinePulse"
import type { ActiveTransition } from "./pipelineTransitionUtils"
import type { Datum } from "../charts/shared/datumTypes"
import type { GeoLayoutContext, GeoLayoutResult } from "./geoCustomLayout"
import type { CustomLayoutSelection } from "./customLayoutSelection"
import {
  buildResolveColor,
  resolveCustomLayoutPalette,
  STREAMING_PALETTE
} from "./customLayoutPalette"
import { warnCustomLayoutDiagnostics } from "./customLayoutDiagnostics"
import {
  createCustomLayoutFailureDiagnostic,
  type CustomLayoutFailureDiagnostic
} from "./customLayoutFailure"
import {
  resolveProjection,
  makeGeoNumericAccessor as makeAccessor,
  makeLineDataAccessor,
  resolveGeoStyle as resolveStyle,
  themedDefaultArea,
  themedDefaultPoint,
  themedDefaultLine,
  splitAntiMeridianPath,
  buildArcPath,
  buildOffsetGeoPath,
  buildOffsetPath
} from "./geoPipelineHelpers"
import { applyDistanceCartogram } from "./geoCartogram"
import {
  compactTimestampBufferForRemoval,
  pushWithTimestamp
} from "./pipelineBufferUtils"

// ── GeoPipelineStore ─────────────────────────────────────────────────

export class GeoPipelineStore {
  config: GeoPipelineConfig

  // Scene output
  scene: GeoSceneNode[] = []
  scales: GeoScales | null = null
  version = 0
  /** SVG overlays returned from the active custom layout. */
  customLayoutOverlays: import("react").ReactNode = null
  /** Most recent custom layout result for host readback (`getCustomLayout()`).
   *  Null before the first layout or without a custom layout. A failed
   *  re-layout retains the prior good result alongside its diagnostic. */
  lastCustomLayoutResult: GeoLayoutResult | null = null
  /** Most recent exception from a custom layout invocation, for host readback. */
  lastCustomLayoutFailure: CustomLayoutFailureDiagnostic | null = null
  private _customLayoutDiagnosticsWarned = new Set<string>()
  private _customRestyle: GeoLayoutResult["restyle"] = undefined
  hasCustomRestyle = false
  private _baseStyles = new WeakMap<object, Style>()
  /** Set only while a custom-layout invocation throws. The rebuild callers use
   *  it to retain the previous scene and projection state without mutating it. */
  private _customLayoutFailedThisBuild = false

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
    // An explicit removal dismisses the old failure rather than surfacing an
    // error for a callback the caller no longer uses. The next built-in scene
    // build clears the remaining custom-layout output.
    if ("customLayout" in config && !config.customLayout) {
      this.lastCustomLayoutFailure = null
    }
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
    const now = getTimestamp()
    pushWithTimestamp(this.pointBuffer!, datum, this.timestampBuffer, now)
    this.lastIngestTime = now
  }

  /** Push multiple streaming points */
  pushMany(data: Datum[]): void {
    if (!this.pointBuffer) this.initStreaming()
    const now = getTimestamp()
    for (const d of data) {
      pushWithTimestamp(this.pointBuffer!, d, this.timestampBuffer, now)
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
      compactTimestampBufferForRemoval(this.pointBuffer, this.timestampBuffer, predicate)
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
    this.customLayoutOverlays = null
    this.lastCustomLayoutResult = null
    this.lastCustomLayoutFailure = null
    this._customRestyle = undefined
    this.hasCustomRestyle = false
    this._baseStyles = new WeakMap()
    this._customLayoutFailedThisBuild = false
    this.version++
  }

  setLayoutSelection(selection: CustomLayoutSelection | null): void {
    this.config.layoutSelection = selection
  }

  /**
   * "Styles changed, repaint the data canvas without rebuilding the scene."
   * Set by {@link restyleScene}; consumed once per frame by the paint loop, so a
   * style-only selection change repaints without a projection/scene recompute.
   */
  private _stylePaintPending = false

  /** Consume the style-only repaint signal (see {@link _stylePaintPending}). */
  consumeStylePaintPending(): boolean {
    const pending = this._stylePaintPending
    this._stylePaintPending = false
    return pending
  }

  restyleScene(selection: CustomLayoutSelection | null): void {
    const fn = this._customRestyle
    if (!fn) return
    for (const node of this.scene) {
      const base = this._baseStyles.get(node) ?? node.style
      const patch = fn(node, selection)
      node.style = patch ? { ...base, ...patch } : base
    }
    this._stylePaintPending = true
  }

  // ── Projection pipeline ──────────────────────────────────────────

  computeScene(layout: StreamLayout): void {
    const { config } = this
    const previousProjection = this.projection
    const previousGeoPath = this.geoPath
    const previousScales = this.scales
    const previousBaseScale = this.baseScale
    const previousBaseTranslate = [...this.baseTranslate] as [number, number]
    const previousBaseRotation = [...this.baseRotation] as [number, number, number]
    const prevScene = this.scene

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
    this._customLayoutFailedThisBuild = false
    const nextScene = this.buildSceneNodes(layout)
    if (this._customLayoutFailedThisBuild) {
      const preservedLastGoodScene =
        this.lastCustomLayoutFailure?.preservedLastGoodScene === true
      if (preservedLastGoodScene) {
        // The callback saw a freshly fitted projection, but the retained scene
        // was produced against the prior one. Restore the complete geographic
        // scale bundle so drawing, annotation anchoring, and imperative
        // readback continue to describe the visible last-good scene.
        this.projection = previousProjection
        this.geoPath = previousGeoPath
        this.scales = previousScales
        this.baseScale = previousBaseScale
        this.baseTranslate = previousBaseTranslate
        this.baseRotation = previousBaseRotation
      } else {
        // A newly installed custom layout must not leave an unrelated built-in
        // scene visible when it fails before producing any custom output.
        this.scene = []
        this.rebuildQuadtree()
      }
      return
    }
    this.scene = nextScene
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
        this.startTransition(syntheticPrev)
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
      if (pad >= 1 && typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn(
          `[semiotic] fitPadding=${pad} looks like pixels, but it's a fraction of the plot (0–0.5). ` +
            `A value >= 1 collapses the projection off-canvas — use e.g. 0.06.`
        )
      }
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
    const previousGeoPath = this.geoPath
    const previousScales = this.scales
    const previousScale = proj.scale()
    const previousTranslate = [...proj.translate()] as [number, number]
    const previousZoom = this.currentZoom

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
    this._customLayoutFailedThisBuild = false
    const nextScene = this.buildSceneNodes(layout)
    if (this._customLayoutFailedThisBuild) {
      if (this.lastCustomLayoutFailure?.preservedLastGoodScene) {
        proj.scale(previousScale)
        proj.translate(previousTranslate)
        this.currentZoom = previousZoom
        this.geoPath = previousGeoPath
        this.scales = previousScales
      } else {
        this.scene = []
        this.rebuildQuadtree()
      }
      return
    }
    this.scene = nextScene
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
    const previousGeoPath = this.geoPath
    const previousScales = this.scales
    const previousScale = proj.scale()
    const previousTranslate = [...proj.translate()] as [number, number]
    const previousZoom = this.currentZoom

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

    this._customLayoutFailedThisBuild = false
    const nextScene = this.buildSceneNodes(layout)
    if (this._customLayoutFailedThisBuild) {
      if (this.lastCustomLayoutFailure?.preservedLastGoodScene) {
        proj.scale(previousScale)
        proj.translate(previousTranslate)
        this.currentZoom = previousZoom
        this.geoPath = previousGeoPath
        this.scales = previousScales
      } else {
        this.scene = []
        this.rebuildQuadtree()
      }
      return
    }
    this.scene = nextScene
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
    const previousGeoPath = this.geoPath
    const previousScales = this.scales
    const previousRotation = [...proj.rotate()] as [number, number, number]

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
    this._customLayoutFailedThisBuild = false
    const nextScene = this.buildSceneNodes(layout)
    if (this._customLayoutFailedThisBuild) {
      if (this.lastCustomLayoutFailure?.preservedLastGoodScene) {
        proj.rotate(previousRotation)
        this.geoPath = previousGeoPath
        this.scales = previousScales
      } else {
        this.scene = []
        this.rebuildQuadtree()
      }
      return
    }
    this.scene = nextScene
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
    this._customLayoutFailedThisBuild = false
    const { config } = this
    const proj = this.projection!
    const path = this.geoPath!
    const xAcc = makeAccessor(config.xAccessor, "lon")
    const yAcc = makeAccessor(config.yAccessor, "lat")

    if (config.customLayout && this.scales) {
      const margin = config.layoutMargin ?? { top: 0, right: 0, bottom: 0, left: 0 }
      const palette = resolveCustomLayoutPalette(
        config.colorScheme,
        config.themeCategorical,
        STREAMING_PALETTE
      )
      const layoutContext: GeoLayoutContext = {
        areas: this.areas.slice(),
        points: this.getPoints().slice(),
        lines: this.lineData.slice(),
        scales: this.scales,
        dimensions: {
          width: layout.width,
          height: layout.height,
          margin,
          plot: { x: 0, y: 0, width: layout.width, height: layout.height }
        },
        theme: {
          semantic: config.themeSemantic ?? {},
          categorical: [...palette]
        },
        resolveColor: buildResolveColor(palette, config.colorScheme),
        config: (config.layoutConfig ?? {}) as Record<string, unknown>,
        selection: config.layoutSelection ?? null
      }

      let result: GeoLayoutResult
      try {
        result = config.customLayout(layoutContext)
      } catch (err) {
        // Do not blank a working custom chart just because its next layout
        // attempt failed. A successful result is the proof that the current
        // scene/overlays/restyle callback belong together and can be retained.
        const preservedLastGoodScene = this.lastCustomLayoutResult !== null
        const diagnostic = createCustomLayoutFailureDiagnostic(
          "geo",
          err,
          preservedLastGoodScene,
          this.version
        )
        this.lastCustomLayoutFailure = diagnostic
        this._customLayoutFailedThisBuild = true
        if (process.env.NODE_ENV !== "production") {
          console.error("[semiotic] geo customLayout threw:", err)
        }
        try {
          config.onLayoutError?.(diagnostic)
        } catch (callbackError) {
          if (process.env.NODE_ENV !== "production") {
            console.error("[semiotic] onLayoutError threw:", callbackError)
          }
        }
        if (!preservedLastGoodScene) {
          this.customLayoutOverlays = null
          this.lastCustomLayoutResult = null
          this._customRestyle = undefined
          this.hasCustomRestyle = false
          this._baseStyles = new WeakMap()
          return []
        }
        return this.scene
      }

      const nodes = result.nodes ?? []
      this.customLayoutOverlays = result.overlays ?? null
      this.lastCustomLayoutResult = result
      this.lastCustomLayoutFailure = null
      this._customRestyle = result.restyle
      this.hasCustomRestyle = !!result.restyle
      this._baseStyles = new WeakMap()
      if (this.hasCustomRestyle) {
        for (const node of nodes) this._baseStyles.set(node, node.style)
        this.restyleScene(config.layoutSelection ?? null)
      }
      warnCustomLayoutDiagnostics({
        label: "geo customLayout",
        nodes,
        overlays: this.customLayoutOverlays,
        warned: this._customLayoutDiagnosticsWarned
      })
      return nodes
    }

    this.customLayoutOverlays = null
    this.lastCustomLayoutResult = null
    this.lastCustomLayoutFailure = null
    this._customRestyle = undefined
    this.hasCustomRestyle = false
    this._baseStyles = new WeakMap()

    const nodes: GeoSceneNode[] = []

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
            style: { ...style, _edgeFade: true },
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

      const r = baseStyle.r || 4

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
    const layoutInfo = applyDistanceCartogram(
      this.scene,
      transform,
      layout,
      this.areas.length
    )
    if (layoutInfo) this.cartogramLayout = layoutInfo
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

    const now = getTimestamp()
    const pointNodes = this.scene.filter(
      (n): n is PointSceneNode => n.type === "point"
    )
    const timestamps = this.timestampBuffer.toArray()

    for (let i = 0; i < pointNodes.length && i < timestamps.length; i++) {
      // Share the pulse-intensity curve with the XY/realtime pipeline so a
      // change to the fade math (pipelinePulse.computePulseIntensity) reaches
      // geo too. Behaviourally identical to the previous inline 1 - age/dur.
      const intensity = computePulseIntensity(pulse, timestamps[i], now)
      if (intensity > 0) {
        pointNodes[i]._pulseIntensity = intensity
        pointNodes[i]._pulseColor = pulse.color || "rgba(255,255,255,0.6)"
        pointNodes[i]._pulseGlowRadius = pulse.glowRadius ?? 4
      }
    }
  }

  get hasActivePulses(): boolean {
    // Delegate to the shared check (peek() avoids the toArray() allocation the
    // inline version did). `?? {}` preserves the previous 500ms default when
    // no pulse config is present.
    return hasActivePulsesShared(this.config.pulse ?? {}, this.timestampBuffer)
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

    // Enter: points present now but absent from the previous scene fade in
    // from opacity 0. The XY/ordinal families get this from the shared
    // transition engine; geo's transition is position-only, so without this
    // new points popped in abruptly while existing points glided. (Exit-fade
    // for removed points is not yet handled — it requires carrying the removed
    // nodes through the transition, which geo's fresh-scene-per-compute model
    // doesn't currently support.)
    for (const node of pointNodes) {
      if (node.pointId && !prevPos.has(node.pointId)) {
        node._targetOpacity = node.style?.opacity ?? 1
        node.style = { ...node.style, opacity: 0 }
        hasMovement = true
      }
    }

    if (hasMovement) {
      this.activeTransition = {
        startTime: getTimestamp(),
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
      // Entering points fade 0 → target opacity along the eased progress.
      if (node._targetOpacity != null) {
        node.style = { ...node.style, opacity: node._targetOpacity * t }
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
        if (node._targetOpacity != null) {
          node.style = { ...node.style, opacity: node._targetOpacity }
          node._targetOpacity = undefined
        }
      }
      this.activeTransition = null
      return false
    }

    return true
  }
}
