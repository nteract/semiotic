import type { ReactNode } from "react"
import type { GeoProjection, GeoPath, GeoPermissibleObjects } from "d3-geo"
import type {
  Style,
  DecayConfig,
  PulseConfig,
  TransitionConfig,
  StalenessConfig,
  MarginalGraphicsConfig,
  PointSceneNode,
  LineSceneNode
} from "./types"
import type {
  HoverAnnotationConfig,
  HoverData,
  AnnotationContext
} from "../realtime/types"
import type { GeoParticleStyle } from "./GeoParticlePool"

// ── Projection prop ──────────────────────────────────────────────────

export type ProjectionProp =
  | GeoProjection
  | ProjectionName
  | ProjectionConfig

export type ProjectionName =
  | "mercator"
  | "equalEarth"
  | "albersUsa"
  | "orthographic"
  | "naturalEarth"
  | "equirectangular"

export interface ProjectionConfig {
  type: ProjectionName
  rotate?: [number, number] | [number, number, number]
  center?: [number, number]
  parallels?: [number, number]
}

// ── Graticule ────────────────────────────────────────────────────────

export interface GraticuleConfig {
  step?: [number, number]
  stroke?: string
  strokeWidth?: number
  strokeDasharray?: string
  showLabels?: boolean
}

// ── Distance cartogram ───────────────────────────────────────────────

export interface DistanceCartogramConfig {
  center: string
  centerAccessor?: string | ((d: any) => string)
  costAccessor: string | ((d: any) => number)
  strength?: number
  lineMode?: "straight" | "fractional"
}

// ── Scene nodes ──────────────────────────────────────────────────────

export interface GeoAreaSceneNode {
  type: "geoarea"
  /** Pre-computed SVG path string from d3.geoPath(projection)(feature) */
  pathData: string
  /** Centroid in screen coords (for tooltip/annotation positioning) */
  centroid: [number, number]
  /** Bounding box in screen coords [[x0,y0],[x1,y1]] */
  bounds: [[number, number], [number, number]]
  /** Screen-space area in px² */
  screenArea: number
  style: Style
  datum: any
  group?: string
  interactive?: boolean
  /** Lazily-cached Path2D parsed from pathData (avoids re-parsing on every hit test) */
  _cachedPath2D?: Path2D
  _decayOpacity?: number
  _pulseIntensity?: number
  _pulseColor?: string
}

/** Union of all scene node types that GeoFrame produces */
export type GeoSceneNode =
  | GeoAreaSceneNode
  | PointSceneNode
  | LineSceneNode

// ── Scales ───────────────────────────────────────────────────────────

export interface GeoScales {
  projection: GeoProjection
  geoPath: GeoPath<any, GeoPermissibleObjects>
  projectedPoint: (lon: number, lat: number) => [number, number] | null
  invertedPoint: (px: number, py: number) => [number, number] | null
}

// ── Pipeline config ──────────────────────────────────────────────────

export interface GeoPipelineConfig {
  projection: ProjectionProp
  projectionExtent?: [[number, number], [number, number]]
  /** Padding fraction for auto-fit projection. 0.1 = 10% inset from edges. @default 0 */
  fitPadding?: number

  xAccessor?: string | ((d: any) => number)
  yAccessor?: string | ((d: any) => number)
  lineDataAccessor?: string | ((d: any) => any[])
  lineType?: "geo" | "line"
  /** Flow rendering style: "basic" (straight/great-circle), "offset" (bidirectional offset), "arc" (curved arcs) @default "basic" */
  flowStyle?: "basic" | "offset" | "arc"

  areaStyle?: Style | ((d: any) => Style)
  pointStyle?: (d: any) => Style & { r?: number }
  lineStyle?: Style | ((d: any, group?: string) => Style)
  colorScheme?: string | string[]

  graticule?: boolean | GraticuleConfig

  // Cartogram
  projectionTransform?: DistanceCartogramConfig

  // Realtime encodings
  decay?: DecayConfig
  pulse?: PulseConfig
  transition?: TransitionConfig

  // Annotations
  annotations?: Record<string, any>[]
  pointIdAccessor?: string | ((d: any) => string)
}

// ── Frame props ──────────────────────────────────────────────────────

export interface StreamGeoFrameProps<T = Record<string, any>> {
  // ── Projection ──
  projection: ProjectionProp
  projectionExtent?: [[number, number], [number, number]]
  /** Padding fraction for auto-fit projection. 0.1 = 10% inset from edges. @default 0 */
  fitPadding?: number

