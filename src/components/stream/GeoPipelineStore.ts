import { geoPath as d3GeoPath } from "d3-geo"
import type { GeoProjection, GeoPath, GeoPermissibleObjects } from "d3-geo"
import type { ZoomTransform } from "d3-zoom"
import { quadtree as d3Quadtree, type Quadtree } from "d3-quadtree"
import type {
  GeoPipelineConfig,
  GeoScales,
  GeoSceneNode,
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
import {
  computePulseIntensity,
  hasActivePulses as hasActivePulsesShared,
  setPulseState
} from "./pipelinePulse"
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
  makeLineDataAccessor
} from "./geoPipelineHelpers"
import { applyDistanceCartogram } from "./geoCartogram"
import {
  compactTimestampBufferForRemoval,
  pushWithTimestamp
} from "./pipelineBufferUtils"
import { GeoPipelineUpdateResults } from "./geoPipelineUpdateResults"
import { attachUpdateResultStore, type UpdateResult, type UpdateResultStore } from "./pipelineUpdateStore"
import { buildBuiltInGeoScene } from "./geoSceneBuilder"

// ── GeoPipelineStore ─────────────────────────────────────────────────

const DEFAULT_STREAM_WINDOW_SIZE = 500
const MAX_FIT_PADDING = 0.5

/**
 * `fitPadding` is applied to both sides of the plot, so 0.5 would leave a
 * zero-sized extent (and a clipped globe with radius zero). Normalize nullish
 * values at the public config boundary, and reject invalid values before they
 * can reach d3 with a negative or non-finite projection extent.
 */
function normalizeFitPadding(value: unknown): number {
  if (value == null) return 0
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value < MAX_FIT_PADDING
  ) {
    return value
  }
  throw new RangeError(
    `[semiotic] fitPadding must be a finite fraction in [0, ${MAX_FIT_PADDING}); received ${String(value)}.`,
  )
}

function normalizeInitialConfig(config: GeoPipelineConfig): GeoPipelineConfig {
  return {
    ...config,
    fitPadding: normalizeFitPadding(config.fitPadding)
  }
}

function normalizeConfigUpdate(
  config: Partial<GeoPipelineConfig>
): Partial<GeoPipelineConfig> {
  if (!("fitPadding" in config)) return config
  return {
    ...config,
    fitPadding: normalizeFitPadding(config.fitPadding)
  }
}

export class GeoPipelineStore implements UpdateResultStore {
  declare getLastUpdateResult: () => UpdateResult
  declare getUpdateSnapshot: () => UpdateResult
  declare subscribeUpdateResult: (listener: () => void) => () => void
  declare setLayoutSelection: (selection: CustomLayoutSelection | null) => void
  declare markStylePaintPending: () => void
  declare consumeStylePaintPending: () => boolean

