import type {
  PhysicsPipelineConfig,
  PhysicsPipelineRuntimeConfig,
  PhysicsPipelineSnapshot
} from "./PhysicsPipelineTypes"
import {
  cloneBodyBudgetOptions,
  requiredKernelOptions
} from "./physicsPipelineHelpers"
import { clonePhysicsConfigInput } from "./physicsPipelineUpdateResults"
import { resolvePhysicsSimulationState } from "./physicsPipelineObservations"

/** Copy retained scheduling/configuration fields independently of saved objects. */
export function restoredPhysicsPipelineFields(
  snapshot: PhysicsPipelineSnapshot
) {
  const config: PhysicsPipelineRuntimeConfig = {
    bodyLimit: snapshot.config.bodyLimit,
    eviction: snapshot.config.eviction,
    fixedDt: snapshot.config.fixedDt,
    maxDeltaSeconds: snapshot.config.maxDeltaSeconds,
    maxSubsteps: snapshot.config.maxSubsteps,
    settleStepLimit: snapshot.config.settleStepLimit,
    timeScale: snapshot.config.timeScale,
    viewTransform: { ...(snapshot.config.viewTransform ?? { x: 0, y: 0 }) }
  }
  const configInput: PhysicsPipelineConfig = clonePhysicsConfigInput({
    ...config,
    bodyBudget: cloneBodyBudgetOptions(snapshot.bodyBudget ?? {}),
    kernel: requiredKernelOptions(snapshot.world.options),
    ...(snapshot.emitters && { emitters: snapshot.emitters.options }),
    ...(snapshot.eventDrop && { eventDrop: snapshot.eventDrop.config })
  })
  return {
    config,
    configInput,
    bodyBudget: cloneBodyBudgetOptions(snapshot.bodyBudget ?? {}),
    activeSensorPairs: new Set(snapshot.activeSensorPairs),
    accumulator: snapshot.accumulator,
    elapsedSeconds: snapshot.elapsedSeconds,
    paused: snapshot.paused,
    revision: snapshot.revision,
    visible: snapshot.visible,
    liveBodyOrder: new Set(snapshot.liveBodyOrder),
    nextSequence:
      snapshot.nextSequence ??
      snapshot.queue.reduce((max, spawn) => Math.max(max, spawn.sequence), -1) +
        1,
    simulationState:
      snapshot.simulationState ??
      resolvePhysicsSimulationState(
        snapshot.paused,
        snapshot.visible,
        snapshot.queue.length > 0,
        snapshot.world.bodies.every((body) => body.sleeping)
      )
  }
}
