import { describe, expect, it } from "vitest"
import { PhysicsKernelWorld } from "./PhysicsKernel"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import { createPhysicsWorkerRuntime } from "./PhysicsWorkerRuntime"

describe("grounded contact convergence", () => {
  it("keeps fast circles on their entry side and conserves unequal-mass momentum", () => {
    const world = new PhysicsKernelWorld({
      gravity: { x: 0, y: 0 }, velocityDamping: 1, restitution: 0, friction: 0
    })
    world.spawn({ id: "incoming", x: 0, y: 0, vx: 500, mass: 2, shape: { type: "circle", radius: 2 } })
    world.spawn({ id: "target", x: 20, y: 0, mass: 3, shape: { type: "circle", radius: 2 } })

    world.step(0.1)

    const [incoming, target] = world.readState()
    expect(target.x - incoming.x).toBeCloseTo(4, 1)
    expect(incoming.vx).toBeCloseTo(200)
    expect(target.vx).toBeCloseTo(200)
    expect(incoming.mass * incoming.vx + target.mass * target.vx).toBeCloseTo(1000)
  })

  it("preserves upward restitution from a sleeping grounded body", () => {
    const world = new PhysicsKernelWorld({
      gravity: { x: 0, y: 980 }, velocityDamping: 1, restitution: 1, friction: 0
    })
    world.setColliders([{ id: "floor", restitution: 0,
      shape: { type: "aabb", x: 0, y: 110, width: 100, height: 20 } }])
    world.spawn({ id: "anchor", x: 0, y: 98, shape: { type: "circle", radius: 2 } })
    world.settle()
    expect(world.readState()[0].sleeping).toBe(true)
    world.spawn({ id: "incoming", x: 0, y: 90, vy: 300, shape: { type: "circle", radius: 2 } })
    world.step()
    world.step()

    const incoming = world.readState().find((body) => body.id === "incoming")!
    expect(incoming.vy).toBeLessThan(-250)
    const previousY = incoming.y
    world.step()
    expect(world.readState().find((body) => body.id === "incoming")!.y).toBeLessThan(previousY)
  })

  it("leaves an unsupported touching stack in free fall", () => {
    const world = new PhysicsKernelWorld({ gravity: { x: 0, y: 600 }, velocityDamping: 1 })
    for (let index = 0; index < 10; index += 1) {
      world.spawn({ id: `falling-${index}`, x: 0, y: index * 4, vx: 15,
        shape: { type: "circle", radius: 2 } })
    }
    world.step(1 / 60)

    for (const [index, body] of world.readState().entries()) {
      expect(body.x).toBeCloseTo(0.25)
      expect(body.y).toBeCloseTo(index * 4 + 1 / 6)
      expect(body.vx).toBe(15)
      expect(body.vy).toBe(10)
      expect(body.sleeping).toBe(false)
    }
  })

  it("continues grounded contacts identically after snapshots and in a worker", () => {
    const store = new PhysicsPipelineStore({
      fixedDt: 1 / 120,
      colliders: [{ id: "floor", shape: { type: "aabb", x: 0, y: 100, width: 100, height: 6 } }]
    })
    for (let index = 0; index < 20; index += 1) {
      store.spawnNow({ id: `stack-${index}`, x: (index % 2) * 3.5,
        y: 94 - index * 3.8, mass: 1 + index % 3, shape: { type: "circle", radius: 2 } })
    }
    store.settle(30)
    const restored = new PhysicsPipelineStore()
    restored.restore(store.snapshot())
    const worker = createPhysicsWorkerRuntime()
    worker.handle({ type: "init", snapshot: store.snapshot() })
    for (let index = 0; index < 60; index += 1) {
      store.tick(1 / 120)
      restored.tick(1 / 120)
      worker.handle({ type: "tick", deltaSeconds: 1 / 120 })
    }
    const response = worker.handle({ type: "snapshot" })
    if (response.type !== "snapshot") throw new Error("Missing worker snapshot")

    expect(response.snapshot.world).toEqual(store.snapshot().world)
    expect(restored.snapshot().world).toEqual(store.snapshot().world)
    expect(store.readBodies().every((body) => body.y <= 95.01)).toBe(true)
  })
})
