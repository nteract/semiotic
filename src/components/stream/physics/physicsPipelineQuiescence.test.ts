import { describe, expect, it, vi } from "vitest"
import { createDefaultPhysicsEngineAdapter } from "./PhysicsEngineAdapter"
import { PhysicsQuiescenceTracker } from "./physicsPipelineQuiescence"

describe("physics quiescence", () => {
  it("avoids body copies for sleeping intervals but checks motion after waking", () => {
    const world = createDefaultPhysicsEngineAdapter({ gravity: { x: 0, y: 0 } })
    world.spawn({ id: "quiet", x: 0, y: 0, shape: { type: "circle", radius: 2 } })
    world.settle()
    expect(world.allSleeping()).toBe(true)
    const readState = vi.spyOn(world, "readState")
    const tracker = new PhysicsQuiescenceTracker()

    tracker.refresh(world, 0.3, 0)
    expect(tracker.isAtRest()).toBe(false)
    tracker.refresh(world, 0.3, 0)
    expect(tracker.isAtRest()).toBe(true)
    expect(readState).not.toHaveBeenCalled()

    world.applyImpulse("quiet", 100, 0)
    tracker.refresh(world, 0.1, 0)
    expect(tracker.isAtRest()).toBe(false)
    expect(readState).toHaveBeenCalledOnce()
  })

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
