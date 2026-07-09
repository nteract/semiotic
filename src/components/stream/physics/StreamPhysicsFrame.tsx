"use client"

import * as React from "react"
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useId,
  useRef
} from "react"
import type { FrameGraphicsProp, FrameMargin } from "../useFrame"
import { useFrame } from "../useFrame"
import {
  useHydration,
  useHydrationLifecycle,
  useWasHydratingFromSSR
} from "../useHydration"
import { isServerEnvironment } from "../SceneToSVG"
import { getDevicePixelRatio, prepareCanvas } from "../canvasSetup"
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
import { useDataSummary } from "../../DataSummaryContext"
import { defaultTooltipStyle } from "../../Tooltip/Tooltip"
import { FlippingTooltip } from "../../Tooltip/FlippingTooltip"
import { resolvePhysicsCanvasTheme } from "./PhysicsCanvasTheme"
import {
  PhysicsSVGOverlay,
  bodiesToAnnotationAnchors,
  type PhysicsAnnotationAnchorNode
} from "./PhysicsSVGOverlay"
import {
  collidersFromPhysicsAnnotations,
  type PhysicsStaticAnnotation
} from "./PhysicsAnnotations"
import type {
  PhysicsBodyState,
  PhysicsColliderBodyFilter,
  PhysicsColliderShape,
  PhysicsColliderSpec
} from "./PhysicsKernel"
import {
  PhysicsWorkerSession,
  canUsePhysicsWorker
} from "./PhysicsWorkerClient"
import {
  PhysicsPipelineStore,
  type PhysicsPipelineConfig,
  type PhysicsPipelineControlSurface,
  type PhysicsObservationEvent,
  type PhysicsPipelineSnapshot,
  type PhysicsPipelineTickResult,
  type PhysicsQueuedSpawn,
  type PhysicsSpawnPacingOptions,
  type PhysicsSimulationState
} from "./PhysicsPipelineStore"
import { renderPhysicsSettledSVG } from "./PhysicsSettledSVG"
import {
  composePhysicsControllers,
  type PhysicsController
} from "./PhysicsControllers"
import {
  DEFAULT_PHYSICS_WORKER_BODY_THRESHOLD,
  isPhysicsWorkerConfigSupported,
  isPhysicsWorkerPacingSupported,
  shouldUsePhysicsWorker,
  type PhysicsExecution,
  type PhysicsWorkerCommand,
  type PhysicsWorkerFrame,
  type PhysicsWorkerResponsePayload
} from "./PhysicsWorkerProtocol"
import { FocusRing, type FocusRingProps } from "../FocusRing"
import {
  AriaLiveTooltip,
  ScreenReaderSummary,
  SkipToTableLink
} from "../AccessibleDataTable"

const DEFAULT_SIZE: [number, number] = [640, 360]
const DEFAULT_MARGIN: FrameMargin = { top: 0, right: 0, bottom: 0, left: 0 }
const NAV_KEYS = new Set([
  "ArrowRight",
  "ArrowLeft",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown"
])
const SR_ONLY_STYLE: React.CSSProperties = {
  border: 0,
  clip: "rect(0 0 0 0)",
  height: 1,
  margin: -1,
  overflow: "hidden",
  padding: 0,
  position: "absolute",
  whiteSpace: "nowrap",
  width: 1
}
const PHYSICS_TABLE_SAMPLE_SIZE = 5
const PHYSICS_TABLE_PAGE_SIZE = 25
const DATA_TABLE_CLASS = "semiotic-accessible-data-table"
const DATA_TABLE_HIDDEN_CLASS = `${DATA_TABLE_CLASS} semiotic-accessible-data-table-hidden`
const DATA_TABLE_VISIBLE_CLASS = `${DATA_TABLE_CLASS} semiotic-accessible-data-table-visible`

const TABLE_PANEL_STYLE: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  zIndex:
    "var(--semiotic-data-table-z-index, var(--semiotic-overlay-z-index, 20))",
  padding: "14px 16px 12px",
  borderBottom:
    "1px solid var(--semiotic-data-table-border, var(--semiotic-border, #e0e0e0))",
  fontFamily:
    "var(--semiotic-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
  fontSize: 13,
  lineHeight: 1.5,
  color: "var(--semiotic-data-table-text, var(--semiotic-text, #333))",
  background:
    "var(--semiotic-data-table-bg, var(--semiotic-surface, var(--semiotic-bg, #fff)))",
  borderRadius:
    "var(--semiotic-border-radius, 0px) var(--semiotic-border-radius, 0px) 0 0"
}

const TABLE_SUMMARY_STYLE: React.CSSProperties = {
  marginBottom: 8,
  paddingRight: 28,
  color:
    "var(--semiotic-data-table-muted-text, var(--semiotic-text-secondary, #666))",
  fontSize: 12,
  letterSpacing: "0.01em"
}

const TABLE_CLOSE_STYLE: React.CSSProperties = {
  position: "absolute",
  top: 10,
  right: 10,
  width: 22,
  height: 22,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border:
    "1px solid var(--semiotic-data-table-border, var(--semiotic-border, #e0e0e0))",
  background:
    "var(--semiotic-data-table-bg, var(--semiotic-surface, var(--semiotic-bg, #fff)))",
  cursor: "pointer",
  color:
    "var(--semiotic-data-table-muted-text, var(--semiotic-text-secondary, #666))",
  fontSize: 13,
  lineHeight: 1,
  padding: 0,
  borderRadius: "var(--semiotic-border-radius, 4px)"
}

const TABLE_STYLE: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12,
  marginTop: 4,
  fontVariantNumeric: "tabular-nums"
}

const TABLE_TH_STYLE: React.CSSProperties = {
  textAlign: "left",
  padding: "5px 10px",
  borderBottom:
    "2px solid var(--semiotic-data-table-border, var(--semiotic-border, #e0e0e0))",
  fontWeight: 600,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color:
    "var(--semiotic-data-table-muted-text, var(--semiotic-text-secondary, #666))"
}

const TABLE_TD_STYLE: React.CSSProperties = {
  padding: "4px 10px",
  borderBottom:
    "1px solid var(--semiotic-data-table-border, var(--semiotic-border, #e0e0e0))"
}

const TABLE_CAPTION_STYLE: React.CSSProperties = {
  textAlign: "left",
  fontSize: 11,
  color:
    "var(--semiotic-data-table-muted-text, var(--semiotic-text-secondary, #666))",
  marginBottom: 4,
  fontStyle: "italic"
}

const TABLE_SHOW_MORE_STYLE: React.CSSProperties = {
  marginTop: 8,
  padding: "4px 10px",
  fontSize: 12,
  cursor: "pointer",
  border:
    "1px solid var(--semiotic-data-table-border, var(--semiotic-border, #e0e0e0))",
  borderRadius: "var(--semiotic-border-radius, 4px)",
  background:
    "var(--semiotic-data-table-bg, var(--semiotic-surface, var(--semiotic-bg, #fff)))",
  color: "var(--semiotic-data-table-text, var(--semiotic-text, #333))",
  fontFamily: "inherit"
}

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

interface InternalStreamPhysicsBodyRegionState {
  activeRegionIds: Set<string>
  regionIds: Set<string>
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
    | ((context: StreamPhysicsRegionEffectContext) => StreamPhysicsRegionVector | null | undefined)
  /**
   * Linear damping applied while a body is inside the region. Values are
   * per-second-ish coefficients and are intentionally lightweight.
   */
  damping?: number
  impulseOnEnter?:
    | StreamPhysicsRegionVector
    | ((context: StreamPhysicsRegionEffectContext) => StreamPhysicsRegionVector | null | undefined)
  impulseOnExit?:
    | StreamPhysicsRegionVector
    | ((context: StreamPhysicsRegionEffectContext) => StreamPhysicsRegionVector | null | undefined)
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

export interface StreamPhysicsPopOptions {
  color?: string
  durationMs?: number
  radius?: number
}

interface StreamPhysicsPopAnimation {
  body: PhysicsBodyState
  color: string
  durationMs: number
  radius: number
  startedAt: number
}

export interface PhysicsHoverData {
  __semioticHoverData: true
  body: PhysicsBodyState
  data: unknown
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
  onClick?: (
    datum: unknown | null,
    event: { x: number; y: number; body: PhysicsBodyState | null }
  ) => void
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
  ) => StreamPhysicsBodyRegionState | Record<string, StreamPhysicsBodyRegionState> | undefined
  clearRegionState: (bodyId?: string) => void
  getStore: () => PhysicsPipelineStore
  popBodies: (ids: string[], options?: StreamPhysicsPopOptions) => string[]
}

function createStore(
  config: PhysicsPipelineConfig | undefined,
  initialSpawns: PhysicsQueuedSpawn[] | undefined,
  initialSpawnPacing: PhysicsSpawnPacingOptions | undefined
): PhysicsPipelineStore {
  const store = new PhysicsPipelineStore(config)
  if (initialSpawns?.length) {
    store.enqueue(initialSpawns, initialSpawnPacing)
  }
  return store
}

function isSelected(
  body: PhysicsBodyState,
  selection: PhysicsBodySelection | null | undefined
): boolean {
  if (!selection?.isActive) return false
  return selection.predicate?.(body) ?? true
}

function regionSensorId(region: StreamPhysicsRegionEffect): string {
  return region.sensorId ?? `stream-region-${region.id}`
}

function regionBoundaryColliders(
  region: StreamPhysicsRegionEffect
): PhysicsColliderSpec[] {
  const baseId = regionSensorId(region)
  const common = {
    bodyFilter: region.bodyFilter,
    friction: region.friction,
    restitution: region.restitution
  }
  if (region.collider === "boundary" && region.shape.type === "aabb") {
    const thickness = region.colliderThickness ?? 8
    const left = region.shape.x - region.shape.width / 2
    const right = region.shape.x + region.shape.width / 2
    const top = region.shape.y - region.shape.height / 2
    const bottom = region.shape.y + region.shape.height / 2
    return [
      {
        ...common,
        id: `${baseId}-top`,
        shape: { type: "segment", x1: left, y1: top, x2: right, y2: top, thickness }
      },
      {
        ...common,
        id: `${baseId}-right`,
        shape: { type: "segment", x1: right, y1: top, x2: right, y2: bottom, thickness }
      },
      {
        ...common,
        id: `${baseId}-bottom`,
        shape: { type: "segment", x1: right, y1: bottom, x2: left, y2: bottom, thickness }
      },
      {
        ...common,
        id: `${baseId}-left`,
        shape: { type: "segment", x1: left, y1: bottom, x2: left, y2: top, thickness }
      }
    ]
  }
  if (!region.collider) return []
  return [
    {
      ...common,
      id: `${baseId}-collider`,
      shape: region.shape
    }
  ]
}

