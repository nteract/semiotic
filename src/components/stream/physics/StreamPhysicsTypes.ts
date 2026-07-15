/**
 * Public types for StreamPhysicsFrame — region effects, body semantics,
 * frame props / handle. Kept separate so region runtime + canvas helpers
 * can import types without pulling the full React frame module.
 */

import type * as React from "react"
import type { FrameGraphicsProp, FrameMargin, FrameScheduler } from "../useFrame"
import type { Style } from "../types"
import type { Datum } from "../../charts/shared/datumTypes"
import type { OnObservationCallback } from "../../store/ObservationStore"
import type { AutoPlaceAnnotations } from "../../recipes/annotationLayout"
import type { AnnotationContext } from "../../realtime/types"
import type {
  GradientLegendConfig,
  LegendGroup,
  LegendLayout
} from "../../types/legendTypes"
import type { FocusRingProps } from "../FocusRing"
import type {
  PhysicsBodyState,
  PhysicsColliderBodyFilter,
  PhysicsColliderShape
} from "./PhysicsKernel"
import type {
  PhysicsPipelineConfig,
  PhysicsPipelineControlSurface,
  PhysicsPipelineStore,
  PhysicsPipelineTickResult,
  PhysicsQueuedSpawn,
  PhysicsSpawnPacingOptions,
  PhysicsSimulationState,
  PhysicsObservationEvent
} from "./PhysicsPipelineStore"
import type { PhysicsController } from "./PhysicsControllers"
import type { PhysicsExecution } from "./PhysicsWorkerProtocol"
import type { StreamPhysicsPopOptions } from "./physicsBodyCanvas"

export interface PhysicsBodySelection {
  isActive?: boolean
  predicate?: (body: PhysicsBodyState) => boolean
}

export type StreamPhysicsRegionKind =
  | "region"
  | "membrane"
  | "charge-gate"
  | "force-field"
  | "sink"
  | "source"

export interface StreamPhysicsRegionVector {
  x?: number
  y?: number
}

export interface StreamPhysicsBodyRegionState {
  activeRegionIds: string[]
  regionIds: string[]
  charges: Record<string, unknown>
  attributes: Record<string, unknown>
  energy: number
}

export interface StreamPhysicsRegionEffectContext {
  body: PhysicsBodyState
  region: StreamPhysicsRegionEffect
  regionState: StreamPhysicsBodyRegionState
}

export interface StreamPhysicsRegionEvent {
  type: "region-enter" | "region-exit"
  bodyId: string
  datum?: unknown
  observation: PhysicsObservationEvent
  region: StreamPhysicsRegionEffect
  regionState: StreamPhysicsBodyRegionState
}

export interface StreamPhysicsRegionEffect {
  /**
   * Stable region id. This is used for observations, accessibility labels,
   * body region state, and generated sensor collider ids.
   */
  id: string
  /**
   * Visual/semantic intent. The physics behavior is controlled by the other
   * properties; kind lets charts and agents describe the region correctly.
   */
  kind?: StreamPhysicsRegionKind
  label?: string
  description?: string
  shape: PhysicsColliderShape
  /**
   * Add a solid collider with the same shape in addition to the sensor region.
   * Defaults to false because information membranes normally tax or annotate
   * bodies without hard-blocking them.
   */
  collider?: boolean | "solid" | "boundary"
  /**
   * Optional filter applied to generated region sensors and colliders. This is
   * useful for permeable regions where one body class should observe or collide
   * with a boundary while other bodies pass through.
   */
  bodyFilter?: PhysicsColliderBodyFilter
  /**
   * Segment thickness used when `collider` is `"boundary"` for an AABB region.
   */
  colliderThickness?: number
  friction?: number
  restitution?: number
  /**
   * The generated sensor collider id. Override only when coordinating with
   * existing observations.
   */
  sensorId?: string
  binId?: string
  /**
   * State attached to a body when it enters the region. `true` on a
   * charge-gate means a charge value of 1.
   */
  charge?:
    | boolean
    | number
    | string
    | ((context: StreamPhysicsRegionEffectContext) => unknown)
  energyDelta?: number
  attributes?:
    | Record<string, unknown>
    | ((context: StreamPhysicsRegionEffectContext) => Record<string, unknown>)
  /**
   * Continuous force applied while a body is inside the region. This is modeled
   * as a per-frame impulse and currently runs on the sync execution path.
   */
  force?:
    | StreamPhysicsRegionVector
    | ((
        context: StreamPhysicsRegionEffectContext
      ) => StreamPhysicsRegionVector | null | undefined)
  /**
   * Linear damping applied while a body is inside the region. Values are
   * per-second-ish coefficients and are intentionally lightweight.
   */
  damping?: number
  impulseOnEnter?:
    | StreamPhysicsRegionVector
    | ((
        context: StreamPhysicsRegionEffectContext
      ) => StreamPhysicsRegionVector | null | undefined)
  impulseOnExit?:
    | StreamPhysicsRegionVector
    | ((
        context: StreamPhysicsRegionEffectContext
      ) => StreamPhysicsRegionVector | null | undefined)
  bodyStyle?:
    | Style
    | ((body: PhysicsBodyState, context: PhysicsBodyStyleContext) => Style)
  /**
   * Set to false to suppress generated keyboard/accessibility semantics.
   * Pass a partial item to override the generated label/description/group.
   */
  semanticItem?: false | Partial<PhysicsSemanticItem>
  metadata?: unknown
  onEnter?: (event: StreamPhysicsRegionEvent) => void
  onExit?: (event: StreamPhysicsRegionEvent) => void
}

