/**
 * Pure physics pipeline helpers: spawn scheduling, colliders, cloning, hit geometry.
 * Extracted from PhysicsPipelineStore so the store class stays orchestration-only.
 */

import {
  type PhysicsActiveSensorPair,
  type PhysicsBodyState,
  type PhysicsColliderSpec,
  type PhysicsKernelOptions,
  type PhysicsKernelSnapshot
} from "./PhysicsKernel"
import type { PhysicsBodyBudgetOptions } from "./PhysicsBodyBudget"
import type {
  PhysicsBoundsColliderOptions,
  PhysicsObservationEvent,
  PhysicsPipelineConfig,
  PhysicsPipelineObservationOptions,
  PhysicsPipelineQueuedSpawnSnapshot,
  PhysicsPlotBounds,
  PhysicsQueuedSpawn,
  PhysicsSensorObservationConfig,
  PhysicsSimulationState,
  PhysicsSpawnPacingOptions,
  PhysicsSpawnTimeAccessor,
  PhysicsXBinColliderOptions
} from "./PhysicsPipelineTypes"

export type InternalQueuedSpawn = PhysicsPipelineQueuedSpawnSnapshot

export const DEFAULT_PHYSICS_PIPELINE_CONFIG: Required<
  Omit<
    PhysicsPipelineConfig,
    | "bodyBudget"
    | "colliders"
    | "engine"
    | "kernel"
    | "observation"
    | "sediment"
  >
> = {
  bodyLimit: Number.POSITIVE_INFINITY,
  eviction: "oldest",
  fixedDt: 1 / 120,
  maxDeltaSeconds: 0.1,
  maxSubsteps: 8,
  settleStepLimit: 1200,
  timeScale: 1
}

export interface NormalizedObservationConfig {
  chartId: string
  chartType: string
  sensors: Record<string, PhysicsSensorObservationConfig>
  onObservation?: (event: PhysicsObservationEvent) => void
  onSimulationStateChange?: (
    state: PhysicsSimulationState,
    previousState: PhysicsSimulationState
  ) => void
}

export const DEFAULT_OBSERVATION_CONFIG: NormalizedObservationConfig = {
  chartId: "physics",
  chartType: "physics",
  sensors: {},
  onObservation: undefined,
  onSimulationStateChange: undefined
}

export function normalizeObservationConfig(
  options: PhysicsPipelineObservationOptions = {},
  previous: NormalizedObservationConfig = DEFAULT_OBSERVATION_CONFIG
): NormalizedObservationConfig {
  return {
    chartId: options.chartId ?? previous.chartId,
    chartType: options.chartType ?? previous.chartType,
    sensors: options.sensors ?? previous.sensors,
    onObservation: options.onObservation ?? previous.onObservation,
    onSimulationStateChange:
      options.onSimulationStateChange ?? previous.onSimulationStateChange
  }
}

export function cloneSpawn(spawn: PhysicsQueuedSpawn): PhysicsQueuedSpawn {
  return {
    ...spawn,
    shape: { ...spawn.shape },
    datum: spawn.datum,
    springs: spawn.springs?.map((spring) => ({
      ...spring,
      target: { ...spring.target }
    }))
  }
}

export function finiteNumber(value: unknown): number | undefined {
  if (value instanceof Date) {
    const time = value.getTime()
    return Number.isFinite(time) ? time : undefined
  }
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN
  return Number.isFinite(number) ? number : undefined
}

function spawnRecordValue(
  spawn: PhysicsQueuedSpawn,
  key: string
): unknown {
  const spawnRecord = spawn as unknown as Record<string, unknown>
  if (spawnRecord[key] != null) return spawnRecord[key]
  const datum = spawn.datum
  if (datum && typeof datum === "object") {
    return (datum as Record<string, unknown>)[key]
  }
  return undefined
}

function spawnTimeValue(
  spawn: PhysicsQueuedSpawn,
  index: number,
  accessor?: PhysicsSpawnTimeAccessor
): number | undefined {
  if (typeof accessor === "function") {
    return finiteNumber(accessor(spawn, index))
  }
  if (typeof accessor === "string") {
    return finiteNumber(spawnRecordValue(spawn, accessor))
  }
  return (
    finiteNumber(spawn.spawnAt) ??
    finiteNumber(spawnRecordValue(spawn, "arrivalTime")) ??
    finiteNumber(spawnRecordValue(spawn, "timestamp")) ??
    finiteNumber(spawnRecordValue(spawn, "time")) ??
    finiteNumber(spawnRecordValue(spawn, "eventTime"))
  )
}

