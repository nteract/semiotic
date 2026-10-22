import { describe, expect, it } from "vitest"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import type { PhysicsPipelineConfig } from "./PhysicsPipelineTypes"
import type { EventDropLiveConfig } from "../../charts/physics/EventDropLiveRuntime"

const live = (follow: "now" | "watermark"): EventDropLiveConfig => ({
  live: { follow, horizon: 2, retain: 4 },
  windowSize: 1,
  size: [600, 300],
  ballRadius: 4,
  seed: 3,
  timeUnit: "s",
  watermark: { delay: 0.5 },
  arrival: "drop"
})

const emitters = (maxEvents?: number): PhysicsPipelineConfig["emitters"] => ({
  sources: [{ id: "source", interval: 100 }],
  templates: { source: { x: 20, y: 0, shape: { type: "circle", radius: 4 } } },
  timeUnit: "s",
  seed: 3,
  ...(maxEvents != null && { maxEvents })
})

const config = (follow: "now" | "watermark", maxEvents?: number): PhysicsPipelineConfig => ({
  fixedDt: 1 / 60,
  kernel: { gravity: { x: 0, y: 600 } },
  eventDrop: live(follow),
  emitters: emitters(maxEvents)
})

describe("physics live programs", () => {
  it("require explicit registration outside EventDropChart and the worker", async () => {
    expect(() => new PhysicsPipelineStore({ emitters: emitters() })).toThrow(
      /registerPhysicsLivePrograms\(\) from semiotic\/physics/
    )
    expect(() => new PhysicsPipelineStore({ eventDrop: live("now") })).toThrow(
      /registerPhysicsLivePrograms/
    )
    const { registerPhysicsLivePrograms } = await import(
      "../../charts/physics/registerPhysicsLivePrograms"
    )
    registerPhysicsLivePrograms()
    const store = new PhysicsPipelineStore(config("watermark", 2))
    const restored = new PhysicsPipelineStore()
    restored.restore(store.snapshot())
    expect(restored.isEventDropLive()).toBe(true)
  })

  it("settles a watermark-following board once a bounded producer finishes", async () => {
    const { registerPhysicsLivePrograms } = await import(
      "../../charts/physics/registerPhysicsLivePrograms"
    )
    registerPhysicsLivePrograms()
    const store = new PhysicsPipelineStore(config("watermark", 3))
    let result = store.tick(1 / 60)
    for (let i = 0; i < 1200 && result.shouldContinue; i++) result = store.tick(1 / 60)
    expect(result.shouldContinue).toBe(false)
    expect(store.hasPendingWork()).toBe(false)
    expect(store.runtimeState().simulationState).toBe("settled")
    expect(store.snapshot().emitters!.progress.emitted).toBe(3)
  })

  it("keeps a clock-following board running after its bodies rest", async () => {
    const { registerPhysicsLivePrograms } = await import(
      "../../charts/physics/registerPhysicsLivePrograms"
    )
    registerPhysicsLivePrograms()
    const store = new PhysicsPipelineStore(config("now", 3))
    let result = store.tick(1 / 60)
    for (let i = 0; i < 1200; i++) result = store.tick(1 / 60)
    expect(store.readBodies().every((body) => body.sleeping)).toBe(true)
    expect(result.shouldContinue).toBe(true)
  })

  it("drains handoffs in an uncapped settle without running producers to the step limit", async () => {
    const { registerPhysicsLivePrograms } = await import(
      "../../charts/physics/registerPhysicsLivePrograms"
    )
    registerPhysicsLivePrograms()
    const store = new PhysicsPipelineStore(config("watermark"))
    expect(store.settleWithObservations().steps).toBe(0)
    store.enqueue({
      id: "pushed",
      x: 40,
      y: 0,
      shape: { type: "circle", radius: 4 },
      datum: { id: "pushed", eventTime: 0.2, source: "source" }
    })
    const settled = store.settleWithObservations()
    // An unbounded producer used to keep this loop running for the whole
    // 1200-step settle limit, advancing the live clock by 20 seconds.
    expect(settled.steps).toBeGreaterThan(0)
    expect(settled.steps).toBeLessThan(600)
    expect(store.readBodies().some((body) => body.id === "pushed")).toBe(true)
    // A capped settle still spends its requested time on the live clock.
    const before = store.elapsed()
    expect(store.settleWithObservations(60).steps).toBe(60)
    expect(store.elapsed() - before).toBeCloseTo(1)
  })
})