export interface PhysicsBodyStyleContext {
  selected: boolean
  simulationState: PhysicsSimulationState
  regionState?: StreamPhysicsBodyRegionState
  regions?: StreamPhysicsRegionEffect[]
}

export interface StreamPhysicsExecutionState {
  execution: "sync" | "worker"
  liveBodies: number
  queuedBodies: number
  reason?: string
  requested: PhysicsExecution
}

export interface PhysicsSemanticItem {
  bodyId?: string
  id?: string
  label: string
  description?: string
  datum?: unknown
  x: number
  y: number
  shape?: FocusRingProps["shape"]
  width?: number
  height?: number
  pathData?: string
  group?: string
}

export interface PhysicsBodySemanticItemContext {
  index: number
  simulationState: PhysicsSimulationState
}

export type PhysicsBodySemanticItemAccessor = (
  body: PhysicsBodyState,
  context: PhysicsBodySemanticItemContext
) => false | null | undefined | Partial<PhysicsSemanticItem>

export interface StreamPhysicsBodyForceContext {
  body: PhysicsBodyState
  bodies: readonly PhysicsBodyState[]
  index: number
  regionState?: StreamPhysicsBodyRegionState
  regions?: StreamPhysicsRegionEffect[]
  simulationState: PhysicsSimulationState
}

export type StreamPhysicsBodyForce =
  | StreamPhysicsRegionVector
  | ((
      context: StreamPhysicsBodyForceContext
    ) => StreamPhysicsRegionVector | null | undefined)

export interface PhysicsHoverData {
  __semioticHoverData: true
  body: PhysicsBodyState
  data: Datum | PhysicsBodyState
  id: string
  type: "body"
  x: number
  y: number
}

