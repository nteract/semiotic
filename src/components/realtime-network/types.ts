import type { ReactNode } from "react"

// ── Tension configuration ──────────────────────────────────────────────────

export interface TensionConfig {
  /** Tension added when an existing edge's weight changes */
  weightChange: number
  /** Tension added when a new edge is created between existing nodes */
  newEdge: number
  /** Tension added when a new node is created */
  newNode: number
  /** Tension threshold that triggers a full relayout */
  threshold: number
  /** Duration of layout transition animation in ms */
  transitionDuration: number
}

export const DEFAULT_TENSION_CONFIG: TensionConfig = {
  weightChange: 0.1,
  newEdge: 0.5,
  newNode: 1.0,
  threshold: 3.0,
  transitionDuration: 500
}

// ── Graph topology types ───────────────────────────────────────────────────

export interface RealtimeNode {
  id: string
  /** Layout position — set by d3-sankey-circular */
  x0: number
  x1: number
  y0: number
  y1: number
  /** Derived from layout */
  x: number
  y: number
  width: number
  height: number
  /** Saved previous positions for transition interpolation */
  _prevX0?: number
  _prevX1?: number
  _prevY0?: number
  _prevY1?: number
  /** Target positions from most recent relayout (for animated transition) */
  _targetX0?: number
  _targetX1?: number
  _targetY0?: number
  _targetY1?: number
  /** Sankey value (sum of connected edges) */
  value: number
  /** Degree info */
  depth?: number
  /** Arbitrary user data */
  data?: Record<string, any>
  /** Internal: created by frame */
  createdByFrame?: boolean
  /** Links */
  sourceLinks?: RealtimeEdge[]
  targetLinks?: RealtimeEdge[]
}

export interface RealtimeEdge {
  source: RealtimeNode | string
  target: RealtimeNode | string
  value: number
  /** Set by sankey layout — band center Y at source */
  y0: number
  /** Set by sankey layout — band center Y at target */
  y1: number
  /** Sankey band width */
  sankeyWidth: number
  /** Saved previous positions for transition */
  _prevY0?: number
  _prevY1?: number
  _prevSankeyWidth?: number
  /** Target positions from most recent relayout (for animated transition) */
  _targetY0?: number
  _targetY1?: number
  _targetSankeyWidth?: number
  /** Direction for rendering */
  direction?: string
  /** Circular link data from d3-sankey-circular */
  circular?: boolean
  circularPathData?: any
  /** Cached bezier control points for particle evaluation */
  bezier?: BezierCache
  /** Arbitrary user data */
  data?: Record<string, any>
}

// ── Bezier cache for particle evaluation ───────────────────────────────────

export interface BezierPoint {
  x: number
  y: number
}

/** For standard (non-circular) links: 4-point cubic bezier */
export interface BezierCache {
  /** Whether this is a multi-segment circular path */
  circular: boolean
  /** Control points for standard link (P0, P1, P2, P3) */
  points?: [BezierPoint, BezierPoint, BezierPoint, BezierPoint]
  /** For circular links: array of segment control point groups */
  segments?: Array<[BezierPoint, BezierPoint, BezierPoint, BezierPoint]>
  /** Band half-width for perpendicular spread */
  halfWidth: number
}

// ── Particle system ────────────────────────────────────────────────────────

export interface Particle {
  /** Progress along the path [0, 1] */
  t: number
  /** Perpendicular offset within band [-0.5, 0.5] */
  offset: number
  /** Index into the edge array this particle belongs to */
  edgeIndex: number
  /** Whether this particle slot is active */
  active: boolean
  /** Current computed x position */
  x: number
  /** Current computed y position */
  y: number
}

export interface ParticleStyle {
  radius?: number
  color?: string | ((edge: RealtimeEdge, node: RealtimeNode) => string)
  opacity?: number
  speedMultiplier?: number
  maxPerEdge?: number
  spawnRate?: number
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

// ── Push API ───────────────────────────────────────────────────────────────

export interface EdgePush {
  source: string
  target: string
  value: number
}

export interface RealtimeNetworkFrameHandle {
  push(edge: EdgePush): void
  pushMany(edges: EdgePush[]): void
  clear(): void
  getTopology(): { nodes: RealtimeNode[]; edges: RealtimeEdge[] }
  relayout(): void
  getTension(): number
}

// ── Component props ────────────────────────────────────────────────────────

export interface RealtimeNetworkFrameProps {
  /** Initial edges to populate the graph */
  initialEdges?: EdgePush[]
  /** Chart dimensions [width, height] */
  size?: [number, number]
  /** Chart margins */
  margin?: { top?: number; right?: number; bottom?: number; left?: number }
  /** Layout orientation */
  orientation?: "horizontal" | "vertical"
  /** Node alignment strategy */
  nodeAlign?: "justify" | "left" | "right" | "center"
  /** Padding between nodes (ratio) */
  nodePaddingRatio?: number
  /** Node width in pixels */
  nodeWidth?: number
  /** Tension configuration */
  tensionConfig?: Partial<TensionConfig>
  /** Show particles on links */
  showParticles?: boolean
  /** Particle visual style */
  particleStyle?: ParticleStyle
  /** Node color accessor */
  colorBy?: string | ((d: RealtimeNode) => string)
  /** Color scheme name or custom palette */
  colorScheme?: string | string[]
  /** Edge color strategy */
  edgeColorBy?: "source" | "target" | ((d: RealtimeEdge) => string)
  /** Edge band opacity */
  edgeOpacity?: number
  /** Node label accessor */
  nodeLabel?: string | ((d: RealtimeNode) => string)
  /** Show node labels */
  showLabels?: boolean
  /** Enable hover tooltips */
  enableHover?: boolean
  /** Custom tooltip renderer */
  tooltipContent?: (d: { type: "node" | "edge"; data: any }) => ReactNode
  /** Callback when topology changes */
  onTopologyChange?: (nodes: RealtimeNode[], edges: RealtimeEdge[]) => void
  /** Background color */
  background?: string
  /** CSS class name */
  className?: string
}

export interface RealtimeSankeyProps extends Omit<RealtimeNetworkFrameProps, never> {
  /** Accessor for source field in pushed edges */
  sourceAccessor?: string
  /** Accessor for target field in pushed edges */
  targetAccessor?: string
  /** Accessor for value field in pushed edges */
  valueAccessor?: string
}
