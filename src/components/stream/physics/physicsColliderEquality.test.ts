import { describe, expect, it } from "vitest"
import { PhysicsKernelWorld, type PhysicsColliderSpec, type PhysicsColliderBodyFilter } from "./PhysicsKernel"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import { physicsCollidersEqual } from "./physicsColliderEquality"

function sensor(bodyFilter: PhysicsColliderBodyFilter): PhysicsColliderSpec {
  return { id: "sensor", sensor: true, shape: { type: "aabb", x: 0, y: 0, width: 10, height: 10 }, bodyFilter }
}

const body = { id: "body", x: 0, y: 0, shape: { type: "circle" as const, radius: 1 } }
const unfiltered = { property: "datum.kind" }

describe("collider filter equality", () => {
  it.each([undefined, 0])("retains thin-segment sensor membership across equivalent thickness=%s updates", (thickness) => {
    const world = new PhysicsKernelWorld({ gravity: { x: 0, y: 0 }, sleepAfter: 999 })
    const collider: PhysicsColliderSpec = {
      id: "sensor", sensor: true,
      shape: { type: "segment", x1: -5, y1: 0, x2: 5, y2: 0 },
    }
    world.spawn(body)
    world.setColliders([collider])
    world.step(1 / 60)
    const before = world.snapshot()
    world.setColliders([{ ...collider, shape: { ...collider.shape, thickness } } as PhysicsColliderSpec])
    expect(world.snapshot()).toEqual(before)
    world.setColliders([collider])
    expect(world.activeSensorPairs()).toEqual([{ sensorId: "sensor", bodyId: "body" }])
    world.step(1 / 60)
    expect(world.events()).toEqual([])
  })

  it("still detects changed segment endpoints and thickness", () => {
    const a: PhysicsColliderSpec = { id: "wall", shape: { type: "segment", x1: 0, y1: 0, x2: 5, y2: 0 } }
    expect(physicsCollidersEqual([a], [{ ...a, shape: { ...a.shape, thickness: 2 } } as PhysicsColliderSpec])).toBe(false)
    expect(physicsCollidersEqual([a], [{ ...a, shape: { ...a.shape, x2: 6 } } as PhysicsColliderSpec])).toBe(false)
  })

  it.each(["equals", "notEquals"] as const)("distinguishes missing %s from explicit undefined", key => {
    const a = [sensor(unfiltered)]
    const b = [sensor({ ...unfiltered, [key]: undefined })]
    expect(physicsCollidersEqual(a, b)).toBe(false)
    expect(physicsCollidersEqual(b, a)).toBe(false)
    expect(physicsCollidersEqual(b, [sensor({ ...unfiltered, [key]: undefined })])).toBe(true)
  })

  it("keeps sparse filter arrays distinct from explicit undefined values", () => {
    const sparse = [sensor({ ...unfiltered, oneOf: new Array(1) })]
    const explicit = [sensor({ ...unfiltered, oneOf: [undefined] })]
    expect(physicsCollidersEqual(sparse, explicit)).toBe(false)
    expect(physicsCollidersEqual(explicit, sparse)).toBe(false)
    expect(physicsCollidersEqual(sparse, [sensor({ ...unfiltered, oneOf: new Array(1) })])).toBe(true)
  })

  it.each([
    { key: "equals", datum: { kind: "known" } },
    { key: "notEquals", datum: {} },
  ] as const)("applies an explicit $key:undefined filter through the store config path", ({ key, datum }) => {
    const store = new PhysicsPipelineStore({ fixedDt: 1 / 60, kernel: { gravity: { x: 0, y: 0 }, sleepAfter: 999 }, colliders: [sensor(unfiltered)] })
    store.spawnNow({ ...body, datum })
    store.tick(1 / 60)
    expect(store.snapshot().activeSensorPairs).toHaveLength(1)
    const update = store.updateConfigWithResult({ colliders: [sensor({ ...unfiltered, [key]: undefined })] })
    expect(update.changeSet.keys).toContain("colliders")
    store.tick(1 / 60)
    expect(store.snapshot().activeSensorPairs).toEqual([])
  })

  it("retains membership-only filters across kernel snapshots and restores", () => {
    const world = new PhysicsKernelWorld({ gravity: { x: 0, y: 0 }, sleepAfter: 999 })
    world.spawn({ ...body, datum: { kind: "known" } })
    world.setColliders([sensor({ ...unfiltered, oneOf: ["known"] })])
    world.step(1 / 60)
    expect(world.activeSensorPairs()).toHaveLength(1)
    const snapshot = world.snapshot()
    expect(Object.hasOwn(snapshot.colliders[0].bodyFilter!, "equals")).toBe(false)
    expect(Object.hasOwn(snapshot.colliders[0].bodyFilter!, "notEquals")).toBe(false)
    world.restore(snapshot)
    world.step(1 / 60)
    expect(world.activeSensorPairs()).toEqual([{ sensorId: "sensor", bodyId: "body" }])
  })

  it("updates sparse oneOf semantics through the direct kernel path", () => {
    const world = new PhysicsKernelWorld({ gravity: { x: 0, y: 0 }, sleepAfter: 999 })
    world.spawn(body)
    world.setColliders([sensor({ ...unfiltered, oneOf: new Array(1) })])
    world.step(1 / 60)
    expect(world.activeSensorPairs()).toEqual([])
    world.setColliders([sensor({ ...unfiltered, oneOf: [undefined] })])
    world.step(1 / 60)
    expect(world.activeSensorPairs()).toEqual([{ sensorId: "sensor", bodyId: "body" }])
  })
})
