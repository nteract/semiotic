import type { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import type { PhysicsPipelineControlSurface } from "./PhysicsPipelineTypes"

/** Project the store's public methods into the stable imperative control API. */
export function createPhysicsPipelineControls(
  store: PhysicsPipelineStore
): PhysicsPipelineControlSurface {
  return {
    applyImpulse: (id, ix, iy) => store.applyImpulse(id, ix, iy),
    clear: () => store.clear(),
    hitTest: (x, y, radius) => store.hitTest(x, y, radius),
    pause: () => store.setPaused(true),
    push: (spawn, pacing) => store.enqueue(spawn, pacing),
    pushMany: (spawns, pacing) => store.enqueue(spawns, pacing),
    bodyBudgetStatus: () => store.bodyBudgetStatus(),
    readBodies: (out) => store.readBodies(out),
    readSediment: () => store.readSediment(),
    recordObservation: (event) => store.recordObservation(event),
    remove: (ids) => store.remove(ids),
    restore: (snapshot) => store.restore(snapshot),
    resume: () => store.setPaused(false),
    settle: (maxSteps) => store.settle(maxSteps),
    settleWithObservations: (maxSteps) => store.settleWithObservations(maxSteps),
    snapshot: () => store.snapshot(),
    sedimentHeightfield: (options) => store.sedimentHeightfield(options),
    sedimentTotals: () => store.sedimentTotals(),
    step: (deltaSeconds) => store.tick(deltaSeconds)
  }
}
