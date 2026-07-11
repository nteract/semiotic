import type { ReactNode } from "react"
import type { OnObservationCallback } from "../store/ObservationStore"
import type { HoverData, AnnotationContext } from "../realtime/types"
import type { LegendGroup, LegendLayout } from "../types/legendTypes"
import type { Style, DecayConfig, PulseConfig, TransitionConfig, StalenessConfig, ThemeSemanticColors, SceneDatum, SceneAccessibilityMetadata } from "./types"
import type { AnimateProp } from "./pipelineTransitionUtils"
import type { Datum } from "../charts/shared/datumTypes"
import type { AutoPlaceAnnotations } from "../recipes/annotationLayout"
import type { NetworkSymbolName } from "./symbolPath"
import type { GlyphDef } from "./glyphDef"

// ── Tension configuration ──────────────────────────────────────────────

export interface TensionConfig {
  weightChange: number
  newEdge: number
  newNode: number
  threshold: number
  transitionDuration: number
}

export const DEFAULT_TENSION_CONFIG: TensionConfig = {
  weightChange: 0.1,
  newEdge: 0.5,
  newNode: 1.0,
  threshold: 3.0,
  transitionDuration: 500
}

// ── Graph topology types ───────────────────────────────────────────────

export interface RealtimeNode {
  id: string
  x0: number
  x1: number
  y0: number
  y1: number
  x: number
  y: number
  width: number
  height: number
  _prevX0?: number
  _prevX1?: number
  _prevY0?: number
  _prevY1?: number
  _targetX0?: number
  _targetX1?: number
  _targetY0?: number
  _targetY1?: number
  value: number
  depth?: number
  data?: Datum
  createdByFrame?: boolean
  sourceLinks?: RealtimeEdge[]
  targetLinks?: RealtimeEdge[]
  _pulseIntensity?: number
  _pulseColor?: string
  _pulseGlowRadius?: number
  /**
   * @internal Hierarchy-layout-only extension fields. Set by
   * `hierarchyLayoutPlugin` / `orbitLayoutPlugin` during layout and
   * read by `hierarchySceneBuilders`. Typed `unknown` because the d3
   * `HierarchyNode` shape is layout-specific (rectangular, circular,
   * point) — consumers narrow with the structural fields they need.
   */
  __hierarchyNode?: unknown
  /** @internal Circle-pack layout radius. Set by `hierarchyLayoutPlugin`. */
  __radius?: number
  /** @internal Pre-resolved force-layout radius used by worker snapshots. */
  __forceRadius?: number
  /**
   * @internal Chord-layout extension. Carries the start/end angles
   * for the arc segment representing this node, computed by
   * `chordLayoutPlugin` and read by its `buildScene`. Concretely
   * typed (unlike `__hierarchyNode`) because chord is the only
   * layout that writes this field, so the shape is fixed — no
   * narrowing-at-read needed. `__` prefix matches the convention
   * used by `__hierarchyNode` / `__radius` on this same interface.
   */
  __arcData?: { startAngle: number; endAngle: number }
}

export interface RealtimeEdge {
  source: RealtimeNode | string
  target: RealtimeNode | string
  value: number
  y0: number
  y1: number
  sankeyWidth: number
  _prevY0?: number
  _prevY1?: number
  _prevSankeyWidth?: number
  _targetY0?: number
  _targetY1?: number
  _targetSankeyWidth?: number
  /** Set during intro animation to allow edge interpolation from width 0 */
  _introFromZero?: boolean
  direction?: string
  circular?: boolean
  circularPathData?: CircularPathData
  bezier?: BezierCache
  data?: Datum
  /** Unique key for this edge (supports parallel edges between same node pair) */
  _edgeKey?: string
  _pulseIntensity?: number
  _pulseColor?: string
  _pulseGlowRadius?: number
  /** @internal Circular sankey layout fields */
  _circularWidth?: number
  _circularStub?: boolean
  /**
   * @internal Chord-layout extension. Carries the d3-chord-generated
   * source/target arc spans for this edge, set by `chordLayoutPlugin`
   * during `computeLayout` and read by its `buildScene`. Typed
   * `unknown` because the d3 `Chord` interface lives in `d3-chord`
   * and importing the type here would couple `networkTypes` to that
   * dep — consumers narrow at the read site. `__` prefix matches the
   * `_circularWidth` / `_circularStub` internal-field convention on
   * this same interface.
   */
  __chordData?: unknown
}

