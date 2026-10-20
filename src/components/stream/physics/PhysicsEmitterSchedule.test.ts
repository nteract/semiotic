import { describe, expect, it } from "vitest"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import { createPhysicsWorkerRuntime } from "./PhysicsWorkerRuntime"
import { isPhysicsWorkerConfigSupported } from "./PhysicsWorkerProtocol"
import type { PhysicsEmitterOptions } from "./PhysicsEmitterSchedule"

const emitters: PhysicsEmitterOptions = {
  seed: 42,
  sources: [
    { id: "regular", interval: 200 },
    { id: "jitter", interval: 100, jitter: "watermarks" },
    {
      id: "burst",
      interval: 300,
      burst: { min: 2, max: 5, intraMs: 40, gapMs: [200, 400] }
    }
  ],
  templates: Object.fromEntries(
    ["regular", "jitter", "burst"].map((id, i) => [
      id,
      {
        x: i * 30,
        y: 0,
        shape: { type: "circle" as const, radius: 2 },
        datum: { label: id },
        collisionGroup: i + 1
      }
    ])
  ),
  maxEvents: 100
}

const config = {
  kernel: { gravity: { x: 0, y: 0 } },
  fixedDt: 1 / 100,
  maxSubsteps: 100,
  maxDeltaSeconds: 1,
  bodyLimit: 25,
  eviction: "sleeping-first" as const,
  emitters
}

describe("pipeline emitter scheduling", () => {
  it("emits the same events and world with different display batches, sync and worker", () => {
    const small = new PhysicsPipelineStore(config)
    const large = new PhysicsPipelineStore(config)
    const worker = createPhysicsWorkerRuntime()
    worker.handle({ type: "init", config })
    for (let i = 0; i < 500; i++) small.tick(0.01)
    for (let i = 0; i < 50; i++) {
      large.tick(0.1)
      worker.handle({ type: "tick", deltaSeconds: 0.1 })
    }
    const result = worker.handle({ type: "snapshot" })
    if (result.type !== "snapshot") throw new Error("Expected snapshot")
    expect(large.snapshot().world).toEqual(small.snapshot().world)
    expect(result.snapshot.world).toEqual(small.snapshot().world)
    expect(result.snapshot.emitters).toEqual(small.snapshot().emitters)
    expect(small.readBodies()).toHaveLength(25)
    expect(small.snapshot().emitters?.progress.emitted).toBe(100)
  })

  it("restores RNG, deadlines and counters, including a worker-to-sync handoff", () => {
    const worker = createPhysicsWorkerRuntime()
    const mirror = new PhysicsPipelineStore(config)
    const apply = (response: ReturnType<typeof worker.handle>) => {
      if (response.type !== "frame") throw new Error("Expected frame")
      mirror.applyWorkerFrame(response.frame)
    }
    apply(worker.handle({ type: "init", config }))
    for (let i = 0; i < 41; i++)
      apply(worker.handle({ type: "tick", deltaSeconds: 0.01 }))
    const fork = new PhysicsPipelineStore()
    fork.restore(structuredClone(mirror.snapshot()))
    for (let i = 0; i < 100; i++) {
      mirror.tick(0.01)
      fork.tick(0.01)
      worker.handle({ type: "tick", deltaSeconds: 0.01 })
    }
    const result = worker.handle({ type: "snapshot" })
    if (result.type !== "snapshot") throw new Error("Expected snapshot")
    expect(fork.snapshot()).toEqual(mirror.snapshot())
    expect(fork.snapshot().emitters).toEqual(result.snapshot.emitters)
    expect(fork.readBodies().map((body) => body.datum)).toEqual(
      result.snapshot.world.bodies.map((body) => body.datum)
    )
  })

  it("honors pause, visibility, active sources, rate and timeScale without resetting ids", () => {
    const store = new PhysicsPipelineStore(config)
    store.tick(0.4)
    const before = store.snapshot().emitters!.progress
    store.setPaused(true)
    store.tick(1)
    expect(store.snapshot().emitters!.progress).toEqual(before)
    store.setPaused(false)
    store.setVisible(false)
    store.tick(1)
    expect(store.snapshot().emitters!.progress).toEqual(before)
    store.setVisible(true)
    store.updateConfig({
      emitters: { ...emitters, active: { regular: false }, rate: 2 },
      timeScale: 2
    })
    store.tick(0.1)
    const after = store.snapshot().emitters!.progress
    expect(after.time).toBeCloseTo(before.time + 200)
    expect(after.sources[0]).toEqual(before.sources[0])
    expect(after.sources[1].sequence - before.sources[1].sequence).toBe(4)
    store.clear()
    expect(store.snapshot().emitters!.progress.emitted).toBe(0)
    expect(store.snapshot().elapsedSeconds).toBe(0)
  })

  it("keeps an empty source clock running and bounds settle with unbounded sources", () => {
    const store = new PhysicsPipelineStore({
      ...config,
      emitters: { ...emitters, maxEvents: undefined }
    })
    expect(store.hasPendingWork()).toBe(true)
    const result = store.settleWithObservations(500)
    expect(result.steps).toBe(500)
    expect(result.shouldContinue).toBe(true)
    expect(store.readBodies().length).toBeLessThanOrEqual(25)
    expect(
      result.observations.some(
        (event) => event.type === "physics-budget-warning"
      )
    ).toBe(true)
    expect(
      result.observations.some((event) => event.simulationState === "settled")
    ).toBe(false)
  })

  it("falls back for callback jitter and validates controls before changing state", () => {
    expect(
      isPhysicsWorkerConfigSupported({
        emitters: { ...emitters, sources: [{ id: "regular", jitter: () => 1 }] }
      })
    ).toBe(false)
    const store = new PhysicsPipelineStore(config)
    const before = store.snapshot()
    expect(() =>
      store.updateConfig({ emitters: { ...emitters, rate: 0 } })
    ).toThrow()
    expect(store.snapshot()).toEqual(before)
  })
})