function publicRegionState(
  state: InternalStreamPhysicsBodyRegionState | undefined
): StreamPhysicsBodyRegionState | undefined {
  if (!state) return undefined
  return {
    activeRegionIds: Array.from(state.activeRegionIds),
    regionIds: Array.from(state.regionIds),
    charges: { ...state.charges },
    attributes: { ...state.attributes },
    energy: state.energy
  }
}

function cloneRegionStateSnapshot(
  state: Map<string, InternalStreamPhysicsBodyRegionState>
): Record<string, StreamPhysicsBodyRegionState> {
  const snapshot: Record<string, StreamPhysicsBodyRegionState> = {}
  state.forEach((value, key) => {
    const publicState = publicRegionState(value)
    if (publicState) snapshot[key] = publicState
  })
  return snapshot
}

function ensureInternalRegionState(
  state: Map<string, InternalStreamPhysicsBodyRegionState>,
  bodyId: string
): InternalStreamPhysicsBodyRegionState {
  let current = state.get(bodyId)
  if (!current) {
    current = {
      activeRegionIds: new Set(),
      attributes: {},
      charges: {},
      energy: 0,
      regionIds: new Set()
    }
    state.set(bodyId, current)
  }
  return current
}

function resolveRegionVector(
  vector:
    | StreamPhysicsRegionVector
    | ((context: StreamPhysicsRegionEffectContext) => StreamPhysicsRegionVector | null | undefined)
    | undefined,
  context: StreamPhysicsRegionEffectContext
): StreamPhysicsRegionVector | null {
  const resolved = typeof vector === "function" ? vector(context) : vector
  if (!resolved) return null
  const x = Number(resolved.x ?? 0)
  const y = Number(resolved.y ?? 0)
  if (!Number.isFinite(x) && !Number.isFinite(y)) return null
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0
  }
}

function mergeRegionAttributes(
  region: StreamPhysicsRegionEffect,
  context: StreamPhysicsRegionEffectContext,
  state: InternalStreamPhysicsBodyRegionState
): void {
  const nextAttributes =
    typeof region.attributes === "function"
      ? region.attributes(context)
      : region.attributes
  if (nextAttributes) {
    state.attributes = { ...state.attributes, ...nextAttributes }
  }
}

function resolveRegionCharge(
  region: StreamPhysicsRegionEffect,
  context: StreamPhysicsRegionEffectContext
): unknown {
  if (region.charge !== undefined) {
    return typeof region.charge === "function"
      ? region.charge(context)
      : region.charge
  }
  return region.kind === "charge-gate" ? 1 : undefined
}

function regionToSemanticItem(
  region: StreamPhysicsRegionEffect
): PhysicsSemanticItem | null {
  if (region.semanticItem === false) return null
  const shape = region.shape
  const override = region.semanticItem ?? {}
  const base: PhysicsSemanticItem =
    shape.type === "aabb"
      ? {
          id: region.id,
          label: region.label ?? region.id,
          description: region.description,
          group: region.kind ?? "region",
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height
        }
      : {
          id: region.id,
          label: region.label ?? region.id,
          description: region.description,
          group: region.kind ?? "region",
          x: (shape.x1 + shape.x2) / 2,
          y: (shape.y1 + shape.y2) / 2,
          pathData: `M ${shape.x1} ${shape.y1} L ${shape.x2} ${shape.y2}`
        }
  return {
    ...base,
    ...override,
    id: override.id ?? base.id
  }
}

function regionRuntimeEffectsRequireSync(
  regionEffects: readonly StreamPhysicsRegionEffect[]
): boolean {
  return regionEffects.some(
    (region) =>
      region.force != null ||
      region.damping != null ||
      region.impulseOnEnter != null ||
      region.impulseOnExit != null
  )
}

function applyActiveRegionEffects(
  controls: PhysicsPipelineControlSurface,
  regionEffects: readonly StreamPhysicsRegionEffect[],
  regionState: Map<string, InternalStreamPhysicsBodyRegionState>
): boolean {
  if (!regionRuntimeEffectsRequireSync(regionEffects)) return false
  const regionsById = new Map(regionEffects.map((region) => [region.id, region]))
  const bodies = controls.readBodies()
  let applied = false
  for (const body of bodies) {
    const internalState = regionState.get(body.id)
    if (!internalState || !internalState.activeRegionIds.size) continue
    const publicState = publicRegionState(internalState)
    if (!publicState) continue
    for (const regionId of internalState.activeRegionIds) {
      const region = regionsById.get(regionId)
      if (!region) continue
      const context = { body, region, regionState: publicState }
      const force = resolveRegionVector(region.force, context)
      const damping = Number(region.damping ?? 0)
      const ix =
        (force?.x ?? 0) / 60 - (Number.isFinite(damping) ? body.vx * damping / 60 : 0)
      const iy =
        (force?.y ?? 0) / 60 - (Number.isFinite(damping) ? body.vy * damping / 60 : 0)
      if (ix || iy) {
        controls.applyImpulse(body.id, ix, iy)
        applied = true
      }
    }
  }
  return applied
}

function resolveBodyForceVector(
  force: StreamPhysicsBodyForce | undefined,
  context: StreamPhysicsBodyForceContext
): StreamPhysicsRegionVector | null {
  const resolved = typeof force === "function" ? force(context) : force
  if (!resolved) return null
  const x = Number(resolved.x ?? 0)
  const y = Number(resolved.y ?? 0)
  if (!Number.isFinite(x) && !Number.isFinite(y)) return null
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0
  }
}

const EMPTY_REGION_EFFECTS: StreamPhysicsRegionEffect[] = []

function applyBodyForces(
  controls: PhysicsPipelineControlSurface,
  bodyForces: StreamPhysicsBodyForce | undefined,
  regionEffects: readonly StreamPhysicsRegionEffect[],
  regionState: Map<string, InternalStreamPhysicsBodyRegionState>,
  simulationState: PhysicsSimulationState
): boolean {
  if (!bodyForces) return false
  const regionById = new Map(regionEffects.map((region) => [region.id, region]))
  const bodies = controls.readBodies()
  let applied = false
  for (let index = 0; index < bodies.length; index += 1) {
    const body = bodies[index]
    const internalState = regionState.get(body.id)
    const publicState = publicRegionState(internalState)
    // Build regions without Array.from + map + filter intermediate arrays.
    let regions: StreamPhysicsRegionEffect[] = EMPTY_REGION_EFFECTS
    if (internalState && internalState.activeRegionIds.size > 0) {
      const list: StreamPhysicsRegionEffect[] = []
      for (const id of internalState.activeRegionIds) {
        const region = regionById.get(id)
        if (region) list.push(region)
      }
      regions = list
    }
    const vector = resolveBodyForceVector(bodyForces, {
      body,
      bodies,
      index,
      regionState: publicState,
      regions,
      simulationState
    })
    if (!vector) continue
    const ix = (vector.x ?? 0) / 60
    const iy = (vector.y ?? 0) / 60
    if (ix || iy) {
      controls.applyImpulse(body.id, ix, iy)
      applied = true
    }
  }
  return applied
}

/**
 * Shared post-tick pipeline: region forces → body forces → controllers → onTick.
 * Used by the main RAF path and the worker-fallback path (DRY + one snapshot).
 */
function runPhysicsPostTick(options: {
  store: PhysicsPipelineStore
  result: PhysicsPipelineTickResult
  regionEffects: readonly StreamPhysicsRegionEffect[]
  regionState: Map<string, InternalStreamPhysicsBodyRegionState>
  bodyForces: StreamPhysicsBodyForce | undefined
  composed: ReturnType<typeof composePhysicsControllers>
  onTick?: (
    result: PhysicsPipelineTickResult,
    controls: PhysicsPipelineControlSurface
  ) => void
}): {
  regionEffectsApplied: boolean
  bodyForcesApplied: boolean
  snapshot: ReturnType<PhysicsPipelineStore["snapshot"]>
} {
  const controls = options.store.controls()
  // Single snapshot for simulation state + reschedule predicate.
  const snapshot = options.store.snapshot()
  const regionEffectsApplied = applyActiveRegionEffects(
    controls,
    options.regionEffects,
    options.regionState
  )
  const bodyForcesApplied = applyBodyForces(
    controls,
    options.bodyForces,
    options.regionEffects,
    options.regionState,
    snapshot.simulationState
  )
  if (options.composed) {
    const fixedDt = snapshot.config.fixedDt || 1 / 60
    const dt = Math.max(0, (options.result.steps || 1) * fixedDt)
    options.composed.onTick(options.result, controls, {
      dt,
      elapsed: options.result.elapsedSeconds,
      getRegionState: (bodyId) =>
        publicRegionState(options.regionState.get(bodyId))
    })
  }
  options.onTick?.(options.result, controls)
  return { regionEffectsApplied, bodyForcesApplied, snapshot }
}

