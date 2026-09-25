import { expect, it, vi } from "vitest"
import { PhysicsKernelWorld, type PhysicsBodySpec } from "./PhysicsKernel"
import * as circleSweep from "./physicsSweptCircleContact"

function overlappingPair(gravity: { x: number; y: number }) {
  const world = new PhysicsKernelWorld({ gravity, velocityDamping: 1 })
  const horizontal = gravity.x !== 0
  world.spawn({ id: "a", x: 0, y: 0, shape: { type: "circle", radius: 2 } })
  world.spawn({
    id: "b",
    x: horizontal ? 3 : 0,
    y: horizontal ? 0 : 3,
    shape: { type: "circle", radius: 2 }
  })
  return world
}

it.each([
  { x: 0, y: 180 },
  { x: 180, y: 0 },
  { x: 0, y: 0 },
  { x: 1e-10, y: 0 }
])(
  "reuses gravity and support calculations while resolving repeated contacts ($x, $y)",
  (gravity) => {
    const world = overlappingPair(gravity)
    const contacts = (
      world as unknown as { supportContactsThisStep: Set<string> }
    ).supportContactsThisStep
    const add = vi.spyOn(contacts, "add")
    const hypot = vi.spyOn(Math, "hypot")
    try {
      world.step()
      // Six contact passes plus the final velocity/sleeping checks.
      expect(hypot).toHaveBeenCalledTimes(8)
      // Each directed support edge is registered once, even across six passes.
      expect(add).toHaveBeenCalledTimes(
        (gravity.x === 0 && gravity.y === 180) || gravity.x === 180 ? 2 : 4
      )
      expect([...contacts]).toEqual(
        gravity.x === 180 || gravity.y === 180 ? ["b", "a"] : ["a", "b"]
      )
      const [a, b] = world.readState()
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeCloseTo(3.995)
      expect(world.events()).toEqual([
        { type: "contact", bodyId: "a", otherId: "b", sensor: false }
      ])
    } finally {
      hypot.mockRestore()
      add.mockRestore()
    }
  }
)

it("uses changed caller gravity and restored gravity without stale contact support", () => {
  const gravity = { x: 0, y: 180 }
  const world = overlappingPair(gravity)
  for (const next of [
    { x: 0, y: 180 },
    { x: 180, y: 0 },
    { x: 0, y: 0 },
    { x: -120, y: 20 }
  ]) {
    Object.assign(gravity, next)
    const restored = new PhysicsKernelWorld()
    restored.restore(world.snapshot())
    world.step()
    restored.step()
    expect(world.snapshot()).toEqual(restored.snapshot())
    expect(world.events()).toEqual(restored.events())
  }
})

it.each(["stationary", "corrected", "wake", "mixed"] as const)(
  "matches full contact passes for %s sleeping bodies, snapshots and events",
  (scenario) => {
    const worlds = [false, true].map((fullPasses) => {
      const world = new PhysicsKernelWorld({ gravity: { x: 0, y: 0 } })
      world.setColliders([
        {
          id: "wall",
          shape: {
            type: "aabb",
            x: scenario === "corrected" ? 0 : 1000,
            y: 0,
            width: 10,
            height: 40
          },
          bodyFilter: fullPasses ? () => true : undefined
        },
        {
          id: "sensor",
          sensor: true,
          shape: { type: "aabb", x: 0, y: 0, width: 40, height: 40 }
        }
      ])
      world.spawn({
        id: "a",
        x: 0,
        y: 0,
        shape: { type: "circle", radius: 2 },
        fixedPosition: scenario === "mixed" ? { x: 0 } : undefined
      })
      world.spawn({
        id: "b",
        x: scenario === "corrected" ? -10.99 : scenario === "mixed" ? 0 : 3.995,
        y: scenario === "mixed" ? 3.995 : 0,
        shape:
          scenario === "mixed"
            ? { type: "aabb", width: 4, height: 4 }
            : { type: "circle", radius: 2 },
        fixedPosition: scenario === "mixed" ? { x: 0 } : undefined
      })
      const snapshot = world.snapshot()
      for (const body of snapshot.bodies) {
        body.sleeping = true
        body.sleepTime = 1
      }
      world.restore(snapshot)
      if (scenario === "wake")
        world.spawn({
          id: "incoming",
          x: -8,
          y: 0,
          vx: 600,
          shape: { type: "circle", radius: 2 }
        })
      return world
    })
    const contact = vi.spyOn(circleSweep, "sweptCircleContact")
    try {
      for (let step = 0; step < 4; step++) {
        contact.mockClear()
        worlds[0].step()
        if (step === 0 && scenario !== "wake") {
          expect(contact).toHaveBeenCalledTimes(
            scenario === "corrected" ? 6 : 1
          )
        }
        contact.mockClear()
        worlds[1].step()
        if (step === 0 && scenario !== "wake")
          expect(contact).toHaveBeenCalledTimes(6)
        const expected = worlds[1].snapshot()
        expected.colliders = expected.colliders.map((collider) => ({
          ...collider,
          bodyFilter: undefined
        }))
        expect(worlds[0].snapshot()).toEqual(expected)
        expect(worlds[0].events()).toEqual(worlds[1].events())
        if (step === 0) {
          expect(worlds[0].events()).toContainEqual({
            type: "contact",
            bodyId: "a",
            otherId: "b",
            sensor: false
          })
          if (scenario === "corrected")
            expect(worlds[0].readState()[0].x).toBeLessThan(-6)
          if (scenario === "wake")
            expect(worlds[0].events()).toContainEqual({
              type: "wake",
              bodyId: "a"
            })
        }
      }
    } finally {
      contact.mockRestore()
    }
  }
)

it.each(["x", "y"] as const)(
  "separates mixed shapes consistently in both %s directions and insertion orders",
  (axis) => {
    for (const sign of [-1, 1]) {
      const states = [false, true].map((circleFirst) => {
        const world = new PhysicsKernelWorld({
          gravity: { x: 0, y: 0 },
          velocityDamping: 1
        })
        const circle: PhysicsBodySpec = {
          id: "circle",
          x: axis === "x" ? sign * 3 : 0,
          y: axis === "y" ? sign * 3 : 0,
          shape: { type: "circle", radius: 2 }
        }
        const box: PhysicsBodySpec = {
          id: "box",
          x: 0,
          y: 0,
          shape: { type: "aabb", width: 4, height: 4 }
        }
        for (const body of circleFirst ? [circle, box] : [box, circle])
          world.spawn(body)
        world.step()
        const bodies = world
          .readState()
          .sort((a, b) => a.id.localeCompare(b.id))
        expect(bodies[0][axis]).toBeCloseTo(-sign * 0.4975)
        expect(bodies[1][axis]).toBeCloseTo(sign * 3.4975)
        expect(world.events()).toEqual([
          {
            type: "contact",
            bodyId: circleFirst ? "circle" : "box",
            otherId: circleFirst ? "box" : "circle",
            sensor: false
          }
        ])
        return bodies
      })
      expect(states[0]).toEqual(states[1])
    }
  }
)