export function schedulePhysicsSpawns(
  spawns: PhysicsQueuedSpawn[],
  options: PhysicsSpawnPacingOptions = {}
): PhysicsQueuedSpawn[] {
  const startAt = finiteNumber(options.startAt) ?? 0
  const pacing = options.pacing ?? "immediate"

  if (pacing === "arrival") {
    const values = spawns.map((spawn, index) =>
      spawnTimeValue(spawn, index, options.timeAccessor)
    )
    const finiteValues = values.filter(
      (value): value is number => value != null
    )
    const first = finiteValues.length > 0 ? Math.min(...finiteValues) : 0
    // Playback-speed semantics: higher timeScale = faster (less spread).
    // timeScale=1 replays arrivals in real event-time; 10 is 10× fast-forward.
    const rawScale = finiteNumber(options.timeScale) ?? 1
    const timeScale = rawScale > 0 ? rawScale : 1
    return spawns.map((spawn, index) => {
      const value = values[index]
      const delta = value == null ? 0 : Math.max(0, value - first)
      return {
        ...cloneSpawn(spawn),
        spawnAt: startAt + delta / timeScale
      }
    })
  }

  if (typeof pacing === "object") {
    const rate = finiteNumber(pacing.ratePerSec)
    if (rate && rate > 0) {
      return spawns.map((spawn, index) => ({
        ...cloneSpawn(spawn),
        spawnAt: startAt + index / rate
      }))
    }
  }

  return spawns.map((spawn) => ({
    ...cloneSpawn(spawn),
    spawnAt: startAt
  }))
}

export function cloneQueuedSpawn(spawn: InternalQueuedSpawn): InternalQueuedSpawn {
  return {
    ...cloneSpawn(spawn),
    sequence: spawn.sequence,
    spawnAt: spawn.spawnAt
  }
}

export function cloneColliders(
  colliders: PhysicsColliderSpec[]
): PhysicsColliderSpec[] {
  return colliders.map((collider) => ({
    ...collider,
    shape: { ...collider.shape },
    bodyFilter:
      collider.bodyFilter && typeof collider.bodyFilter !== "function"
        ? {
            ...collider.bodyFilter,
            oneOf: collider.bodyFilter.oneOf?.slice(),
            notOneOf: collider.bodyFilter.notOneOf?.slice()
          }
        : collider.bodyFilter
  }))
}

export function cloneBodyBudgetOptions(
  options: false | PhysicsBodyBudgetOptions
): false | PhysicsBodyBudgetOptions {
  return options === false ? false : { ...options }
}

export function sortQueue(a: InternalQueuedSpawn, b: InternalQueuedSpawn): number {
  return a.spawnAt === b.spawnAt
    ? a.sequence - b.sequence
    : a.spawnAt - b.spawnAt
}

export function requiredKernelOptions(
  kernel: PhysicsKernelSnapshot["options"]
): Required<PhysicsKernelOptions> {
  return {
    ...kernel,
    gravity: { ...kernel.gravity }
  }
}

export function bodySearchRadius(body: PhysicsBodyState): number {
  if (body.shape.type === "circle") return body.shape.radius
  return Math.hypot(body.shape.width, body.shape.height) / 2
}

export function bodyHitDistanceSquared(
  body: PhysicsBodyState,
  x: number,
  y: number,
  radius: number
): number | null {
  if (body.shape.type === "circle") {
    const dx = body.x - x
    const dy = body.y - y
    const allowed = body.shape.radius + radius
    const distanceSquared = dx * dx + dy * dy
    return distanceSquared <= allowed * allowed ? distanceSquared : null
  }

  const dx = Math.max(Math.abs(x - body.x) - body.shape.width / 2, 0)
  const dy = Math.max(Math.abs(y - body.y) - body.shape.height / 2, 0)
  const distanceSquared = dx * dx + dy * dy
  return distanceSquared <= radius * radius ? distanceSquared : null
}

