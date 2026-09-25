import { expect, it, vi } from "vitest"
import { PhysicsKernelWorld } from "./PhysicsKernel"
import * as bounds from "./physicsCollisionBounds"

it("sleeps separated bodies without allocating empty collider or sensor bounds", () => {
  const world = new PhysicsKernelWorld({
    gravity: { x: 0, y: 0 },
    sleepAfter: 0.01
  })
  for (let index = 0; index < 3; index++)
    world.spawn({
      id: String(index),
      x: index * 10,
      y: 0,
      shape: { type: "circle", radius: 1 }
    })
  const candidates = vi.spyOn(bounds, "colliderCandidatesForBody")
  const sensorBounds = vi.spyOn(bounds, "bodyBounds")
  try {
    world.step()
    world.step()
    expect(candidates).not.toHaveBeenCalled()
    expect(sensorBounds).not.toHaveBeenCalled()
    expect(
      world.readState().map(({ x, sleeping }) => ({ x, sleeping }))
    ).toEqual([
      { x: 0, sleeping: true },
      { x: 10, sleeping: true },
      { x: 20, sleeping: true }
    ])
    expect(world.events()).toEqual([
      { type: "sleep", bodyId: "0" },
      { type: "sleep", bodyId: "1" },
      { type: "sleep", bodyId: "2" }
    ])
  } finally {
    candidates.mockRestore()
    sensorBounds.mockRestore()
  }
})

it("preserves motion and sensor-only entry/exit events without solid candidate work", () => {
  const world = new PhysicsKernelWorld({
    gravity: { x: 0, y: 0 },
    velocityDamping: 1
  })
  world.setColliders([
    {
      id: "sensor",
      sensor: true,
      shape: { type: "aabb", x: 6, y: 0, width: 2, height: 4 }
    }
  ])
  world.spawn({
    id: "moving",
    x: 0,
    y: 0,
    vx: 20,
    shape: { type: "circle", radius: 1 }
  })
  const candidates = vi.spyOn(bounds, "colliderCandidatesForBody")
  try {
    const events = []
    for (let step = 0; step < 5; step++) {
      world.step(0.1)
      events.push(...world.events())
      expect(world.readState()[0].x).toBe((step + 1) * 2)
    }
    expect(candidates).not.toHaveBeenCalled()
    expect(events).toEqual([
      { type: "sensor-enter", bodyId: "moving", sensorId: "sensor" },
      { type: "sensor-exit", bodyId: "moving", sensorId: "sensor" }
    ])
    expect(world.activeSensorPairs()).toEqual([])
  } finally {
    candidates.mockRestore()
  }
})

it("emits exits for restored active sensors even when no sensor colliders remain", () => {
  const world = new PhysicsKernelWorld({ gravity: { x: 0, y: 0 } })
  world.setColliders([
    {
      id: "sensor",
      sensor: true,
      shape: { type: "aabb", x: 0, y: 0, width: 4, height: 4 }
    }
  ])
  world.spawn({
    id: "inside",
    x: 0,
    y: 0,
    shape: { type: "circle", radius: 1 }
  })
  world.step()
  expect(world.activeSensorPairs()).toEqual([
    { bodyId: "inside", sensorId: "sensor" }
  ])
  const snapshot = world.snapshot()
  snapshot.colliders = []
  const restored = new PhysicsKernelWorld()
  restored.restore(snapshot)
  restored.step()
  expect(restored.events()).toEqual([
    { type: "sensor-exit", bodyId: "inside", sensorId: "sensor" }
  ])
  expect(restored.activeSensorPairs()).toEqual([])
})
