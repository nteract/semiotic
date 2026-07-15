import type { ReactNode } from "react"
import type { GeoProjection, GeoPath, GeoPermissibleObjects } from "d3-geo"
import type { GradientLegendConfig, LegendGroup, LegendLayout } from "../types/legendTypes"
import type {
  Style,
  DecayConfig,
  PulseConfig,
  TransitionConfig,
  StalenessConfig,
  SceneDatum,
  PointSceneNode,
  GlyphSceneNode,
  ThemeSemanticColors,
  SceneAccessibilityMetadata,
  SceneRenderMode
} from "./types"
import type { AnimateProp } from "./pipelineTransitionUtils"
import type {
  HoverAnnotationConfig,
  HoverData
} from "../realtime/types"
import type { GeoParticleStyle } from "./GeoParticlePool"
import type { Datum } from "../charts/shared/datumTypes"
import type { AutoPlaceAnnotations } from "../recipes/annotationLayout"
import type { MarginType } from "../types/marginType"
import type { GeoCustomLayout } from "./geoCustomLayout"
import type { CustomLayoutSelection } from "./customLayoutSelection"
import type { CustomLayoutFailureDiagnostic } from "./customLayoutFailure"
import type { OnObservationCallback } from "../store/ObservationStore"
import type {
  SemanticClickBehavior,
  SemanticHoverBehavior
} from "../charts/shared/semanticInteractions"
import type { OnAnnotationActivateCallback } from "../charts/shared/annotationActivation"

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
  centerAccessor?: string | ((d: Datum) => string)
  costAccessor: string | ((d: Datum) => number)
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
  datum: SceneDatum
  accessibleDatum?: SceneAccessibilityMetadata["accessibleDatum"]
  accessibility?: SceneAccessibilityMetadata["accessibility"]
  group?: string
  interactive?: boolean
  /** Lazily-cached Path2D parsed from pathData (avoids re-parsing on every hit test) */
  _cachedPath2D?: Path2D
  _decayOpacity?: number
  _pulseIntensity?: number
  _pulseColor?: string
}

export interface GeoLineSceneNode {
  type: "line"
  path: [number, number][]
  style: Style
  datum: SceneDatum
  accessibleDatum?: SceneAccessibilityMetadata["accessibleDatum"]
  accessibility?: SceneAccessibilityMetadata["accessibility"]
  group?: string
}

/** Union of all scene node types that GeoFrame produces. `GlyphSceneNode`
 *  joins for custom geo layouts — projected pictograms standing on the map. */
export type GeoSceneNode =
  | GeoAreaSceneNode
  | PointSceneNode
  | GlyphSceneNode
  | GeoLineSceneNode

// ── Scales ───────────────────────────────────────────────────────────

export interface GeoScales {
  projection: GeoProjection
  geoPath: GeoPath<void, GeoPermissibleObjects>
  projectedPoint: (lon: number, lat: number) => [number, number] | null
  invertedPoint: (px: number, py: number) => [number, number] | null
}

// ── Pipeline config ──────────────────────────────────────────────────

export interface GeoPipelineConfig {
  projection: ProjectionProp
  projectionExtent?: [[number, number], [number, number]]
  /**
   * Auto-fit padding as a **fraction** of the plot (0–0.5), not pixels.
   * `0.1` insets the fitted geography 10% from each edge. A value `>= 1` is
   * almost always a pixel mistake and collapses the projection off-canvas.
   * @default 0
   */
  fitPadding?: number

  xAccessor?: string | ((d: Datum) => number)
  yAccessor?: string | ((d: Datum) => number)
  lineDataAccessor?: string | ((d: Datum) => Datum[])
  lineType?: "geo" | "line"
  /** Flow rendering style: "basic" (straight/great-circle), "offset" (bidirectional offset), "arc" (curved arcs) @default "basic" */
  flowStyle?: "basic" | "offset" | "arc"

  areaStyle?: Style | ((d: GeoJSON.Feature) => Style)
  pointStyle?: (d: Datum) => Style & { r?: number }
  lineStyle?: Style | ((d: Datum, group?: string) => Style)
  colorScheme?: string | string[] | Record<string, string>
  /** Theme-resolved semantic role colors — default fallback before hardcoded hex. See `ThemeSemanticColors` in ./types. */
  themeSemantic?: ThemeSemanticColors
  /** Theme sequential scheme name — fallback for ChoroplethMap when colorScheme is not set. */
  themeSequential?: string
  /** Theme diverging scheme name — available for geo consumers that need midpoint encodings. */
  themeDiverging?: string