export function sensorPairKey(sensorId: string, bodyId: string): string {
  return `${sensorId}\u0000${bodyId}`
}

export function parseSensorPairKey(key: string): PhysicsActiveSensorPair {
  const index = key.indexOf("\u0000")
  return {
    sensorId: key.slice(0, index),
    bodyId: key.slice(index + 1)
  }
}

export type PhysicsQuadtreeLeaf = {
  data?: PhysicsBodyState
  next?: PhysicsQuadtreeLeaf
  length?: number
}

export function collidersFromPlotBounds(
  bounds: PhysicsPlotBounds,
  options: PhysicsBoundsColliderOptions = {}
): PhysicsColliderSpec[] {
  const {
    idPrefix = "plot",
    includeFloor = true,
    includeCeiling = false,
    includeLeftWall = true,
    includeRightWall = true,
    wallThickness = 20,
    floorThickness = wallThickness
  } = options
  const colliders: PhysicsColliderSpec[] = []
  const midX = bounds.x + bounds.width / 2
  const midY = bounds.y + bounds.height / 2

  if (includeFloor) {
    colliders.push({
      id: `${idPrefix}-floor`,
      shape: {
        type: "aabb",
        x: midX,
        y: bounds.y + bounds.height + floorThickness / 2,
        width: bounds.width + wallThickness * 2,
        height: floorThickness
      }
    })
  }
  if (includeCeiling) {
    colliders.push({
      id: `${idPrefix}-ceiling`,
      shape: {
        type: "aabb",
        x: midX,
        y: bounds.y - floorThickness / 2,
        width: bounds.width + wallThickness * 2,
        height: floorThickness
      }
    })
  }
  if (includeLeftWall) {
    colliders.push({
      id: `${idPrefix}-left-wall`,
      shape: {
        type: "aabb",
        x: bounds.x - wallThickness / 2,
        y: midY,
        width: wallThickness,
        height: bounds.height + floorThickness * 2
      }
    })
  }
  if (includeRightWall) {
    colliders.push({
      id: `${idPrefix}-right-wall`,
      shape: {
        type: "aabb",
        x: bounds.x + bounds.width + wallThickness / 2,
        y: midY,
        width: wallThickness,
        height: bounds.height + floorThickness * 2
      }
    })
  }

  return colliders
}

export function collidersFromXScaleBins(
  options: PhysicsXBinColliderOptions
): PhysicsColliderSpec[] {
  const {
    idPrefix = "bin",
    count,
    domainStart,
    domainStep,
    xScale,
    yTop,
    yBottom,
    wallThickness = 4,
    includeBoundaryWalls = true,
    includeInteriorWalls = true,
    closedBefore,
    lidY = yTop,
    lidThickness = Math.max(2, wallThickness)
  } = options
  const colliders: PhysicsColliderSpec[] = []
  const wallY = yTop + (yBottom - yTop) / 2
  const wallHeight = Math.abs(yBottom - yTop)
  const firstWall = includeBoundaryWalls ? 0 : 1
  const lastWall = includeBoundaryWalls ? count : count - 1

  if (includeInteriorWalls || includeBoundaryWalls) {
    for (let i = firstWall; i <= lastWall; i += 1) {
      if (!includeInteriorWalls && i > 0 && i < count) continue
      const x = xScale(domainStart + i * domainStep)
      colliders.push({
        id: `${idPrefix}-wall-${i}`,
        shape: {
          type: "aabb",
          x,
          y: wallY,
          width: wallThickness,
          height: wallHeight
        }
      })
    }
  }

  if (closedBefore != null) {
    for (let i = 0; i < count; i += 1) {
      const start = domainStart + i * domainStep
      const end = start + domainStep
      if (end >= closedBefore) continue
      const x0 = xScale(start)
      const x1 = xScale(end)
      colliders.push({
        id: `${idPrefix}-lid-${i}`,
        shape: {
          type: "segment",
          x1: Math.min(x0, x1) + wallThickness / 2,
          y1: lidY,
          x2: Math.max(x0, x1) - wallThickness / 2,
          y2: lidY,
          thickness: lidThickness
        }
      })
    }
  }

  return colliders
}

export interface PhysicsPipelineEvictionResult {
  evicted: string[]
  sedimented: string[]
}
