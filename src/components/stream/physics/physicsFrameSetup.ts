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
  if (initialSpawns?.length) {
    store.enqueue(initialSpawns, initialSpawnPacing)
    // Seed bodies that are already due must exist before the first paint so
    // paused snapshots, SSR settled SVG, and the first client frame show them
    // without waiting for an unpaused tick (tick refuses to spawn while paused).
    store.materializeDueSpawns()
  }
  return store
}

export function defaultPhysicsFrameClock(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now()
}
