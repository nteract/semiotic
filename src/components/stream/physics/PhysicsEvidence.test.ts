import { describe, expect, it } from "vitest"
import { buildPhysicsSettledProjection } from "./PhysicsAccessibility"
import { buildPhysicsSettledEvidence } from "./PhysicsEvidence"
import type { PhysicsBodyState } from "./PhysicsKernel"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"

function circle(id: string, windowIndex = 0) {
  return {
    id,
    x: windowIndex * 10,
    y: 0,
    shape: { type: "circle" as const, radius: 2 },
    mass: 1,
    datum: { windowIndex, label: id }
  }
}

function windowContainerId(body: PhysicsBodyState): string | undefined {
  const datum = body.datum as { windowIndex?: number } | undefined
  return datum?.windowIndex == null ? undefined : `window-${datum.windowIndex}`
}

describe("buildPhysicsSettledEvidence", () => {
  it("summarizes a settled computed scene with seed and projection bins", () => {
    const store = new PhysicsPipelineStore({
      fixedDt: 1 / 60,
      kernel: {
        seed: 17,
        gravity: { x: 0, y: 0 },
        sleepSpeed: 100,
        sleepAfter: 0.01
      }
    })
    store.spawnNow(circle("event-a", 0))
    store.spawnNow(circle("event-b", 1))

    const stepsRun = store.settle()
    const bodies = store.readBodies()
    const projectionRows = buildPhysicsSettledProjection(
      [
        { id: "window-0", label: "0-12s", observed: 2 },
        {
          id: "window-1",
          label: "12-24s",
          secondary: 1,
          secondaryLabel: "late"
        }
      ],
      { bodies, getContainerId: windowContainerId }
    )
    const evidence = buildPhysicsSettledEvidence(store.snapshot(), {
      bodies,
      projectionRows,
      stepsRun
    })

    expect(stepsRun).toBeGreaterThan(0)
    expect(evidence).toEqual({
      bodyCount: 2,
      sleepingCount: 2,
      settled: true,
      stepsRun,
      seed: 17,
      binCounts: [
        { id: "window-0", label: "0-12s", count: 1, observed: 2 },
        {
          id: "window-1",
          label: "12-24s",
          count: 1,
          secondary: 1,
          secondaryLabel: "late"
        }
      ]
    })
  })

  it("uses snapshot bodies and refuses pending or awake scenes as settled", () => {
    const store = new PhysicsPipelineStore({
      kernel: {
        seed: 23,
        gravity: { x: 0, y: 0 },
        sleepAfter: 999
      }
    })
    store.spawnNow({ ...circle("awake", 0), vx: 3 })
    store.enqueue({ ...circle("queued", 1), spawnAt: 10 })

    expect(buildPhysicsSettledEvidence(store.snapshot(), { stepsRun: -4 })).toMatchObject({
      bodyCount: 1,
      sleepingCount: 0,
      settled: false,
      stepsRun: 0,
      seed: 23,
      binCounts: []
    })
  })
})