  graticule?: boolean | GraticuleConfig

  // Cartogram
  projectionTransform?: DistanceCartogramConfig

  // Realtime encodings
  /** Maximum retained points and lines after the store enters streaming mode. @default 500 */
  windowSize?: number
  /** Logical clock used for Geo pulse and transition work. */
  clock?: import("./FrameRuntime").FrameClock
  decay?: DecayConfig
  pulse?: PulseConfig
  transition?: TransitionConfig
  /** Whether to animate elements on first render */
  introAnimation?: boolean

  // Annotations
  annotations?: Datum[]
  autoPlaceAnnotations?: AutoPlaceAnnotations
  pointIdAccessor?: string | ((d: Datum) => string)
  /** ID accessor on line data — required for `removeLine` by id. */
  lineIdAccessor?: string | ((d: Datum) => string)

  // Custom layout
  customLayout?: GeoCustomLayout
  layoutConfig?: object
  layoutMargin?: MarginType
  layoutSelection?: CustomLayoutSelection | null
  /** Receives structured information if `customLayout` throws. */
  onLayoutError?: (diagnostic: CustomLayoutFailureDiagnostic) => void
  themeCategorical?: string[]
}

// ── Frame props ──────────────────────────────────────────────────────

export interface StreamGeoFrameProps<T = Datum> {
  // ── Projection ──
  projection: ProjectionProp
  projectionExtent?: [[number, number], [number, number]]
  /**
   * Auto-fit padding as a **fraction** of the plot (0–0.5), not pixels.
   * `0.1` insets the fitted geography 10% from each edge. A value `>= 1` is
   * almost always a pixel mistake and collapses the projection off-canvas.
   * @default 0
   */
  fitPadding?: number

  // ── Data ──
  areas?: GeoJSON.Feature[]
  points?: T[]
  lines?: T[]

  // ── Custom layout ──
  /** Replace built-in area/line/point scene construction with a custom layout. */
  customLayout?: GeoCustomLayout
  /** User configuration threaded to `GeoLayoutContext.config`. */
  layoutConfig?: object
  /** Shared-selection projection supplied by `GeoCustomChart`. */
  layoutSelection?: CustomLayoutSelection | null
  /** Receives structured information if `customLayout` throws. The prior
   *  successful scene remains visible when one is available. */
  onLayoutError?: (diagnostic: CustomLayoutFailureDiagnostic) => void

  // ── Accessors ──
  xAccessor?: string | ((d: T) => number)
  yAccessor?: string | ((d: T) => number)
  lineDataAccessor?: string | ((d: T) => Datum[])
  pointIdAccessor?: string | ((d: T) => string)
  /** ID accessor on line data — required for ref `removeLine` by id. */
  lineIdAccessor?: string | ((d: T) => string)

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
  /** Maximum retained points and lines after imperative streaming begins. @default 500 */
  windowSize?: number

  // ── Style ──
  /** Optional scene paint backend. Exact projected geometry remains interactive. */
  renderMode?: SceneRenderMode<GeoSceneNode>
  areaStyle?: Style | ((d: GeoJSON.Feature) => Style)
  pointStyle?: (d: Datum) => Style & { r?: number }
  lineStyle?: Style | ((d: Datum, group?: string) => Style)
  colorScheme?: string | string[] | Record<string, string>
  /**
   * Categorical color field. For ChoroplethMap reads from area `properties`
   * (or top-level fallback); for ProportionalSymbolMap reads from each point.
   * Server-side legend auto-build groups by this field when `showLegend` is
   * set and no explicit `legend` prop is provided. The function form accepts
   * either the point datum `T` or a GeoJSON Feature so choropleth callers can
   * write `(f) => f.properties.region` without a cast.
   */
  colorBy?: string | ((d: T | GeoJSON.Feature) => string)

