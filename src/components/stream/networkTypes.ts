import type { ReactNode } from "react"
import type {
  TensionConfig,
  RealtimeNode,
  RealtimeEdge,
  EdgePush,
  BezierCache,
  BezierPoint,
  Particle,
  ParticleStyle,
  RealtimeNetworkFrameHandle
} from "../realtime-network/types"
import type { HoverData, AnnotationContext } from "../realtime/types"
import type { LegendGroup } from "../types/legendTypes"
import type { Style } from "./types"

// ── Re-export realtime-network types we reuse directly ───────────────────

export type {
  TensionConfig,
  RealtimeNode,
  RealtimeEdge,
  EdgePush,
  BezierCache,
  BezierPoint,
  Particle,
  ParticleStyle,
  HoverData
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
  | "partition"

// ── Scene graph nodes ─────────────────────────────────────────────────

/** Circle node — used by force, tree, cluster, circlepack */
export interface NetworkCircleNode {
  type: "circle"
  cx: number
  cy: number
  r: number
  style: Style
  datum: any
  id?: string
  label?: string
  depth?: number
}

/** Rect node — used by sankey, treemap, partition */
export interface NetworkRectNode {
  type: "rect"
  x: number
  y: number
  w: number
  h: number
  style: Style
  datum: any
  id?: string
  label?: string
  depth?: number
}

/** Arc node — used by chord */
export interface NetworkArcNode {
  type: "arc"
  cx: number
  cy: number
  innerR: number
  outerR: number
  startAngle: number
  endAngle: number
  style: Style
  datum: any
  id?: string
  label?: string
}

/** Line edge — used by force */
export interface NetworkLineEdge {
  type: "line"
  x1: number
  y1: number
  x2: number
  y2: number
  style: Style
  datum: any
}

/** Bezier band edge — used by sankey */
export interface NetworkBezierEdge {
  type: "bezier"
  pathD: string
  bezierCache?: BezierCache
  style: Style
  datum: any
}

/** Ribbon edge — used by chord */
export interface NetworkRibbonEdge {
  type: "ribbon"
  pathD: string
  style: Style
  datum: any
}

/** Curved edge — used by tree, cluster */
export interface NetworkCurvedEdge {
  type: "curved"
  pathD: string
  style: Style
  datum: any
}

export type NetworkSceneNode =
  | NetworkCircleNode
  | NetworkRectNode
  | NetworkArcNode

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
}

// ── Pipeline config ──────────────────────────────────────────────────

export interface NetworkPipelineConfig {
  chartType: NetworkChartType

  // ── Accessors ────────────────────────────────────
  nodeIDAccessor?: string | ((d: any) => string)
  sourceAccessor?: string | ((d: any) => string)
  targetAccessor?: string | ((d: any) => string)
  valueAccessor?: string | ((d: any) => number)

  // ── Hierarchy (tree/treemap/circlepack) ──────────
  childrenAccessor?: string | ((d: any) => any[])
  hierarchySum?: (d: any) => number

  // ── Sankey layout ────────────────────────────────
  orientation?: "horizontal" | "vertical"
  nodeAlign?: "justify" | "left" | "right" | "center"
  nodePaddingRatio?: number
  nodeWidth?: number
  edgeSort?: (a: any, b: any) => number

  // ── Force layout ─────────────────────────────────
  iterations?: number
  forceStrength?: number

  // ── Chord layout ─────────────────────────────────
  padAngle?: number
  groupWidth?: number
  sortGroups?: (a: any, b: any) => number

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
  nodeStyle?: (d: any) => Record<string, any>
  edgeStyle?: (d: any) => Record<string, any>
  nodeLabel?: string | ((d: any) => string)
  showLabels?: boolean

  // ── Color ────────────────────────────────────────
  colorBy?: string | ((d: any) => string)
  colorScheme?: string | string[]
  edgeColorBy?: "source" | "target" | "gradient" | ((d: any) => string)
  edgeOpacity?: number
  colorByDepth?: boolean
  nodeSize?: number | string | ((d: any) => number)
  nodeSizeRange?: [number, number]
}

// ── Component props ─────────────────────────────────────────────────

export interface StreamNetworkFrameProps<T = Record<string, any>> {
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

  // ── Hierarchy ────────────────────────────────────
  childrenAccessor?: string | ((d: T) => T[])
  hierarchySum?: (d: T) => number

  // ── Layout config ────────────────────────────────
  orientation?: "horizontal" | "vertical"
  nodeAlign?: "justify" | "left" | "right" | "center"
  nodePaddingRatio?: number
  nodeWidth?: number
  iterations?: number
  forceStrength?: number
  padAngle?: number
  groupWidth?: number
  sortGroups?: (a: any, b: any) => number
  edgeSort?: (a: any, b: any) => number
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
  nodeStyle?: (d: any) => Record<string, any>
  edgeStyle?: (d: any) => Record<string, any>
  colorBy?: string | ((d: any) => string)
  colorScheme?: string | string[]
  edgeColorBy?: "source" | "target" | "gradient" | ((d: any) => string)
  edgeOpacity?: number
  colorByDepth?: boolean
  nodeSize?: number | string | ((d: any) => number)
  nodeSizeRange?: [number, number]

  // ── Labels ───────────────────────────────────────
  nodeLabel?: string | ((d: any) => string)
  showLabels?: boolean

  // ── Layout ───────────────────────────────────────
  size?: [number, number]
  margin?: { top?: number; right?: number; bottom?: number; left?: number }
  className?: string
  background?: string

  // ── Interaction ──────────────────────────────────
  enableHover?: boolean
  tooltipContent?: (d: { type: "node" | "edge"; data: any; x: number; y: number }) => ReactNode
  onTopologyChange?: (nodes: RealtimeNode[], edges: RealtimeEdge[]) => void

  // ── Annotations ──────────────────────────────────
  annotations?: Record<string, any>[]
  svgAnnotationRules?: (
    annotation: Record<string, any>,
    index: number,
    context: AnnotationContext
  ) => ReactNode

  // ── Legend / title ───────────────────────────────
  legend?: ReactNode | { legendGroups: LegendGroup[] }
  title?: string | ReactNode
  foregroundGraphics?: ReactNode
  backgroundGraphics?: ReactNode
}

// ── Ref handle ──────────────────────────────────────────────────────

export interface StreamNetworkFrameHandle {
  push(edge: EdgePush): void
  pushMany(edges: EdgePush[]): void
  clear(): void
  getTopology(): { nodes: RealtimeNode[]; edges: RealtimeEdge[] }
  relayout(): void
  getTension(): number
}

// ── Canvas renderer function type ───────────────────────────────────

export type NetworkRendererFn = (
  ctx: CanvasRenderingContext2D,
  nodes: NetworkSceneNode[],
  edges: NetworkSceneEdge[],
  size: [number, number]
) => void