// ── Bezier cache ───────────────────────────────────────────────────────

export interface BezierPoint {
  x: number
  y: number
}

export interface BezierCache {
  circular: boolean
  points?: [BezierPoint, BezierPoint, BezierPoint, BezierPoint]
  segments?: Array<[BezierPoint, BezierPoint, BezierPoint, BezierPoint]>
  halfWidth: number
}

export interface CircularPathData {
  sourceX: number
  targetX: number
  sourceY: number
  targetY: number
  rightFullExtent: number
  leftFullExtent: number
  verticalFullExtent: number
  rightInnerExtent: number
  leftInnerExtent: number
  verticalRightInnerExtent: number
  verticalLeftInnerExtent: number
  rightSmallArcRadius: number
  rightLargeArcRadius: number
  leftSmallArcRadius: number
  leftLargeArcRadius: number
  sourceWidth: number
  rightNodeBuffer: number
  leftNodeBuffer: number
  arcRadius: number
}

// ── Particle system ────────────────────────────────────────────────────

export interface Particle {
  t: number
  offset: number
  edgeIndex: number
  active: boolean
  x: number
  y: number
}

export interface ParticleStyle {
  radius?: number
  color?: string | ((edge: RealtimeEdge, node: RealtimeNode) => string)
  /** Color particles by source or target node (default: "source") */
  colorBy?: "source" | "target"
  opacity?: number
  speedMultiplier?: number
  maxPerEdge?: number
  spawnRate?: number
  /** Scale particle speed proportional to edge value (higher value = faster). Default: false */
  proportionalSpeed?: boolean
}

export const DEFAULT_PARTICLE_STYLE: Required<
  Pick<ParticleStyle, "radius" | "opacity" | "speedMultiplier" | "maxPerEdge" | "spawnRate">
> = {
  radius: 3,
  opacity: 0.7,
  speedMultiplier: 1,
  maxPerEdge: 50,
  spawnRate: 0.1
}

// ── Push API ───────────────────────────────────────────────────────────

export interface EdgePush {
  source: string
  target: string
  value: number
}

// ── Re-export HoverData ────────────────────────────────────────────────

export type { HoverData }

// ── Backwards-compat aliases for old RealtimeNetworkFrame types ────────

export type RealtimeNetworkFrameHandle = StreamNetworkFrameHandle

export interface RealtimeNetworkFrameProps {
  initialEdges?: EdgePush[]
  size?: [number, number]
  margin?: { top?: number; right?: number; bottom?: number; left?: number }
  orientation?: "horizontal" | "vertical"
  nodeAlign?: "justify" | "left" | "right" | "center"
  nodePaddingRatio?: number
  nodeWidth?: number
  tensionConfig?: Partial<TensionConfig>
  showParticles?: boolean
  particleStyle?: ParticleStyle
  colorBy?: string | ((d: RealtimeNode) => string)
  colorScheme?: string | string[] | Record<string, string>
  edgeColorBy?: "source" | "target" | ((d: RealtimeEdge) => string)
  edgeOpacity?: number
  nodeLabel?: string | ((d: RealtimeNode) => string)
  showLabels?: boolean
  enableHover?: boolean
  tooltipContent?: (d: { type: "node" | "edge"; data: Datum | null }) => ReactNode
  onTopologyChange?: (nodes: RealtimeNode[], edges: RealtimeEdge[]) => void
  background?: string
  className?: string
}


// ── Chart types ────────────────────────────────────────────────────────

export type NetworkChartType =
  | "force"
  | "sankey"
  | "chord"
  | "tree"
  | "cluster"
  | "treemap"
  | "circlepack"
  | "orbit"
  | "partition"

