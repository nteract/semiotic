import { expect, it, vi } from "vitest"
import { PhysicsKernelWorld, type PhysicsColliderSpec } from "./PhysicsKernel"
import * as sweep from "./physicsSweptAabbContact"
import * as circleSweep from "./physicsSweptCircleContact"
import * as bounds from "./physicsCollisionBounds"

it("skips redundant contact-free passes while preserving motion, springs, sensors and snapshots", () => {
  const worlds = [false, true].map((fullPasses) => {
    const world = new PhysicsKernelWorld({
      gravity: { x: 0, y: 12 },
      velocityDamping: 1
    })
    world.setColliders([
      {
        id: "distant",
        shape: { type: "aabb", x: 1000, y: 0, width: 2, height: 40 },
        bodyFilter: fullPasses ? () => true : undefined
      },
      {
        id: "sensor",
        sensor: true,
        shape: { type: "aabb", x: 1.5, y: 0, width: 20, height: 20 }
      }
    ])
    for (const [id, x] of [
      ["a", 0],
      ["b", 3]
    ] as const) {
      world.spawn({ id, x, y: 0, vx: 3, shape: { type: "circle", radius: 1 } })
      world.setConstraint({
        bodyId: id,
        target: { type: "point", x: x + 10, y: 0 },
        stiffness: 2,
        damping: 0,
        restLength: 0
      })
    }
    return world
  })
  const contact = vi.spyOn(circleSweep, "sweptCircleContact")
  try {
    for (let step = 0; step < 12; step++) {
      contact.mockClear()
      worlds[0].step()
      expect(contact).toHaveBeenCalledTimes(1)
      contact.mockClear()
      worlds[1].step()
      expect(contact).toHaveBeenCalledTimes(6)
      const expected = worlds[1].snapshot()
      expected.colliders = expected.colliders.map((collider) => ({
        ...collider,
        bodyFilter: undefined
      }))
      expect(worlds[0].snapshot()).toEqual(expected)
      expect(worlds[0].events()).toEqual(worlds[1].events())
      expect(worlds[0].events().some((event) => event.type === "contact")).toBe(
        false
      )
      if (step === 0) {
        const body = worlds[0].readState()[0]
        expect(body.vx).toBeCloseTo(3 + 20 / 120)
        expect(body.x).toBeCloseTo((3 + 20 / 120) / 120)
        expect(body.vy).toBeCloseTo(12 / 120)
        expect(body.y).toBeCloseTo(12 / 120 / 120)
        expect(worlds[0].events()).toEqual([
          { type: "sensor-enter", bodyId: "a", sensorId: "sensor" },
          { type: "sensor-enter", bodyId: "b", sensorId: "sensor" }
        ])
      }
    }
  } finally {
    contact.mockRestore()
  }
})

it("retains every relaxation pass when contacts cannot move fixed bodies", () => {
  const world = new PhysicsKernelWorld({ gravity: { x: 0, y: 0 } })
  for (const [id, x] of [
    ["a", 0],
    ["b", 1.5]
  ] as const)
    world.spawn({
      id,
      x,
      y: 0,
      fixedPosition: { x, y: 0 },
      shape: { type: "circle", radius: 1 }
    })
  const contact = vi.spyOn(circleSweep, "sweptCircleContact")
  try {
    world.step()
    expect(contact).toHaveBeenCalledTimes(6)
    expect(world.readState().map(({ x, y }) => [x, y])).toEqual([
      [0, 0],
      [1.5, 0]
    ])
    expect(world.events()).toContainEqual({
      type: "contact",
      bodyId: "a",
      otherId: "b",
      sensor: false
    })
  } finally {
    contact.mockRestore()
  }
})