function resolveStyle(
  body: PhysicsBodyState,
  simulationState: PhysicsSimulationState,
  bodyStyle: StreamPhysicsFrameProps["bodyStyle"],
  selectedBodyStyle: StreamPhysicsFrameProps["selectedBodyStyle"],
  selection: StreamPhysicsFrameProps["selection"],
  regionState: StreamPhysicsBodyRegionState | undefined,
  activeRegions: StreamPhysicsRegionEffect[],
  fallbackFill: string,
  fallbackStroke: string,
  primitives?: {
    color?: string
    stroke?: string
    strokeWidth?: number
    opacity?: number
  }
): Style {
  const selected = isSelected(body, selection)
  const context = { selected, simulationState, regionState, regions: activeRegions }
  const base =
    typeof bodyStyle === "function" ? bodyStyle(body, context) : bodyStyle
  const regionPatch = activeRegions.reduce<Style>((style, region) => {
    if (!region.bodyStyle) return style
    return {
      ...style,
      ...(typeof region.bodyStyle === "function"
        ? region.bodyStyle(body, context)
        : region.bodyStyle)
    }
  }, {})
  const selectedPatch = selected
    ? typeof selectedBodyStyle === "function"
      ? selectedBodyStyle(body, context)
      : selectedBodyStyle
    : undefined

  return {
    fill: primitives?.color ?? fallbackFill,
    stroke: primitives?.stroke ?? fallbackStroke,
    strokeWidth: primitives?.strokeWidth ?? 1,
    opacity: primitives?.opacity ?? 0.9,
    ...base,
    ...regionPatch,
    ...selectedPatch
  }
}

const CHART_TYPE = "StreamPhysicsFrame"

/**
 * Body mark kinds for process identity without custom renderBody.
 * Set via bodyStyle.mark or datum.__physicsMark / datum.mark.
 */
export type PhysicsBodyMark =
  | "circle"
  | "halo"
  | "faceted"
  | "pill"
  | "diamond"
  | "square"

function resolveBodyMark(
  body: PhysicsBodyState,
  style: Style
): PhysicsBodyMark {
  const fromStyle = (style as Style & { mark?: PhysicsBodyMark }).mark
  if (fromStyle) return fromStyle
  const datum = body.datum as Record<string, unknown> | undefined
  const fromDatum = datum?.__physicsMark ?? datum?.mark
  if (
    fromDatum === "circle" ||
    fromDatum === "halo" ||
    fromDatum === "faceted" ||
    fromDatum === "pill" ||
    fromDatum === "diamond" ||
    fromDatum === "square"
  ) {
    return fromDatum
  }
  return body.shape.type === "circle" ? "circle" : "square"
}

function drawBody(
  ctx: CanvasRenderingContext2D,
  body: PhysicsBodyState,
  style: Style
): void {
  const fill = style.fill ?? "#4e79a7"
  const stroke = style.stroke
  const strokeWidth = style.strokeWidth ?? 0
  const opacity = style.opacity ?? 1
  const fillOpacity = style.fillOpacity ?? 1
  const mark = resolveBodyMark(body, style)
  const radius =
    body.shape.type === "circle"
      ? (style.r ?? body.shape.radius)
      : Math.max(body.shape.width, body.shape.height) / 2

  ctx.save()
  ctx.globalAlpha *= opacity
  ctx.beginPath()
  if (mark === "pill" || mark === "square" || body.shape.type === "aabb") {
    const w =
      mark === "pill"
        ? radius * 2.4
        : body.shape.type === "aabb"
          ? body.shape.width
          : radius * 1.7
    const h =
      mark === "pill"
        ? radius * 1.35
        : body.shape.type === "aabb"
          ? body.shape.height
          : radius * 1.7
    const x = body.x - w / 2
    const y = body.y - h / 2
    const rr = mark === "pill" ? h / 2 : Math.min(4, w / 4)
    ctx.moveTo(x + rr, y)
    ctx.arcTo(x + w, y, x + w, y + h, rr)
    ctx.arcTo(x + w, y + h, x, y + h, rr)
    ctx.arcTo(x, y + h, x, y, rr)
    ctx.arcTo(x, y, x + w, y, rr)
    ctx.closePath()
  } else if (mark === "diamond") {
    ctx.moveTo(body.x, body.y - radius)
    ctx.lineTo(body.x + radius, body.y)
    ctx.lineTo(body.x, body.y + radius)
    ctx.lineTo(body.x - radius, body.y)
    ctx.closePath()
  } else if (mark === "faceted") {
    const n = 6
    for (let i = 0; i < n; i += 1) {
      const a = (Math.PI * 2 * i) / n - Math.PI / 2
      const px = body.x + Math.cos(a) * radius
      const py = body.y + Math.sin(a) * radius
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
  } else {
    // circle + halo
    ctx.arc(body.x, body.y, radius, 0, Math.PI * 2)
  }

  if (fill) {
    ctx.save()
    ctx.globalAlpha *= fillOpacity
    ctx.fillStyle = fill
    ctx.fill()
    ctx.restore()
  }
  if (mark === "halo") {
    ctx.beginPath()
    ctx.arc(body.x, body.y, radius * 1.35, 0, Math.PI * 2)
    ctx.strokeStyle = stroke ?? fill
    ctx.lineWidth = Math.max(1.5, strokeWidth || 1.5)
    ctx.globalAlpha *= 0.55
    ctx.stroke()
    ctx.globalAlpha /= 0.55
  }
  if (stroke && strokeWidth > 0) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = strokeWidth
    if (style.strokeDasharray) {
      ctx.setLineDash(
        style.strokeDasharray
          .split(/[,\s]+/)
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value))
      )
    }
    ctx.stroke()
  }
  ctx.restore()
}

function physicsBodyRadius(body: PhysicsBodyState): number {
  if (body.shape.type === "circle") return body.shape.radius
  return Math.max(body.shape.width, body.shape.height) / 2
}

function drawPopAnimations(
  ctx: CanvasRenderingContext2D,
  animations: Map<string, StreamPhysicsPopAnimation>,
  now: number
): boolean {
  let active = false
  for (const [id, animation] of animations) {
    const t = Math.min(1, Math.max(0, (now - animation.startedAt) / animation.durationMs))
    if (t >= 1) {
      animations.delete(id)
      continue
    }
    active = true
    const easeOut = 1 - Math.pow(1 - t, 3)
    const { body } = animation
    const radius = animation.radius + 28 * easeOut
    const alpha = 1 - t

    ctx.save()
    ctx.globalAlpha *= alpha
    ctx.strokeStyle = animation.color
    ctx.fillStyle = animation.color
    ctx.lineWidth = 2.4 * alpha + 0.4
    ctx.beginPath()
    ctx.arc(body.x, body.y, radius, 0, Math.PI * 2)
    ctx.stroke()

    ctx.globalAlpha *= 0.18
    ctx.beginPath()
    ctx.arc(body.x, body.y, radius * 0.52, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.globalAlpha *= alpha
    ctx.strokeStyle = animation.color
    ctx.lineWidth = 1.8
    for (let index = 0; index < 8; index += 1) {
      const angle = index * (Math.PI / 4) + t * 1.4
      const inner = animation.radius + 5 + easeOut * 12
      const outer = animation.radius + 12 + easeOut * 34
      ctx.beginPath()
      ctx.moveTo(
        body.x + Math.cos(angle) * inner,
        body.y + Math.sin(angle) * inner
      )
      ctx.lineTo(
        body.x + Math.cos(angle) * outer,
        body.y + Math.sin(angle) * outer
      )
      ctx.stroke()
    }
    ctx.restore()
  }
  return active
}

function documentIsVisible(): boolean {
  return typeof document === "undefined" ? true : !document.hidden
}

function primitiveValueText(value: unknown): string | null {
  if (value == null) return null
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value)
  }
  return null
}

function physicsHoverData(body: PhysicsBodyState): PhysicsHoverData {
  return {
    __semioticHoverData: true,
    body,
    data: body.datum ?? body,
    id: body.id,
    type: "body",
    x: body.x,
    y: body.y
  }
}

function bodySemanticShape(body: PhysicsBodyState): Pick<
  PhysicsSemanticItem,
  "height" | "shape" | "width"
> {
  if (body.shape.type === "circle") {
    const diameter = Math.max(4, body.shape.radius * 2)
    return {
      height: diameter,
      shape: "circle",
      width: diameter
    }
  }
  return {
    height: body.shape.height,
    shape: "rect",
    width: body.shape.width
  }
}

function defaultBodySemanticLabel(body: PhysicsBodyState): string {
  const datum = body.datum
  if (datum && typeof datum === "object") {
    const record = datum as Record<string, unknown>
    const label = record.label ?? record.name ?? record.id
    if (
      typeof label === "string" ||
      typeof label === "number" ||
      typeof label === "boolean"
    ) {
      return String(label)
    }
  }
  return body.id
}

function defaultBodySemanticDescription(body: PhysicsBodyState): string {
  const rows = physicsTooltipRows(body.datum ?? body)
  if (!rows.length) return `Physics body ${body.id}`
  return rows.map(([key, value]) => `${key}: ${value}`).join(", ")
}

function createBodySemanticItems(
  bodies: readonly PhysicsBodyState[],
  simulationState: PhysicsSimulationState,
  bodySemanticItems: StreamPhysicsFrameProps["bodySemanticItems"],
  limit: number
): PhysicsSemanticItem[] {
  if (!bodySemanticItems) return []
  const maxItems = Math.max(0, Math.floor(limit))
  if (!maxItems) return []
  const items: PhysicsSemanticItem[] = []
  for (let index = 0; index < bodies.length && items.length < maxItems; index += 1) {
    const body = bodies[index]
    const context = { index, simulationState }
    const override =
      typeof bodySemanticItems === "function"
        ? bodySemanticItems(body, context)
        : undefined
    if (override === false) continue
    const shape = bodySemanticShape(body)
    items.push({
      datum: body.datum ?? body,
      description: defaultBodySemanticDescription(body),
      group: "body",
      label: defaultBodySemanticLabel(body),
      ...shape,
      ...(override ?? {}),
      bodyId: override?.bodyId ?? body.id,
      id: override?.id ?? `body:${body.id}`,
      x: override?.x ?? body.x,
      y: override?.y ?? body.y
    })
  }
  return items
}

function semanticItemsChanged(
  previous: readonly PhysicsSemanticItem[],
  next: readonly PhysicsSemanticItem[]
): boolean {
  if (previous.length !== next.length) return true
  for (let index = 0; index < previous.length; index += 1) {
    const a = previous[index]
    const b = next[index]
    if (
      a.id !== b.id ||
      a.label !== b.label ||
      a.description !== b.description ||
      a.group !== b.group ||
      a.bodyId !== b.bodyId ||
      Math.round(a.x) !== Math.round(b.x) ||
      Math.round(a.y) !== Math.round(b.y)
    ) {
      return true
    }
  }
  return false
}