// ── Scene graph nodes ─────────────────────────────────────────────────

/** Circle node — used by force, tree, cluster, circlepack */
export interface NetworkCircleNode {
  type: "circle"
  cx: number
  cy: number
  r: number
  style: Style
  datum: SceneDatum
  accessibleDatum?: SceneAccessibilityMetadata["accessibleDatum"]
  accessibility?: SceneAccessibilityMetadata["accessibility"]
  id?: string
  label?: string
  depth?: number
  _pulseIntensity?: number
  _pulseColor?: string
  _pulseGlowRadius?: number
}

/** Rect node — used by sankey, treemap, partition */
export interface NetworkRectNode {
  type: "rect"
  x: number
  y: number
  w: number
  h: number
  style: Style
  datum: SceneDatum
  accessibleDatum?: SceneAccessibilityMetadata["accessibleDatum"]
  accessibility?: SceneAccessibilityMetadata["accessibility"]
  id?: string
  label?: string
  depth?: number
  _pulseIntensity?: number
  _pulseColor?: string
  _pulseGlowRadius?: number
}

/** Arc node — used by chord */
/** Arc node — used by chord. Angles in canvas convention (0 = 3 o'clock). */
export interface NetworkArcNode {
  type: "arc"
  cx: number
  cy: number
  innerR: number
  outerR: number
  /** Start angle in radians, canvas convention (0 = 3 o'clock, positive = clockwise) */
  startAngle: number
  /** End angle in radians, canvas convention */
  endAngle: number
  style: Style
  datum: SceneDatum
  accessibleDatum?: SceneAccessibilityMetadata["accessibleDatum"]
  accessibility?: SceneAccessibilityMetadata["accessibility"]
  id?: string
  label?: string
  _pulseIntensity?: number
  _pulseColor?: string
  _pulseGlowRadius?: number
}

/**
 * Symbol node — a glyph rendered from a `d3-shape` symbol path (or a custom
 * path). The per-datum shape channel: recipes that encode a categorical field
 * as marker shape (e.g. `packedClusterMatrix`) emit these. Hit-tests as a
 * circle of the symbol's effective radius; renders on canvas and in SVG/SSR.
 */
export interface NetworkSymbolNode {
  type: "symbol"
  cx: number
  cy: number
  /** d3-symbol area in px² — drives the glyph's drawn size. */
  size: number
  /** Named shape. Ignored when `path` is set. @default "circle" */
  symbolType?: NetworkSymbolName
  /** Pre-built SVG path string, origin-centered — overrides `symbolType`. */
  path?: string
  /** Rotation in radians about (cx, cy). */
  rotation?: number
  style: Style
  datum: SceneDatum
  accessibleDatum?: SceneAccessibilityMetadata["accessibleDatum"]
  accessibility?: SceneAccessibilityMetadata["accessibility"]
  id?: string
  label?: string
  depth?: number
  _pulseIntensity?: number
  _pulseColor?: string
  _pulseGlowRadius?: number
}

/**
 * Glyph node — the composite-pictogram channel for network scenes: a
 * multi-part `GlyphDef` stamped at (cx, cy) with per-node `color`/`accent`
 * paints and optional partial fill. The network sibling of the XY/ordinal/geo
 * `GlyphSceneNode`.
 */
export interface NetworkGlyphNode {
  type: "glyph"
  cx: number
  cy: number
  /** Rendered height in px — width follows the definition's viewBox aspect. */
  size: number
  /** The multi-part pictogram definition to stamp. */
  glyph: GlyphDef
  /** Primary paint for parts declaring `"color"`. Falls back to `style.fill`. */
  color?: string
  /** Accent paint for parts declaring `"accent"`. */
  accent?: string
  /** Partial fill 0–1. @default 1 */
  fraction?: number
  /** Where the partial fill begins, 0–1. @default 0 */
  fractionStart?: number
  /** Partial-fill axis. @default "horizontal" */
  fractionDirection?: "horizontal" | "vertical"
  /** Ghost paint drawn at full extent beneath a partial fill. */
  ghostColor?: string
  /** Rotation in radians about (cx, cy). */
  rotation?: number
  style: Style
  datum: SceneDatum
  accessibleDatum?: SceneAccessibilityMetadata["accessibleDatum"]
  accessibility?: SceneAccessibilityMetadata["accessibility"]
  id?: string
  label?: string
  depth?: number
  _pulseIntensity?: number
  _pulseColor?: string
  _pulseGlowRadius?: number
}

