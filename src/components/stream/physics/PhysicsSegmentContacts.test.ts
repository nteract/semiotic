import { describe, expect, it } from "vitest"
import {
  PhysicsKernelWorld,
  type PhysicsBodyShape,
  type PhysicsColliderSpec
} from "./PhysicsKernel"
import { segmentContact } from "./physicsSegmentContact"

describe("segment collider contacts (#1346)", () => {
  it.each([1 / 60, 1 / 120, 1 / 240])(
    "retains fast small circles above a zero-thickness floor at dt=%s",
    (fixedDt) => {
      for (const radius of [1, 2, 3, 4, 5, 6]) {
        const world = new PhysicsKernelWorld({ fixedDt, restitution: 0 })
        world.setColliders([
          {
            id: "floor",
            shape: { type: "segment", x1: -100, y1: 100, x2: 100, y2: 100 }
          }
        ])
        world.spawn({
          id: "body",
          x: 0,
          y: -900,
          vy: 1600,
          shape: { type: "circle", radius }
        })
        world.settle(2000)
        const body = world.readState()[0]
        expect(body.y + radius).toBeCloseTo(100, 2)
        expect(body.sleeping).toBe(true)
      }
    }
  )

  it("rests boxes on their actual bottom edge and lets them sleep", () => {
    const world = new PhysicsKernelWorld({ restitution: 0 })
    world.setColliders([
      {
        id: "floor",
        shape: { type: "segment", x1: -100, y1: 100, x2: 100, y2: 100 }
      }
    ])
    world.spawn({
      id: "box",
      x: 0,
      y: 0,
      shape: { type: "aabb", width: 20, height: 20 }
    })
    world.settle(2000)
    const body = world.readState()[0]
    expect(body.y + 10).toBeCloseTo(100, 2)
    expect(body.sleeping).toBe(true)
  })

  it.each([
    { type: "circle", radius: 2 },
    { type: "aabb", width: 12, height: 4 }
  ] satisfies PhysicsBodyShape[])(
    "keeps fast $type bodies on the entry side of rotated, reversed, thick walls",
    (shape) => {
      for (const angle of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 3]) {
        for (const thickness of [0, 4]) {
          for (const side of [-1, 1]) {
            const tx = Math.cos(angle)
            const ty = Math.sin(angle)
            const nx = -ty * side
            const ny = tx * side
            const results = [1, -1].map((direction) => {
              const world = new PhysicsKernelWorld({
                gravity: { x: 0, y: 0 },
                velocityDamping: 1,
                maxVelocity: 0,
                restitution: 0,
                friction: 0
              })
              world.setColliders([
                {
                  id: "wall",
                  shape: {
                    type: "segment",
                    x1: -100 * tx * direction,
                    y1: -100 * ty * direction,
                    x2: 100 * tx * direction,
                    y2: 100 * ty * direction,
                    thickness
                  }
                }
              ])
              world.spawn({
                id: "body",
                x: nx * 50,
                y: ny * 50,
                vx: -nx * 12000,
                vy: -ny * 12000,
                shape
              })
              world.step(1 / 120)
              const body = world.readState()[0]
              const support =
                shape.type === "circle"
                  ? shape.radius
                  : (Math.abs(nx) * shape.width) / 2 +
                    (Math.abs(ny) * shape.height) / 2
              expect(body.x * nx + body.y * ny).toBeCloseTo(
                support + thickness / 2 - 0.005,
                6
              )
              expect(body.vx * nx + body.vy * ny).toBeCloseTo(0, 6)
              expect(world.events()).toContainEqual({
                type: "contact",
                bodyId: "body",
                otherId: "wall",
                sensor: false
              })
              return body
            })
            expect(results[0].x).toBeCloseTo(results[1].x, 8)
            expect(results[0].y).toBeCloseTo(results[1].y, 8)
          }
        }
      }
    }
  )

  it.each([
    { type: "circle", radius: 2 },
    { type: "aabb", width: 12, height: 4 }
  ] satisfies PhysicsBodyShape[])(
    "sweeps finite endpoints and zero-length segments for $type bodies",
    (shape) => {
      for (const x2 of [0, 50]) {
        const world = new PhysicsKernelWorld({
          gravity: { x: 0, y: 0 },
          velocityDamping: 1,
          restitution: 0,
          maxVelocity: 0
        })
        world.setColliders([
          {
            id: "end",
            shape: { type: "segment", x1: 0, y1: 0, x2, y2: 0, thickness: 4 }
          }
        ])
        world.spawn({ id: "body", x: -50, y: 0, vx: 12000, shape })
        world.step()
        const body = world.readState()[0]
        const halfWidth =
          shape.type === "circle" ? shape.radius : shape.width / 2
        expect(body.x).toBeCloseTo(-halfWidth - 2 + 0.005, 6)
        expect(body.vx).toBe(0)
      }
    }
  )

  it("uses rounded cap geometry for boxes already overlapping a thick endpoint", () => {
    const world = new PhysicsKernelWorld()
    world.spawn({
      id: "box",
      x: 3.6,
      y: 4.8,
      shape: { type: "aabb", width: 6, height: 8 }
    })
    const contact = segmentContact(world.readState()[0], {
      type: "segment",
      x1: 0,
      y1: 0,
      x2: -50,
      y2: 0,
      thickness: 4
    })
    expect(contact?.nx).toBeCloseTo(0.6)
    expect(contact?.ny).toBeCloseTo(0.8)
    expect(contact?.penetration).toBeCloseTo(1)
  })

  it("does not collide with the infinite line or a box's bounding circle", () => {
    const world = new PhysicsKernelWorld({
      gravity: { x: 0, y: 0 },
      velocityDamping: 1
    })
    world.setColliders([
      {
        id: "wall",
        shape: { type: "segment", x1: -10, y1: 0, x2: 10, y2: 0, thickness: 2 }
      }
    ])
    world.spawn({
      id: "above",
      x: 0,
      y: -4,
      shape: { type: "aabb", width: 20, height: 2 }
    })
    world.spawn({
      id: "past-end",
      x: 14,
      y: -5,
      vy: 1200,
      shape: { type: "circle", radius: 2 }
    })
    world.step()
    expect(world.readState().map(({ x, y }) => [x, y])).toEqual([
      [0, -4],
      [14, 5]
    ])
    expect(world.events()).toEqual([])
  })

  it("sweeps rounded corners without replacing them with square end caps", () => {
    const world = new PhysicsKernelWorld()
    world.spawn({
      id: "box",
      x: 6.6,
      y: 8.8,
      shape: { type: "aabb", width: 6, height: 8 }
    })
    const body = world.readState()[0]
    body.x = -5.4
    body.y = -7.2
    const contact = segmentContact(
      body,
      {
        type: "segment",
        x1: -50,
        y1: 0,
        x2: 0,
        y2: 0,
        thickness: 4
      },
      0.005,
      true
    )
    expect(contact?.nx).toBeCloseTo(0.6)
    expect(contact?.ny).toBeCloseTo(0.8)
    expect(contact?.penetration).toBeCloseTo(16)

    // This path enters the expanded endpoint's bounding square but stays
    // outside its round corner (distance sqrt(1.6² + 1.6²) > thickness/2).
    body.prevX = 4.6
    body.prevY = 8
    body.x = 4.6
    body.y = 5.6
    expect(
      segmentContact(
        body,
        {
          type: "segment",
          x1: -50,
          y1: 0,
          x2: 0,
          y2: 0,
          thickness: 4
        },
        0.005,
        true
      )
    ).toBeNull()
  })

  it("retains overlap-only sensors and respects permeable segment filters", () => {
    for (const sensor of [false, true]) {
      const collider: PhysicsColliderSpec = {
        id: "wall",
        sensor,
        shape: { type: "segment", x1: -100, y1: 0, x2: 100, y2: 0 },
        ...(!sensor && {
          bodyFilter: { property: "datum.pass", equals: false }
        })
      }
      const world = new PhysicsKernelWorld({
        gravity: { x: 0, y: 0 },
        velocityDamping: 1
      })
      world.setColliders([collider])
      world.spawn({
        id: "body",
        x: 0,
        y: -5,
        vy: 1200,
        shape: { type: "circle", radius: 1 },
        datum: { pass: true }
      })
      world.step()
      expect(world.readState()[0].y).toBe(5)
      expect(world.events()).toEqual([])
    }
    const world = new PhysicsKernelWorld({ gravity: { x: 0, y: 0 } })
    world.setColliders([
      {
        id: "sensor",
        sensor: true,
        shape: { type: "segment", x1: -100, y1: 0, x2: 100, y2: 0 }
      }
    ])
    world.spawn({
      id: "box",
      x: 0,
      y: -0.5,
      shape: { type: "aabb", width: 20, height: 2 }
    })
    world.step()
    expect(world.events()).toContainEqual({
      type: "sensor-enter",
      bodyId: "box",
      sensorId: "sensor"
    })
    expect(world.readState()[0].y).toBe(-0.5)
  })
})
