import { expect, it, vi } from "vitest"
import { PhysicsKernelWorld } from "./PhysicsKernel"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import { createPhysicsWorkerRuntime } from "./PhysicsWorkerRuntime"

it("continues random draws across snapshots, worker handoff and config updates", () => {
  const store = new PhysicsPipelineStore({ kernel: { seed: 17 } })
  for (let i = 0; i < 23; i++) store.nextRandom()
  const saved = store.snapshot()
  const expected = Array.from({ length: 10 }, () => store.nextRandom())
  store.restore(saved)
  store.updateConfig({ kernel: { friction: 0.2 } })
  expect(Array.from({ length: 10 }, () => store.nextRandom())).toEqual(expected)
  const worker = createPhysicsWorkerRuntime()
  worker.handle({ type: "init", snapshot: saved })
  worker.handle({ type: "tick", deltaSeconds: 1 / 60 })
  const response = worker.handle({ type: "snapshot" })
  if (response.type !== "snapshot") throw new Error("Expected snapshot")
  store.restore(response.snapshot)
  expect(Array.from({ length: 10 }, () => store.nextRandom())).toEqual(expected)
})

it("accepts older snapshots without random state and resets draws on init", () => {
  const world = new PhysicsKernelWorld({ seed: 9 })
  const first = world.nextRandom()
  const saved = world.snapshot()
  delete saved.randomState
  world.restore(saved)
  expect(world.nextRandom()).toBe(first)
  world.init({ seed: 9 })
  expect(world.nextRandom()).toBe(first)
})

it("retains the same velocity after a second at different fixed timesteps", () => {
  for (const hz of [30, 60, 120, 240]) {
    const world = new PhysicsKernelWorld({
      gravity: { x: 0, y: 0 },
      sleepSpeed: 0
    })
    world.spawn({
      id: "body",
      x: 0,
      y: 0,
      vx: 100,
      shape: { type: "circle", radius: 1 }
    })
    for (let i = 0; i < hz; i++) world.step(1 / hz)
    expect(world.readState()[0].vx).toBeCloseTo(100 * 0.995 ** 120, 9)
  }
})

it("limits static friction by the normal impulse across timestep and solver counts", () => {
  for (const hz of [60, 120, 240])
    for (const collisionIterations of [1, 6, 12]) {
      const world = new PhysicsKernelWorld({
        gravity: { x: 0, y: 100 },
        velocityDamping: 1,
        friction: 0.2,
        restitution: 0,
        sleepSpeed: 0,
        collisionIterations
      })
      world.setColliders([
        {
          id: "floor",
          shape: { type: "segment", x1: -100, y1: 0, x2: 1000, y2: 0 }
        }
      ])
      world.spawn({
        id: "body",
        x: 0,
        y: -1,
        vx: 100,
        shape: { type: "circle", radius: 1 }
      })
      for (let i = 0; i < hz; i++) world.step(1 / hz)
      expect(world.readState()[0].vx).toBeCloseTo(80, 8)
    }
})

it("keeps one-second free fall within one percent across fixed timesteps", () => {
  const positions = [60, 120, 240].map((hz) => {
    const world = new PhysicsKernelWorld({ sleepSpeed: 0 })
    world.spawn({
      id: "body",
      x: 0,
      y: 0,
      shape: { type: "circle", radius: 1 }
    })
    for (let step = 0; step < hz; step++) world.step(1 / hz)
    return world.readState()[0].y
  })
  expect(
    (Math.max(...positions) - Math.min(...positions)) / positions[1]
  ).toBeLessThan(0.01)
})

it("orders springs independently of the host locale", () => {
  const world = new PhysicsKernelWorld({ gravity: { x: 0, y: 0 } })
  world.spawn({ id: "body", x: 0, y: 0, shape: { type: "circle", radius: 1 } })
  for (const id of ["z", "ä", "a"])
    world.setConstraint({
      id,
      bodyId: "body",
      target: { type: "point", x: 10, y: 0 }
    })
  const compare = vi
    .spyOn(String.prototype, "localeCompare")
    .mockImplementation(() => {
      throw new Error("Locale ordering")
    })
  try {
    expect(() => world.step()).not.toThrow()
  } finally {
    compare.mockRestore()
  }
})
