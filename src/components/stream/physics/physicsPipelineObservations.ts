import type { PhysicsEngineAdapter } from "./PhysicsEngineAdapter"
import type { PhysicsKernelEvent } from "./PhysicsKernel"
import type {
  PhysicsObservationEvent,
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

export function observePhysicsKernelEvents(
  world: PhysicsEngineAdapter,
  events: PhysicsKernelEvent[],
  context: PhysicsObservationContext
): void {
  if (events.length === 0) return
  const bodyById = new Map(world.readState().map((body) => [body.id, body]))
  for (const event of events) {
    if (event.type !== "sleep") continue
    const body = bodyById.get(event.bodyId)
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
    world.activeSensorPairs().map((pair) => sensorPairKey(pair.sensorId, pair.bodyId))
  )
  if (currentPairs.size === 0 && previousPairs.size === 0) return currentPairs
  const bodyById = new Map(world.readState().map((body) => [body.id, body]))

  const emit = (direction: "enter" | "exit", key: string) => {
    const { sensorId, bodyId } = parseSensorPairKey(key)
    const sensor = context.observation.sensors[sensorId]
    const body = bodyById.get(bodyId)
    context.emit({
      type: direction === "enter"
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

  for (const key of Array.from(currentPairs).sort()) {
    if (!previousPairs.has(key)) emit("enter", key)
  }
  for (const key of Array.from(previousPairs).sort()) {
    if (!currentPairs.has(key)) emit("exit", key)
  }
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
