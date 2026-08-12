import { describe, expect, it } from "vitest"
import type { PhysicsBodyState } from "./PhysicsKernel"
import {
  physicsBodyVisualHitDistanceSquared,
  physicsBodyVisualSearchRadius
} from "./physicsBodyCanvas"

function circle(): PhysicsBodyState {
  return {
    id: "body",
    x: 50,
    y: 50,
    prevX: 50,
    prevY: 50,
    vx: 0,
    vy: 0,
    angle: 0,
    mass: 1,
    shape: { type: "circle", radius: 5 },
    sleeping: false
  }
}

describe("physics built-in visual cursor geometry", () => {
  it("uses authored radius instead of the smaller collision radius", () => {
    const body = circle()
    expect(
      physicsBodyVisualHitDistanceSquared(body, { r: 12 }, 60, 50)
    ).toBe(100)
    expect(
      physicsBodyVisualHitDistanceSquared(body, { r: 12 }, 63, 50)
    ).toBeNull()
    expect(physicsBodyVisualSearchRadius(body, { r: 12 })).toBe(12)
  })

  it("matches deterministic diamond, faceted, pill, and halo bounds", () => {
    const body = circle()
    expect(
      physicsBodyVisualHitDistanceSquared(
        body,
        { r: 10, mark: "diamond" } as never,
        57,
        57
      )
    ).toBeNull()
    expect(
      physicsBodyVisualHitDistanceSquared(
        body,
        { r: 10, mark: "faceted" } as never,
        58,
        50
      )
    ).not.toBeNull()
    expect(
      physicsBodyVisualHitDistanceSquared(
        body,
        { r: 10, mark: "pill" } as never,
        61,
        50
      )
    ).not.toBeNull()
    expect(
      physicsBodyVisualHitDistanceSquared(
        body,
        { r: 10, mark: "halo", strokeWidth: 2 } as never,
        64,
        50
      )
    ).not.toBeNull()
  })
})
