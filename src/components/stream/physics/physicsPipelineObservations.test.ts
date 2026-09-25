import { describe, expect, it, vi } from "vitest"
import { createDefaultPhysicsEngineAdapter } from "./PhysicsEngineAdapter"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import { normalizeObservationConfig } from "./physicsPipelineHelpers"
import { observePhysicsKernelEvents, observePhysicsSensorTransitions } from "./physicsPipelineObservations"

const spawn = {
  id: "observed", x: 1, y: 2, fixedPosition: { x: 10 },
  shape: { type: "circle" as const, radius: 2 }, datum: { label: "Body" }
}

describe("physics observation materialization", () => {
  it("admits bodies without copying the world when no spawn observation is consumed", () => {
    const world = createDefaultPhysicsEngineAdapter()
    const store = new PhysicsPipelineStore({ engine: world })
    const readState = vi.spyOn(world, "readState")

    store.spawnNow(spawn)

    expect(readState).not.toHaveBeenCalled()
    expect(store.liveBodyCount()).toBe(1)
    expect(store.readBodies()[0]).toMatchObject({ id: "observed", x: 10, y: 2, datum: spawn.datum })
  })

  it.each(["callback", "collected"] as const)("retains normalized spawn data for %s observations", (kind) => {
    const onObservation = vi.fn()
    const store = new PhysicsPipelineStore({
      observation: kind === "callback" ? { onObservation } : undefined
    })
    store.enqueue(spawn)
    if (kind === "callback") store.settle(0)
    const observations = kind === "collected"
      ? store.settleWithObservations(0).observations
      : onObservation.mock.calls.map(([event]) => event)

    expect(observations).toContainEqual(expect.objectContaining({
      type: "physics-spawn", bodyId: "observed", x: 10, y: 2, datum: spawn.datum, timestamp: 0
    }))
  })

  it("copies body state only when a kernel event emits a settle observation", () => {
    const world = createDefaultPhysicsEngineAdapter()
    world.spawn(spawn)
    const readState = vi.spyOn(world, "readState")
    const emit = vi.fn()
    const context = { elapsedSeconds: 3, observation: normalizeObservationConfig({}), emit }

    observePhysicsKernelEvents(world, [{ type: "contact", bodyId: "observed", otherId: "wall", sensor: false }], context)
    expect(readState).not.toHaveBeenCalled()
    expect(emit).not.toHaveBeenCalled()

    observePhysicsKernelEvents(world, [{ type: "sleep", bodyId: "observed" }], context)
    expect(readState).toHaveBeenCalledOnce()
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({
      type: "physics-settle", bodyId: "observed", x: 10, y: 2, datum: spawn.datum, timestamp: 3
    }))
  })

  it("preserves sensor transitions and skips body copies while membership is unchanged", () => {
    const world = createDefaultPhysicsEngineAdapter()
    world.spawn(spawn)
    const pairs = vi.spyOn(world, "activeSensorPairs").mockReturnValue([{ sensorId: "first", bodyId: "observed" }])
    const readState = vi.spyOn(world, "readState")
    const emit = vi.fn()
    const context = { elapsedSeconds: 3, observation: normalizeObservationConfig({}), emit }
    const previous = observePhysicsSensorTransitions(world, new Set(), context)
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: "physics-bin-enter", sensorId: "first", x: 10, y: 2 }))
    readState.mockClear()
    emit.mockClear()

    const unchanged = observePhysicsSensorTransitions(world, previous, context)
    expect(unchanged).toEqual(previous)
    expect(readState).not.toHaveBeenCalled()
    expect(emit).not.toHaveBeenCalled()

    pairs.mockReturnValue([{ sensorId: "second", bodyId: "observed" }])
    observePhysicsSensorTransitions(world, unchanged, context)
    expect(readState).toHaveBeenCalledOnce()
    expect(emit.mock.calls.map(([event]) => [event.type, event.sensorId, event.datum])).toEqual([
      ["physics-bin-enter", "second", spawn.datum],
      ["physics-bin-exit", "first", spawn.datum]
    ])
  })
})