/** Line edge — used by force */
export interface NetworkLineEdge {
  type: "line"
  x1: number
  y1: number
  x2: number
  y2: number
  style: Style
  datum: SceneDatum
  _pulseIntensity?: number
  _pulseColor?: string
}

/** Bezier band edge — used by sankey */
export interface NetworkBezierEdge {
  type: "bezier"
  pathD: string
  /** When false, the hit tester skips this edge. Used for
   *  decorative scene-edges like ProcessSankey's gradient stubs —
   *  they paint visually but shouldn't intercept hover. */
  interactive?: boolean
  bezierCache?: BezierCache
  style: Style
  datum: SceneDatum
  /** Internal gradient used by circular sankey stub bands. */
  _gradient?: { x0: number; x1: number; from: number; to: number }
  _pulseIntensity?: number
  _pulseColor?: string
  /** Lazily-built Path2D for hit testing; invalidated when pathD changes. */
  _cachedPath2D?: Path2D
  _cachedPath2DSource?: string
}

/** Ribbon edge — used by chord */
export interface NetworkRibbonEdge {
  type: "ribbon"
  pathD: string
  style: Style
  datum: SceneDatum
  _pulseIntensity?: number
  _pulseColor?: string
  _cachedPath2D?: Path2D
  _cachedPath2DSource?: string
}

/** Curved edge — used by tree, cluster */
export interface NetworkCurvedEdge {
  type: "curved"
  pathD: string
  style: Style
  datum: SceneDatum
  _pulseIntensity?: number
  _pulseColor?: string
  _cachedPath2D?: Path2D
  _cachedPath2DSource?: string
}

export type NetworkSceneNode =
  | NetworkCircleNode
  | NetworkRectNode
  | NetworkArcNode
  | NetworkSymbolNode
  | NetworkGlyphNode

export type NetworkSceneEdge =
  | NetworkLineEdge
  | NetworkBezierEdge
  | NetworkRibbonEdge
  | NetworkCurvedEdge

/** Label data for the SVG overlay */
export interface NetworkLabel {
  x: number
  y: number
  text: string
  anchor?: "start" | "middle" | "end"
  baseline?: string
  fontSize?: number
  fontWeight?: number | string
  fill?: string
  stroke?: string
  strokeWidth?: number
  paintOrder?: string
}

// ── Layout plugin interface ───────────────────────────────────────────

export interface NetworkLayoutPlugin {
  /**
   * Run the layout algorithm. May mutate node/edge positions directly.
   * For bounded data, called once. For streaming, called on topology changes.
   */
  computeLayout(
    nodes: RealtimeNode[],
    edges: RealtimeEdge[],
    config: NetworkPipelineConfig,
    size: [number, number]
  ): void

  /**
   * Build scene nodes + labels from the positioned node/edge data.
   */
  buildScene(
    nodes: RealtimeNode[],
    edges: RealtimeEdge[],
    config: NetworkPipelineConfig,
    size: [number, number]
  ): {
    sceneNodes: NetworkSceneNode[]
    sceneEdges: NetworkSceneEdge[]
    labels: NetworkLabel[]
  }

  /** Whether this layout supports incremental streaming updates */
  supportsStreaming: boolean

  /** Whether this layout uses hierarchical (tree) input instead of nodes+edges */
  hierarchical: boolean

  /**
   * Whether this layout drives continuous animation (e.g. orbiting nodes).
   * When true, StreamNetworkFrame keeps its RAF loop alive and calls `tick()` each frame.
   */
  supportsAnimation?: boolean