it("rejects distant static bounds before swept contact work while preserving fast floor contacts", () => {
  const world = new PhysicsKernelWorld({
    gravity: { x: 0, y: 0 },
    velocityDamping: 1
  })
  world.setColliders([
    ...Array.from({ length: 50 }, (_, index) => ({
      id: `distant-${index}`,
      shape: {
        type: "aabb" as const,
        x: 1000 + index * 10,
        y: 20,
        width: 2,
        height: 100
      }
    })),
    { id: "floor", shape: { type: "aabb", x: 0, y: 20, width: 100, height: 6 } }
  ])
  world.spawn({
    id: "fast",
    x: 0,
    y: 0,
    vy: 500,
    shape: { type: "circle", radius: 2 }
  })
  const contact = vi.spyOn(sweep, "sweptAabbContact")
  const candidates = vi.spyOn(bounds, "colliderCandidatesForBody")
  try {
    world.step(0.1)
    expect(world.readState()[0].y).toBeLessThanOrEqual(15.02)
    expect(world.events()).toContainEqual({
      type: "contact",
      bodyId: "fast",
      otherId: "floor",
      sensor: false
    })
    expect(contact.mock.calls.length).toBeLessThan(10)
    // The large floor correction leaves the original padded position, so the
    // initial candidate list is rebuilt once and reused for remaining passes.
    expect(candidates).toHaveBeenCalledTimes(2)
  } finally {
    contact.mockRestore()
    candidates.mockRestore()
  }
})

it.each([false, true])(
  "matches full scans when corrections enter earlier/later colliders (reverse=%s)",
  (reverse) => {
    const colliders: PhysicsColliderSpec[] = [
      {
        id: "center",
        shape: { type: "aabb", x: 0, y: 0, width: 10, height: 40 }
      },
      {
        id: "left",
        shape: { type: "aabb", x: -9, y: 0, width: 2, height: 40 }
      },
      {
        id: "sensor",
        sensor: true,
        shape: { type: "aabb", x: -6, y: 0, width: 4, height: 40 }
      }
    ]
    if (reverse) colliders.reverse()
    const worlds = [false, true].map((fullScan) => {
      const world = new PhysicsKernelWorld({
        gravity: { x: 0, y: 0 },
        collisionIterations: 2
      })
      world.setColliders(
        colliders.map((collider) =>
          fullScan && !collider.sensor
            ? { ...collider, bodyFilter: () => true }
            : collider
        )
      )
      world.spawn({
        id: "corrected",
        x: 0,
        y: 0,
        shape: { type: "circle", radius: 2 }
      })
      return world
    })
    for (let step = 0; step < 3; step++) {
      for (const world of worlds) world.step()
      expect(worlds[0].readState()).toEqual(worlds[1].readState())
      expect(worlds[0].events()).toEqual(worlds[1].events())
      expect(worlds[0].snapshot().activeSensors).toEqual(
        worlds[1].snapshot().activeSensors
      )
    }
    expect(worlds[0].readState()[0].x).toBeLessThan(-5)
    const restored = new PhysicsKernelWorld()
    restored.restore(worlds[0].snapshot())
    restored.step()
    worlds[0].step()
    expect(restored.snapshot()).toEqual(worlds[0].snapshot())
    expect(restored.events()).toEqual(worlds[0].events())
  }
)

it("keeps all filter calls in authored body/collider order, including mutations and sensors", () => {
  const calls: string[] = []
  const world = new PhysicsKernelWorld({
    gravity: { x: 0, y: 0 }
  })
  const shape = { type: "aabb" as const, x: 1000, y: 0, width: 2, height: 40 }
  world.setColliders([
    {
      id: "first",
      shape,
      bodyFilter: (body) => {
        calls.push(`first:${body.id}`)
        body.x++
        return false
      }
    },
    {
      id: "second",
      shape,
      bodyFilter: (body) => {
        calls.push(`second:${body.id}`)
        return true
      }
    },
    {
      id: "sensor",
      sensor: true,
      shape: { ...shape, x: 0, width: 100 },
      bodyFilter: (body) => {
        calls.push(`sensor:${body.id}`)
        return true
      }
    }
  ])
  for (const id of ["a", "b"])
    world.spawn({
      id,
      x: 0,
      y: 0,
      bodyCollisions: false,
      shape: { type: "circle", radius: 1 }
    })
  const candidates = vi.spyOn(bounds, "colliderCandidatesForBody")
  try {
    world.step()
    expect(candidates).not.toHaveBeenCalled()
    expect(calls).toEqual([
      ...Array.from({ length: 7 }, () => [
        "first:a",
        "second:a",
        "first:b",
        "second:b"
      ]).flat(),
      "sensor:a",
      "sensor:b"
    ])
    expect(world.readState().map((body) => body.x)).toEqual([7, 7])
    expect(
      world.events().filter((event) => event.type === "sensor-enter")
    ).toHaveLength(2)
  } finally {
    candidates.mockRestore()
  }
})
