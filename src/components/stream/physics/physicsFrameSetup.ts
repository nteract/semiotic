import {
  PhysicsPipelineStore,
  type PhysicsPipelineConfig,
  type PhysicsQueuedSpawn,
  type PhysicsSpawnPacingOptions,
} from "./PhysicsPipelineStore"

/** Create the retained simulation store and seed its initial queued bodies. */
export function createPhysicsFrameStore(
  config: PhysicsPipelineConfig | undefined,
  initialSpawns: PhysicsQueuedSpawn[] | undefined,
  initialSpawnPacing: PhysicsSpawnPacingOptions | undefined,
): PhysicsPipelineStore {
  const store = new PhysicsPipelineStore(config)
  if (initialSpawns?.length) store.enqueue(initialSpawns, initialSpawnPacing)
  return store
}

export function defaultPhysicsFrameClock(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now()
}