  /**
   * Advance one animation frame. Called by StreamNetworkFrame on each RAF tick
   * when `supportsAnimation` is true. Should mutate node positions in-place.
   * Returns true if the scene needs a rebuild (always true for orbit animation).
   */
  tick?: (
    nodes: RealtimeNode[],
    edges: RealtimeEdge[],
    config: NetworkPipelineConfig,
    size: [number, number],
    deltaTime: number
  ) => boolean
}

// ── Threshold alerting ────────────────────────────────────────────────

/** Threshold alerting configuration for streaming network nodes */
export interface ThresholdAlertConfig {
  /** Function that extracts the metric value from a node for threshold comparison */
  metric: (node: RealtimeNode) => number
  /** Warning threshold — node enters "warning" state when metric >= this value */
  warning?: number
  /** Critical threshold — node enters "critical" state when metric >= this value */
  critical?: number
  /** Colors for threshold states */
  warningColor?: string
  criticalColor?: string
  /** Whether to pulse nodes that cross a threshold. Default: true */
  pulse?: boolean
}

// ── Pipeline config ──────────────────────────────────────────────────

export interface NetworkPipelineConfig {
  chartType: NetworkChartType

  // ── Accessors ────────────────────────────────────
  nodeIDAccessor?: string | ((d: Datum) => string)
  sourceAccessor?: string | ((d: Datum) => string)
  targetAccessor?: string | ((d: Datum) => string)
  valueAccessor?: string | ((d: Datum) => number)
  /** Edge ID accessor for removeEdge(edgeId) — enables single-ID edge removal */
  edgeIdAccessor?: string | ((d: Datum) => string)

  // ── Hierarchy (tree/treemap/circlepack) ──────────
  childrenAccessor?: string | ((d: Datum) => Datum[])
  hierarchySum?: string | ((d: Datum) => number)

  // ── Sankey layout ────────────────────────────────
  orientation?: "horizontal" | "vertical"
  nodeAlign?: "justify" | "left" | "right" | "center"
  nodePaddingRatio?: number
  nodeWidth?: number
  edgeSort?: (a: unknown, b: unknown) => number

  // ── Force layout ─────────────────────────────────
  iterations?: number
  forceStrength?: number
  /** @internal Skip simulation after worker-computed positions are applied. */
  __skipForceSimulation?: boolean

  // ── Chord layout ─────────────────────────────────
  padAngle?: number
  groupWidth?: number
  sortGroups?: (a: unknown, b: unknown) => number

  // ── Tree/hierarchy layout ────────────────────────
  treeOrientation?: "vertical" | "horizontal" | "radial"
  edgeType?: "line" | "curve"
  padding?: number
  paddingTop?: number

  // ── Tension (streaming sankey) ───────────────────
  tensionConfig?: TensionConfig

  // ── Particles (sankey) ───────────────────────────
  showParticles?: boolean
  particleStyle?: ParticleStyle

  // ── Style functions ──────────────────────────────
  nodeStyle?: (d: Datum) => Datum
  edgeStyle?: (d: Datum) => Datum
  nodeLabel?: string | ((d: Datum) => string)
  showLabels?: boolean
  labelMode?: "leaf" | "parent" | "all"

  // ── Color ────────────────────────────────────────
  colorBy?: string | ((d: Datum) => string | number)
  colorScheme?: string | string[] | Record<string, string>
  /** Theme categorical palette — used as fallback when colorScheme is not an explicit array */
  themeCategorical?: string[]
  /** Theme-resolved semantic role colors — default fallback before hardcoded hex. See `ThemeSemanticColors` in ./types. */
  themeSemantic?: ThemeSemanticColors
  edgeColorBy?: "source" | "target" | "gradient" | ((d: Datum) => string)
  edgeOpacity?: number
  colorByDepth?: boolean
  nodeSize?: number | string | ((d: Datum) => number)
  nodeSizeRange?: [number, number]

