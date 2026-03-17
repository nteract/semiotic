import {
  geoMercator,
  geoEqualEarth,
  geoAlbersUsa,
  geoOrthographic,
  geoNaturalEarth1,
  geoEquirectangular,
  geoPath as d3GeoPath,
  geoBounds,
  geoGraticule
} from "d3-geo"
import type { GeoProjection, GeoPath, GeoPermissibleObjects } from "d3-geo"
import type { ZoomTransform } from "d3-zoom"
import { scaleLinear } from "d3-scale"
import type {
  GeoPipelineConfig,
  GeoScales,
  GeoSceneNode,
  GeoAreaSceneNode,
  ProjectionProp,
  ProjectionName,
  GraticuleConfig,
  DistanceCartogramConfig
} from "./geoTypes"
import type {
  PointSceneNode,
  LineSceneNode,
  Style,
  StreamLayout
} from "./types"
import { RingBuffer } from "../realtime/RingBuffer"
import { computeEasing, computeRawProgress, lerp } from "./pipelineTransitionUtils"
import type { ActiveTransition } from "./pipelineTransitionUtils"

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

function makeAccessor(acc: string | ((d: any) => number) | undefined, fallback: string): (d: any) => number {
  if (!acc) return (d: any) => d[fallback]
  if (typeof acc === "function") return acc
  return (d: any) => d[acc]
}

function makeLineDataAccessor(acc: string | ((d: any) => any[]) | undefined): (d: any) => any[] {
  if (!acc) return (d: any) => d.coordinates || d.data || []
  if (typeof acc === "function") return acc
  return (d: any) => d[acc]
}

function resolveStyle(
  styleProp: Style | ((d: any) => Style) | undefined,
  datum: any,
  defaults: Style
): Style {
  if (!styleProp) return defaults
  if (typeof styleProp === "function") return { ...defaults, ...styleProp(datum) }
  return { ...defaults, ...styleProp }
}

// ── Default styles ───────────────────────────────────────────────────

const DEFAULT_AREA_STYLE: Style = {
  fill: "#e0e0e0",
  stroke: "#999",
  strokeWidth: 0.5,
  fillOpacity: 1
}

const DEFAULT_POINT_STYLE: Style & { r?: number } = {
  fill: "#4e79a7",
  r: 4,
  fillOpacity: 0.8
}

const DEFAULT_LINE_STYLE: Style = {
  stroke: "#4e79a7",
  strokeWidth: 1.5,
  fill: "none"
}

// ── GeoPipelineStore ─────────────────────────────────────────────────

export class GeoPipelineStore {
  config: GeoPipelineConfig

  // Scene output
  scene: GeoSceneNode[] = []
  scales: GeoScales | null = null
  version = 0

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
  private pointData: Record<string, any>[] = []
  private lineData: Record<string, any>[] = []

  // Streaming buffer for points
  private pointBuffer: RingBuffer<Record<string, any>> | null = null
  private streaming = false

  // Timestamps for pulse
  lastIngestTime = 0
  private timestampBuffer: RingBuffer<number> | null = null

  // Transition state
  activeTransition: ActiveTransition | null = null
  private prevPositions: Map<string, [number, number]> | null = null

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

  setPoints(data: Record<string, any>[]): void {
    this.pointData = data
    this.streaming = false
  }

  setLines(data: Record<string, any>[]): void {
    this.lineData = data
  }

  /** Initialize streaming mode with a ring buffer */
  initStreaming(windowSize = 500): void {
    this.pointBuffer = new RingBuffer<Record<string, any>>(windowSize)
    this.timestampBuffer = new RingBuffer<number>(windowSize)
    this.streaming = true
  }

  /** Push a single streaming point */
  pushPoint(datum: Record<string, any>): void {
    if (!this.pointBuffer) this.initStreaming()
    this.pointBuffer!.push(datum)
    this.timestampBuffer!.push(performance.now())
    this.lastIngestTime = performance.now()
  }

  /** Push multiple streaming points */
  pushMany(data: Record<string, any>[]): void {
    if (!this.pointBuffer) this.initStreaming()
    const now = performance.now()
    for (const d of data) {
      this.pointBuffer!.push(d)
      this.timestampBuffer!.push(now)
    }
    this.lastIngestTime = now
  }

