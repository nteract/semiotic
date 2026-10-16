import { expect, it } from "vitest"
import { PhysicsKernelWorld, type PhysicsBodySpec, type PhysicsKernelSnapshot } from "./PhysicsKernel"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import type { PhysicsPipelineSnapshot } from "./PhysicsPipelineTypes"
import { createPhysicsWorkerRuntime } from "./PhysicsWorkerRuntime"
import { buildGaltonBoardPhysics } from "../../charts/physics/galtonBoardPhysics"

const valid: PhysicsBodySpec = {
  id: "body",
  x: 0,
  y: 0,
  shape: { type: "circle", radius: 2 }
}

it.each([
  ...["x", "y", "vx", "vy", "angle", "mass", "restitution", "friction"].flatMap(
    (field) => [NaN, Infinity, -Infinity].map((value) => ({ [field]: value }))
  ),
  { mass: 0 },
  { mass: -1 },
  { shape: { type: "circle", radius: NaN } },
  { shape: { type: "circle", radius: 0 } },
  { shape: { type: "circle", radius: -1 } },
  { shape: { type: "aabb", width: Infinity, height: 2 } },
  { shape: { type: "aabb", width: 2, height: -1 } }
] as Partial<PhysicsBodySpec>[])(
  "rejects invalid bodies atomically: %j",
  (patch) => {
    const world = new PhysicsKernelWorld()
    world.spawn(valid)
    const before = world.snapshot()
    expect(() => world.spawn({ ...valid, ...patch })).toThrow(RangeError)
    expect(world.snapshot()).toEqual(before)
    world.step()
    expect(Number.isFinite(world.readState()[0].y)).toBe(true)
  }
)

it.each([NaN, Infinity, -Infinity])(
  "rejects spawnAt=%s without poisoning admission",
  (spawnAt) => {
    const store = new PhysicsPipelineStore()
    const before = store.snapshot()
    expect(() =>
      store.enqueue([valid, { ...valid, id: "bad", spawnAt }])
    ).toThrow(/spawnAt/)
    expect(store.snapshot()).toEqual(before)
    store.enqueue(valid)
    expect(store.tick(0).spawned).toEqual(["body"])
    expect(store.queueSize()).toBe(0)
  }
)

it("leaves a live body and its sensor membership intact after an invalid immediate replacement", () => {
  const store = new PhysicsPipelineStore({
    colliders: [
      {
        id: "sensor",
        sensor: true,
        shape: { type: "aabb", x: 0, y: 0, width: 10, height: 10 }
      }
    ]
  })
  store.spawnNow(valid)
  store.tick(1 / 120)
  const before = store.snapshot()
  expect(() => store.spawnNow({ ...valid, mass: NaN })).toThrow(/mass/)
  expect(store.snapshot()).toEqual(before)
})

it("keeps the worker usable after invalid queue input", () => {
  const worker = createPhysicsWorkerRuntime()
  worker.handle({ type: "init" })
  expect(() =>
    worker.handle({ type: "enqueue", spawns: [{ ...valid, spawnAt: NaN }] })
  ).toThrow(/spawnAt/)
  const response = worker.handle({ type: "enqueue", spawns: [valid] })
  if (response.type !== "frame") throw new Error("Expected worker frame")
  expect(response.frame.ids).toEqual(["body"])
  expect(response.frame.positions.every(Number.isFinite)).toBe(true)
})

it("rejects invalid snapshots and configuration without changing the pipeline", () => {
  const store = new PhysicsPipelineStore()
  store.enqueue({ ...valid, spawnAt: 10 })
  const saved = store.snapshot()
  expect(() =>
    store.restore({ ...saved, queue: [{ ...saved.queue[0], spawnAt: NaN }] })
  ).toThrow(/spawnAt/)
  expect(() =>
    store.restore({ ...saved, queue: [{ ...saved.queue[0], sequence: NaN }] })
  ).toThrow(/sequence/)
  expect(() => store.updateConfig({ fixedDt: NaN })).toThrow(/fixedDt/)
  expect(() =>
    store.updateConfig({ kernel: { gravity: { x: NaN, y: 100 } } })
  ).toThrow(/gravity/)
  expect(store.snapshot()).toEqual(saved)
})