  // ── Realtime encoding ─────────────────────────────
  decay?: DecayConfig
  pulse?: PulseConfig
  transition?: TransitionConfig
  /** Whether to animate elements on first render (nodes scale up, edges fade in) */
  introAnimation?: boolean
  staleness?: StalenessConfig

  // ── Threshold alerting ────────────────────────────
  thresholds?: ThresholdAlertConfig

  // ── Orbit layout ──────────────────────────────────
  /** Ring arrangement mode: "flat" (all children in one ring), "solar" (one per ring),
   *  "atomic" ([2,8] electron shell), or custom capacities. @default "flat" */
  orbitMode?: "flat" | "solar" | "atomic" | number[]
  /** Ring size divisor per depth. Larger = tighter orbits. @default 2.95 */
  orbitSize?: number | ((node: Datum) => number)
  /** Orbit speed multiplier (higher = faster rotation). @default 0.25 */
  orbitSpeed?: number
  /** Per-node speed modifier. @default (node) => 1 / (node.depth + 1) */
  orbitRevolution?: (node: Datum) => number
  /**
   * Built-in revolution style presets:
   * - "locked": children rotate with parent at decreasing speed (default)
   * - "decay": each depth level progressively slower, independent of parent
   * - "alternate": odd-depth rings reverse direction
   * Ignored when `orbitRevolution` is provided.
   * @default "locked"
   */
  orbitRevolutionStyle?: "locked" | "decay" | "alternate"
  /** Vertical squash for elliptical orbits. 1 = circle. @default 1 */
  orbitEccentricity?: number | ((node: Datum) => number)
  /** Show orbital ring ellipses as foreground graphics. @default true */
  orbitShowRings?: boolean
  /** Enable orbit animation. @default true */
  orbitAnimated?: boolean

  // ── Internal plugin state (managed by layout plugins) ──────────
  /** @internal Hierarchy root stashed for tree/treemap/circlepack plugins */
  __hierarchyRoot?: unknown
  /** @internal Orbit animation state preserved across config updates */
  __orbitState?: unknown
  /** @internal Previous node positions for warm-start force layout */
  __previousPositions?: Map<string, { x: number; y: number }>

  // ── customLayout escape hatch ────────────────────
  /** When provided, replaces both layout dispatch and scene building.
   *  Receives raw nodes/edges and returns positioned scene primitives. */
  customNetworkLayout?: import("./networkCustomLayout").NetworkCustomLayout
  /** Called when `customNetworkLayout` throws. */
  onLayoutError?: (
    diagnostic: import("./customLayoutFailure").CustomLayoutFailureDiagnostic
  ) => void
  /** User-supplied config blob threaded through to NetworkLayoutContext.config. */
  layoutConfig?: object
  /** Resolved shared-selection predicate, surfaced to a custom layout as
   *  `NetworkLayoutContext.selection`. Render-only — deliberately kept out of
   *  the layout/ingest-affecting signature so a selection change re-runs
   *  `buildScene` (re-emitting dimmed marks) without a re-ingest or re-layout. */
  layoutSelection?: import("./networkCustomLayout").NetworkLayoutSelection | null
}

// ── Component props ─────────────────────────────────────────────────

export interface StreamNetworkFrameProps<T = Datum> {
  // ── Chart type ───────────────────────────────────
  chartType: NetworkChartType

  // ── Data (bounded mode: nodes+edges or hierarchy root) ──
  nodes?: T[]
  edges?: T[] | T  // array for graph data, single object for hierarchy
  /** Hierarchy root (alias for edges when using tree/treemap/circlepack) */
  data?: T

  // ── Initial edges for streaming ──────────────────
  initialEdges?: EdgePush[]

  // ── Accessors ────────────────────────────────────
  nodeIDAccessor?: string | ((d: T) => string)
  sourceAccessor?: string | ((d: T) => string)
  targetAccessor?: string | ((d: T) => string)
  valueAccessor?: string | ((d: T) => number)
  /** Edge ID accessor for removeEdge(edgeId) single-ID removal */
  edgeIdAccessor?: string | ((d: Datum) => string)

