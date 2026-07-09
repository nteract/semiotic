/**
 * Public types for PhysicsPipelineStore.
 * Separated so helpers, frames, and recipes can import types without the store class.
 */

import type {
  PhysicsBodySpec,
  PhysicsBodyState,
  PhysicsColliderSpec,
  PhysicsKernelEvent,
  PhysicsKernelOptions,
  PhysicsKernelSnapshot,
  PhysicsSpringSpec
} from "./PhysicsKernel"
import type { PhysicsEngineAdapterInput } from "./PhysicsEngineAdapter"
import type {
  PhysicsSedimentBinSnapshot,
  PhysicsSedimentColumn,
  PhysicsSedimentConfig,
  PhysicsSedimentHeightfieldOptions,
  PhysicsSedimentTotals
} from "./PhysicsSediment"
import type {
  PhysicsBodyBudgetDecision,
  PhysicsBodyBudgetOptions
} from "./PhysicsBodyBudget"

export interface PhysicsPlotBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface PhysicsBoundsColliderOptions {
  idPrefix?: string
  includeFloor?: boolean
  includeCeiling?: boolean
  includeLeftWall?: boolean
  includeRightWall?: boolean
  wallThickness?: number
  floorThickness?: number
}

export interface PhysicsXBinColliderOptions {
  idPrefix?: string
  count: number
  domainStart: number
  domainStep: number
  xScale: (value: number) => number
  yTop: number
  yBottom: number
  wallThickness?: number
  includeBoundaryWalls?: boolean
  includeInteriorWalls?: boolean
  closedBefore?: number
  lidY?: number
  lidThickness?: number
}

export type PhysicsSpawnSpringSpec = Omit<PhysicsSpringSpec, "bodyId">

export interface PhysicsQueuedSpawn extends PhysicsBodySpec {
  spawnAt?: number
  springs?: PhysicsSpawnSpringSpec[]
}

export type PhysicsSpawnPacing =
  | "immediate"
  | "arrival"
  | { ratePerSec: number }

export type PhysicsSpawnTimeAccessor =
  | string
  | ((spawn: PhysicsQueuedSpawn, index: number) => unknown)

export interface PhysicsSpawnPacingOptions {
  pacing?: PhysicsSpawnPacing
  startAt?: number
  timeAccessor?: PhysicsSpawnTimeAccessor
  timeScale?: number
}

export interface PhysicsPipelineQueuedSpawnSnapshot extends PhysicsQueuedSpawn {
  sequence: number
  spawnAt: number
}

export type PhysicsObservationEventType =
  | "physics-spawn"
  | "physics-settle"
  | "physics-sediment"
  | "physics-budget-warning"
  | "physics-budget-overflow"
  | "physics-bin-enter"
  | "physics-bin-exit"
  | "physics-proximity-enter"
  | "physics-proximity-exit"
  | "physics-late"
  | "physics-barrier-cross"
  | "physics-capacity-processed"
  | "physics-capacity-queued"
  | "sim-active"
  | "sim-idle"

export type PhysicsSimulationState = "running" | "paused" | "settled"

export interface PhysicsObservationEvent {
  type: PhysicsObservationEventType
  timestamp: number
  chartType: string
  chartId: string
  bodyId?: string
  datum?: unknown
  x?: number
  y?: number
  sensorId?: string
  binId?: string
  barrierId?: string
  barrierValue?: number
  count?: number
  total?: number
  budgetAction?: PhysicsBodyBudgetDecision["action"]
  bodyLimit?: number
  engineMaxBodiesHint?: number
  liveBodies?: number
  overflow?: number
  projectedBodies?: number
  queuedBodies?: number
  warnAt?: number
  simulationState?: PhysicsSimulationState
  previousSimulationState?: PhysicsSimulationState
  /** Capacitated region id for capacity queue controllers. */
  regionId?: string
  /** Work units processed when a capacity queue releases a body. */
  work?: number
}

