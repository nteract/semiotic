import { PhysicsPipelineStore } from "../../stream/physics/PhysicsPipelineStore"
import type {
  PhysicsPipelineSnapshot,
  PhysicsQueuedSpawn
} from "../../stream/physics/PhysicsPipelineStore"
import type { PhysicsChartLayout } from "./physicsChartShared"
import { physicsPhaseDatum, physicsBoardPhase } from "../../stream/physics/physicsBodyTravel"
import type { EventDropSpawn } from "./eventDropArrival"

function placementKey(spawn: PhysicsQueuedSpawn): string {
  const { datum: _datum, spawnAt: _spawnAt, __eventDropSpawnTime: _pacingTime, ...placement } = spawn as EventDropSpawn
  return JSON.stringify(placement)
}

function boardPlacement(spawn: PhysicsQueuedSpawn): PhysicsQueuedSpawn {
  if (!spawn.travel) return spawn
  const { travel, ...rest } = spawn
  return { ...rest, ...travel.points[travel.points.length - 1] }
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
    const admitted = bodies.has(id) && !bodies.get(id)?.travel
    const oldPlacement = admitted ? boardPlacement(old) : old
    const nextPlacement = candidate && admitted ? boardPlacement(candidate) : candidate
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
      (bodies.get(id)?.y ?? -Infinity) >= nextPlacement!.y &&
      placementKey({ ...oldPlacement, y: nextPlacement!.y }) === placementKey(nextPlacement!)
    if (
      !candidate ||
      admissionChanged ||
      (!retainUnderLid && placementKey(oldPlacement) !== placementKey(nextPlacement!))
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
        datum: physicsPhaseDatum(
          after.get(body.id)?.datum ?? body.datum,
          body.travel ? "travel" : body.sleeping ? "settled" : physicsBoardPhase(body.datum)
        )
      }))
    },
    queue: snapshot.queue.map((spawn) => ({
      // Relayout changes geometry, not an existing arrival's deadline or
      // order among tied arrivals. Keep future bodies in their original queue.
      ...(replaced.has(spawn.id) ? (after.get(spawn.id) ?? spawn) : spawn),
      datum: after.get(spawn.id)?.datum ?? spawn.datum,
      spawnAt: spawn.spawnAt,
      sequence: spawn.sequence
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
  store.remove(
    Array.from(replaced).filter((id) => bodies.has(id) || !after.has(id))
  )
  // Already materialized bodies must stay materialized after a resize or
  // encoding correction. Replaying their pacing would make them disappear
  // until their source-time gap elapses again. Intentionally removed bodies
  // have neither a live body nor a queued arrival and remain absent.
  for (const spawn of next.initialSpawns) {
    if (replaced.has(spawn.id) && bodies.has(spawn.id)) {
      const body = bodies.get(spawn.id)!
      const replacement = { ...spawn, spawnAt: undefined }
      if (spawn.travel) {
        if (body.travel) {
          replacement.travel = {
            ...spawn.travel,
            elapsedSeconds: Math.min(
              spawn.travel.durationSeconds,
              body.travel.elapsedSeconds ?? 0
            )
          }
        } else {
          // A relayout must not send an admitted body back to its producer.
          const end = spawn.travel.points.at(-1)!
          replacement.x = end.x
          replacement.y = end.y
          delete replacement.travel
          replacement.datum = physicsPhaseDatum(spawn.datum, physicsBoardPhase(spawn.datum))
        }
      }
      store.enqueue(replacement)
    }
  }
  const spawns = next.initialSpawns
    .filter((spawn) => !before.has(spawn.id))
    .map((spawn) => ({ ...spawn, spawnAt: undefined }))
  store.enqueue(
    spawns,
    paceNewBodies && !snapshot.paused ? next.initialSpawnPacing : undefined
  )
  // Commit immediate replacements and synchronize simulation-state observers,
  // even while playback is paused. Future arrivals retain their deadlines.
  store.materializeDueSpawns()
  return store.snapshot()
}
