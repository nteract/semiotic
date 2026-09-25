import { describe, expect, it } from "vitest"
import { PhysicsKernelWorld, type PhysicsBodyShape, type PhysicsBodyState } from "./PhysicsKernel"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import { buildGaltonBoardPhysics } from "../../charts/physics/galtonBoardPhysics"
import { buildPhysicsPile } from "../../charts/physics/physicsPilePhysics"
import { physicsChartArea } from "../../charts/physics/physicsChartShared"
import { createPhysicsWorkerRuntime } from "./PhysicsWorkerRuntime"

function maximumCircleOverlap(bodies: PhysicsBodyState[]): number {
  let maximum = 0
  for (let first = 0; first < bodies.length; first += 1) {
    for (let second = first + 1; second < bodies.length; second += 1) {
      const a = bodies[first]
      const b = bodies[second]
      if (a.shape.type !== "circle" || b.shape.type !== "circle") continue
      maximum = Math.max(maximum,
        a.shape.radius + b.shape.radius - Math.hypot(a.x - b.x, a.y - b.y))
    }
  }
  return maximum
}

describe("solid physics confinement", () => {
  it.each([
    { type: "circle", radius: 2 },
    { type: "aabb", width: 4, height: 4 }
  ] satisfies PhysicsBodyShape[])("keeps a fast $type on its starting side of a thin wall", (shape) => {
    const world = new PhysicsKernelWorld({ gravity: { x: 0, y: 0 }, velocityDamping: 1 })
    world.spawn({ id: "fast", x: 0, y: 0, vx: 500, shape })
    world.setColliders([{ id: "wall", shape: { type: "aabb", x: 20, y: 0, width: 6, height: 100 } }])

    world.step(0.1)

    expect(world.readState()[0].x).toBeLessThanOrEqual(15.02)
    expect(world.events()).toContainEqual({ type: "contact", bodyId: "fast", otherId: "wall", sensor: false })
  })

  it("keeps a fast body above a floor even when it crosses the entire collider", () => {
    const world = new PhysicsKernelWorld({ gravity: { x: 0, y: 0 }, velocityDamping: 1 })
    world.spawn({ id: "fast", x: 0, y: 0, vy: 500, shape: { type: "circle", radius: 2 } })
    world.setColliders([{ id: "floor", shape: { type: "aabb", x: 0, y: 20, width: 100, height: 6 } }])

    world.step(0.1)

    expect(world.readState()[0].y).toBeLessThanOrEqual(15.02)
  })

  it("resolves neighboring contacts introduced by a floor correction in the same step", () => {
    const world = new PhysicsKernelWorld({ gravity: { x: 0, y: 100 }, velocityDamping: 1 })
    world.setColliders([{ id: "floor", shape: { type: "aabb", x: 0, y: 10, width: 100, height: 4 } }])
    for (let index = 0; index < 3; index += 1) {
      world.spawn({ id: `stack-${index}`, x: 0, y: 6 - index * 4.05, shape: { type: "circle", radius: 2 } })
    }
    world.step(0.1)
    const bodies = world.readState()

    expect(bodies[0].y - bodies[1].y).toBeGreaterThan(3.5)
    expect(bodies[1].y - bodies[2].y).toBeGreaterThan(3.5)
    expect(bodies[0].y).toBeLessThanOrEqual(6.01)
  })

  it("lets a stationary supported stack sleep together without freezing free fall", () => {
    const world = new PhysicsKernelWorld({ gravity: { x: 0, y: 10 }, sleepSpeed: 20, sleepAfter: 0.05 })
    world.setColliders([{ id: "floor", shape: { type: "aabb", x: 0, y: 100, width: 100, height: 6 } }])
    for (let index = 0; index < 10; index += 1) {
      world.spawn({ id: `stack-${index}`, x: 0, y: 95 - index * 4, shape: { type: "circle", radius: 2 } })
    }
    world.spawn({ id: "falling", x: 20, y: 0, shape: { type: "circle", radius: 2 } })
    world.settle(40)

    expect(world.readState().filter((body) => body.id.startsWith("stack-")).every((body) => body.sleeping)).toBe(true)
    expect(world.readState().find((body) => body.id === "falling")?.sleeping).toBe(false)
  })

  it("preserves filtered walls and does not invent contacts outside a face", () => {
    const world = new PhysicsKernelWorld({ gravity: { x: 0, y: 0 }, velocityDamping: 1 })
    world.spawn({ id: "pass", x: 0, y: 0, vx: 500, shape: { type: "circle", radius: 2 }, datum: { allowed: true } })
    world.spawn({ id: "miss", x: 0, y: 20, vx: 500, shape: { type: "circle", radius: 2 } })
    world.setColliders([{ id: "wall", bodyFilter: { property: "datum.allowed", notEquals: true },
      shape: { type: "aabb", x: 20, y: 0, width: 6, height: 10 } }])
    world.step(0.1)

    expect(world.readState().map((body) => body.x)).toEqual([50, 50])
    expect(world.events().filter((event) => event.type === "contact")).toEqual([])
  })

  it("keeps confinement through snapshots and worker ticks", () => {
    const store = new PhysicsPipelineStore({
      fixedDt: 0.1, maxDeltaSeconds: 0.1,
      kernel: { gravity: { x: 0, y: 0 }, velocityDamping: 1 },
      colliders: [{ id: "wall", shape: { type: "aabb", x: -20, y: 0, width: 6, height: 100 } }]
    })
    store.spawnNow({ id: "fast", x: 0, y: 0, vx: -500, shape: { type: "circle", radius: 2 } })
    const worker = createPhysicsWorkerRuntime()
    worker.handle({ type: "init", snapshot: store.snapshot() })
    worker.handle({ type: "tick", deltaSeconds: 0.1 })
    const response = worker.handle({ type: "snapshot" })
    if (response.type !== "snapshot") throw new Error("Missing worker snapshot")
    store.tick(0.1)

    expect(response.snapshot.world.bodies).toEqual(store.snapshot().world.bodies)
    expect(store.readBodies()[0].x).toBeGreaterThanOrEqual(-15.02)
  })

  it("retains the assigned bins for a 1000-ball concentrated Galton distribution", () => {
    const size: [number, number] = [600, 400]
    const layout = buildGaltonBoardPhysics({
      data: Array.from({ length: 1000 }, (_, index) => ({ id: `row-${index}`, value: index % 3 })),
      valueAccessor: "value", bins: 21, ballRadius: 2, seed: 1, size
    })
    const store = new PhysicsPipelineStore(layout.config)
    store.enqueue(layout.initialSpawns, layout.initialSpawnPacing)
    const wallStart = Date.now()
    const steps = store.settle()
    const wallMilliseconds = Date.now() - wallStart
    const { plot } = physicsChartArea(size)
    const bodies = store.readBodies()
    const misplaced = bodies.filter((body) =>
      Math.floor((body.x - plot.x) / (plot.width / 21)) !== (body.datum as { bin: number }).bin
    )

    expect(store.queueSize()).toBe(0)
    expect(bodies).toHaveLength(1000)
    expect(misplaced.map((body) => body.id)).toEqual([])
    expect(bodies.every((body) => body.y <= plot.y + plot.height)).toBe(true)
    const maximumOverlap = maximumCircleOverlap(bodies)
    const metrics = { steps, simulatedSeconds: store.elapsed(), wallMilliseconds,
      queued: store.queueSize(), outsideBins: misplaced.length,
      belowFloor: bodies.filter((body) => body.y > plot.y + plot.height).length,
      active: bodies.filter((body) => !body.sleeping).length,
      moving: bodies.filter((body) => Math.hypot(body.vx, body.vy) >= 8).length,
      maximumSpeed: Math.max(...bodies.map((body) => Math.hypot(body.vx, body.vy))),
      maximumOverlap }
    expect(store.atRest(), JSON.stringify(metrics)).toBe(true)
    // Settlement must not merely freeze a visibly interpenetrating pile.
    expect(maximumOverlap).toBeLessThan(0.2)
  }, 60000)

  it("keeps all 1000 pile units above the floor and eventually stops", () => {
    const size: [number, number] = [700, 420]
    const layout = buildPhysicsPile({
      data: Array.from({ length: 1000 }, (_, index) => ({ id: `row-${index}`, category: `category-${index % 4}` })),
      categoryAccessor: "category", unitValue: 1, ballRadius: 2, seed: 1, size
    })
    const store = new PhysicsPipelineStore(layout.config)
    store.enqueue(layout.initialSpawns, layout.initialSpawnPacing)
    store.settle()
    const { plot } = physicsChartArea(size)

    expect(store.queueSize()).toBe(0)
    expect(store.liveBodyCount()).toBe(1000)
    expect(store.readBodies().filter((body) => body.y > plot.y + plot.height).map((body) => body.id)).toEqual([])
    expect(store.atRest()).toBe(true)
    expect(maximumCircleOverlap(store.readBodies())).toBeLessThan(0.2)
  }, 60000)
})