function physicsTooltipRows(data: unknown): Array<[string, string]> {
  if (!data || typeof data !== "object") return []
  return Object.entries(data as Record<string, unknown>)
    .map(([key, value]) => {
      if (key.startsWith("_")) return null
      const text = primitiveValueText(value)
      return text == null ? null : [key, text] as [string, string]
    })
    .filter((entry): entry is [string, string] => entry != null)
    .slice(0, 8)
}

function DefaultPhysicsTooltip({
  hover
}: {
  hover: PhysicsHoverData
}): React.ReactElement {
  const rows = physicsTooltipRows(hover.data)
  return (
    <div className="semiotic-tooltip" style={defaultTooltipStyle}>
      <div style={{ fontWeight: 700, marginBottom: rows.length ? 4 : 0 }}>
        {hover.id}
      </div>
      {rows.map(([key, value]) => (
        <div key={key}>
          <span style={{ opacity: 0.72 }}>{key}: </span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  )
}

function semanticItemDataText(item: PhysicsSemanticItem): string {
  if (!item.datum || typeof item.datum !== "object") return ""
  return Object.entries(item.datum as Record<string, unknown>)
    .map(([key, value]) => {
      const text = primitiveValueText(value)
      return text == null ? null : `${key}: ${text}`
    })
    .filter((entry): entry is string => entry != null)
    .slice(0, 8)
    .join(", ")
}

function semanticItemsSummary(items: readonly PhysicsSemanticItem[]): string {
  const parts = [
    `${items.length} semantic item${items.length === 1 ? "" : "s"}.`
  ]
  const groups = new Map<string, number>()
  for (const item of items) {
    if (!item.group) continue
    groups.set(item.group, (groups.get(item.group) ?? 0) + 1)
  }
  if (groups.size) {
    parts.push(
      Array.from(groups)
        .map(([group, count]) => `${group}: ${count}`)
        .join(", ")
    )
  }
  return parts.join(" ")
}

function PhysicsSemanticDataTable(props: {
  chartTitle?: string
  items: readonly PhysicsSemanticItem[]
  tableId: string
}): React.ReactElement {
  const { chartTitle, items, tableId } = props
  const [srExpanded, setSrExpanded] = React.useState(false)
  const [visibleCount, setVisibleCount] = React.useState(
    PHYSICS_TABLE_SAMPLE_SIZE
  )
  const dataSummary = useDataSummary()
  const visible = dataSummary?.visible ?? false
  const isExpanded = srExpanded || visible
  const containerRef = React.useRef<HTMLDivElement>(null)
  const regionLabel = `Data summary for ${chartTitle ?? "physics chart"}`

  React.useEffect(() => {
    if (!isExpanded) setVisibleCount(PHYSICS_TABLE_SAMPLE_SIZE)
  }, [isExpanded])

  const handleFocus = React.useCallback(
    (event: React.FocusEvent) => {
      if (event.target !== event.currentTarget) return
      if (!srExpanded && !visible) setSrExpanded(true)
    },
    [srExpanded, visible]
  )

  const handleBlur = React.useCallback(
    (event: React.FocusEvent) => {
      if (visible) return
      if (containerRef.current?.contains(event.relatedTarget as Node)) return
      setSrExpanded(false)
    },
    [visible]
  )

  if (!items.length) {
    return <span id={tableId} tabIndex={-1} style={SR_ONLY_STYLE} />
  }

  if (!isExpanded) {
    return (
      <div
        id={tableId}
        className={DATA_TABLE_HIDDEN_CLASS}
        role="region"
        aria-label={regionLabel}
        tabIndex={-1}
        style={SR_ONLY_STYLE}
        onFocus={handleFocus}
      >
        <button type="button" onClick={() => setSrExpanded(true)}>
          View data summary ({items.length} semantic items)
        </button>
      </div>
    )
  }

  const shownCount = Math.min(visibleCount, items.length)
  const sampleItems = items.slice(0, shownCount)
  const remaining = items.length - shownCount
  const dismiss = () => {
    if (visible && dataSummary) dataSummary.setVisible(false)
    setSrExpanded(false)
  }
  const showMore = () => setVisibleCount((count) => count + PHYSICS_TABLE_PAGE_SIZE)

  return (
    <div
      ref={containerRef}
      id={tableId}
      className={DATA_TABLE_VISIBLE_CLASS}
      role="region"
      aria-label={regionLabel}
      tabIndex={-1}
      onBlur={handleBlur}
      style={TABLE_PANEL_STYLE}
    >
      <button
        type="button"
        className="semiotic-accessible-data-table-close"
        aria-label="Close data summary"
        onClick={dismiss}
        style={TABLE_CLOSE_STYLE}
      >
        &times;
      </button>
      <div
        className="semiotic-accessible-data-table-summary"
        role="note"
        style={TABLE_SUMMARY_STYLE}
      >
        {semanticItemsSummary(items)}
      </div>
      <table
        className="semiotic-accessible-data-table-table"
        role="table"
        aria-label={`Semantic items for ${chartTitle ?? "physics chart"}`}
        style={TABLE_STYLE}
      >
        <caption
          className="semiotic-accessible-data-table-caption"
          style={TABLE_CAPTION_STYLE}
        >
          {remaining > 0
            ? `First ${shownCount} of ${items.length} semantic items`
            : `All ${items.length} semantic items`}
        </caption>
        <thead>
          <tr>
            <th scope="col" style={TABLE_TH_STYLE}>
              Item
            </th>
            <th scope="col" style={TABLE_TH_STYLE}>
              Description
            </th>
            <th scope="col" style={TABLE_TH_STYLE}>
              Group
            </th>
            <th scope="col" style={TABLE_TH_STYLE}>
              Position
            </th>
            <th scope="col" style={TABLE_TH_STYLE}>
              Data
            </th>
          </tr>
        </thead>
        <tbody>
          {sampleItems.map((item, index) => (
            <tr key={item.id ?? `${item.label}-${index}`}>
              <th scope="row" style={TABLE_TD_STYLE}>
                {item.label}
              </th>
              <td style={TABLE_TD_STYLE}>{item.description ?? item.label}</td>
              <td style={TABLE_TD_STYLE}>{item.group ?? ""}</td>
              <td style={TABLE_TD_STYLE}>
                {Math.round(item.x)}, {Math.round(item.y)}
              </td>
              <td style={TABLE_TD_STYLE}>{semanticItemDataText(item)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {remaining > 0 ? (
        <button
          type="button"
          className="semiotic-accessible-data-table-show-more"
          onClick={showMore}
          style={TABLE_SHOW_MORE_STYLE}
        >
          Show {Math.min(PHYSICS_TABLE_PAGE_SIZE, remaining)} more{" "}
          {remaining === 1 ? "row" : "rows"} ({remaining} remaining)
        </button>
      ) : null}
    </div>
  )
}

export const StreamPhysicsFrame = forwardRef<
  StreamPhysicsFrameHandle,
  StreamPhysicsFrameProps
>(function StreamPhysicsFrame(props, ref) {
  const {
    accessibleTable = true,
    annotations,
    autoPlaceAnnotations,
    background,
    backgroundGraphics,
    bodySemanticItemLimit = 200,
    bodySemanticItems = false,
    bodySemanticUpdateMs = 200,
    bodyForces,
    bodyStyle,
    chartId,
    className,
    color,
    config,
    controllers,
    continuous = false,
    description,
    emphasis,
    chartMode,
    enableHover = true,
    foregroundGraphics,
    hoverRadius = 16,
    initialSpawns,
    initialSpawnPacing,
    legend,
    legendClickBehavior,
    legendHighlightedCategory,
    legendHoverBehavior,
    legendIsolatedCategories,
    legendLayout,
    legendPosition,
    margin: marginProp,
    onClick,
    onObservation,
    onRegionEvent,
    onSimulationExecutionChange,
    onBodyHover,
    onBodyPointerDown,
    onSemanticItemActivate,
    onSemanticItemFocus,
    onTick,
    opacity,
    paused = false,
    regionEffects = [],
    responsiveHeight,
    responsiveWidth,
    selectedBodyStyle = {
      stroke: "#111827",
      strokeWidth: 2,
      opacity: 1
    },
    selection,
    semanticItems = [],
    simulationExecution = "auto",
    size: sizeProp = DEFAULT_SIZE,
    stroke,
    strokeWidth,
    summary,
    suspendWhenHidden = true,
    svgAnnotationRules,
    title,
    tooltipContent,
    workerBodyThreshold = DEFAULT_PHYSICS_WORKER_BODY_THRESHOLD,
    renderBody: renderBodyProp,
    beforePaint,
    afterPaint
  } = props
  const stylePrimitives = React.useMemo(
    () => ({ color, stroke, strokeWidth, opacity }),
    [color, opacity, stroke, strokeWidth]
  )
  const onObservationRef = useRef(onObservation)
  onObservationRef.current = onObservation
  const chartIdRef = useRef(chartId)
  chartIdRef.current = chartId

  const regionStateRef = useRef<
    Map<string, InternalStreamPhysicsBodyRegionState>
  >(new Map())
  const regionEffectsRef = useRef(regionEffects)
  regionEffectsRef.current = regionEffects
  const bodyForcesRef = useRef(bodyForces)
  bodyForcesRef.current = bodyForces
  const onTickRef = useRef(onTick)
  onTickRef.current = onTick
  const composedControllers = React.useMemo(
    () => composePhysicsControllers(controllers),
    [controllers]
  )
  const composedControllersRef = useRef(composedControllers)
  composedControllersRef.current = composedControllers
  const continuousEffective =
    continuous || Boolean(composedControllers?.continuous)
  const continuousRef = useRef(continuousEffective)
  continuousRef.current = continuousEffective

  const composedBodyForces = React.useMemo<StreamPhysicsBodyForce | undefined>(() => {
    if (!bodyForces && !composedControllers?.bodyForce) return bodyForces
    if (!composedControllers?.bodyForce) return bodyForces
    if (!bodyForces) return composedControllers.bodyForce
    const controllerForce = composedControllers.bodyForce
    return (context) => {
      const a =
        typeof bodyForces === "function" ? bodyForces(context) : bodyForces
      const b =
        typeof controllerForce === "function"
          ? controllerForce(context)
          : controllerForce
      if (!a && !b) return null
      return {
        x: (a?.x ?? 0) + (b?.x ?? 0),
        y: (a?.y ?? 0) + (b?.y ?? 0)
      }
    }
  }, [bodyForces, composedControllers])
  bodyForcesRef.current = composedBodyForces

  const regionBySensorId = React.useMemo(() => {
    return new Map(
      regionEffects.map((region) => [regionSensorId(region), region])
    )
  }, [regionEffects])
  const regionById = React.useMemo(() => {
    return new Map(regionEffects.map((region) => [region.id, region]))
  }, [regionEffects])
  const regionSemanticItems = React.useMemo(
    () =>
      regionEffects
        .map(regionToSemanticItem)
        .filter((item): item is PhysicsSemanticItem => item != null),
    [regionEffects]
  )
  const [bodySemanticItemsSnapshot, setBodySemanticItemsSnapshot] =
    React.useState<PhysicsSemanticItem[]>([])
  const allSemanticItems = React.useMemo(
    () =>
      bodySemanticItemsSnapshot.length || regionSemanticItems.length
        ? [...semanticItems, ...bodySemanticItemsSnapshot, ...regionSemanticItems]
        : semanticItems,
    [bodySemanticItemsSnapshot, regionSemanticItems, semanticItems]
  )
  const hasRuntimeRegionEffects = React.useMemo(
    () => regionRuntimeEffectsRequireSync(regionEffects),
    [regionEffects]
  )
  const hasRuntimeBodyForces = Boolean(composedBodyForces)
  const storeRef = useRef<PhysicsPipelineStore | null>(null)

  const applyRegionImpulse = useCallback(
    (
      bodyId: string,
      region: StreamPhysicsRegionEffect,
      vector:
        | StreamPhysicsRegionVector
        | ((
            context: StreamPhysicsRegionEffectContext
          ) => StreamPhysicsRegionVector | null | undefined)
        | undefined
    ) => {
      const store = storeRef.current
      if (!store || !vector) return false
      const body = store.readBodies().find((candidate) => candidate.id === bodyId)
      const internalState = regionStateRef.current.get(bodyId)
      const regionState = publicRegionState(internalState)
      if (!body || !regionState) return false
      const resolved = resolveRegionVector(vector, {
        body,
        region,
        regionState
      })
      if (!resolved || (!resolved.x && !resolved.y)) return false
      store.applyImpulse(bodyId, resolved.x ?? 0, resolved.y ?? 0)
      return true
    },
    []
  )

  const emitRegionEvent = useCallback(
    (
      type: StreamPhysicsRegionEvent["type"],
      region: StreamPhysicsRegionEffect,
      observation: PhysicsObservationEvent
    ) => {
      if (!observation.bodyId) return
      const publicState = publicRegionState(
        regionStateRef.current.get(observation.bodyId)
      )
      if (!publicState) return
      const event: StreamPhysicsRegionEvent = {
        bodyId: observation.bodyId,
        datum: observation.datum,
        observation,
        region,
        regionState: publicState,
        type
      }
      if (type === "region-enter") region.onEnter?.(event)
      else region.onExit?.(event)
      onRegionEvent?.(event)
    },
    [onRegionEvent]
  )

  const handleRegionObservation = useCallback(
    (event: PhysicsObservationEvent) => {
      const region = event.sensorId ? regionBySensorId.get(event.sensorId) : undefined
      if (!region || !event.bodyId) return
      const internalState = ensureInternalRegionState(
        regionStateRef.current,
        event.bodyId
      )
      const body = storeRef.current
        ?.readBodies()
        .find((candidate) => candidate.id === event.bodyId)
      const publicStateBefore = publicRegionState(internalState)
      const context =
        body && publicStateBefore
          ? { body, region, regionState: publicStateBefore }
          : null

      if (event.type === "physics-proximity-enter") {
        internalState.activeRegionIds.add(region.id)
        internalState.regionIds.add(region.id)
        internalState.energy += region.energyDelta ?? 0
        if (context) {
          mergeRegionAttributes(region, context, internalState)
          const charge = resolveRegionCharge(region, context)
          if (charge !== undefined) internalState.charges[region.id] = charge
        }
        applyRegionImpulse(event.bodyId, region, region.impulseOnEnter)
        emitRegionEvent("region-enter", region, event)
      } else if (event.type === "physics-proximity-exit") {
        internalState.activeRegionIds.delete(region.id)
        applyRegionImpulse(event.bodyId, region, region.impulseOnExit)
        emitRegionEvent("region-exit", region, event)
      }
    },
    [applyRegionImpulse, emitRegionEvent, regionBySensorId]
  )

  const annotationColliders = React.useMemo(() => {
    if (!annotations?.length) return []
    const staticPhysicsNotes = annotations.filter(
      (ann): ann is PhysicsStaticAnnotation & Datum =>
        ann.physics === "barrier" || ann.physics === "sensor"
    )
    if (!staticPhysicsNotes.length) return []
    return collidersFromPhysicsAnnotations(staticPhysicsNotes, {
      idPrefix: chartId ? `${chartId}-ann` : "physics-ann",
      plotBounds: {
        x: 0,
        y: 0,
        width: sizeProp?.[0] ?? DEFAULT_SIZE[0],
        height: sizeProp?.[1] ?? DEFAULT_SIZE[1]
      }
    })
  }, [annotations, chartId, sizeProp])

  const augmentedConfig = React.useMemo(() => {
    const regionColliders: NonNullable<PhysicsPipelineConfig["colliders"]> =
      regionEffects.flatMap((region) => {
        const sensorCollider = {
          id: regionSensorId(region),
          sensor: true,
          shape: region.shape,
          bodyFilter: region.bodyFilter,
          friction: region.friction,
          restitution: region.restitution
        }
        return [sensorCollider, ...regionBoundaryColliders(region)]
      })
    const regionSensors = Object.fromEntries(
      regionEffects.map((region) => [
        regionSensorId(region),
        {
          binId: region.binId ?? region.id,
          enterType: "physics-proximity-enter",
          exitType: "physics-proximity-exit"
        }
      ])
    ) as NonNullable<
      NonNullable<PhysicsPipelineConfig["observation"]>["sensors"]
    >
    const previousObservation = config?.observation
    const hasRegionWiring = regionEffects.length > 0
    const hasExtraColliders =
      regionColliders.length > 0 || annotationColliders.length > 0
    if (
      !hasRegionWiring &&
      !hasExtraColliders &&
      chartId == null &&
      !previousObservation
    ) {
      return config
    }
    return {
      ...config,
      colliders: [
        ...(config?.colliders ?? []),
        ...regionColliders,
        ...annotationColliders
      ],
      observation: {
        ...previousObservation,
        chartId: chartId ?? previousObservation?.chartId,
        chartType: previousObservation?.chartType ?? CHART_TYPE,
        sensors: {
          ...(previousObservation?.sensors ?? {}),
          ...regionSensors
        },
        onObservation: (event: PhysicsObservationEvent) => {
          if (hasRegionWiring) handleRegionObservation(event)
          previousObservation?.onObservation?.(event)
        }
      }
    }
  }, [
    annotationColliders,
    chartId,
    config,
    handleRegionObservation,
    regionEffects
  ])

  if (!storeRef.current) {
    storeRef.current = createStore(augmentedConfig, initialSpawns, initialSpawnPacing)
  }

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const semanticFocusIndexRef = useRef(-1)
  const lastFrameTimeRef = useRef(0)
  const dirtyRef = useRef(true)
  const executionStateKeyRef = useRef("")
  const svgInstanceId = useId().replace(/:/g, "")
  const workerActiveRef = useRef(false)
  const workerFailedRef = useRef(false)
  const workerGenerationRef = useRef(0)
  const workerPendingRef = useRef(false)
  const workerSessionRef = useRef<PhysicsWorkerSession | null>(null)
  const workerStartingRef = useRef(false)
  const frame = useFrame({
    sizeProp,
    responsiveWidth,
    responsiveHeight,
    userMargin: marginProp,
    marginDefault: DEFAULT_MARGIN,
    foregroundGraphics,
    backgroundGraphics
  })
  const {
    margin,
    rafRef,
    reducedMotionRef,
    renderFnRef,
    resolvedBackground,
    resolvedForeground,
    responsiveRef,
    scheduleRender,
    size
  } = frame
  const hydrated = useHydration()
  const wasHydratingFromSSR = useWasHydratingFromSSR()
  const [focusedSemanticItem, setFocusedSemanticItem] =
    React.useState<PhysicsSemanticItem | null>(null)
  const [hoverData, setHoverData] = React.useState<PhysicsHoverData | null>(
    null
  )
  const focusedBodyIdRef = useRef<string | null>(null)
  const lastBodySemanticUpdateRef = useRef(0)
  const popAnimationsRef = useRef(new Map<string, StreamPhysicsPopAnimation>())
  const liveRegionId = `${svgInstanceId}-physics-live`

  const syncBodySemanticItems = useCallback(
    (bodies: readonly PhysicsBodyState[], simulationState: PhysicsSimulationState, force = false) => {
      if (!bodySemanticItems) {
        setBodySemanticItemsSnapshot((current) => current.length ? [] : current)
        return
      }

      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now()
      if (
        !force &&
        bodySemanticUpdateMs > 0 &&
        now - lastBodySemanticUpdateRef.current < bodySemanticUpdateMs
      ) {
        return
      }
      lastBodySemanticUpdateRef.current = now

      const next = createBodySemanticItems(
        bodies,
        simulationState,
        bodySemanticItems,
        bodySemanticItemLimit
      )
      setBodySemanticItemsSnapshot((current) =>
        semanticItemsChanged(current, next) ? next : current
      )
    },
    [
      bodySemanticItemLimit,
      bodySemanticItems,
      bodySemanticUpdateMs
    ]
  )

  const focusSemanticItem = useCallback(
    (index: number) => {
      if (!allSemanticItems.length) return
      const nextIndex = Math.max(0, Math.min(index, allSemanticItems.length - 1))
      semanticFocusIndexRef.current = nextIndex
      const item = allSemanticItems[nextIndex]
      focusedBodyIdRef.current = item.bodyId ?? null
      setFocusedSemanticItem(item)
      onSemanticItemFocus?.(item)

      if (item.bodyId && storeRef.current) {
        const body = storeRef.current
          .readBodies()
          .find((candidate) => candidate.id === item.bodyId)
        if (body) {
          const hover = physicsHoverData(body)
          setHoverData(hover)
          onBodyHover?.(body, hover)
        }
      }
    },
    [allSemanticItems, onBodyHover, onSemanticItemFocus]
  )

  const clearSemanticFocus = useCallback(() => {
    semanticFocusIndexRef.current = -1
    focusedBodyIdRef.current = null
    setFocusedSemanticItem(null)
    onSemanticItemFocus?.(null)
  }, [onSemanticItemFocus])

  const emitObservation = useCallback(
    (
      type: "hover" | "hover-end" | "click" | "click-end",
      payload?: { datum?: unknown; x?: number; y?: number }
    ) => {
      const cb = onObservationRef.current
      if (!cb) return
      const now = Date.now()
      if (type === "hover" || type === "click") {
        cb({
          type,
          datum: (payload?.datum as Datum) ?? {},
          x: payload?.x ?? 0,
          y: payload?.y ?? 0,
          timestamp: now,
          chartType: CHART_TYPE,
          chartId: chartIdRef.current
        })
        return
      }
      cb({
        type,
        timestamp: now,
        chartType: CHART_TYPE,
        chartId: chartIdRef.current
      })
    },
    []
  )

  const clearHover = useCallback(() => {
    setHoverData((current) => {
      if (!current) return current
      onBodyHover?.(null, null)
      emitObservation("hover-end")
      return null
    })
  }, [emitObservation, onBodyHover])

  const handleCanvasPointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!enableHover || !storeRef.current) return
      const rect = event.currentTarget.getBoundingClientRect()
      const body = storeRef.current.hitTest(
        event.clientX - rect.left,
        event.clientY - rect.top,
        hoverRadius
      )
      if (!body) {
        clearHover()
        return
      }
      const hover = physicsHoverData(body)
      setHoverData((current) => {
        if (
          current &&
          current.id === hover.id &&
          current.x === hover.x &&
          current.y === hover.y
        ) {
          return current
        }
        onBodyHover?.(body, hover)
        emitObservation("hover", {
          datum: body.datum,
          x: body.x,
          y: body.y
        })
        return hover
      })
    },
    [clearHover, emitObservation, enableHover, hoverRadius, onBodyHover]
  )

  const handleCanvasPointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      clearSemanticFocus()
      const store = storeRef.current
      const rect = event.currentTarget.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const body = store
        ? store.hitTest(x, y, Math.max(16, hoverRadius))
        : null
      onBodyPointerDown?.(body, event)
      if (body) {
        emitObservation("click", {
          datum: body.datum,
          x: body.x,
          y: body.y
        })
        onClick?.(body.datum ?? null, { x: body.x, y: body.y, body })
      } else {
        emitObservation("click-end")
        onClick?.(null, { x, y, body: null })
        clearHover()
      }
    },
    [
      clearHover,
      clearSemanticFocus,
      emitObservation,
      hoverRadius,
      onBodyPointerDown,
      onClick
    ]
  )

  useEffect(() => {
    if (!allSemanticItems.length) {
      clearSemanticFocus()
      return
    }
    const current = semanticFocusIndexRef.current
    if (current >= allSemanticItems.length) {
      focusSemanticItem(allSemanticItems.length - 1)
    } else if (current >= 0) {
      const item = allSemanticItems[current]
      focusedBodyIdRef.current = item.bodyId ?? null
      setFocusedSemanticItem((previous) => {
        if (
          previous != null &&
          previous.id === item.id &&
          Math.round(previous.x) === Math.round(item.x) &&
          Math.round(previous.y) === Math.round(item.y)
        ) {
          return previous
        }
        return item
      })
      if (item.bodyId && storeRef.current) {
        const body = storeRef.current
          .readBodies()
          .find((candidate) => candidate.id === item.bodyId)
        if (body) {
          const hover = physicsHoverData(body)
          setHoverData((previous) => {
            if (
              previous?.id === hover.id &&
              Math.round(previous.x) === Math.round(hover.x) &&
              Math.round(previous.y) === Math.round(hover.y)
            ) {
              return previous
            }
            return hover
          })
        }
      }
    }
  }, [allSemanticItems, clearSemanticFocus, focusSemanticItem])

  useEffect(() => {
    if (!enableHover) clearHover()
  }, [clearHover, enableHover])

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!allSemanticItems.length) return

      if (event.key === "Escape") {
        event.preventDefault()
        clearSemanticFocus()
        return
      }

      if (
        (event.key === "Enter" || event.key === " ") &&
        semanticFocusIndexRef.current >= 0
      ) {
        event.preventDefault()
        onSemanticItemActivate?.(allSemanticItems[semanticFocusIndexRef.current])
        return
      }

      if (!NAV_KEYS.has(event.key)) return
      event.preventDefault()

      const current = semanticFocusIndexRef.current
      if (current < 0) {
        focusSemanticItem(0)
        return
      }

      const pageStep = Math.max(1, Math.floor(allSemanticItems.length * 0.1))
      let next = current
      if (event.key === "Home") next = 0
      else if (event.key === "End") next = allSemanticItems.length - 1
      else if (event.key === "PageDown") {
        next = Math.min(allSemanticItems.length - 1, current + pageStep)
      } else if (event.key === "PageUp") {
        next = Math.max(0, current - pageStep)
      } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        next = Math.min(allSemanticItems.length - 1, current + 1)
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        next = Math.max(0, current - 1)
      }
      focusSemanticItem(next)
    },
    [
      clearSemanticFocus,
      focusSemanticItem,
      onSemanticItemActivate,
      allSemanticItems
    ]
  )

  const [annotationAnchors, setAnnotationAnchors] = React.useState<
    PhysicsAnnotationAnchorNode[]
  >([])
  const lastAnnotationAnchorUpdateRef = useRef(0)
  const needsLiveAnnotationAnchors =
    Boolean(annotations?.length) &&
    annotations!.some(
      (ann) => ann.pointId != null || ann.bodyId != null || ann.anchor === "latest"
    )

  const paint = useCallback(() => {
    const canvas = canvasRef.current
    const store = storeRef.current
    if (!canvas || !store) return
    const dpr = getDevicePixelRatio()
    const ctx = prepareCanvas(canvas, size, margin, dpr)
    if (!ctx) return

    const theme = resolvePhysicsCanvasTheme(ctx)
    ctx.clearRect(-margin.left, -margin.top, size[0], size[1])
    if (!backgroundGraphics) {
      if (background === "transparent") {
        // leave cleared (compositing over siblings)
      } else {
        ctx.fillStyle = background ?? theme.background
        ctx.fillRect(-margin.left, -margin.top, size[0], size[1])
      }
    }

    const snapshot = store.snapshot()
    const bodies = store.readBodies()
    syncBodySemanticItems(bodies, snapshot.simulationState)
    if (needsLiveAnnotationAnchors) {
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now()
      if (now - lastAnnotationAnchorUpdateRef.current >= 100) {
        lastAnnotationAnchorUpdateRef.current = now
        const next = bodiesToAnnotationAnchors(bodies)
        setAnnotationAnchors((prev) => {
          if (
            prev.length === next.length &&
            prev.every(
              (row, i) =>
                row.pointId === next[i].pointId &&
                Math.round(row.x) === Math.round(next[i].x) &&
                Math.round(row.y) === Math.round(next[i].y)
            )
          ) {
            return prev
          }
          return next
        })
      }
    }
    if (beforePaint) {
      ctx.save()
      beforePaint(ctx, bodies)
      ctx.restore()
    }
    for (const body of bodies) {
      const internalRegionState = regionStateRef.current.get(body.id)
      const activeRegions = internalRegionState
        ? Array.from(internalRegionState.activeRegionIds)
            .map((id) => regionById.get(id))
            .filter((region): region is StreamPhysicsRegionEffect => region != null)
        : []
      const style = resolveStyle(
        body,
        snapshot.simulationState,
        bodyStyle,
        selectedBodyStyle,
        selection,
        publicRegionState(internalRegionState),
        activeRegions,
        theme.primary,
        theme.text,
        stylePrimitives
      )
      if (renderBodyProp) {
        ctx.save()
        renderBodyProp(ctx, body, style)
        ctx.restore()
      } else {
        drawBody(ctx, body, style)
      }
    }
    if (afterPaint) {
      ctx.save()
      afterPaint(ctx, bodies)
      ctx.restore()
    }
    drawPopAnimations(
      ctx,
      popAnimationsRef.current,
      typeof performance !== "undefined" ? performance.now() : Date.now()
    )
    dirtyRef.current = false
  }, [
    afterPaint,
    background,
    backgroundGraphics,
    beforePaint,
    bodyStyle,
    margin,
    needsLiveAnnotationAnchors,
    regionById,
    renderBodyProp,
    selectedBodyStyle,
    selection,
    stylePrimitives,
    syncBodySemanticItems,
    size
  ])

  const reportExecutionState = useCallback(
    (execution: "sync" | "worker", reason?: string) => {
      const store = storeRef.current
      const key = `${simulationExecution}:${execution}:${reason ?? ""}`
      if (executionStateKeyRef.current === key) return
      executionStateKeyRef.current = key
      onSimulationExecutionChange?.({
        execution,
        liveBodies: store?.liveBodyCount() ?? 0,
        queuedBodies: store?.queueSize() ?? 0,
        reason,
        requested: simulationExecution
      })
    },
    [onSimulationExecutionChange, simulationExecution]
  )

  const stopWorker = useCallback(
    (reason?: string, report = true) => {
      workerGenerationRef.current += 1
      workerActiveRef.current = false
      workerPendingRef.current = false
      workerStartingRef.current = false
      workerSessionRef.current?.terminate()
      workerSessionRef.current = null
      if (report) reportExecutionState("sync", reason)
    },
    [reportExecutionState]
  )

  const workerUnsupportedReason = useCallback((): string | null => {
    if (!hydrated) return "hydrating"
    if (!canUsePhysicsWorker()) return "worker unavailable"
    if (hasRuntimeRegionEffects) return "runtime region effects require sync"
    if (hasRuntimeBodyForces) return "body forces require sync"
    if (composedControllers) return "physics controllers require sync"
    if (!isPhysicsWorkerConfigSupported(augmentedConfig ?? {})) {
      return "config is not worker-cloneable"
    }
    if (!isPhysicsWorkerPacingSupported(initialSpawnPacing)) {
      return "spawn pacing is not worker-cloneable"
    }
    if (workerFailedRef.current) return "worker fallback"
    return null
  }, [
    augmentedConfig,
    composedControllers,
    hasRuntimeBodyForces,
    hasRuntimeRegionEffects,
    hydrated,
    initialSpawnPacing
  ])

  const workerChoice = useCallback(() => {
    const store = storeRef.current
    const reason = workerUnsupportedReason()
    if (!store || reason) return { reason, useWorker: false }
    const liveBodies = store.liveBodyCount()
    const queuedBodies = store.queueSize()
    const useWorker = shouldUsePhysicsWorker(
      simulationExecution,
      liveBodies,
      queuedBodies,
      workerBodyThreshold
    )
    return {
      reason: useWorker
        ? simulationExecution === "worker"
          ? "forced worker"
          : "body threshold"
        : "below threshold",
      useWorker
    }
  }, [simulationExecution, workerBodyThreshold, workerUnsupportedReason])

  const applyWorkerFrame = useCallback((frame: PhysicsWorkerFrame) => {
    const store = storeRef.current
    if (!store || !frame.snapshot) return store
    store.restore(frame.snapshot)
    dirtyRef.current = true
    return store
  }, [])

  const finishWorkerFrame = useCallback(
    (frame: PhysicsWorkerFrame, notifyTick = true) => {
      const store = applyWorkerFrame(frame)
      if (!store) return
      if (notifyTick) onTick?.(frame.result, store.controls())
      paint()

      const latest = store.snapshot()
      const popAnimationsActive = popAnimationsRef.current.size > 0
      if (
        (frame.result.shouldContinue || popAnimationsActive) &&
        !latest.paused &&
        latest.visible &&
        !reducedMotionRef.current
      ) {
        rafRef.current = requestAnimationFrame(() => renderFnRef.current())
      }
    },
    [applyWorkerFrame, onTick, paint, rafRef, reducedMotionRef, renderFnRef]
  )

  const handleWorkerError = useCallback(
    (error: unknown) => {
      workerFailedRef.current = true
      const message = error instanceof Error ? error.message : String(error)
      stopWorker(`worker failed: ${message || "unknown error"}`)
    },
    [stopWorker]
  )

  const startWorkerIfNeeded = useCallback(() => {
    const store = storeRef.current
    if (!store) return false

    const choice = workerChoice()
    if (!choice.useWorker) {
      if (workerActiveRef.current || workerStartingRef.current) {
        stopWorker(choice.reason ?? "sync fallback")
      } else {
        reportExecutionState("sync", choice.reason ?? "sync")
      }
      return false
    }

    if (workerActiveRef.current || workerStartingRef.current) return true

    const session = workerSessionRef.current ?? new PhysicsWorkerSession()
    workerSessionRef.current = session
    workerStartingRef.current = true
    const generation = workerGenerationRef.current + 1
    workerGenerationRef.current = generation

    session
      .initFromSnapshot(augmentedConfig ?? {}, store.snapshot())
      .then((frame) => {
        if (workerGenerationRef.current !== generation) return
        workerStartingRef.current = false
        workerActiveRef.current = true
        workerFailedRef.current = false
        applyWorkerFrame(frame)
        reportExecutionState("worker", choice.reason ?? "worker")
        paint()
        const latest = storeRef.current?.snapshot()
        if (
          frame.result.shouldContinue &&
          latest &&
          !latest.paused &&
          latest.visible &&
          !reducedMotionRef.current
        ) {
          lastFrameTimeRef.current = 0
          scheduleRender()
        }
      })
      .catch((error) => {
        if (workerGenerationRef.current !== generation) return
        handleWorkerError(error)
      })

    return true
  }, [
    applyWorkerFrame,
    augmentedConfig,
    handleWorkerError,
    paint,
    reducedMotionRef,
    reportExecutionState,
    scheduleRender,
    stopWorker,
    workerChoice
  ])

  const frameFromPayload = useCallback(
    (payload: PhysicsWorkerResponsePayload): PhysicsWorkerFrame | null => {
      if (payload.type === "frame" || payload.type === "removed") {
        return payload.frame
      }
      return null
    },
    []
  )

  const postWorkerCommand = useCallback(
    (command: PhysicsWorkerCommand, notifyTick = true) => {
      const session = workerSessionRef.current
      if (!session || !workerActiveRef.current) return
      const generation = workerGenerationRef.current
      session
        .request(command)
        .then((payload) => {
          if (workerGenerationRef.current !== generation) return
          const frame = frameFromPayload(payload)
          if (frame) finishWorkerFrame(frame, notifyTick)
        })
        .catch(handleWorkerError)
    },
    [finishWorkerFrame, frameFromPayload, handleWorkerError]
  )

  const requestRender = useCallback(() => {
    const store = storeRef.current
    if (!store) return
    const usingWorker = startWorkerIfNeeded()
    const snapshot = store.snapshot()
    const frameDrivenWork =
      continuousEffective ||
      hasRuntimeBodyForces ||
      hasRuntimeRegionEffects ||
      Boolean(composedControllers)
    if (
      snapshot.paused ||
      !snapshot.visible ||
      (!store.hasPendingWork() && !frameDrivenWork) ||
      reducedMotionRef.current
    ) {
      renderFnRef.current()
      return
    }
    if (usingWorker && workerStartingRef.current) return
    lastFrameTimeRef.current = 0
    scheduleRender()
  }, [
    composedControllers,
    continuousEffective,
    hasRuntimeBodyForces,
    hasRuntimeRegionEffects,
    reducedMotionRef,
    renderFnRef,
    scheduleRender,
    startWorkerIfNeeded
  ])

  const renderFrame = useCallback(() => {
    rafRef.current = 0
    const store = storeRef.current
    if (!store) return

    if (workerActiveRef.current && workerSessionRef.current) {
      if (workerPendingRef.current) return
      let deltaSeconds = 0
      if (!reducedMotionRef.current) {
        const now = performance.now()
        deltaSeconds = lastFrameTimeRef.current
          ? (now - lastFrameTimeRef.current) / 1000
          : 0
        lastFrameTimeRef.current = now
      }
      const session = workerSessionRef.current
      const generation = workerGenerationRef.current
      workerPendingRef.current = true
      const request = reducedMotionRef.current
        ? session.settle()
        : session.tick(deltaSeconds)
      request
        .then((frame) => {
          workerPendingRef.current = false
          if (workerGenerationRef.current !== generation) return
          finishWorkerFrame(frame)
        })
        .catch((error) => {
          workerPendingRef.current = false
          if (workerGenerationRef.current !== generation) return
          handleWorkerError(error)

          const result = reducedMotionRef.current
            ? store.settleWithObservations()
            : store.tick(deltaSeconds)
          runPhysicsPostTick({
            store,
            result,
            regionEffects: regionEffectsRef.current,
            regionState: regionStateRef.current,
            bodyForces: bodyForcesRef.current,
            composed: composedControllersRef.current,
            onTick: onTickRef.current
          })
          paint()
        })
      return
    }

    let result: PhysicsPipelineTickResult | null = null
    if (reducedMotionRef.current) {
      result = store.settleWithObservations()
    } else {
      const now = performance.now()
      const deltaSeconds = lastFrameTimeRef.current
        ? (now - lastFrameTimeRef.current) / 1000
        : 0
      lastFrameTimeRef.current = now
      result = store.tick(deltaSeconds)
    }

    const composed = composedControllersRef.current
    const { regionEffectsApplied, bodyForcesApplied, snapshot: latest } =
      runPhysicsPostTick({
        store,
        result,
        regionEffects: regionEffectsRef.current,
        regionState: regionStateRef.current,
        bodyForces: bodyForcesRef.current,
        composed,
        onTick: onTickRef.current
      })
    paint()

    const popAnimationsActive = popAnimationsRef.current.size > 0
    if (
      (continuousRef.current ||
        result.shouldContinue ||
        regionEffectsApplied ||
        bodyForcesApplied ||
        Boolean(composed) ||
        popAnimationsActive) &&
      !latest.paused &&
      latest.visible &&
      !reducedMotionRef.current
    ) {
      rafRef.current = requestAnimationFrame(() => renderFnRef.current())
    }
  }, [
    finishWorkerFrame,
    handleWorkerError,
    paint,
    rafRef,
    reducedMotionRef,
    renderFnRef
  ])

  renderFnRef.current = renderFrame

  useHydrationLifecycle({
    hydrated,
    wasHydratingFromSSR,
    storeRef: storeRef as React.RefObject<{
      cancelIntroAnimation?: () => void
    } | null>,
    dirtyRef,
    renderFnRef
  })

  useEffect(() => {
    workerFailedRef.current = false
    if (workerActiveRef.current || workerStartingRef.current) {
      stopWorker("config changed", false)
    }
    storeRef.current?.updateConfig(augmentedConfig ?? {})
    requestRender()
    // requestRender depends on paint/layout callbacks; config changes are the
    // intentional trigger here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [augmentedConfig, stopWorker])

  useEffect(() => {
    workerFailedRef.current = false
    requestRender()
    // requestRender depends on paint/layout callbacks; hydration and execution
    // settings are the intentional triggers here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, simulationExecution, workerBodyThreshold])

  useEffect(() => {
    const store = storeRef.current
    if (!store) return
    store.setPaused(paused)
    postWorkerCommand({ type: "setPaused", paused }, false)
    requestRender()
    // postWorkerCommand/requestRender depend on paint callbacks; paused is the
    // intentional trigger here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused])

  useEffect(() => {
    if (!suspendWhenHidden || typeof document === "undefined") return
    const update = () => {
      const store = storeRef.current
      if (!store) return
      const visible = documentIsVisible()
      store.setVisible(visible)
      postWorkerCommand({ type: "setVisible", visible }, false)
      requestRender()
    }
    update()
    document.addEventListener("visibilitychange", update)
    return () => document.removeEventListener("visibilitychange", update)
    // postWorkerCommand/requestRender depend on paint callbacks; visibility
    // listener registration only follows suspendWhenHidden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suspendWhenHidden])

  useEffect(() => {
    return () => stopWorker("unmount", false)
  }, [stopWorker])

  useEffect(() => {
    paint()
  }, [paint])

  useImperativeHandle(
    ref,
    (): StreamPhysicsFrameHandle => ({
      ...storeRef.current!.controls(),
      applyImpulse: (id, ix, iy) => {
        storeRef.current!.applyImpulse(id, ix, iy)
        postWorkerCommand({ type: "applyImpulse", id, ix, iy })
        requestRender()
      },
      clear: () => {
        storeRef.current!.clear()
        regionStateRef.current.clear()
        popAnimationsRef.current.clear()
        postWorkerCommand({ type: "clear" })
        requestRender()
      },
      clearRegionState: (bodyId) => {
        if (bodyId) regionStateRef.current.delete(bodyId)
        else regionStateRef.current.clear()
        requestRender()
      },
      getData: () => storeRef.current!.readBodies(),
      getRegionState: (bodyId) =>
        bodyId
          ? publicRegionState(regionStateRef.current.get(bodyId))
          : cloneRegionStateSnapshot(regionStateRef.current),
      getStore: () => storeRef.current!,
      pause: () => {
        storeRef.current!.setPaused(true)
        postWorkerCommand({ type: "setPaused", paused: true }, false)
        requestRender()
      },
      push: (spawn, pacing) => {
        storeRef.current!.enqueue(spawn, pacing)
        if (isPhysicsWorkerPacingSupported(pacing)) {
          postWorkerCommand({ type: "enqueue", spawns: [spawn], pacing })
        } else if (workerActiveRef.current || workerStartingRef.current) {
          stopWorker("spawn pacing is not worker-cloneable")
        }
        requestRender()
      },
      pushMany: (spawns, pacing) => {
        storeRef.current!.enqueue(spawns, pacing)
        if (isPhysicsWorkerPacingSupported(pacing)) {
          postWorkerCommand({ type: "enqueue", spawns, pacing })
        } else if (workerActiveRef.current || workerStartingRef.current) {
          stopWorker("spawn pacing is not worker-cloneable")
        }
        requestRender()
      },
      popBodies: (ids, options = {}) => {
        const store = storeRef.current!
        const bodyById = new Map(store.readBodies().map((body) => [body.id, body]))
        const removed = store.remove(ids)
        const now = typeof performance !== "undefined" ? performance.now() : Date.now()
        for (const id of removed) {
          const body = bodyById.get(id)
          if (!body) continue
          regionStateRef.current.delete(id)
          popAnimationsRef.current.set(id, {
            body,
            color: options.color ?? "#f59e0b",
            durationMs: Math.max(120, options.durationMs ?? 520),
            radius: options.radius ?? physicsBodyRadius(body),
            startedAt: now
          })
          if (focusedBodyIdRef.current === id) {
            focusedBodyIdRef.current = null
            setFocusedSemanticItem(null)
          }
          setHoverData((current) => current?.id === id ? null : current)
        }
        if (removed.length) {
          postWorkerCommand({ type: "remove", ids: removed })
          requestRender()
        }
        return removed
      },
      remove: (ids) => {
        const removed = storeRef.current!.remove(ids)
        for (const id of ids) regionStateRef.current.delete(id)
        postWorkerCommand({ type: "remove", ids })
        requestRender()
        return removed
      },
      restore: (snapshot: PhysicsPipelineSnapshot) => {
        storeRef.current!.restore(snapshot)
        regionStateRef.current.clear()
        popAnimationsRef.current.clear()
        postWorkerCommand({ type: "restore", snapshot }, false)
        requestRender()
      },
      resume: () => {
        storeRef.current!.setPaused(false)
        postWorkerCommand({ type: "setPaused", paused: false }, false)
        requestRender()
      },
      settle: (maxSteps) => {
        const steps = storeRef.current!.settle(maxSteps)
        postWorkerCommand({ type: "settle", maxSteps })
        requestRender()
        return steps
      },
      settleWithObservations: (maxSteps) => {
        const result = storeRef.current!.settleWithObservations(maxSteps)
        postWorkerCommand({ type: "settle", maxSteps })
        requestRender()
        return result
      },
      step: (deltaSeconds) => {
        const store = storeRef.current!
        const result = store.tick(deltaSeconds)
        runPhysicsPostTick({
          store,
          result,
          regionEffects: regionEffectsRef.current,
          regionState: regionStateRef.current,
          bodyForces: bodyForcesRef.current,
          composed: composedControllersRef.current,
          onTick: onTickRef.current
        })
        postWorkerCommand({ type: "tick", deltaSeconds })
        paint()
        return result
      }
    }),
    [paint, postWorkerCommand, requestRender, stopWorker]
  )

  const serverLikeRender =
    isServerEnvironment || (!hydrated && wasHydratingFromSSR)
  const wrapperClassName = [
    "stream-physics-frame",
    chartMode ? `stream-physics-frame--mode-${chartMode}` : null,
    emphasis ? `stream-physics-frame--emphasis-${emphasis}` : null,
    className
  ]
    .filter(Boolean)
    .join(" ")
  const ariaLabel =
    description ??
    (typeof title === "string" ? title : undefined) ??
    "Physics chart"
  const tableId = `${svgInstanceId}-physics-table`
  const plotWidth = Math.max(1, size[0] - margin.left - margin.right)
  const plotHeight = Math.max(1, size[1] - margin.top - margin.bottom)
  const tooltipRendered =
    enableHover && hoverData
      ? tooltipContent
        ? tooltipContent(hoverData)
        : <DefaultPhysicsTooltip hover={hoverData} />
      : null
  const adjustedWidth = Math.max(1, size[0] - margin.left - margin.right)
  const adjustedHeight = Math.max(1, size[1] - margin.top - margin.bottom)
  const tooltipElement = tooltipRendered && hoverData ? (
    <FlippingTooltip
      x={hoverData.x - margin.left}
      y={hoverData.y - margin.top}
      containerWidth={adjustedWidth}
      containerHeight={adjustedHeight}
      margin={margin}
      className="stream-physics-tooltip"
    >
      {tooltipRendered}
    </FlippingTooltip>
  ) : null

  if (serverLikeRender) {
    const store =
      storeRef.current ?? createStore(augmentedConfig, initialSpawns, initialSpawnPacing)
    const titleText = typeof title === "string" ? title : undefined
    const { svg } = renderPhysicsSettledSVG(store, {
      width: size[0],
      height: size[1],
      title: titleText,
      description,
      background: background === "transparent" ? undefined : background,
      className: "stream-physics-frame__svg",
      idPrefix: `physics-${svgInstanceId}`
    })
    return (
      <div
        ref={responsiveRef}
        className={wrapperClassName}
        data-semiotic-mode={chartMode}
        role="img"
        aria-label={ariaLabel}
        style={{ width: size[0], height: size[1] }}
      >
        <ScreenReaderSummary summary={summary} />
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
    )
  }

  return (
    <div
      ref={responsiveRef}
      className={wrapperClassName}
      data-semiotic-mode={chartMode}
      role="group"
      aria-label={ariaLabel}
      aria-describedby={focusedSemanticItem ? liveRegionId : undefined}
      tabIndex={0}
      style={{
        position: "relative",
        width: size[0],
        height: size[1]
      }}
      onKeyDown={onKeyDown}
    >
      {accessibleTable ? <SkipToTableLink tableId={tableId} /> : null}
      {accessibleTable ? (
        <PhysicsSemanticDataTable
          chartTitle={typeof title === "string" ? title : ariaLabel}
          items={allSemanticItems}
          tableId={tableId}
        />
      ) : null}
      <ScreenReaderSummary summary={summary} />
      {/* Live region must sit outside role="img" so AT announces hover/focus. */}
      <AriaLiveTooltip hoverPoint={hoverData} />
      <div id={liveRegionId} aria-live="polite" aria-atomic="true" style={SR_ONLY_STYLE}>
        {focusedSemanticItem
          ? focusedSemanticItem.description ?? focusedSemanticItem.label
          : ""}
      </div>
      <div
        role="img"
        aria-label={ariaLabel}
        style={{ position: "relative", width: "100%", height: "100%" }}
      >
        {resolvedBackground}
        <canvas
          ref={canvasRef}
          width={size[0]}
          height={size[1]}
          aria-hidden="true"
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={enableHover ? handleCanvasPointerMove : undefined}
          onPointerLeave={enableHover ? clearHover : undefined}
        />
        {resolvedForeground}
        <PhysicsSVGOverlay
          width={plotWidth}
          height={plotHeight}
          totalWidth={size[0]}
          totalHeight={size[1]}
          margin={margin}
          title={title}
          legend={legend}
          legendPosition={legendPosition}
          legendLayout={legendLayout}
          legendHoverBehavior={legendHoverBehavior}
          legendClickBehavior={legendClickBehavior}
          legendHighlightedCategory={legendHighlightedCategory}
          legendIsolatedCategories={legendIsolatedCategories}
          pointNodes={annotationAnchors}
          annotations={annotations}
          autoPlaceAnnotations={autoPlaceAnnotations}
          svgAnnotationRules={svgAnnotationRules}
        />
        <FocusRing
          active={focusedSemanticItem != null}
          hoverPoint={
            focusedSemanticItem
              ? { x: focusedSemanticItem.x, y: focusedSemanticItem.y }
              : null
          }
          margin={margin}
          size={size}
          shape={focusedSemanticItem?.shape}
          width={focusedSemanticItem?.width}
          height={focusedSemanticItem?.height}
          pathData={focusedSemanticItem?.pathData}
        />
        {tooltipElement}
      </div>
    </div>
  )
})

StreamPhysicsFrame.displayName = "StreamPhysicsFrame"

export default StreamPhysicsFrame
