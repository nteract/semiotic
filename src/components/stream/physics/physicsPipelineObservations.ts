import { physicsBodyLookup } from "./physicsBodyLookup"
import type { PhysicsBodyBudgetDecision } from "./PhysicsBodyBudget"
import type { PhysicsEngineAdapter } from "./PhysicsEngineAdapter"
import type { PhysicsKernelEvent } from "./PhysicsKernel"
import type {
  PhysicsObservationEvent,
  PhysicsQueuedSpawn,
  PhysicsSimulationState
} from "./PhysicsPipelineTypes"
import {
  parseSensorPairKey,
  sensorPairKey,
  type NormalizedObservationConfig
} from "./physicsPipelineHelpers"

export interface PhysicsObservationContext {
  elapsedSeconds: number
  observation: NormalizedObservationConfig
  emit: (event: PhysicsObservationEvent) => void
}

/** Deduplicate budget warnings until either the action or budget state changes. */
export function observePhysicsBudgetDecision(
  decision: PhysicsBodyBudgetDecision,
  enabled: boolean,
  previousKey: string,
  context: PhysicsObservationContext
): string {
  if (!enabled || decision.state === "ok") return "ok"
  const key = `${decision.state}:${decision.action}`
  if (key !== previousKey) emitPhysicsBodyBudgetObservation(decision, context)
  return key
}

export function emitPhysicsSpawnObservation(
  world: PhysicsEngineAdapter,
  spawn: PhysicsQueuedSpawn,
  context: PhysicsObservationContext
): void {
  const body = physicsBodyLookup(world)(spawn.id)
  context.emit({
    type: "physics-spawn",
    timestamp: context.elapsedSeconds,
    chartType: context.observation.chartType,
    chartId: context.observation.chartId,
    bodyId: spawn.id,
    datum: body?.datum ?? spawn.datum,
    x: body?.x ?? spawn.x,
    y: body?.y ?? spawn.y
  })
}

export function observePhysicsKernelEvents(
  world: PhysicsEngineAdapter,
  events: PhysicsKernelEvent[],
  context: PhysicsObservationContext
): void {
  const sleepEvents = events.filter((event) => event.type === "sleep")
  if (sleepEvents.length === 0) return
  const readBody = physicsBodyLookup(
    world,
    sleepEvents.map((event) => event.bodyId)
  )
  for (const event of sleepEvents) {
    const body = readBody(event.bodyId)
    context.emit({
      type: "physics-settle",
      timestamp: context.elapsedSeconds,
      chartType: context.observation.chartType,
      chartId: context.observation.chartId,
      bodyId: event.bodyId,
      datum: body?.datum,
      x: body?.x,
      y: body?.y
    })
  }
}

export function observePhysicsSensorTransitions(
  world: PhysicsEngineAdapter,
  previousPairs: ReadonlySet<string>,
  context: PhysicsObservationContext
): Set<string> {
  const currentPairs = new Set(
    world
      .activeSensorPairs()
      .map((pair) => sensorPairKey(pair.sensorId, pair.bodyId))
  )
  let changed = currentPairs.size !== previousPairs.size
  if (!changed) {
    for (const key of currentPairs) {
      if (!previousPairs.has(key)) {
        changed = true
        break
      }
    }
  }
  if (!changed) return currentPairs
  const entered = Array.from(currentPairs)
    .filter((key) => !previousPairs.has(key))
    .sort()
  const exited = Array.from(previousPairs)
    .filter((key) => !currentPairs.has(key))
    .sort()
  const readBody = physicsBodyLookup(
    world,
    [...entered, ...exited].map((key) => parseSensorPairKey(key).bodyId)
  )

  const emit = (direction: "enter" | "exit", key: string) => {
    const { sensorId, bodyId } = parseSensorPairKey(key)
    const sensor = context.observation.sensors[sensorId]
    const body = readBody(bodyId)
    context.emit({
      type:
        direction === "enter"
          ? (sensor?.enterType ?? "physics-bin-enter")
          : (sensor?.exitType ?? "physics-bin-exit"),
      timestamp: context.elapsedSeconds,
      chartType: context.observation.chartType,
      chartId: context.observation.chartId,
      bodyId,
      datum: body?.datum,
      x: body?.x,
      y: body?.y,
      sensorId,
      binId: sensor?.binId ?? sensorId
    })
  }

  for (const key of entered) emit("enter", key)
  for (const key of exited) emit("exit", key)
  return currentPairs
}

export function removePhysicsSensorPairsForBodies(
  pairs: Set<string>,
  bodyIds: ReadonlySet<string>
): void {
  for (const key of pairs) {
    if (bodyIds.has(parseSensorPairKey(key).bodyId)) pairs.delete(key)
  }
}

export function resolvePhysicsSimulationState(
  paused: boolean,
  visible: boolean,
  hasQueuedBodies: boolean,
  atRest: boolean
): PhysicsSimulationState {
  if (paused || !visible) return "paused"
  return hasQueuedBodies || !atRest ? "running" : "settled"
}

export function emitPhysicsSimulationStateTransition(
  previous: PhysicsSimulationState,
  next: PhysicsSimulationState,
  context: PhysicsObservationContext
): void {
  context.observation.onSimulationStateChange?.(next, previous)
  if (next !== "running" && next !== "settled") return
  context.emit({
    type: next === "running" ? "sim-active" : "sim-idle",
    timestamp: context.elapsedSeconds,
    chartType: context.observation.chartType,
    chartId: context.observation.chartId,
    simulationState: next,
    previousSimulationState: previous
  })
}

export function emitPhysicsBodyBudgetObservation(
  decision: PhysicsBodyBudgetDecision,
  context: PhysicsObservationContext
): void {
  context.emit({
    type:
      decision.state === "overflow"
        ? "physics-budget-overflow"
        : "physics-budget-warning",
    timestamp: context.elapsedSeconds,
    chartType: context.observation.chartType,
    chartId: context.observation.chartId,
    budgetAction: decision.action,
    bodyLimit: decision.bodyLimit,
    engineMaxBodiesHint: decision.engineMaxBodiesHint,
    liveBodies: decision.liveBodies,
    overflow: decision.overflow,
    projectedBodies: decision.projectedBodies,
    queuedBodies: decision.queuedBodies,
    warnAt: decision.warnAt
  })
}
