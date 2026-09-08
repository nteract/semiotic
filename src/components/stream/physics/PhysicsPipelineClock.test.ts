import { describe, expect, it } from "vitest"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import { createPhysicsWorkerRuntime } from "./PhysicsWorkerRuntime"

const fixedDt = 1 / 120

function scheduledStore() {
  const store = new PhysicsPipelineStore({
    fixedDt,
    maxDeltaSeconds: 1,
    maxSubsteps: 120,
    kernel: {
      gravity: { x: 0, y: 100 },
      velocityDamping: 1,
      sleepAfter: 100,
      sleepSpeed: 0
    }
  })
  store.enqueue({
    id: "arrival",
    spawnAt: 0.25,
    x: 0,
    y: 0,
    shape: { type: "circle", radius: 1 }
  })
  return store
}

describe("physics model clock", () => {
  it.each([120, 60, 30, 10])(
    "admits the same arrival at %i Hz without pre-birth motion",
    (hz) => {
      const store = scheduledStore()
      for (let frame = 0; frame < hz; frame += 1) store.tick(1 / hz)
      const [body] = store.readBodies()
      // 90 semi-implicit Euler steps from 0.25 to 1 second.
      expect(body.vy).toBeCloseTo(75, 10)
      expect(body.y).toBeCloseTo((100 * fixedDt ** 2 * 90 * 91) / 2, 10)
      expect(store.elapsed()).toBeCloseTo(1, 10)
    }
  )

  it("agrees between live ticks, observed settling, and unobserved settling", () => {
    const live = scheduledStore()
    const observed = scheduledStore()
    const staticRun = scheduledStore()
    for (let i = 0; i < 10; i += 1) live.tick(0.1)
    observed.settleWithObservations(120)
    staticRun.settle(120)
    expect(observed.readBodies()).toEqual(live.readBodies())
    expect(staticRun.readBodies()).toEqual(live.readBodies())
  })

  it("preserves the same clock and body state through worker messages", () => {
    const store = scheduledStore()
    const worker = createPhysicsWorkerRuntime()
    worker.handle({ type: "init", snapshot: store.snapshot() })
    for (let frame = 0; frame < 10; frame += 1) {
      store.tick(0.1)
      worker.handle({ type: "tick", deltaSeconds: 0.1 })
    }
    const response = worker.handle({ type: "snapshot" })
    expect(response.type).toBe("snapshot")
    if (response.type !== "snapshot") throw new Error("Missing worker snapshot")
    expect(response.snapshot.world.bodies).toEqual(
      store.snapshot().world.bodies
    )
    expect(response.snapshot.elapsedSeconds).toBe(store.elapsed())
  })

  it("does not move an event at its exact admission boundary", () => {
    const store = scheduledStore()
    store.tick(0.25)
    expect(store.readBodies()[0]).toMatchObject({ y: 0, vy: 0 })
    store.tick(fixedDt)
    expect(store.readBodies()[0].vy).toBeCloseTo(100 * fixedDt)
  })

  it("does not advance event time past work discarded by the catch-up limit", () => {
    const store = scheduledStore()
    store.updateConfig({ maxSubsteps: 2 })
    const result = store.tick(1)
    expect(result.steps).toBe(2)
    expect(result.elapsedSeconds).toBeCloseTo(2 * fixedDt)
    expect(result.spawned).toEqual([])
    expect(store.queueSize()).toBe(1)
  })

  it("preserves fractional time across snapshot/restore and pause", () => {
    const store = scheduledStore()
    store.tick(0.253)
    const saved = store.snapshot()
    store.setPaused(true)
    store.tick(1)
    store.setPaused(false)
    store.tick(0.747)
    const expected = store.readBodies()
    store.restore(saved)
    for (const dt of [0.247, 0.2, 0.3]) store.tick(dt)
    expect(store.readBodies()).toEqual(expected)
    expect(store.elapsed()).toBeCloseTo(1)
  })

  it("ignores nonfinite display deltas without corrupting later ticks", () => {
    const store = scheduledStore()
    store.tick(NaN)
    store.tick(Infinity)
    store.tick(1)
    expect(store.elapsed()).toBeCloseTo(1)
    expect(store.readBodies()[0].vy).toBeCloseTo(75)
  })
})