  config: GeoPipelineConfig
  protected updateResults = new GeoPipelineUpdateResults()

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
  private geoPath: GeoPath<void, GeoPermissibleObjects> | null = null

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
    this.config = normalizeInitialConfig(config)
  }

  /** Keep Geo transitions and pulse lifecycle on the host's logical clock
   *  when one is supplied, while preserving the existing wall-clock default. */
  private currentTime(): number {
    return this.config.clock?.() ?? getTimestamp()
  }

  /** Resolve the one configuration-owned retention bound for both streaming
   *  points and flow lines. Keeping it here prevents imperative push paths
   *  from silently allocating a differently sized window. */
  private getConfiguredWindowSize(): number {
    const windowSize = this.config.windowSize ?? DEFAULT_STREAM_WINDOW_SIZE
    if (!Number.isInteger(windowSize) || windowSize < 1) {
      throw new Error("GeoPipelineStore windowSize must be a positive integer")
    }
    return windowSize
  }

  /** Trim the array-backed line collection only while it participates in a
   *  stream. Bounded `setLines` snapshots remain complete until conversion. */
  private retainNewestLines(windowSize = this.getConfiguredWindowSize()): void {
    if (this.lineData.length > windowSize) {
      this.lineData = this.lineData.slice(-windowSize)
    }
  }

  /** Rebuild both point resources from the same retained suffix so pulse
   *  timestamps remain indexed to their matching point after a resize. */
  private resizeStreamingWindow(windowSize: number): void {
    if (this.pointBuffer) {
      const points = this.pointBuffer.toArray()
      const timestamps = this.timestampBuffer?.toArray() ?? []
      const retainedPoints = points.slice(-windowSize)
      const retainedTimestamps = timestamps.slice(-retainedPoints.length)
      const fallbackTimestamp = this.currentTime()

      this.pointBuffer = new RingBuffer<Datum>(windowSize)
      this.timestampBuffer = new RingBuffer<number>(windowSize)
      retainedPoints.forEach((point, index) => {
        this.pointBuffer!.push(point)
        this.timestampBuffer!.push(retainedTimestamps[index] ?? fallbackTimestamp)
      })
    }
    this.retainNewestLines(windowSize)
  }

  updateConfig(config: Partial<GeoPipelineConfig>): void {
    // Normalize before observing or changing any store state so an invalid
    // update is atomic: no config, retained data, version, or update result
    // changes if validation throws.
    const normalizedConfig = normalizeConfigUpdate(config)
    const previous = this.config
    const previousWindowSize = this.getConfiguredWindowSize()
    const changedConfigKeys = Object.keys(normalizedConfig).filter(
      (key) => (normalizedConfig as unknown as Record<string, unknown>)[key] !==
        (previous as unknown as Record<string, unknown>)[key]
    )
    this.config = { ...this.config, ...normalizedConfig }
    const nextWindowSize = this.getConfiguredWindowSize()
    const resizedRetainedData = this.streaming && nextWindowSize !== previousWindowSize
    if (resizedRetainedData) {
      this.resizeStreamingWindow(nextWindowSize)
      this.version++
    }
    // An explicit removal dismisses the old failure rather than surfacing an
    // error for a callback the caller no longer uses. The next built-in scene
    // build clears the remaining custom-layout output.
    if ("customLayout" in normalizedConfig && !normalizedConfig.customLayout) {
      this.lastCustomLayoutFailure = null
    }
    this.updateResults.recordConfig(changedConfigKeys, {
      retainedDataChanged: resizedRetainedData
    })
  }

  /** Additive explicit-result form of {@link updateConfig}. */
  updateConfigWithResult(config: Partial<GeoPipelineConfig>): UpdateResult {
    this.updateConfig(config)
    return this.updateResults.last
  }

  // ── Data ingestion ───────────────────────────────────────────────

  setAreas(features: GeoJSON.Feature[]): void {
    this.areas = features
    this.updateResults.recordData("replace", features.length)
  }

  /** Additive explicit-result form of {@link setAreas}. */
  setAreasWithResult(features: GeoJSON.Feature[]): UpdateResult {
    this.setAreas(features)
    return this.updateResults.last
  }

  setPoints(data: Datum[]): void {
    // Bounded replacement must become the authoritative retained dataset.
    // In particular, a prior stream cannot remain latent: otherwise the next
    // push writes into its old ring while `streaming` is false and never shows
    // up in a rebuild. Mirror the line boundary by owning the array shape.
    this.pointData = data.slice()
    this.pointBuffer = null
    this.timestampBuffer = null
    this.streaming = false
    this.updateResults.recordData("replace", data.length)
  }

  /** Additive explicit-result form of {@link setPoints}. */
  setPointsWithResult(data: Datum[]): UpdateResult {
    this.setPoints(data)
    return this.updateResults.last
  }

  setLines(data: Datum[]): void {
    // Defensive copy — `pushLine` / `pushManyLines` mutate
    // `lineData` in place (no ring buffer for lines), so taking the
    // user's array reference here would let a subsequent push leak
    // into the React-owned array passed via the `lines` prop.
    this.lineData = data.slice()
    if (this.streaming) this.retainNewestLines()
    this.updateResults.recordData("replace", data.length)
  }

  /** Additive explicit-result form of {@link setLines}. */
  setLinesWithResult(data: Datum[]): UpdateResult {
    this.setLines(data)
    return this.updateResults.last
  }

  /**
   * Enter streaming mode while retaining the newest configured window from a
   * bounded snapshot. The optional legacy argument is immediately reflected
   * in config so the config remains the sole owner of the active capacity.
   */
  initStreaming(windowSize?: number): void {
    if (windowSize !== undefined && windowSize !== this.config.windowSize) {
      this.config = { ...this.config, windowSize }
    }
    const configuredWindowSize = this.getConfiguredWindowSize()
    const points = this.pointBuffer ? this.pointBuffer.toArray() : this.pointData
    const timestamps = this.timestampBuffer?.toArray() ?? []
    const retainedPoints = points.slice(-configuredWindowSize)
    const retainedTimestamps = timestamps.slice(-retainedPoints.length)
    const fallbackTimestamp = this.currentTime()

    this.pointBuffer = new RingBuffer<Datum>(configuredWindowSize)
    this.timestampBuffer = new RingBuffer<number>(configuredWindowSize)
    retainedPoints.forEach((point, index) => {
      this.pointBuffer!.push(point)
      this.timestampBuffer!.push(retainedTimestamps[index] ?? fallbackTimestamp)
    })
    this.pointData = []
    this.retainNewestLines(configuredWindowSize)
    this.streaming = true
  }

  /** Push a single streaming point */
  pushPoint(datum: Datum): void {
    if (!this.pointBuffer) this.initStreaming()
    const now = this.currentTime()
    pushWithTimestamp(this.pointBuffer!, datum, this.timestampBuffer, now)
    this.lastIngestTime = now
    this.updateResults.recordData("ingest", 1)
  }

  /** Additive explicit-result form of {@link pushPoint}. */
  pushPointWithResult(datum: Datum): UpdateResult {
    this.pushPoint(datum)
    return this.updateResults.last
  }

  /** Push multiple streaming points */
  pushMany(data: Datum[]): void {
    if (!this.pointBuffer) this.initStreaming()
    const now = this.currentTime()
    for (const d of data) {
      pushWithTimestamp(this.pointBuffer!, d, this.timestampBuffer, now)
    }
    this.lastIngestTime = now
    this.updateResults.recordData("ingest", data.length)
  }

  /** Additive explicit-result form of {@link pushMany}. */
  pushManyWithResult(data: Datum[]): UpdateResult {
    this.pushMany(data)
    return this.updateResults.last
  }

  /** Append a single line/flow record (coordinates pre-resolved). Lines
   *  use array storage, then retain the active configured window in streaming mode.
   *  Mutates `lineData` in place to avoid the O(n) GC churn of an
   *  array spread per push. The mutation is invisible to callers
   *  because `setLines` defensive-copies on entry and `getLines`
   *  defensive-copies on exit. */
  pushLine(line: Datum): void {
    if (line == null || typeof line !== "object") {
      this.updateResults.recordNoop("ingest")
      return
    }
    if (!this.streaming) this.initStreaming()
    this.lineData.push(line)
    this.retainNewestLines()
    this.version++
    this.updateResults.recordData("ingest", 1)
  }

  /** Append multiple line/flow records in one pass. Same in-place
   *  mutation rationale as `pushLine`. Loops instead of
   *  `Array.prototype.push(...safe)` so very large batches don't
   *  blow the engine's argument-count limit (mirrors how `pushMany`
   *  for points iterates rather than spreads). */
  pushManyLines(lines: Datum[]): void {
    if (!Array.isArray(lines) || lines.length === 0) {
      this.updateResults.recordNoop("ingest")
      return
    }
    const safe = lines.filter((l) => l != null && typeof l === "object")
    if (safe.length === 0) {
      this.updateResults.recordNoop("ingest")
      return
    }
    if (!this.streaming) this.initStreaming()
    for (const line of safe) this.lineData.push(line)
    this.retainNewestLines()
    this.version++
    this.updateResults.recordData("ingest", safe.length)
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
    if (removed.length > 0) {
      this.version++
      this.updateResults.recordData("remove", removed.length)
    } else {
      this.updateResults.recordNoop("remove")
    }
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
      if (removed.length > 0) {
        this.version++
        this.updateResults.recordData("remove", removed.length)
      } else {
        this.updateResults.recordNoop("remove")
      }
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
      if (removed.length > 0) {
        this.version++
        this.updateResults.recordData("remove", removed.length)
      } else {
        this.updateResults.recordNoop("remove")
      }
      return removed
    }
  }

  clear(): void {
    this.areas = []
    this.pointData = []
    this.lineData = []
    this.pointBuffer = null
    this.timestampBuffer = null
    this.streaming = false
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
    this.updateResults.recordData("clear")
  }

  restyleScene(selection: CustomLayoutSelection | null): void {
    const fn = this._customRestyle
    if (!fn) {
      this.updateResults.recordRestyle(false)
      return
    }
    for (const node of this.scene) {
      const base = this._baseStyles.get(node) ?? node.style
      const patch = fn(node, selection)
      node.style = patch ? { ...base, ...patch } : base
    }
    this.markStylePaintPending()
    this.updateResults.recordRestyle(true)
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
      // Exterior rings must be counter-clockwise (RFC 7946 / d3-geo). A
      // clockwise ring is interpreted as the complement of the box — i.e. the
      // whole globe — so fitExtent collapses to world scale.
      const syntheticFeature: GeoJSON.Feature = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [[[lonMin, latMin], [lonMin, latMax], [lonMax, latMax], [lonMax, latMin], [lonMin, latMin]]]
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

    return buildBuiltInGeoScene({
      config,
      projection: proj,
      path,
      areas: this.areas,
      points: this.getPoints(),
      lines: this.lineData,
      layout
    })
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

  private applyPulse(now = this.currentTime()): boolean {
    const pulse = this.config.pulse
    if (!pulse || !this.timestampBuffer) return false

    const pointNodes = this.scene.filter(
      (n): n is PointSceneNode => n.type === "point"
    )
    const timestamps = this.timestampBuffer.toArray()
    const pulseColor = pulse.color || "rgba(255,255,255,0.6)"
    const glowRadius = pulse.glowRadius ?? 4
    let changed = false

    for (let i = 0; i < pointNodes.length && i < timestamps.length; i++) {
      // Share the pulse-intensity curve with the XY/realtime pipeline so a
      // change to the fade math (pipelinePulse.computePulseIntensity) reaches
      // geo too. Behaviourally identical to the previous inline 1 - age/dur.
      const intensity = computePulseIntensity(pulse, timestamps[i], now)
      changed = setPulseState(pointNodes[i], intensity, pulseColor, glowRadius) || changed
    }

    return changed
  }

  refreshPulse(now: number): boolean {
    if (this.lastCustomLayoutFailure?.preservedLastGoodScene === true) return false
    return this.applyPulse(now)
  }

  hasActivePulsesAt(now: number): boolean {
    return !!this.config.pulse && hasActivePulsesShared(this.config.pulse, this.timestampBuffer, now)
  }

  get hasActivePulses(): boolean {
    return this.hasActivePulsesAt(this.currentTime())
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
        startTime: this.currentTime(),
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

attachUpdateResultStore(GeoPipelineStore)
