import { describe, expect, it, vi } from "vitest"
import { PhysicsKernelWorld, type PhysicsBodyState } from "./PhysicsKernel"
import * as broadphase from "./physicsBodyPairCandidates"
import { mulberry32 } from "../../recipes/random"

function exhaustivePairs(bodies: PhysicsBodyState[], gravity = { x: 0, y: 0 }) {
  const bounds = bodies.map((body) => {
    const xRadius =
      body.shape.type === "circle" ? body.shape.radius : body.shape.width / 2
    const yRadius =
      body.shape.type === "circle" ? body.shape.radius : body.shape.height / 2
    const padding = Math.max(0.005, Math.min(xRadius, yRadius))
    return [
      Math.min(body.prevX, body.x) - xRadius - padding,
      Math.max(body.prevX, body.x) + xRadius + padding,
      Math.min(body.prevY, body.y) - yRadius - padding,
      Math.max(body.prevY, body.y) + yRadius + padding
    ]
  })
  const pairs: [number, number][] = []
  for (let a = 0; a < bodies.length; a++) {
    for (let b = a + 1; b < bodies.length; b++) {
      if (
        bodies[a].bodyCollisions === false ||
        bodies[b].bodyCollisions === false
      )
        continue
      if (
        bounds[a][0] <= bounds[b][1] &&
        bounds[b][0] <= bounds[a][1] &&
        bounds[a][2] <= bounds[b][3] &&
        bounds[b][2] <= bounds[a][3]
      )
        pairs.push([a, b])
    }
  }
  const depth = (index: number) =>
    bodies[index].x * gravity.x + bodies[index].y * gravity.y
  pairs.sort(
    ([a, b], [c, d]) =>
      Math.max(depth(c), depth(d)) - Math.max(depth(a), depth(b)) ||
      a - c ||
      b - d
  )
  return pairs
}

describe("physics broadphase candidate completeness", () => {
  it.each([1, 8, 36, 64, 1000])(
    "matches all-pairs swept overlap and ordering for cell size %s",
    (cellSize) => {
      const random = mulberry32(12345)
      const world = new PhysicsKernelWorld()
      for (let index = 0; index < 150; index++) {
        world.spawn({
          id: String(index),
          x: random() * 120 - 60,
          y: random() * 120 - 60,
          bodyCollisions: index % 7 !== 0,
          shape:
            index % 3
              ? { type: "circle", radius: 0.5 + random() * 4 }
              : {
                  type: "aabb",
                  width: 1 + random() * 40,
                  height: 1 + random() * 5
                }
        })
      }
      const bodies = world.snapshot().bodies
      for (const body of bodies) {
        body.prevX -= random() * 10
        body.prevY += random() * 8
      }
      const gravity = { x: 3, y: -4 }
      expect(
        broadphase.physicsBodyPairCandidates(bodies, cellSize, gravity).pairs
      ).toEqual(exhaustivePairs(bodies, gravity))
    }
  )

  it("retains exact dense-pile snapshots and ordered events against exhaustive candidates", () => {
    const makeWorld = () => {
      const world = new PhysicsKernelWorld({
        gravity: { x: 0, y: 120 },
        cellSize: 64,
        seed: 5
      })
      world.setColliders([
        {
          id: "floor",
          shape: { type: "aabb", x: 20, y: 60, width: 100, height: 4 }
        }
      ])
      for (let index = 0; index < 80; index++)
        world.spawn({
          id: String(index),
          x: (index % 10) * 2.1,
          y: 40 - Math.floor(index / 10) * 2.1,
          shape: { type: "circle", radius: 1 }
        })
      return world
    }
    const optimized = makeWorld()
    const expected = makeWorld()
    const original = broadphase.physicsBodyPairCandidates
    const events = []
    for (let index = 0; index < 120; index++) {
      optimized.step()
      events.push(optimized.events())
    }
    const spy = vi
      .spyOn(broadphase, "physicsBodyPairCandidates")
      .mockImplementation((bodies, size, gravity) => ({
        ...original(bodies, size, gravity),
        pairs: exhaustivePairs(bodies, gravity)
      }))
    try {
      for (let index = 0; index < 120; index++) {
        expected.step()
        expect(expected.events()).toEqual(events[index])
      }
      expect(optimized.snapshot()).toEqual(expected.snapshot())
      expect(optimized.readState().every((body) => body.y <= 57.01)).toBe(true)
    } finally {
      spy.mockRestore()
    }
  })
})
