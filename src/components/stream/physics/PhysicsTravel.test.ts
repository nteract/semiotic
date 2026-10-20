import { describe, expect, it } from "vitest"
import { PhysicsKernelWorld } from "./PhysicsKernel"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import { createPhysicsWorkerRuntime } from "./PhysicsWorkerRuntime"
import { PhysicsWorkerDatums } from "./physicsWorkerDatums"
import type { PhysicsWorkerCommand } from "./PhysicsWorkerProtocol"

const spawn = {
  id: "traveller",
  x: 0,
  y: 0,
  shape: { type: "circle" as const, radius: 4 },
  datum: { id: "traveller", __phase: "travel", late: false },
  travel: {
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 }
    ],
    durationSeconds: 2
  }
}

describe("serializable physics travel", () => {
  it("crosses colliders, bodies and sensors without contact, then releases to gravity", () => {
    const world = new PhysicsKernelWorld()
    world.setColliders([
      {
        id: "wall",
        shape: { type: "aabb", x: 50, y: 0, width: 20, height: 50 }
      },
      {
        id: "sensor",
        sensor: true,
        shape: { type: "aabb", x: 50, y: 50, width: 200, height: 200 }
      }
    ])
    world.spawn(spawn)
    world.spawn({
      id: "anchor",
      x: 50,
      y: 0,
      shape: spawn.shape,
      fixedPosition: { x: 50, y: 0 }
    })
    for (let i = 0; i < 120; i++) {
      world.step()
      expect(
        world.events().filter((event) => event.bodyId === spawn.id)
      ).toEqual([])
    }
    expect(world.readBody(spawn.id)?.x).toBeCloseTo(100, 10)
    expect(world.readBody(spawn.id)).toMatchObject({
      y: 0,
      datum: { __phase: "travel" }
    })
    for (let i = 0; i < 120; i++) world.step()
    expect(world.readBody(spawn.id)).toMatchObject({
      x: 100,
      y: 100,
      vx: 0,
      vy: 0,
      datum: { __phase: "board" }
    })
    expect(world.readBody(spawn.id)?.travel).toBeUndefined()
    expect(world.events()).toContainEqual({
      type: "travel-end",
      bodyId: spawn.id
    })
    world.step()
    expect(world.readBody(spawn.id)!.y).toBeGreaterThan(100)
    expect(world.events()).toContainEqual({
      type: "sensor-enter",
      bodyId: spawn.id,
      sensorId: "sensor"
    })
    expect(spawn.datum.__phase).toBe("travel")
  })

  it("does not sleep or declare idle on a slow or stationary path", () => {
    const store = new PhysicsPipelineStore({
      kernel: { gravity: { x: 0, y: 0 } }
    })
    store.enqueue({
      ...spawn,
      travel: {
        points: [
          { x: 0, y: 0 },
          { x: 0, y: 0 }
        ],
        durationSeconds: 5
      }
    })
    for (let i = 0; i < 480; i++)
      expect(store.tick(1 / 120).shouldContinue).toBe(true)
    expect(store.readBodies()[0].travel?.elapsedSeconds).toBeCloseTo(4)
    store.setPaused(true)
    const before = store.snapshot()
    store.tick(10)
    expect(store.snapshot()).toEqual(before)
    store.setPaused(false)
    store.settle()
    expect(store.readBodies()[0]).toMatchObject({
      sleeping: true,
      datum: { __phase: "settled" }
    })
  })

  it("snapshots own their paths and resume at exactly the same position", () => {
    const first = new PhysicsPipelineStore()
    first.enqueue(spawn)
    for (let i = 0; i < 60; i++) first.tick(1 / 120)
    const snapshot = first.snapshot()
    const second = new PhysicsPipelineStore()
    second.restore(snapshot)
    snapshot.world.bodies[0].travel!.points[0].x = -999
    for (let i = 0; i < 240; i++) {
      first.tick(1 / 120)
      second.tick(1 / 120)
    }
    expect(second.snapshot()).toEqual(first.snapshot())
  })

  it("settles long travel before spending the post-arrival settling margin", () => {
    const store = new PhysicsPipelineStore({
      kernel: { gravity: { x: 0, y: 0 } }
    })
    store.enqueue({
      ...spawn,
      travel: { ...spawn.travel, durationSeconds: 12 }
    })
    store.settle()
    expect(store.readBodies()[0]).toMatchObject({
      sleeping: true,
      datum: { __phase: "settled" }
    })
    expect(store.snapshot().elapsedSeconds).toBeGreaterThan(12)
  })

  it("keeps worker progress, phase changes and authored datum functions on handoff", () => {
    const runtime = createPhysicsWorkerRuntime()
    const datums = new PhysicsWorkerDatums()
    const mirror = new PhysicsPipelineStore()
    const label = () => "original"
    const send = (command: PhysicsWorkerCommand) => {
      const revision = datums.capture(command)
      // Worker commands normally pass through structured clone. The session
      // strips noncloneable datum functions; simulate that transport boundary.
      const portable = JSON.parse(
        JSON.stringify(command)
      ) as PhysicsWorkerCommand
      const payload = datums.receive(runtime.handle(portable), revision)
      if (payload.type === "frame") mirror.applyWorkerFrame(payload.frame)
      return payload
    }
    send({
      type: "init",
      initialSpawns: [{ ...spawn, datum: { ...spawn.datum, label } }]
    })
    for (let i = 0; i < 60; i++) send({ type: "tick", deltaSeconds: 1 / 120 })
    expect(mirror.readBodies()[0].travel?.elapsedSeconds).toBeCloseTo(0.5)
    expect((mirror.readBodies()[0].datum as { label: unknown }).label).toBe(
      label
    )
    const resumed = new PhysicsPipelineStore()
    resumed.restore(mirror.snapshot())
    for (let i = 0; i < 180; i++) {
      resumed.tick(1 / 120)
      send({ type: "tick", deltaSeconds: 1 / 120 })
    }
    expect(mirror.readBodies()[0].datum).toMatchObject({
      __phase: "board",
      label
    })
    expect(mirror.readBodies()[0].travel).toBeUndefined()
    expect(resumed.readBodies()[0]).toEqual(mirror.readBodies()[0])
  })

  it.each([
    { points: [], durationSeconds: 1 },
    {
      points: [
        { x: 0, y: 0 },
        { x: NaN, y: 1 }
      ],
      durationSeconds: 1
    },
    { ...spawn.travel, durationSeconds: 0 },
    { ...spawn.travel, elapsedSeconds: 3 }
  ])("rejects malformed travel before mutating the world", (travel) => {
    const world = new PhysicsKernelWorld()
    expect(() => world.spawn({ ...spawn, travel })).toThrow(RangeError)
    expect(world.readState()).toEqual([])
  })
})
