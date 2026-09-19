import { describe, expect, it, vi } from "vitest"
import { schedulePhysicsSpawns } from "./PhysicsPipelineStore"
import type { PhysicsQueuedSpawn } from "./PhysicsPipelineTypes"

const spawn: PhysicsQueuedSpawn = {
  id: "body",
  x: 0,
  y: 0,
  shape: { type: "circle", radius: 2 }
}

describe("physics arrival scheduling", () => {
  it("schedules batches larger than the engine's function argument limit", () => {
    const count = 150_000
    const spawns = Array.from({ length: count }, (_, index) => ({
      ...spawn,
      id: String(index),
      spawnAt: count - index
    }))
    const scheduled = schedulePhysicsSpawns(spawns, {
      pacing: "arrival",
      startAt: 3,
      timeScale: 2
    })

    expect(scheduled).toHaveLength(count)
    expect(scheduled[0].spawnAt).toBe(3 + (count - 1) / 2)
    expect(scheduled[count - 1].spawnAt).toBe(3)
    expect(spawns[count - 1].spawnAt).toBe(1)
  })

  it("reads each arrival once and ignores missing or nonfinite times", () => {
    const arrivals = [undefined, Infinity, 20, NaN, 10]
    const accessor = vi.fn(
      (_: PhysicsQueuedSpawn, index: number) => arrivals[index]
    )
    const scheduled = schedulePhysicsSpawns(
      arrivals.map(() => spawn),
      {
        pacing: "arrival",
        timeAccessor: accessor,
        startAt: 4,
        timeScale: 2
      }
    )

    expect(scheduled.map((body) => body.spawnAt)).toEqual([4, 4, 9, 4, 4])
    expect(accessor).toHaveBeenCalledTimes(arrivals.length)
  })

  it("handles empty batches and batches without any valid arrival", () => {
    expect(schedulePhysicsSpawns([], { pacing: "arrival" })).toEqual([])
    expect(
      schedulePhysicsSpawns([spawn], { pacing: "arrival", startAt: 7 })[0]
        .spawnAt
    ).toBe(7)
  })
})
