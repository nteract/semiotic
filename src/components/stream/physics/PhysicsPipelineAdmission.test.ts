import { describe, expect, it, vi } from "vitest"
import { BuiltInPhysicsEngineAdapter } from "./PhysicsEngineAdapter"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import { createPhysicsWorkerRuntime } from "./PhysicsWorkerRuntime"
import type { PhysicsColliderSpec } from "./PhysicsKernel"

const circle = (id: string, spawnAt = 0) => ({
  id, x: 0, y: 0, spawnAt, shape: { type: "circle" as const, radius: 1 }
})
const colliders: PhysicsColliderSpec[] = [
  { id: "floor", shape: { type: "aabb", x: 0, y: 10, width: 100, height: 2 } },
  { id: "sensor", sensor: true, shape: { type: "aabb", x: 0, y: 0, width: 10, height: 10 } }
]

describe("physics admission and reset", () => {
  it("retains current walls and sensors after clearing, including restored geometry", () => {
    const source = new PhysicsPipelineStore({ colliders, kernel: { gravity: { x: 0, y: 100 } } })
    source.spawnNow(circle("old"))
    source.enqueue(circle("queued", 10))
    const store = new PhysicsPipelineStore()
    store.restore(source.snapshot())
    store.clear()
    expect(store.snapshot().world.colliders).toEqual(source.snapshot().world.colliders)
    expect(store.readBodies()).toEqual([])
    expect(store.queueSize()).toBe(0)
    expect(store.elapsed()).toBe(0)
    store.enqueue(circle("new"))
    const result = store.settleWithObservations(600)
    expect(result.observations).toContainEqual(expect.objectContaining({ type: "physics-bin-enter", sensorId: "sensor", bodyId: "new" }))
    expect(store.readBodies()[0].y).toBeLessThan(9)
    expect(result.events).toContainEqual(expect.objectContaining({ type: "contact", bodyId: "new", otherId: "floor" }))
  })

  it("preserves configured geometry through worker clear and enqueue commands", () => {
    const runtime = createPhysicsWorkerRuntime()
    runtime.handle({ type: "init", config: { colliders } })
    runtime.handle({ type: "clear" })
    runtime.handle({ type: "enqueue", spawns: [circle("new")] })
    const response = runtime.handle({ type: "snapshot" })
    expect(response.type).toBe("snapshot")
    if (response.type !== "snapshot") throw new Error("Expected snapshot")
    expect(response.snapshot.world.colliders.map(({ id }) => id)).toEqual(["floor", "sensor"])
    expect(response.snapshot.world.bodies.map(({ id }) => id)).toEqual(["new"])
  })

  it("does not reemit sensor entry when equivalent geometry is reapplied", () => {
    const store = new PhysicsPipelineStore({ colliders, kernel: { gravity: { x: 0, y: 0 } } })
    store.enqueue(circle("body"))
    expect(store.tick(0.02).events.some(({ type }) => type === "sensor-enter")).toBe(true)
    store.setColliders(colliders.map((collider) => ({ ...collider, shape: { ...collider.shape } })))
    store.updateConfig({ colliders: colliders.map((collider) => ({ ...collider, shape: { ...collider.shape } })) })
    expect(store.tick(0.02).events.filter(({ type }) => type === "sensor-enter")).toEqual([])
    store.setColliders([])
    store.updateConfig({ colliders })
    expect(store.tick(0.02).events.some(({ type }) => type === "sensor-enter")).toBe(true)
  })

  it("applies imperative collider edits even when the caller reuses the array", () => {
    const colliders: PhysicsColliderSpec[] = [{ id: "wall", shape: { type: "aabb", x: 0, y: 10, width: 20, height: 2 } }]
    const store = new PhysicsPipelineStore({ colliders })
    if (colliders[0].shape.type === "aabb") colliders[0].shape.y = 20
    store.updateConfig({ colliders })
    expect(store.snapshot().world.colliders[0].shape).toMatchObject({ y: 20 })
    if (colliders[0].shape.type === "aabb") colliders[0].shape.y = 30
    store.updateConfig({ colliders })
    expect(store.snapshot().world.colliders[0].shape).toMatchObject({ y: 30 })
  })

  it("applies reused kernel option objects without mutating the caller", () => {
    const kernel = { gravity: { x: 0, y: 10 }, velocityDamping: 1 }
    const store = new PhysicsPipelineStore({ kernel })
    kernel.gravity.y = 20
    store.updateConfig({ kernel })
    expect(store.snapshot().world.options.gravity.y).toBe(20)
    kernel.gravity.y = 30
    store.updateConfig({ kernel })
    expect(store.snapshot().world.options.gravity.y).toBe(30)
  })

  it("rebuilds hit testing when restoring a different world at the same revision", () => {
    const first = new PhysicsPipelineStore()
    const second = new PhysicsPipelineStore()
    first.spawnNow(circle("old"))
    second.spawnNow({ ...circle("new"), x: 100 })
    expect(first.hitTest(0, 0)?.id).toBe("old")
    expect(first.version()).toBe(second.version())
    first.restore(second.snapshot())
    expect(first.hitTest(0, 0)).toBeNull()
    expect(first.hitTest(100, 0)?.id).toBe("new")
  })

  it("returns isolated indexed body states", () => {
    const engine = new BuiltInPhysicsEngineAdapter()
    engine.spawn(circle("body"))
    const body = engine.readBody("body")!
    body.x = 100
    if (body.shape.type === "circle") body.shape.radius = 99
    expect(engine.readBody("body")).toMatchObject({ x: 0, shape: { radius: 1 } })
    expect(engine.readBody("missing")).toBeUndefined()
  })

  it("rejects sparse spawn batches before admitting any bodies or advancing queue order", () => {
    const store = new PhysicsPipelineStore()
    store.enqueue(circle("existing", 1))
    const before = store.snapshot()
    const sparse = new Array<ReturnType<typeof circle>>(3)
    sparse[0] = circle("first")
    sparse[2] = circle("last")
    expect(() => store.enqueue(sparse)).toThrow(RangeError)
    expect(store.snapshot()).toEqual(before)
    store.enqueue(circle("after", 1))
    expect(store.snapshot().queue.map(({ sequence }) => sequence)).toEqual([0, 1])
  })

  it("emits positioned spawn observations without copying all existing bodies", () => {
    const engine = new BuiltInPhysicsEngineAdapter()
    const store = new PhysicsPipelineStore({ engine })
    const readState = vi.spyOn(engine, "readState")
    const spawns = Array.from({ length: 1000 }, (_, i) => ({
      ...circle(String(i)), x: i * 3, fixedPosition: { y: 7 }, datum: { i }
    }))
    store.enqueue(spawns)
    const result = store.tick(0)
    expect(result.observations.filter(({ type }) => type === "physics-spawn")).toHaveLength(1000)
    expect(result.observations).toContainEqual(expect.objectContaining({ type: "physics-spawn", bodyId: "999", x: 2997, y: 7, datum: { i: 999 } }))
    expect(readState.mock.calls.length).toBe(0)
  })

  it("retains arrival order, ties, removals, and replacement eviction through restore", () => {
    const source = new PhysicsPipelineStore({ bodyLimit: 2, kernel: { gravity: { x: 0, y: 0 } } })
    source.enqueue([circle("last", 2), circle("first", 0), circle("removed", 1)])
    source.enqueue([circle("tie-a", 1), circle("tie-b", 1)])
    source.remove(["removed"])
    const store = new PhysicsPipelineStore()
    store.restore(source.snapshot())
    expect(store.snapshot().queue.map(({ id }) => id)).toEqual(["first", "tie-a", "tie-b", "last"])
    expect(store.materializeDueSpawns()).toEqual(["first"])
    store.spawnNow(circle("tie-a"))
    store.spawnNow(circle("first"))
    store.spawnNow(circle("replacement"))
    expect(store.snapshot().liveBodyOrder).toEqual(["first", "replacement"])
    const result = store.settleWithObservations(400)
    expect(result.spawned).toEqual(["tie-a", "tie-b", "last"])
    expect(store.snapshot().liveBodyOrder).toEqual(["tie-b", "last"])
    expect(store.queueSize()).toBe(0)
  })
})
