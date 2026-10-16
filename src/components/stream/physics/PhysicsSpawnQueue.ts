import { cloneSpawn, schedulePhysicsSpawns, sortQueue, type InternalQueuedSpawn } from "./physicsPipelineHelpers"
import { validatePhysicsSpawn } from "./physicsInputValidation"
import type { PhysicsQueuedSpawn, PhysicsSpawnPacingOptions } from "./PhysicsPipelineTypes"

/** Validate a whole batch before mutating the pending arrival queue. */
export function enqueuePhysicsSpawns(
  queue: PhysicsSpawnQueue,
  spawn: PhysicsQueuedSpawn | PhysicsQueuedSpawn[],
  pacing: PhysicsSpawnPacingOptions | undefined,
  elapsedSeconds: number,
  nextSequence: number
): number {
  const raw = Array.isArray(spawn) ? spawn : [spawn]
  for (const item of raw) validatePhysicsSpawn(item)
  const spawns = pacing
    ? schedulePhysicsSpawns(raw, { ...pacing, startAt: pacing.startAt ?? elapsedSeconds })
    : raw
  if (pacing) for (const item of spawns) validatePhysicsSpawn(item)
  for (const item of spawns) {
    queue.push({ ...cloneSpawn(item), sequence: nextSequence++, spawnAt: item.spawnAt ?? elapsedSeconds })
  }
  return spawns.length
}

/** Stable arrival queue. Admissions do not shift or sort the remaining stream. */
export class PhysicsSpawnQueue {
  private heap: InternalQueuedSpawn[] = []
  private latest: number | undefined

  get length(): number { return this.heap.length }
  firstArrival(): number | undefined { return this.heap[0]?.spawnAt }
  lastArrival(): number | undefined { return this.latest }

  push(spawn: InternalQueuedSpawn): void {
    this.latest = Math.max(this.latest ?? -Infinity, spawn.spawnAt)
    let index = this.heap.length
    this.heap.push(spawn)
    while (index > 0) {
      const parent = (index - 1) >>> 1
      if (sortQueue(this.heap[parent], spawn) <= 0) break
      this.heap[index] = this.heap[parent]
      index = parent
    }
    this.heap[index] = spawn
  }

  shift(): InternalQueuedSpawn | undefined {
    const first = this.heap[0]
    const last = this.heap.pop()
    if (this.heap.length === 0) {
      this.latest = undefined
      return first
    }
    // The nonempty heap had at least two elements before the pop.
    if (!last) return first
    let index = 0
    while (index * 2 + 1 < this.heap.length) {
      let child = index * 2 + 1
      if (child + 1 < this.heap.length && sortQueue(this.heap[child + 1], this.heap[child]) < 0) child += 1
      if (sortQueue(last, this.heap[child]) <= 0) break
      this.heap[index] = this.heap[child]
      index = child
    }
    this.heap[index] = last
    return first
  }

  clear(): void {
    this.heap = []
    this.latest = undefined
  }

  remove(ids: ReadonlySet<string>): Set<string> {
    const removed = new Set<string>()
    const remaining = this.heap.filter((spawn) => {
      if (!ids.has(spawn.id)) return true
      removed.add(spawn.id)
      return false
    })
    if (removed.size) this.restore(remaining)
    return removed
  }

  sorted(): InternalQueuedSpawn[] {
    return this.heap.slice().sort(sortQueue)
  }

  restore(spawns: InternalQueuedSpawn[]): void {
    this.clear()
    for (const spawn of spawns) this.push(spawn)
  }
}