  // ── Interaction ──
  enableHover?: boolean
  hoverAnnotation?: boolean | HoverAnnotationConfig
  tooltipContent?: (d: HoverData) => ReactNode
  /**
   * Allow chart-local tooltips to extend beyond the frame bounds.
   * Useful when a non-portal tooltip should overlap adjacent chart chrome.
   * @default false
   */
  allowTooltipOverflow?: boolean
  customClickBehavior?: SemanticClickBehavior<HoverData>
  customHoverBehavior?: SemanticHoverBehavior<HoverData>
  /** Structured interaction observations, including semantic focus/activate. */
  onObservation?: OnObservationCallback
  /** @internal HOC observation callback forwarded only to annotation widgets. */
  annotationObservationCallback?: OnObservationCallback
  /** Chart instance identifier included in observation events. */
  chartId?: string
  annotations?: Datum[]
  /** Observe activation of widget annotations without replacing widget behavior. */
  onAnnotationActivate?: OnAnnotationActivateCallback
  autoPlaceAnnotations?: AutoPlaceAnnotations

  // ── Realtime encoding ──
  decay?: DecayConfig
  pulse?: PulseConfig
  transition?: TransitionConfig
  /** Declarative animation: `true` for defaults (300ms ease-out), or config object.
   *  When enabled, charts animate on first render (intro) and on data change.
   *  Set `{ intro: false }` to disable the intro animation. */
  animate?: AnimateProp
  staleness?: StalenessConfig

  // ── Frame runtime policy ───────────────────────────
  /** Optional rAF seam for deterministic host scheduling. */
  frameScheduler?: import("./useFrame").FrameScheduler
  /** Monotonic wall-clock seam for deterministic replay, tests, or evidence capture. */
  clock?: import("./FrameRuntime").FrameClock
  /** Injectable random source for frame-local stochastic work. */
  random?: import("./FrameRuntime").FrameRandom
  /** Serializable deterministic random seed. Ignored when `random` is supplied. */
  seed?: number
  /** Freeze logical animation time and cancel queued work while paused. */
  paused?: boolean
  /** Freeze logical animation time while the page is hidden. Defaults to true for Geo frames. */
  suspendWhenHidden?: boolean

  // ── Rendering ──
  backgroundGraphics?: ReactNode
  foregroundGraphics?: ReactNode
  title?: string | ReactNode

  // ── Legend (passed from HOCs) ──
  legend?: ReactNode | { legendGroups: LegendGroup[] } | { gradient: GradientLegendConfig }
  legendPosition?: "right" | "left" | "top" | "bottom"
  legendLayout?: LegendLayout
  legendHoverBehavior?: (item: { label: string } | null) => void
  legendClickBehavior?: (item: { label: string }) => void
  legendHighlightedCategory?: string | null
  legendIsolatedCategories?: Set<string>
  /** Accessor used to report the current legend category domain in push mode. */
  legendCategoryAccessor?: string | ((d: T) => string)
  /** Fires when the current legend category domain changes after scene rebuilds. */
  onCategoriesChange?: (categories: string[]) => void
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
  push(datum: Datum): void
  pushMany(data: Datum[]): void
  /** Remove points by ID. Requires pointIdAccessor. */
  removePoint(id: string | string[]): Datum[]
  /** Append a single line/flow record. Coordinates pre-resolved per `lineDataAccessor`. */
  pushLine(line: Datum): void
  /** Append multiple line/flow records in one batch. */
  pushManyLines(lines: Datum[]): void
  /** Remove lines by ID. Requires `lineIdAccessor`. */
  removeLine(id: string | string[]): Datum[]
  /** Read the current line/flow set. */
  getLines(): Datum[]
  clear(): void
  getProjection(): GeoProjection | null
  getGeoPath(): GeoPath<void, GeoPermissibleObjects> | null
  /** Get cartogram layout info (center position, max cost, radius) */
  getCartogramLayout(): { cx: number; cy: number; maxCost: number; availableRadius: number } | null
  /** Get current zoom level (1 = default) */
  getZoom(): number
  /** Animate back to initial view */
  resetZoom(): void
  /** Get current data points */
  getData(): Datum[]
  /** The most recent custom layout result — host readback so pages that need
   *  the computed placement don't re-run the layout. Null before the first
   *  layout or when no custom layout is configured. A failed retry retains the
   *  prior good result; inspect `getLayoutFailure()` to distinguish recovery. */
  getCustomLayout(): import("./geoCustomLayout").GeoLayoutResult | null
  /** The most recent custom-layout failure, or null after a successful retry,
   *  clear, or explicit removal of `customLayout`. */
  getLayoutFailure(): CustomLayoutFailureDiagnostic | null
}
