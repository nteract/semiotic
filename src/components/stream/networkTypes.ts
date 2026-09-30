import type { ReactNode } from "react"
import type { HoverData } from "../realtime/types"
import type { Datum } from "../charts/shared/datumTypes"

type NetworkDatumComparator = { bivarianceHack(a: Datum, b: Datum): number }["bivarianceHack"]
type NetworkGroupComparator = (a: number, b: number) => number
import type { LegendLayout, LegendValue } from "../types/legendTypes"
import type { Style, DecayConfig, PulseConfig, TransitionConfig, StalenessConfig, ThemeSemanticColors, SceneRenderMode, FrameGraphicsProp } from "./types"
import type { AnimateProp } from "./pipelineTransitionUtils"
import type { StreamNetworkFrameHandle } from "./networkFrameHandleTypes"
import type { StreamNetworkInteractionProps } from "./networkInteractionTypes"
import type { NetworkViewportProps } from "./networkViewportTypes"
import type { AccessibleTableProp } from "./accessibleTableTypes"

/** Style-callback result, including `cursor` on legacy datum-shaped returns. */
export type NetworkMarkStyle = Style | (Datum & Pick<Style, "cursor">)

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
  /** @internal Hierarchy-layout metadata; consumers narrow to the plugin-specific shape. */
  __hierarchyNode?: unknown
  /** @internal Circle-pack layout radius. Set by `hierarchyLayoutPlugin`. */
  __radius?: number
  /** @internal Pre-resolved force-layout radius used by worker snapshots. */
  __forceRadius?: number
  /** @internal Chord-layout arc segment angles. */
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
  _prevCircularPathData?: CircularPathData
  _targetY0?: number
  _targetY1?: number
  _targetSankeyWidth?: number
  _targetCircularPathData?: CircularPathData
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
   * @internal Source/target arc spans set and read by `chordLayoutPlugin`.
   * Unknown avoids coupling shared network types to d3-chord; readers narrow it.
   */
  __chordData?: unknown
  /** @internal All positive input edges represented by the same chord ribbon. */
  __chordEdges?: RealtimeEdge[]
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

/** Raw edge row resolved with the frame's source/target/value accessors. */
export type EdgePush = Datum

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

  /** Optional scene paint backend. Exact node and edge geometry remains interactive. */
  renderMode?: SceneRenderMode<NetworkSceneNode | NetworkSceneEdge>
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

// ── Scene graph (see networkSceneTypes.ts) ───────────────────────────
export type {
  NetworkCircleNode,
  NetworkPerspectiveFace,
  NetworkRectNode,
  NetworkArcNode,
  NetworkSymbolNode,
  NetworkGlyphNode,
  NetworkLineEdge,
  NetworkBezierEdge,
  NetworkRibbonEdge,
  NetworkCurvedEdge,
  NetworkSceneNode,
  NetworkSceneEdge,
  NetworkLabel,
} from "./networkSceneTypes"
import type {
  NetworkSceneNode,
  NetworkSceneEdge,
  NetworkLabel,
} from "./networkSceneTypes"

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

  /** Frame-owned logical clock for ingest, live encodings, and transitions. */
  clock?: import("./FrameRuntime").FrameClock
  /** Frame-local random source used by synchronous force layout. */
  random?: import("./FrameRuntime").FrameRandom
  /** Serializable deterministic seed, including the force-worker protocol. */
  seed?: number

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
  edgeSort?: NetworkDatumComparator

  // ── Force layout ─────────────────────────────────
  iterations?: number
  forceStrength?: number
  /** @internal Skip simulation after worker-computed positions are applied. */
  __skipForceSimulation?: boolean

  // ── Chord layout ─────────────────────────────────
  padAngle?: number
  groupWidth?: number
  sortGroups?: NetworkGroupComparator

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
  nodeStyle?: (d: Datum) => NetworkMarkStyle
  edgeStyle?: (d: Datum) => NetworkMarkStyle
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

  /** Parallel projection applied after layout. See {@link StreamNetworkFrameProps.perspective}. */
  perspective?: import("./networkPerspective").NetworkPerspective

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

