import { describe, expect, it } from "vitest"
import { createDefaultPhysicsEngineAdapter } from "./PhysicsEngineAdapter"
import { PhysicsQuiescenceTracker } from "./physicsPipelineQuiescence"

describe("physics quiescence", () => {
  it("counts contact correction as motion even when velocity is zero", () => {
    const world = createDefaultPhysicsEngineAdapter({ gravity: { x: 0, y: 0 } })
    world.spawn({ id: "corrected", x: 0, y: 0, shape: { type: "circle", radius: 2 } })
    const tracker = new PhysicsQuiescenceTracker()
    for (let step = 0; step < 120; step += 1) {
      const snapshot = world.snapshot()
      const body = snapshot.bodies[0]
      body.prevX = body.x
      body.x += 0.1
      body.vx = body.vy = 0
      world.restore(snapshot)
      tracker.refresh(world, 1 / 120, 0)
    }
    expect(tracker.isAtRest()).toBe(false)

    const stopped = world.snapshot()
    stopped.bodies[0].prevX = stopped.bodies[0].x
    world.restore(stopped)
    for (let step = 0; step < 120; step += 1) tracker.refresh(world, 1 / 120, 0)
    expect(tracker.isAtRest()).toBe(true)
  })
})
