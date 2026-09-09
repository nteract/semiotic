import { describe, expect, it } from "vitest"
import { PhysicsKernelWorld, type PhysicsBodyShape } from "./PhysicsKernel"

describe("fixed physics coordinates", () => {
  it("holds x through gravity, springs, impulses, snapshots, and state reads", () => {
    const fixed = { x: 100 }
    const world = new PhysicsKernelWorld({ gravity: { x: 100, y: 10 } })
    world.spawn({
      id: "a",
      x: 0,
      y: 0,
      vx: 50,
      shape: { type: "circle", radius: 4 },
      fixedPosition: fixed
    })
    fixed.x = 200
    world.setConstraint({
      bodyId: "a",
      target: { type: "point", x: 0, y: 100 },
      stiffness: 5
    })
    world.applyImpulse("a", 1000, 20)
    expect(world.readState()[0]).toMatchObject({
      x: 100,
      vx: 0,
      fixedPosition: { x: 100 }
    })
    for (let i = 0; i < 120; i++) {
      world.step()
      expect(world.readState()[0]).toMatchObject({ x: 100, prevX: 100, vx: 0 })
    }
    expect(world.readState()[0].y).toBeGreaterThan(0)
    const saved = world.snapshot()
    saved.bodies[0].x = -100
    const restored = new PhysicsKernelWorld()
    restored.restore(saved)
    expect(restored.readState()[0].x).toBe(100)
    restored.step()
    expect(restored.readState()[0].x).toBe(100)
  })

  it.each([
    {
      axis: "x" as const,
      a: { type: "circle", radius: 5 },
      b: { type: "circle", radius: 5 },
      separation: 10
    },
    {
      axis: "y" as const,
      a: { type: "aabb", width: 10, height: 8 },
      b: { type: "aabb", width: 6, height: 8 },
      separation: 8
    },
    {
      axis: "x" as const,
      a: { type: "circle", radius: 5 },
      b: { type: "aabb", width: 8, height: 12 },
      separation: 11
    },
    {
      axis: "y" as const,
      a: { type: "aabb", width: 8, height: 12 },
      b: { type: "circle", radius: 5 },
      separation: 9
    }
  ])(
    "separates $a.type/$b.type contacts along the free axis when $axis is fixed",
    ({ axis, a, b, separation }) => {
      const world = new PhysicsKernelWorld({ gravity: { x: 0, y: 0 } })
      world.spawn({
        id: "a",
        x: 0,
        y: 0,
        fixedPosition: { [axis]: 0 },
        shape: a as PhysicsBodyShape
      })
      world.spawn({
        id: "b",
        x: 0,
        y: 0,
        fixedPosition: { [axis]: 0 },
        shape: b as PhysicsBodyShape
      })
      world.step()
      const [first, second] = world.readState()
      const free = axis === "x" ? "y" : "x"
      expect(first[axis]).toBe(0)
      expect(second[axis]).toBe(0)
      expect(Math.abs(second[free] - first[free])).toBeCloseTo(separation, 1)
    }
  )

  it("lets an unconstrained neighbor move and ignores nonfinite fixed coordinates", () => {
    const world = new PhysicsKernelWorld({ gravity: { x: 0, y: 0 } })
    world.spawn({
      id: "a",
      x: 0,
      y: 0,
      fixedPosition: { x: 0, y: 0 },
      shape: { type: "circle", radius: 5 }
    })
    world.spawn({
      id: "b",
      x: 1,
      y: 0,
      fixedPosition: { x: NaN, y: Infinity },
      shape: { type: "circle", radius: 5 }
    })
    world.step()
    const [a, b] = world.readState()
    expect(a).toMatchObject({ x: 0, y: 0 })
    expect(b.x).toBeCloseTo(10, 1)
    expect(b.fixedPosition).toBeUndefined()
  })
})