export interface StreamNetworkFrameProps<T = Datum>
  extends StreamNetworkInteractionProps<RealtimeNode, RealtimeEdge> {
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
  sortGroups?: NetworkGroupComparator
  edgeSort?: NetworkDatumComparator
  /** Optional scene paint backend. Exact node and edge geometry remains interactive. */
  renderMode?: SceneRenderMode<NetworkSceneNode | NetworkSceneEdge>
  /**
   * Parallel projection applied after layout: `"isometric"`, `"pixel"` (2:1),
   * `"dimetric"`, `"military"`, `"cabinet"`, or a config object with
   * elevation, extrusion, ground grid, regions and edge routing. Layout
   * coordinates are unchanged; point marks stay upright, areas and edges lie
   * on the projected ground, and hit testing, tooltips, keyboard focus,
   * annotations and SSR follow the projected marks. @default "flat"
   */
  perspective?: import("./networkPerspective").NetworkPerspective
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
  nodeStyle?: (d: Datum) => NetworkMarkStyle
  edgeStyle?: (d: Datum) => NetworkMarkStyle
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
  /** Maximum canvas backing-store DPR; large canvases also use the shared backing-store budget. */
  maxDevicePixelRatio?: number

  // ── Legend / title ───────────────────────────────
  legend?: LegendValue
  legendPosition?: "right" | "left" | "top" | "bottom"
  legendLayout?: LegendLayout
  legendHoverBehavior?: (item: { label: string } | null) => void
  legendClickBehavior?: (item: { label: string }) => void
  legendHighlightedCategory?: string | null
  legendIsolatedCategories?: Set<string>
  /** Internal push-mode category discovery accessor used by chart HOCs. */
  legendCategoryAccessor?: string | ((d: T) => string | number)
  /** Receives the current pushed-node category domain. */
  onCategoriesChange?: (categories: string[]) => void
  title?: string | ReactNode
  /** SVG above the canvas. Network layouts have no shared scale object, so callback `scales` is null. */
  foregroundGraphics?: FrameGraphicsProp<null>
  /** SVG behind the canvas. Network layouts have no shared scale object, so callback `scales` is null. */
  backgroundGraphics?: FrameGraphicsProp<null>

  // ── Realtime encoding ─────────────────────────────
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
  /** Monotonic wall-clock seam used to derive logical frame time. */
  clock?: import("./FrameRuntime").FrameClock
  /** Injectable random source for force layout and particles. */
  random?: import("./FrameRuntime").FrameRandom
  /** Serializable deterministic random seed. Ignored when `random` is supplied. */
  seed?: number
  /** Freeze logical animation time and cancel queued work while paused. */
  paused?: boolean
  /** Freeze logical animation time while the document is hidden. Defaults to true. */
  suspendWhenHidden?: boolean

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
  accessibleTable?: AccessibleTableProp
  /** Accessible description overriding the auto-generated aria-label on the chart container */
  description?: string
  /** Accessible summary rendered as a screen-reader-only note */
  summary?: string

  // ── customLayout escape hatch ────────────────────
  /** Scroll root for HTML marks and shared plot-coordinate viewport reports. */
  viewport?: NetworkViewportProps["viewport"]
  /** Optional plot camera; see semiotic/network/zoom for gestures and LOD. */
  viewTransform?: NetworkViewportProps["viewTransform"]
  /** HTML mark overscan, mounting switch, and off-screen pins. */
  htmlMarkCulling?: NetworkViewportProps["htmlMarkCulling"]
  /** Reports committed viewport geometry and visible/mounted mark IDs. */
  onViewportChange?: NetworkViewportProps["onViewportChange"]
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

export type { StreamNetworkFrameHandle } from "./networkFrameHandleTypes"

// ── Canvas renderer function type ───────────────────────────────────

export type NetworkRendererFn = (
  ctx: CanvasRenderingContext2D,
  nodes: NetworkSceneNode[],
  edges: NetworkSceneEdge[],
  size: [number, number]
) => void
