import { expect, it } from "vitest"
import { PhysicsKernelWorld } from "./PhysicsKernel"
import { sweptAabbContact } from "./physicsSweptAabbContact"

it.each(["circle", "aabb"] as const)("preserves all four entry faces for fast %s bodies", (type) => {
  for (const horizontal of [true, false]) {
    for (const direction of [-1, 1]) {
      const world = new PhysicsKernelWorld()
      world.spawn({
        id: "body",
        x: horizontal ? -10 * direction : 0,
        y: horizontal ? 0 : -10 * direction,
        shape: type === "circle"
          ? { type, radius: 1 }
          : { type, width: 2, height: 2 }
      })
      const body = world.readState()[0]
      body.x = horizontal ? 10 * direction : 0
      body.y = horizontal ? 0 : 10 * direction
      expect(sweptAabbContact(body, {
        type: "aabb", x: 0, y: 0, width: 2, height: 2
      }, 0.005)).toEqual({
        nx: horizontal ? -direction : 0,
        ny: horizontal ? 0 : -direction,
        penetration: 12
      })
      world.dispose()
    }
  }
})