export interface StreamPhysicsFrameProps {
  accessibleTable?: boolean
  /**
   * Canvas fill. When set, overrides the theme background unless
   * `backgroundGraphics` already owns the backdrop. Pass `"transparent"`
   * to composite over siblings (same contract as StreamXYFrame).
   */
  background?: string
  backgroundGraphics?: FrameGraphicsProp
  /**
   * Optional rAF seam for deterministic frame-loop scheduling in tests.
   * When omitted, the browser's requestAnimationFrame is used.
   */
  frameScheduler?: FrameScheduler
  /**
   * Monotonic milliseconds used for frame deltas, semantic throttling,
   * pop animations, and frame-originated observation timestamps. Inject a
   * deterministic clock for replayable tests or evidence capture.
   */
  clock?: () => number
  /**
   * Host-level random seam for frame-local visual work. It deliberately does
   * not replace the physics kernel's deterministic random source.
   */
  random?: () => number
  /**
   * Serializable deterministic seed for frame-local work and, when
   * `config.kernel.seed` is omitted, the built-in physics kernel. An explicit
   * kernel seed always wins so existing simulation snapshots remain stable.
   */
  seed?: number
  bodySemanticItemLimit?: number
  bodySemanticItems?: boolean | PhysicsBodySemanticItemAccessor
  bodySemanticUpdateMs?: number
  bodyForces?: StreamPhysicsBodyForce
  bodyStyle?:
    | Style
    | ((body: PhysicsBodyState, context: PhysicsBodyStyleContext) => Style)
  /** Identifier included on `onObservation` events and pipeline observations. */
  chartId?: string
  className?: string
  /**
   * Uniform fill for bodies when `bodyStyle` does not set `fill`.
   * Accepts CSS vars (`var(--semiotic-primary)`).
   */
  color?: string
  config?: PhysicsPipelineConfig
  /**
   * Process plugins that tick with the physics heartbeat (capacity queues,
   * portals, custom process rules). Prefer controllers over pumping
   * `layoutConfig` every frame. Controllers with `continuous` keep RAF alive
   * while they still have work even if the kernel is sleeping.
   */
  controllers?: readonly PhysicsController[]
  /**
   * Keep the animation loop alive even when the physics store reports no
   * pending work. Use for frame-local systems that drive motion from `onTick`
   * or other imperative controls instead of queued spawns/body forces.
   * Also set automatically when any controller opts into continuous mode.
   */
  continuous?: boolean
  description?: string
  /** Dashboard hierarchy class hook (`stream-physics-frame--emphasis-*`). */
  emphasis?: "primary" | "secondary"
  /**
   * Chart display mode (primary/context/sparkline/mobile). HOCs resolve this
   * via `useChartMode` and pass it for class hooks + ChartContainer export.
   */
  chartMode?: "primary" | "context" | "sparkline" | "mobile"
  enableHover?: boolean
  foregroundGraphics?: FrameGraphicsProp
  hoverRadius?: number
  initialSpawns?: PhysicsQueuedSpawn[]
  initialSpawnPacing?: PhysicsSpawnPacingOptions
  /**
   * Semiotic annotations (label/callout/threshold/…). Pixel-space `x`/`y`,
   * or `pointId`/`bodyId` to track a live body. Notes with
   * `physics: "barrier"|"sensor"` also feed colliders via PhysicsAnnotations.
   */
  annotations?: Datum[]
  /** Observe activation of widget annotations without replacing widget behavior. */
  onAnnotationActivate?: import("../../charts/shared/annotationActivation").OnAnnotationActivateCallback
  autoPlaceAnnotations?: AutoPlaceAnnotations
  svgAnnotationRules?: (
    annotation: Datum,
    index: number,
    context: AnnotationContext
  ) => React.ReactNode
  legend?:
    | React.ReactNode
    | { legendGroups: LegendGroup[] }
    | { gradient: GradientLegendConfig }
  legendHoverBehavior?: (item: { label: string } | null) => void
  legendClickBehavior?: (item: { label: string }) => void
  legendHighlightedCategory?: string | null
  legendIsolatedCategories?: Set<string>
  legendPosition?: "right" | "left" | "top" | "bottom"
  legendLayout?: LegendLayout
  margin?: Partial<FrameMargin>
  /**
   * Structured interaction events (hover / hover-end / click / click-end) —
   * same contract as XY/ordinal/network frames for AI + coordinated views.
   */
  onObservation?: OnObservationCallback
  /**
   * Click on a body (or empty canvas when null). Prefer this over
   * `onBodyPointerDown` when you only need the Semiotic click contract.
   */
  onClick?: {
    bivarianceHack(
      datum: Datum | null,
      event: { x: number; y: number; body: PhysicsBodyState | null }
    ): void
  }["bivarianceHack"]
  onRegionEvent?: (event: StreamPhysicsRegionEvent) => void
  onSimulationExecutionChange?: (state: StreamPhysicsExecutionState) => void
  onBodyPointerDown?: (
    body: PhysicsBodyState | null,
    event: React.PointerEvent<HTMLCanvasElement>
  ) => void
  onBodyHover?: (
    body: PhysicsBodyState | null,
    hover: PhysicsHoverData | null
  ) => void
  onSemanticItemActivate?: (item: PhysicsSemanticItem) => void
  onSemanticItemFocus?: (item: PhysicsSemanticItem | null) => void
  onTick?: (
    result: PhysicsPipelineTickResult,
    controls: PhysicsPipelineControlSurface
  ) => void
  /** Uniform opacity for bodies when `bodyStyle` does not set `opacity`. */
  opacity?: number
  paused?: boolean
  responsiveHeight?: boolean
  responsiveWidth?: boolean
  regionEffects?: StreamPhysicsRegionEffect[]
  selectedBodyStyle?:
    | Style
    | ((body: PhysicsBodyState, context: PhysicsBodyStyleContext) => Style)
  selection?: PhysicsBodySelection | null
  semanticItems?: PhysicsSemanticItem[]
  simulationExecution?: PhysicsExecution
  size?: [number, number]
  /** Uniform stroke for bodies when `bodyStyle` does not set `stroke`. */
  stroke?: string
  strokeWidth?: number
  summary?: string
  suspendWhenHidden?: boolean
  title?: string | React.ReactNode
  tooltipContent?: (hover: PhysicsHoverData) => React.ReactNode
  workerBodyThreshold?: number
  renderBody?: (
    ctx: CanvasRenderingContext2D,
    body: PhysicsBodyState,
    style: Style
  ) => void
  beforePaint?: (
    ctx: CanvasRenderingContext2D,
    bodies: PhysicsBodyState[]
  ) => void
  afterPaint?: (
    ctx: CanvasRenderingContext2D,
    bodies: PhysicsBodyState[]
  ) => void
}

export interface StreamPhysicsFrameHandle
  extends PhysicsPipelineControlSurface {
  getData: () => PhysicsBodyState[]
  getRegionState: (
    bodyId?: string
  ) =>
    | StreamPhysicsBodyRegionState
    | Record<string, StreamPhysicsBodyRegionState>
    | undefined
  clearRegionState: (bodyId?: string) => void
  getStore: () => PhysicsPipelineStore
  popBodies: (ids: string[], options?: StreamPhysicsPopOptions) => string[]
}

// Re-export pop options so consumers can import from types or body canvas.
export type { StreamPhysicsPopOptions }
