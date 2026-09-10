import { PhysicsPipelineStore } from "../../stream/physics/PhysicsPipelineStore"
import type {
  PhysicsPipelineSnapshot,
  PhysicsQueuedSpawn
} from "../../stream/physics/PhysicsPipelineStore"
import type { PhysicsChartLayout } from "./physicsChartShared"

function placementKey(spawn: PhysicsQueuedSpawn): string {
  const { datum: _datum, spawnAt: _spawnAt, ...placement } = spawn
  return JSON.stringify(placement)
}

/** Recompile geometry without replaying bodies whose placement is unchanged. */
export function reconcilePhysicsChart(
  snapshot: PhysicsPipelineSnapshot,
  previous: PhysicsChartLayout,
  next: PhysicsChartLayout,
  paceNewBodies = false
): PhysicsPipelineSnapshot {
  const before = new Map(
    previous.initialSpawns.map((spawn) => [spawn.id, spawn])
  )
  const after = new Map(next.initialSpawns.map((spawn) => [spawn.id, spawn]))
  const replaced = new Set<string>()
  const bodies = new Map(snapshot.world.bodies.map((body) => [body.id, body]))
  for (const [id, old] of before) {
    const candidate = after.get(id)
    const admissionChanged =
      candidate &&
      next.metadata?.kind === "event-drop" &&
      (old.datum as { late?: boolean })?.late !==
        (candidate.datum as { late?: boolean })?.late
    // EventDrop can close a lid above an already admitted body. Its snapshot
    // spawn moves below the lid, but the retained body is already there.
    const retainUnderLid =
      candidate &&
      previous.metadata?.kind === "event-drop" &&
      next.metadata?.kind === "event-drop" &&
      JSON.stringify(previous.metadata.windowPlot) ===
        JSON.stringify(next.metadata.windowPlot) &&
      (old.datum as { late?: boolean })?.late === false &&
      (candidate.datum as { late?: boolean })?.late === false &&
      (bodies.get(id)?.y ?? -Infinity) >= candidate.y &&
      placementKey({ ...old, y: candidate.y }) === placementKey(candidate)
    if (
      !candidate ||
      admissionChanged ||
      (!retainUnderLid && placementKey(old) !== placementKey(candidate))
    )
      replaced.add(id)
  }

  // A temporary built-in store edits the portable snapshot. It never steps or
  // initializes the frame's adapter; restore carries the result to sync/worker.
  const store = new PhysicsPipelineStore()
  store.restore({
    ...snapshot,
    world: {
      ...snapshot.world,
      bodies: snapshot.world.bodies.map((body) => ({
        ...body,
        datum: after.get(body.id)?.datum ?? body.datum
      }))
    },
    queue: snapshot.queue.map((spawn) => ({
      ...spawn,
      datum: after.get(spawn.id)?.datum ?? spawn.datum
    }))
  })
  const chartColliderIds = new Set(
    previous.config.colliders?.map((collider) => collider.id)
  )
  const extraColliders = snapshot.world.colliders.filter(
    (collider) => !chartColliderIds.has(collider.id)
  )
  store.updateConfig({
    ...next.config,
    colliders: [...(next.config.colliders ?? []), ...extraColliders]
  })
  store.remove(Array.from(replaced))
  const spawns = next.initialSpawns
    .filter((spawn) => !before.has(spawn.id) || replaced.has(spawn.id))
    .map((spawn) => ({ ...spawn, spawnAt: undefined }))
  store.enqueue(
    spawns,
    paceNewBodies && !snapshot.paused ? next.initialSpawnPacing : undefined
  )
  // Data updates are visible even while playback is paused.
  store.materializeDueSpawns()
  return store.snapshot()
}