  // ── Hierarchy ────────────────────────────────────
  childrenAccessor?: string | ((d: T) => T[])
  hierarchySum?: string | ((d: T) => number)

  // ── Layout config ────────────────────────────────
  orientation?: "horizontal" | "vertical"
  nodeAlign?: "justify" | "left" | "right" | "center"
  nodePaddingRatio?: number
  nodeWidth?: number
  iterations?: number
  forceStrength?: number
  /** Execute force layout synchronously, in a worker, or choose by graph cost. */
  layoutExecution?: "auto" | "worker" | "sync"
  /** Content displayed while an internally-managed worker layout is pending. */
  layoutLoadingContent?: ReactNode | false
  /** Receives internally-managed force-layout lifecycle changes. */
  onLayoutStateChange?: (state: "pending" | "ready" | "error") => void
  padAngle?: number
  groupWidth?: number
  sortGroups?: (a: unknown, b: unknown) => number
  edgeSort?: (a: unknown, b: unknown) => number
  treeOrientation?: "vertical" | "horizontal" | "radial"
  edgeType?: "line" | "curve"
  padding?: number
  paddingTop?: number

  // ── Tension (streaming) ──────────────────────────
  tensionConfig?: Partial<TensionConfig>

  // ── Particles (sankey) ───────────────────────────
  showParticles?: boolean
  particleStyle?: ParticleStyle

  // ── Style ────────────────────────────────────────
  nodeStyle?: (d: Datum) => Datum
  edgeStyle?: (d: Datum) => Datum
  colorBy?: string | ((d: Datum) => string | number)
  colorScheme?: string | string[] | Record<string, string>
  edgeColorBy?: "source" | "target" | "gradient" | ((d: Datum) => string)
  edgeOpacity?: number
  colorByDepth?: boolean
  nodeSize?: number | string | ((d: Datum) => number)
  nodeSizeRange?: [number, number]

  // ── Labels ───────────────────────────────────────
  nodeLabel?: string | ((d: Datum) => string)
  showLabels?: boolean
  labelMode?: "leaf" | "parent" | "all"

  // ── Layout ───────────────────────────────────────
  size?: [number, number]
  responsiveWidth?: boolean
  responsiveHeight?: boolean
  margin?: { top?: number; right?: number; bottom?: number; left?: number }
  className?: string
  background?: string

  // ── Interaction ──────────────────────────────────
  enableHover?: boolean
  tooltipContent?: (d: HoverData) => ReactNode
  customHoverBehavior?: (d: HoverData | null) => void
  customClickBehavior?: (d: HoverData | null) => void
  /** Observation callback — emits hover/click events to the ObservationStore and this callback */
  onObservation?: OnObservationCallback
  /** Chart instance identifier for observation filtering */
  chartId?: string
  onTopologyChange?: (nodes: RealtimeNode[], edges: RealtimeEdge[]) => void

  // ── Annotations ──────────────────────────────────
  annotations?: Datum[]
  autoPlaceAnnotations?: AutoPlaceAnnotations
  svgAnnotationRules?: (
    annotation: Datum,
    index: number,
    context: AnnotationContext
  ) => ReactNode

  // ── Legend / title ───────────────────────────────
  legend?: ReactNode | { legendGroups: LegendGroup[] }
  legendPosition?: "right" | "left" | "top" | "bottom"
  legendLayout?: LegendLayout
  legendHoverBehavior?: (item: { label: string } | null) => void
  legendClickBehavior?: (item: { label: string }) => void
  legendHighlightedCategory?: string | null
  legendIsolatedCategories?: Set<string>
  title?: string | ReactNode
  foregroundGraphics?: ReactNode
  backgroundGraphics?: ReactNode

  // ── Realtime encoding ─────────────────────────────
  decay?: DecayConfig
  pulse?: PulseConfig
  transition?: TransitionConfig
  /** Declarative animation: `true` for defaults (300ms ease-out), or config object.
   *  When enabled, charts animate on first render (intro) and on data change.
   *  Set `{ intro: false }` to disable the intro animation. */
  animate?: AnimateProp
  staleness?: StalenessConfig

