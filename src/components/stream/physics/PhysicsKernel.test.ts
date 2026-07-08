import { describe, expect, it } from "vitest"
import { PhysicsKernelWorld } from "./PhysicsKernel"

function makeWorld() {
  return new PhysicsKernelWorld({
    seed: 42,
    gravity: { x: 0, y: 400 },
    fixedDt: 1 / 120,
    velocityDamping: 0.998,
    restitution: 0.05,
    friction: 0.08
  })
}

function step(world: PhysicsKernelWorld, count: number): void {
  for (let i = 0; i < count; i += 1) world.step()
}

describe("PhysicsKernelWorld", () => {
  it("produces byte-identical seeded runs across fixed steps", () => {
    const run = () => {
      const world = makeWorld()
      world.setColliders([
        {
          id: "floor",
          shape: { type: "aabb", x: 150, y: 210, width: 320, height: 20 }
        },
        {
          id: "left-wall",
          shape: { type: "aabb", x: -10, y: 90, width: 20, height: 240 }
        },
        {
          id: "peg",
          shape: { type: "segment", x1: 70, y1: 120, x2: 130, y2: 150, thickness: 4 }
        }
      ])
      for (let i = 0; i < 8; i += 1) {
        world.spawn({
          id: `ball-${i}`,
          x: 30 + world.nextRandom() * 160,
          y: 10 + i * 3,
          vx: -20 + world.nextRandom() * 40,
          vy: world.nextRandom() * 30,
          shape: { type: "circle", radius: 5 },
          mass: 1 + i * 0.1
        })
      }
      step(world, 240)
      return world.readState().map((body) => [
        body.id,
        body.x,
        body.y,
        body.vx,
        body.vy,
        body.sleeping
      ])
    }

    expect(run()).toEqual(run())
  })

  it("resolves circle contacts against static walls", () => {
    const world = new PhysicsKernelWorld({
      gravity: { x: 0, y: 0 },
      restitution: 0,
      velocityDamping: 1,
      sleepAfter: 10
    })
    world.setColliders([
      { id: "wall", shape: { type: "aabb", x: 100, y: 0, width: 20, height: 160 } }
    ])
    world.spawn({
      id: "ball",
      x: 80,
      y: 0,
      vx: 300,
      vy: 0,
      shape: { type: "circle", radius: 10 }
    })

    step(world, 20)
    const [ball] = world.readState()
    // Rests against the wall face (x=90 − radius 10 = 80) within POSITION_SLOP.
    expect(ball.x).toBeLessThanOrEqual(80.01)
    expect(ball.x).toBeGreaterThan(79.9)
    expect(ball.vx).toBeLessThanOrEqual(0)
    expect(world.events().some((event) => event.type === "contact")).toBe(true)
  })

  it("keeps dynamic bodies separated through the spatial hash broadphase", () => {
    const world = new PhysicsKernelWorld({
      gravity: { x: 0, y: 0 },
      restitution: 0,
      velocityDamping: 1,
      cellSize: 16,
      sleepAfter: 10
    })
    world.spawn({
      id: "a",
      x: 0,
      y: 0,
      vx: 80,
      vy: 0,
      shape: { type: "circle", radius: 10 }
    })
    world.spawn({
      id: "b",
      x: 32,
      y: 0,
      vx: -80,
      vy: 0,
      shape: { type: "circle", radius: 10 }
    })

    step(world, 16)
    const [a, b] = world.readState()
    const distance = Math.hypot(a.x - b.x, a.y - b.y)
    expect(distance).toBeGreaterThanOrEqual(19.99)
    expect(a.vx).toBeLessThanOrEqual(0)
    expect(b.vx).toBeGreaterThanOrEqual(0)
  })

  it("emits sensor enter and exit without resolving the body", () => {
    const world = new PhysicsKernelWorld({
      gravity: { x: 0, y: 0 },
      velocityDamping: 1,
      sleepAfter: 10
    })
    world.setColliders([
      {
        id: "window-a",
        sensor: true,
        shape: { type: "aabb", x: 50, y: 0, width: 20, height: 80 }
      }
    ])
    world.spawn({
      id: "event",
      x: 0,
      y: 0,
      vx: 240,
      vy: 0,
      shape: { type: "circle", radius: 4 }
    })

    let entered = false
    let exited = false
    for (let i = 0; i < 60; i += 1) {
      world.step()
      for (const event of world.events()) {
        if (event.type === "sensor-enter" && event.sensorId === "window-a") {
          entered = true
        }
        if (event.type === "sensor-exit" && event.sensorId === "window-a") {
          exited = true
        }
      }
    }

    const [body] = world.readState()
    expect(entered).toBe(true)
    expect(exited).toBe(true)
    expect(body.x).toBeGreaterThan(100)
  })

  it("settles to sleep and wakes on impulse", () => {
    const world = makeWorld()
    world.setColliders([
      { id: "floor", shape: { type: "aabb", x: 0, y: 100, width: 200, height: 20 } }
    ])
    world.spawn({
      id: "ball",
      x: 0,
      y: 0,
      shape: { type: "circle", radius: 8 }
    })

    const steps = world.settle(2000)
    expect(steps).toBeLessThan(2000)
    expect(world.allSleeping()).toBe(true)

    world.applyImpulse("ball", 80, -200)
    expect(world.allSleeping()).toBe(false)
    expect(world.events().some((event) => event.type === "wake")).toBe(true)
  })

  it("restores snapshots and continues deterministically", () => {
    const first = makeWorld()
    first.setColliders([
      { id: "floor", shape: { type: "aabb", x: 0, y: 140, width: 200, height: 20 } }
    ])
    first.spawn({
      id: "ball",
      x: -20,
      y: 0,
      vx: 40,
      shape: { type: "circle", radius: 8 }
    })
    step(first, 80)

    const snapshot = first.snapshot()
    const restored = makeWorld()
    restored.restore(snapshot)

    step(first, 100)
    step(restored, 100)

    expect(restored.readState()).toEqual(first.readState())
  })

  it("applies spring constraints toward fixed points", () => {
    const world = new PhysicsKernelWorld({
      gravity: { x: 0, y: 0 },
      velocityDamping: 0.999,
      sleepAfter: 10
    })
    world.spawn({
      id: "body",
      x: 0,
      y: 0,
      shape: { type: "circle", radius: 4 }
    })
    world.setConstraint({
      bodyId: "body",
      target: { type: "point", x: 100, y: 0 },
      restLength: 0,
      stiffness: 20,
      damping: 1
    })

    step(world, 40)
    const [body] = world.readState()
    expect(body.x).toBeGreaterThan(0)
  })
})
