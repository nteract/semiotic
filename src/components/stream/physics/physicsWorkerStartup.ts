import type {
  PhysicsPipelineConfig,
  PhysicsPipelineStore
} from "./PhysicsPipelineStore"
import type { PhysicsWorkerSession } from "./PhysicsWorkerClient"
import type { PhysicsWorkerFrame } from "./PhysicsWorkerProtocol"

/**
 * Startup is asynchronous: pause, visibility, pushes and restores can happen
 * while the worker initializes. Never overwrite those newer host mutations
 * with the older initialization response.
 */
export async function initializeCurrentPhysicsWorker(
  session: Pick<PhysicsWorkerSession, "initFromSnapshot" | "restore">,
  store: PhysicsPipelineStore,
  config: PhysicsPipelineConfig,
  current: () => boolean
): Promise<PhysicsWorkerFrame | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!current()) return null
    const marker = store.getUpdateSnapshot()
    const snapshot = store.snapshot()
    const frame =
      attempt === 0
        ? await session.initFromSnapshot(config, snapshot)
        : await session.restore(snapshot)
    if (!current()) return null
    if (store.getUpdateSnapshot() === marker) return frame
  }
  // A rapidly mutating host can continue synchronously without losing input.
  throw new Error(
    "Physics worker startup could not catch up with host mutations"
  )
}
