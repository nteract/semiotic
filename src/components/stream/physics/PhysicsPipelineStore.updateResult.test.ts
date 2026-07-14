import { describe, expect, it } from "vitest"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import {
  classifyPhysicsConfigPatch,
  PHYSICS_CONFIG_PATCH_DEPENDENCIES,
} from "./physicsPipelineUpdateResults"

function circle(id: string) {
  return {
    id,
    x: 20,
    y: 20,
    mass: 1,
    shape: { type: "circle" as const, radius: 4 }
  }
}

describe("PhysicsPipelineStore update-result reference path", () => {
  it("reports queued body work through the shared revision contract", () => {
    const store = new PhysicsPipelineStore({
      fixedDt: 0.1,
      kernel: { gravity: { x: 0, y: 0 } }
    })

    const queued = store.enqueueWithResult(circle("queued"))
    expect(queued.changeSet).toEqual({ kind: "enqueue", count: 1 })
    expect([...queued.changed]).toEqual([
      "data",
      "scene-geometry",
      "data-paint",
      "accessibility",
      "evidence"
    ])
    expect(queued.revisions).toMatchObject({
      data: 1,
      sceneGeometry: 1,
      dataPaint: 1,
      accessibility: 1,
      evidence: 1
    })

    store.tick(0)
    const spawned = store.getLastUpdateResult()
    expect(spawned.changeSet).toEqual({ kind: "tick", count: 0 })
    expect(spawned.changed).toEqual(expect.any(Set))
    expect(spawned.changed.has("data")).toBe(true)
    expect(spawned.revisions.data).toBe(2)
    expect(spawned.revisions.sceneGeometry).toBe(2)
  })

  it("keeps config, simulation state, and no-op ticks distinguishable from data", () => {
    const store = new PhysicsPipelineStore({ fixedDt: 0.1 })

    const config = store.updateConfigWithResult({ bodyLimit: 12 })
    expect(config.changeSet).toEqual({ kind: "config", keys: ["bodyLimit"] })
    expect(config.changed.has("data")).toBe(false)
    expect(config.changed.has("layout")).toBe(true)
    expect(config.revisions.layout).toBe(1)

    store.setPaused(true)
    const paused = store.getLastUpdateResult()
    expect(paused.changeSet).toEqual({ kind: "pause" })
    expect([...paused.changed]).toEqual(["overlay", "accessibility", "evidence"])
    expect(paused.revisions.overlay).toBe(config.revisions.overlay + 1)

    store.tick(1)
    const noOp = store.getLastUpdateResult()
    expect(noOp.changeSet).toEqual({ kind: "tick", count: 0 })
    expect(noOp.changed.size).toBe(0)
    expect(noOp.revisions).toEqual(paused.revisions)
  })

  it("does not reuse stale invalidations for a no-op enqueue or config patch", () => {
    const store = new PhysicsPipelineStore({ fixedDt: 0.1 })
    const first = store.updateConfigWithResult({ bodyLimit: 3 })

    const configNoOp = store.updateConfigWithResult({ bodyLimit: 3 })
    expect(configNoOp.changeSet).toEqual({ kind: "config", keys: [] })
    expect(configNoOp.changed.size).toBe(0)
    expect(configNoOp.revisions).toEqual(first.revisions)

    const enqueueNoOp = store.enqueueWithResult([])
    expect(enqueueNoOp.changeSet).toEqual({ kind: "enqueue", count: 0 })
    expect(enqueueNoOp.changed.size).toBe(0)
    expect(enqueueNoOp.revisions).toEqual(first.revisions)
  })

  it("applies merged kernel config against retained bodies", () => {
    const store = new PhysicsPipelineStore({
      fixedDt: 0.1,
      kernel: {
        gravity: { x: 0, y: 0 },
        velocityDamping: 1,
        sleepAfter: 999
      }
    })
    store.spawnNow(circle("retained"))

    const updated = store.updateConfigWithResult({
      kernel: { gravity: { x: 0, y: 10 } }
    })
    store.tick(0.1)

    expect(store.readBodies()[0]).toMatchObject({ id: "retained", y: 20.1 })
    expect(updated.changeSet).toEqual({ kind: "config", keys: ["kernel"] })
    expect(updated.changed.has("scene-geometry")).toBe(true)
  })

  it("declares engine, simulation, capacity, and future-only config patch effects", () => {
    const store = new PhysicsPipelineStore({ fixedDt: 0.1 })

    expect(PHYSICS_CONFIG_PATCH_DEPENDENCIES.engine.retainedData).toBe("rebuild")
    expect(classifyPhysicsConfigPatch(["engine"]).retainedData).toBe("rebuild")

    const kernel = store.updateConfigWithResult({
      kernel: { gravity: { x: 0, y: 1 } }
    })
    expect(classifyPhysicsConfigPatch(kernel.changeSet.keys ?? []).retainedData).toBe("preserve")
    expect(kernel.changed.has("scene-geometry")).toBe(true)
    expect(kernel.changed.has("layout")).toBe(false)

    const capacity = store.updateConfigWithResult({ bodyLimit: 12 })
    expect(capacity.changed.has("layout")).toBe(true)

    const futureOnly = store.updateConfigWithResult({ fixedDt: 0.2 })
    expect(futureOnly.changeSet).toEqual({ kind: "config", keys: ["fixedDt"] })
    expect(futureOnly.changed.size).toBe(0)
    expect(futureOnly.revisions).toEqual(capacity.revisions)
  })
})