export type PhysicsObservationRecord = Omit<
  PhysicsObservationEvent,
  "timestamp" | "chartType" | "chartId"
> &
  Partial<Pick<PhysicsObservationEvent, "timestamp" | "chartType" | "chartId">>

export interface PhysicsSensorObservationConfig {
  binId?: string
  enterType?: PhysicsObservationEventType
  exitType?: PhysicsObservationEventType
}

export interface PhysicsPipelineObservationOptions {
  chartId?: string
  chartType?: string
  sensors?: Record<string, PhysicsSensorObservationConfig>
  onObservation?: (event: PhysicsObservationEvent) => void
  onSimulationStateChange?: (
    state: PhysicsSimulationState,
    previousState: PhysicsSimulationState
  ) => void
}

export interface PhysicsPipelineConfig {
  bodyBudget?: false | PhysicsBodyBudgetOptions
  engine?: PhysicsEngineAdapterInput
  kernel?: PhysicsKernelOptions
  colliders?: PhysicsColliderSpec[]
  bodyLimit?: number
  eviction?: false | "oldest" | "sleeping-first"
  sediment?: false | PhysicsSedimentConfig
  fixedDt?: number
  maxDeltaSeconds?: number
  maxSubsteps?: number
  settleStepLimit?: number
  timeScale?: number
  observation?: PhysicsPipelineObservationOptions
}

export interface PhysicsPipelineTickResult {
  budget: PhysicsBodyBudgetDecision
  elapsedSeconds: number
  evicted: string[]
  events: PhysicsKernelEvent[]
  observations: PhysicsObservationEvent[]
  queueSize: number
  revision: number
  shouldContinue: boolean
  sleeping: boolean
  sedimented: string[]
  spawned: string[]
  steps: number
}

export interface PhysicsPipelineSnapshot {
  accumulator: number
  activeSensorPairs: string[]
  bodyBudget: false | PhysicsBodyBudgetOptions
  config: Required<
    Omit<
      PhysicsPipelineConfig,
      | "bodyBudget"
      | "colliders"
      | "engine"
      | "kernel"
      | "observation"
      | "sediment"
    >
  > & { kernel: Required<PhysicsKernelOptions> }
  elapsedSeconds: number
  paused: boolean
  queue: PhysicsPipelineQueuedSpawnSnapshot[]
  revision: number
  sediment: PhysicsSedimentBinSnapshot[]
  simulationState: PhysicsSimulationState
  liveBodyOrder: string[]
  visible: boolean
  world: PhysicsKernelSnapshot
}

export interface PhysicsPipelineControlSurface {
  applyImpulse: (id: string, ix: number, iy: number) => void
  clear: () => void
  hitTest: (x: number, y: number, radius?: number) => PhysicsBodyState | null
  pause: () => void
  push: (spawn: PhysicsQueuedSpawn, pacing?: PhysicsSpawnPacingOptions) => void
  pushMany: (
    spawns: PhysicsQueuedSpawn[],
    pacing?: PhysicsSpawnPacingOptions
  ) => void
  readBodies: (out?: PhysicsBodyState[]) => PhysicsBodyState[]
  readSediment: () => PhysicsSedimentBinSnapshot[]
  bodyBudgetStatus: () => PhysicsBodyBudgetDecision
  recordObservation: (event: PhysicsObservationRecord) => PhysicsObservationEvent
  remove: (ids: string[]) => string[]
  restore: (snapshot: PhysicsPipelineSnapshot) => void
  resume: () => void
  settle: (maxSteps?: number) => number
  settleWithObservations: (maxSteps?: number) => PhysicsPipelineTickResult
  snapshot: () => PhysicsPipelineSnapshot
  sedimentHeightfield: (
    options?: PhysicsSedimentHeightfieldOptions
  ) => PhysicsSedimentColumn[]
  sedimentTotals: () => PhysicsSedimentTotals
  step: (deltaSeconds: number) => PhysicsPipelineTickResult
}