  clear(): void {
    this.areas = []
    this.pointData = []
    this.lineData = []
    this.pointBuffer = null
    this.timestampBuffer = null
    this.scene = []
    this.scales = null
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

    // Step 7: Transition
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
        const lineCoords: [number, number][] = coords.map((d: any) => [xAcc(d), yAcc(d)])
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

    // Apply cartogram transform if configured
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
    if (this.config.projectionTransform) {
      this.applyCartogramTransform(this.config.projectionTransform, layout)
    }
    this.version++
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

  private getPoints(): Record<string, any>[] {
    if (this.streaming && this.pointBuffer) {
      return this.pointBuffer.toArray()
    }
    return this.pointData
  }

  private buildSceneNodes(layout: StreamLayout): GeoSceneNode[] {
    const nodes: GeoSceneNode[] = []
    const { config } = this
    const proj = this.projection!
    const path = this.geoPath!
    const xAcc = makeAccessor(config.xAccessor, "lon")
    const yAcc = makeAccessor(config.yAccessor, "lat")

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

      const style = resolveStyle(config.areaStyle, feature, DEFAULT_AREA_STYLE)

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

      const lineCoords: [number, number][] = coords.map((d: any) => [xAcc(d), yAcc(d)])

      let screenPath: [number, number][]

      if (config.lineType === "line") {
        // Straight screen-space connections
        screenPath = lineCoords
          .map(([lon, lat]) => proj([lon, lat]))
          .filter((p): p is [number, number] => p != null)
      } else {
        // Great circle arcs via geoPath — project to screen via geoPath
        // We need to convert geoPath output to a point array for LineSceneNode
        // Use individual segment projection for the scene node
        screenPath = lineCoords
          .map(([lon, lat]) => proj([lon, lat]))
          .filter((p): p is [number, number] => p != null)
      }

      if (screenPath.length < 2) continue

      const style = resolveStyle(config.lineStyle, line, DEFAULT_LINE_STYLE) as Style

      const lineNode: LineSceneNode = {
        type: "line",
        path: screenPath,
        style,
        datum: line
      }
      nodes.push(lineNode)
    }

    // Points
    const points = this.getPoints()
    const pointIdAcc = config.pointIdAccessor
      ? (typeof config.pointIdAccessor === "function"
        ? config.pointIdAccessor
        : (d: any) => d[config.pointIdAccessor as string])
      : null

    for (let i = 0; i < points.length; i++) {
      const d = points[i]
      const lon = xAcc(d)
      const lat = yAcc(d)
      const projected = proj([lon, lat])
      if (!projected) continue

      const baseStyle = config.pointStyle
        ? config.pointStyle(d)
        : { ...DEFAULT_POINT_STYLE }

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
        : (d: any) => d[transform.centerAccessor as string])
      : (d: any) => d.id

    const costAcc = typeof transform.costAccessor === "function"
      ? transform.costAccessor
      : (d: any) => d[transform.costAccessor as string]

    // Find center node
    const centerNode = pointNodes.find(
      n => String(idAcc(n.datum)) === String(transform.center)
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
    const costs = pointNodes.map(n => costAcc(n.datum)).filter(c => isFinite(c) && c >= 0)
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

      const angle = Math.atan2(node.y - cy, node.x - cx)
      const geoDist = Math.sqrt((node.x - cx) ** 2 + (node.y - cy) ** 2)
      const cost = costAcc(node.datum)
      const costDist = isFinite(cost) ? costScale(cost) : geoDist

      const dist = geoDist + (costDist - geoDist) * strength

      node.x = cx + Math.cos(angle) * dist
      node.y = cy + Math.sin(angle) * dist
    }

    // Reposition lines connecting repositioned points
    const lineNodes = this.scene.filter(
      (n): n is LineSceneNode => n.type === "line"
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

    const minOpacity = decay.minOpacity ?? 0.1
    const halfLife = decay.halfLife ?? bufferSize / 2
    const stepThreshold = decay.stepThreshold ?? bufferSize * 0.5

    // Points get per-node decay
    const pointNodes = this.scene.filter(
      (n): n is PointSceneNode => n.type === "point"
    )

    for (let i = 0; i < pointNodes.length; i++) {
      const age = bufferSize - 1 - i
      let opacity: number
      switch (decay.type) {
        case "exponential":
          opacity = minOpacity + Math.pow(0.5, age / halfLife) * (1 - minOpacity)
          break
        case "step":
          opacity = age < stepThreshold ? 1 : minOpacity
          break
        case "linear":
        default: {
          const t = bufferSize > 1 ? 1 - age / (bufferSize - 1) : 1
          opacity = minOpacity + t * (1 - minOpacity)
        }
      }
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
