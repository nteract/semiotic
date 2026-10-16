import { expect, it } from "vitest"
import { PhysicsKernelWorld, type PhysicsColliderShape } from "./PhysicsKernel"

const shapes: PhysicsColliderShape[] = [
  { type: "segment", x1: 0, y1: 0, x2: 10, y2: 0 },
  { type: "aabb", x: 5, y: 5, width: 10, height: 10 }
]

it("retains body contacts introduced by an earlier correction in a later pass", () => {
  const world = new PhysicsKernelWorld({
    gravity: { x: 0, y: 0 },
    restitution: 0
  })
  for (const [id, x] of [
    ["c", 0],
    ["a", 3.1],
    ["b", 2.1]
  ] as const)
    world.spawn({ id, x, y: 0, shape: { type: "circle", radius: 1 } })
  world.step()
  expect(world.readState()[0].x).toBeLessThan(0)
  expect(world.events()).toEqual([
    { type: "contact", bodyId: "a", otherId: "b", sensor: false },
    { type: "contact", bodyId: "c", otherId: "b", sensor: false }
  ])
})

it.each(shapes)(
  "retains glancing prepass contacts against $type colliders",
  (shape) => {
    const world = new PhysicsKernelWorld({
      gravity: { x: 0, y: 0 },
      velocityDamping: 1,
      restitution: 0,
      friction: 0,
      maxVelocity: 0
    })
    world.setColliders([{ id: "wall", shape }])
    world.spawn({
      id: "body",
      x: -4,
      y: -1,
      vx: 960,
      shape: { type: "circle", radius: 2 }
    })
    world.step()
    const body = world.readState()[0]
    expect(body.x).toBeLessThan(0)
    expect(body.y).toBeLessThan(-2)
    expect(body.vx).toBeLessThan(960)
    expect(world.events()).toEqual([
      { type: "contact", bodyId: "body", otherId: "wall", sensor: false }
    ])
    world.step()
    expect(world.events()).toEqual([])
  }
)

it.each(shapes)("emits each resting $type contact once per step", (shape) => {
  const world = new PhysicsKernelWorld({ restitution: 0 })
  world.setColliders([{ id: "wall", shape }])
  world.spawn({ id: "body", x: 5, y: -2, shape: { type: "circle", radius: 2 } })
  for (let step = 0; step < 5; step++) {
    world.step()
    expect(world.events()).toEqual([
      { type: "contact", bodyId: "body", otherId: "wall", sensor: false }
    ])
  }
})

it.each([
  { type: "segment", x1: -10, y1: 0, x2: 10, y2: 0 },
  { type: "segment", x1: 10, y1: 0, x2: -10, y2: 0 },
  { type: "aabb", x: 0, y: 5, width: 20, height: 10 }
] satisfies PhysicsColliderShape[])(
  "ignores zero-duration box grazes against $type",
  (shape) => {
    const world = new PhysicsKernelWorld({
      gravity: { x: 0, y: 0 },
      velocityDamping: 1,
      restitution: 0,
      friction: 0
    })
    world.setColliders([{ id: "wall", shape }])
    world.spawn({
      id: "body",
      x: 12,
      y: 0,
      vx: -240,
      vy: -240,
      shape: { type: "aabb", width: 2, height: 2 }
    })
    world.step()
    expect(world.readState()[0]).toMatchObject({
      x: 10,
      y: -2,
      vx: -240,
      vy: -240
    })
    expect(world.events()).toEqual([])
  }
)

it.each([0, -0.000001])(
  "retains genuine corner crossings (offset %s)",
  (offset) => {
    const world = new PhysicsKernelWorld({
      gravity: { x: 0, y: 0 },
      velocityDamping: 1,
      restitution: 0,
      friction: 0
    })
    world.setColliders([
      { id: "wall", shape: { type: "segment", x1: -10, y1: 0, x2: 10, y2: 0 } }
    ])
    world.spawn({
      id: "body",
      x: 12 + offset,
      y: -2,
      vx: -240,
      vy: 240,
      shape: { type: "aabb", width: 2, height: 2 }
    })
    world.step()
    expect(world.events()).toEqual([
      { type: "contact", bodyId: "body", otherId: "wall", sensor: false }
    ])
    const body = world.readState()[0]
    expect(Math.hypot(body.vx, body.vy)).toBeLessThan(Math.hypot(240, 240))
  }
)

it.each([-0.000001, 0.000001])(
  "distinguishes a brief corner crossing from a near miss (offset %s)",
  (offset) => {
    const world = new PhysicsKernelWorld({
      gravity: { x: 0, y: 0 },
      velocityDamping: 1,
      restitution: 0,
      friction: 0
    })
    world.setColliders([
      { id: "wall", shape: { type: "segment", x1: -10, y1: 0, x2: 10, y2: 0 } }
    ])
    world.spawn({
      id: "body",
      x: 12 + offset,
      y: 0,
      vx: -240,
      vy: -240,
      shape: { type: "aabb", width: 2, height: 2 }
    })
    world.step()
    if (offset < 0) {
      expect(world.readState()[0].vx).toBe(0)
      expect(world.events()).toEqual([
        { type: "contact", bodyId: "body", otherId: "wall", sensor: false }
      ])
    } else {
      expect(world.readState()[0]).toMatchObject({
        x: 10 + offset,
        y: -2,
        vx: -240,
        vy: -240
      })
      expect(world.events()).toEqual([])
    }
  }
)