  // ── Data ──
  areas?: GeoJSON.Feature[]
  points?: T[]
  lines?: T[]

  // ── Accessors ──
  xAccessor?: string | ((d: T) => number)
  yAccessor?: string | ((d: T) => number)
  lineDataAccessor?: string | ((d: T) => any[])
  pointIdAccessor?: string | ((d: T) => string)

  // ── Geo-specific ──
  lineType?: "geo" | "line"
  /** Flow rendering style: "basic" (straight/great-circle), "offset" (bidirectional offset), "arc" (curved arcs) @default "basic" */
  flowStyle?: "basic" | "offset" | "arc"
  graticule?: boolean | GraticuleConfig
  zoomable?: boolean
  zoomExtent?: [number, number]
  onZoom?: (state: { projection: GeoProjection; zoom: number }) => void
  /**
   * When true, drag gestures rotate the projection (globe spinning)
   * instead of panning. Defaults to true for orthographic projection.
   * Scroll-wheel zoom still works normally.
   */
  dragRotate?: boolean
  projectionTransform?: DistanceCartogramConfig

  // ── Particles ──
  /** Show animated particles flowing along line paths */
  showParticles?: boolean
  /** Particle appearance and behavior config */
  particleStyle?: GeoParticleStyle

  // ── Tiles ──
  /** Raster tile URL template or function. Enables tile basemap (Mercator only). */
  tileURL?: string | ((z: number, x: number, y: number, dpr: number) => string)
  /** Attribution text for tile provider (e.g., "© OpenStreetMap contributors") */
  tileAttribution?: string
  /** Max cached tiles @default 256 */
  tileCacheSize?: number

  // ── Layout ──
  size?: [number, number]
  width?: number
  height?: number
  responsiveWidth?: boolean
  responsiveHeight?: boolean
  margin?: { top?: number; right?: number; bottom?: number; left?: number }
  className?: string
  background?: string
  runtimeMode?: "bounded" | "streaming"

  // ── Style ──
  areaStyle?: Style | ((d: any) => Style)
  pointStyle?: (d: any) => Style & { r?: number }
  lineStyle?: Style | ((d: any, group?: string) => Style)
  colorScheme?: string | string[]

  // ── Interaction ──
  enableHover?: boolean
  hoverAnnotation?: boolean | HoverAnnotationConfig
  tooltipContent?: (d: HoverData) => ReactNode
  customClickBehavior?: (d: HoverData | null) => void
  customHoverBehavior?: (d: HoverData | null) => void
  annotations?: Record<string, any>[]

  // ── Realtime encoding ──
  decay?: DecayConfig
  pulse?: PulseConfig
  transition?: TransitionConfig
  staleness?: StalenessConfig

  // ── Rendering ──
  backgroundGraphics?: ReactNode
  foregroundGraphics?: ReactNode
  title?: string | ReactNode

  // ── Legend (passed from HOCs) ──
  legend?: any
  legendPosition?: "right" | "left" | "top" | "bottom"
  legendHoverBehavior?: (item: { label: string } | null) => void
  legendClickBehavior?: (item: { label: string }) => void
  legendHighlightedCategory?: string | null
  legendIsolatedCategories?: Set<string>
  showAxes?: boolean

  // ── Accessibility ─────────────────────────────────
  /** Render a visually-hidden data table from the scene graph for screen readers */
  accessibleTable?: boolean
  /** Accessible description overriding the auto-generated aria-label on the chart container */
  description?: string
  /** Accessible summary rendered as a screen-reader-only note */
  summary?: string
}

export interface StreamGeoFrameHandle {
  push(datum: Record<string, any>): void
  pushMany(data: Record<string, any>[]): void
  /** Remove points by ID. Requires pointIdAccessor. */
  removePoint(id: string | string[]): Record<string, any>[]
  clear(): void
  getProjection(): GeoProjection | null
  getGeoPath(): GeoPath<any, GeoPermissibleObjects> | null
  /** Get cartogram layout info (center position, max cost, radius) */
  getCartogramLayout(): { cx: number; cy: number; maxCost: number; availableRadius: number } | null
  /** Get current zoom level (1 = default) */
  getZoom(): number
  /** Animate back to initial view */
  resetZoom(): void
  /** Get current data points */
  getData(): Record<string, any>[]
}