  // ── Threshold alerting ────────────────────────────
  thresholds?: ThresholdAlertConfig

  // ── Orbit layout ────────────────────────────────────
  orbitMode?: "flat" | "solar" | "atomic" | number[]
  orbitSize?: number | ((node: Datum) => number)
  orbitSpeed?: number
  orbitRevolution?: (node: Datum) => number
  orbitRevolutionStyle?: "locked" | "decay" | "alternate"
  orbitEccentricity?: number | ((node: Datum) => number)
  orbitShowRings?: boolean
  orbitAnimated?: boolean

  // ── Accessibility ─────────────────────────────────
  /** Render a visually-hidden data table from the scene graph for screen readers */
  accessibleTable?: boolean
  /** Accessible description overriding the auto-generated aria-label on the chart container */
  description?: string
  /** Accessible summary rendered as a screen-reader-only note */
  summary?: string

  // ── customLayout escape hatch ────────────────────
  /** Replaces network layout + scene dispatch with a user-supplied function.
   *  Receives raw nodes/edges + dimensions/theme, returns positioned scene
   *  primitives. See `semiotic/recipes` for reference layouts (flextree, dagre). */
  customNetworkLayout?: import("./networkCustomLayout").NetworkCustomLayout
  /** Called when `customNetworkLayout` throws. */
  onLayoutError?: (
    diagnostic: import("./customLayoutFailure").CustomLayoutFailureDiagnostic
  ) => void
  /** User-supplied config blob threaded through to NetworkLayoutContext.config. */
  layoutConfig?: object
  /** Resolved shared-selection predicate, surfaced to a custom layout as
   *  `NetworkLayoutContext.selection`. Set by `NetworkCustomChart` from its
   *  `selection` / `linkedHover` wiring; render-only (no re-ingest on change). */
  layoutSelection?: import("./networkCustomLayout").NetworkLayoutSelection | null
}

// ── Ref handle ──────────────────────────────────────────────────────

export interface StreamNetworkFrameHandle {
  push(edge: EdgePush): void
  pushMany(edges: EdgePush[]): void
  /** Remove a node by ID. Also removes connected edges. */
  removeNode(id: string): boolean
  /** Remove edges by source+target, or by edge ID when edgeIdAccessor is configured. */
  removeEdge(sourceIdOrEdgeId: string, targetId?: string): boolean
  /** Update a node's data by ID. Returns previous data. */
  updateNode(id: string, updater: (data: Datum) => Datum): Datum | null
  /** Update all edges between source+target. Returns array of previous data. */
  updateEdge(sourceId: string, targetId: string, updater: (data: Datum) => Datum): Datum[]
  clear(): void
  getTopology(): { nodes: RealtimeNode[]; edges: RealtimeEdge[] }
  getTopologyDiff(): { addedNodes: string[]; removedNodes: string[]; addedEdges: string[]; removedEdges: string[] }
  relayout(): void
  getTension(): number
  /** The most recent custom layout result (sceneNodes/sceneEdges/overlays as
   *  returned by `customNetworkLayout`) — host readback so pages that need the
   *  computed placement don't re-run the layout. Null before the first layout
   *  or when no custom layout is configured. A failed retry retains the prior
   *  good result; inspect `getLayoutFailure()` to distinguish recovery. */
  getCustomLayout(): import("./networkCustomLayout").NetworkLayoutResult | null
  /** The latest custom-layout failure, if any. Cleared by a successful layout,
   * removing the custom layout, or `clear()`. */
  getLayoutFailure(): import("./customLayoutFailure").CustomLayoutFailureDiagnostic | null
}

// ── Canvas renderer function type ───────────────────────────────────

export type NetworkRendererFn = (
  ctx: CanvasRenderingContext2D,
  nodes: NetworkSceneNode[],
  edges: NetworkSceneEdge[],
  size: [number, number]
) => void