it("rejects invalid colliders, springs, impulses and restored bodies before mutation", () => {
  const world = new PhysicsKernelWorld()
  world.spawn(valid)
  const before = world.snapshot()
  expect(() =>
    world.setColliders([
      { id: "bad", shape: { type: "segment", x1: 0, y1: NaN, x2: 10, y2: 0 } }
    ])
  ).toThrow(RangeError)
  expect(() =>
    world.setConstraint({
      bodyId: "body",
      target: { type: "point", x: NaN, y: 0 }
    })
  ).toThrow(RangeError)
  expect(() => world.applyImpulse("body", NaN, 0)).toThrow(RangeError)
  expect(() =>
    world.restore({ ...before, bodies: [{ ...before.bodies[0], mass: NaN }] })
  ).toThrow(RangeError)
  expect(world.snapshot()).toEqual(before)
})

it.each([0, -3, NaN, Infinity, 1.9])(
  "normalizes Galton bins=%s into finite geometry",
  (bins) => {
    const layout = buildGaltonBoardPhysics({
      data: [{ value: 1 }, { value: 3 }],
      valueAccessor: "value",
      bins,
      ballRadius: 2,
      seed: 1,
      size: [400, 300]
    })
    expect(layout.projectionRows).toEqual([{ label: "1", value: 2 }])
    const store = new PhysicsPipelineStore(layout.config)
    store.enqueue(layout.initialSpawns)
    store.tick(0)
    expect(store.readBodies()).toHaveLength(2)
    expect(
      store
        .readBodies()
        .every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))
    ).toBe(true)
  }
)

it("rejects sparse restored body and queue arrays before replacing the current world", () => {
  const store = new PhysicsPipelineStore()
  store.spawnNow(valid)
  store.enqueue({ ...valid, id: "future", spawnAt: 10 })
  const before = store.snapshot()
  const bodies = before.world.bodies.slice()
  bodies.length = 2
  expect(() => store.restore({ ...before, world: { ...before.world, bodies } })).toThrow(RangeError)
  expect(store.snapshot()).toEqual(before)
  const queue = before.queue.slice()
  queue.length = 2
  expect(() => store.restore({ ...before, queue })).toThrow(RangeError)
  expect(store.snapshot()).toEqual(before)
})

it.each([2, {}, "sensor", [2], new Array(1)])("rejects malformed activeSensors atomically: %j", (activeSensors) => {
  const world = new PhysicsKernelWorld()
  world.spawn(valid)
  const before = world.snapshot()
  expect(() => world.restore({ ...before, activeSensors } as PhysicsKernelSnapshot)).toThrow(/activeSensors/)
  expect(world.snapshot()).toEqual(before)
})

it("validates all restored pipeline containers before replacing live state", () => {
  const store = new PhysicsPipelineStore({ sediment: {}, bodyLimit: 1 })
  store.spawnNow({ ...valid, id: "sediment" })
  store.spawnNow(valid)
  store.enqueue({ ...valid, id: "future", spawnAt: 10 })
  const before = store.snapshot()
  const bin = before.sediment[0]
  expect(bin.bodyIds).toEqual(["sediment"])
  const patches = [
    { world: { ...before.world, activeSensors: 2 } },
    { activeSensorPairs: 2 }, { activeSensorPairs: [null] },
    { liveBodyOrder: {} }, { liveBodyOrder: new Array(1) },
    { queue: {} }, { world: { ...before.world, bodies: {} } },
    { world: { ...before.world, colliders: {} } },
    { world: { ...before.world, springs: {} } },
    { sediment: {} }, { sediment: new Array(1) },
    { sediment: [{ ...bin, bodyIds: 2 }] },
    { sediment: [{ ...bin, bodyIds: new Array(1) }] },
    { sediment: [{ ...bin, x: null }] },
    { sediment: [{ ...bin, value: { ...bin.value, variance: NaN } }] },
  ]
  for (const patch of patches) {
    expect(() => store.restore({ ...before, elapsedSeconds: 123, ...patch } as PhysicsPipelineSnapshot)).toThrow(RangeError)
    expect(store.snapshot()).toEqual(before)
  }
  store.restore(before)
  expect(store.snapshot()).toEqual(before)
  const legacy = { ...before }
  Reflect.deleteProperty(legacy, "sediment")
  store.restore(legacy)
  expect(store.readSediment()).toEqual([])
  expect(store.readBodies().map((body) => body.id)).toEqual([valid.id])
})
