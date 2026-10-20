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
  it("records ledger evidence without sending ledger events to kernel/controller callbacks", () => {
    const onObservation = vi.fn()
    const store = new PhysicsPipelineStore({
      observation: { chartId: "ledger", chartType: "EventDropChart", onObservation }
    })
    const event = store.recordLifecycleObservation({
      type: "physics-window-update", windowId: "0-10", accepted: 2, retractions: 1
    })
    expect(event).toMatchObject({
      type: "physics-window-update", chartId: "ledger", chartType: "EventDropChart",
      timestamp: 0, windowId: "0-10", accepted: 2, retractions: 1
    })
    expect(store.getLastUpdateResult().changed).toContain("evidence")
    expect(onObservation).not.toHaveBeenCalled()
    store.recordObservation({ type: "physics-late", count: 1 })
    expect(onObservation).toHaveBeenCalledTimes(1)
  })

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

  it.each([true, false])("reads only required settle state (indexed: %s)", (indexed) => {
    const world = createDefaultPhysicsEngineAdapter()
    world.spawn(spawn)
    if (!indexed) world.readBody = undefined
    const readState = vi.spyOn(world, "readState")
    const emit = vi.fn()
    const context = { elapsedSeconds: 3, observation: normalizeObservationConfig({}), emit }

    observePhysicsKernelEvents(world, [{ type: "contact", bodyId: "observed", otherId: "wall", sensor: false }], context)
    expect(readState).not.toHaveBeenCalled()
    expect(emit).not.toHaveBeenCalled()

    observePhysicsKernelEvents(world, [{ type: "sleep", bodyId: "observed" }], context)
    expect(readState.mock.calls.length).toBe(indexed ? 0 : 1)
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({
      type: "physics-settle", bodyId: "observed", x: 10, y: 2, datum: spawn.datum, timestamp: 3
    }))
  })

  it.each([true, false])("preserves sensor transitions and skips unchanged membership (indexed: %s)", (indexed) => {
    const world = createDefaultPhysicsEngineAdapter()
    world.spawn(spawn)
    if (!indexed) world.readBody = undefined
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
    expect(readState.mock.calls.length).toBe(indexed ? 0 : 1)
    expect(emit.mock.calls.map(([event]) => [event.type, event.sensorId, event.datum])).toEqual([
      ["physics-bin-enter", "second", spawn.datum],
      ["physics-bin-exit", "first", spawn.datum]
    ])
  })
})

describe("physics boundary observations under callback mutations", () => {
  it.each([true, false])("captures only affected bodies before settle callbacks (indexed: %s)", indexed => {
    const world = createDefaultPhysicsEngineAdapter()
    for (let i = 0; i < 20; i++) world.spawn({ ...spawn, id: String(i), datum: { id: i } })
    const readBody = vi.spyOn(world, "readBody")
    if (!indexed) world.readBody = undefined
    const readState = vi.spyOn(world, "readState")
    const events: unknown[] = []
    observePhysicsKernelEvents(world, [{ type: "sleep", bodyId: "0" }, { type: "sleep", bodyId: "1" }], {
      elapsedSeconds: 3, observation: normalizeObservationConfig({}),
      emit(event) { events.push(event); if (event.bodyId === "0") world.remove(["1"]) }
    })
    expect(events).toEqual([
      expect.objectContaining({ bodyId: "0", datum: { id: 0 }, x: 10, y: 2 }),
      expect.objectContaining({ bodyId: "1", datum: { id: 1 }, x: 10, y: 2 }),
    ])
    expect(readState.mock.calls.length).toBe(indexed ? 0 : 1)
    expect(readBody.mock.calls.length).toBe(indexed ? 2 : 0)
  })

  it.each([true, false])("keeps enter and exit boundary data stable (indexed: %s)", indexed => {
    const world = createDefaultPhysicsEngineAdapter()
    world.spawn({ ...spawn, id: "a", datum: { id: "a" } })
    world.spawn({ ...spawn, id: "b", datum: { id: "b" } })
    if (!indexed) world.readBody = undefined
    vi.spyOn(world, "activeSensorPairs").mockReturnValue([{ sensorId: "new", bodyId: "a" }])
    const events: unknown[] = []
    observePhysicsSensorTransitions(world, new Set(["old\u0000b"]), {
      elapsedSeconds: 3, observation: normalizeObservationConfig({}),
      emit(event) { events.push(event); if (event.bodyId === "a") world.remove(["b"]) }
    })
    expect(events).toEqual([
      expect.objectContaining({ type: "physics-bin-enter", bodyId: "a", datum: { id: "a" }, x: 10 }),
      expect.objectContaining({ type: "physics-bin-exit", bodyId: "b", datum: { id: "b" }, x: 10 }),
    ])
  })
})
