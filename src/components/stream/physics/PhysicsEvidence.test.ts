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
      ],
      queuedCount: 0,
      sedimentedCount: 0,
      warnings: []
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

describe("settled ledger", () => {
  function quietStore() {
    return new PhysicsPipelineStore({
      fixedDt: 1 / 60,
      kernel: {
        seed: 5,
        gravity: { x: 0, y: 0 },
        sleepSpeed: 100,
        sleepAfter: 0.01
      }
    })
  }

  it("is absent unless the chart declares its charge", () => {
    const store = quietStore()
    store.spawnNow(circle("a", 0))

    const evidence = buildPhysicsSettledEvidence(store.snapshot(), {})
    expect(evidence.ledger).toBeUndefined()
    expect(evidence.warnings).toEqual([])
  })

  it("balances when every charged body is live in the world", () => {
    const store = quietStore()
    store.spawnNow(circle("a", 0))
    store.spawnNow(circle("b", 1))
    store.settle()

    const evidence = buildPhysicsSettledEvidence(store.snapshot(), {
      bodies: store.readBodies(),
      charge: 2
    })

    expect(evidence.ledger).toEqual({
      charge: 2,
      live: 2,
      queued: 0,
      sedimented: 0,
      unaccounted: 0,
      balanced: true
    })
    expect(evidence.warnings).toEqual([])
  })

  it("flags the projection-vs-world contradiction an undrained queue creates", () => {
    // This is the shape of the reduced-motion defect: the chart's projection
    // counted three bodies, the world only ever admitted one, and nothing
    // reconciled the two numbers.
    const store = quietStore()
    store.spawnNow(circle("admitted", 0))
    store.enqueue({ ...circle("owed-1", 1), spawnAt: 10 })
    store.enqueue({ ...circle("owed-2", 2), spawnAt: 20 })

    const evidence = buildPhysicsSettledEvidence(store.snapshot(), {
      bodies: store.readBodies(),
      charge: 3
    })

    expect(evidence.queuedCount).toBe(2)
    expect(evidence.ledger).toMatchObject({
      charge: 3,
      live: 1,
      queued: 2,
      unaccounted: 0,
      balanced: true
    })
    // The ledger balances (the queue is honest about what it owes) but the
    // scene is not settled and says so loudly.
    expect(evidence.settled).toBe(false)
    expect(evidence.warnings).toContain("PHYSICS_QUEUE_UNDRAINED")
  })

  it("flags genuinely vanished bodies as a ledger mismatch", () => {
    const store = quietStore()
    store.spawnNow(circle("a", 0))
    store.settle()

    const evidence = buildPhysicsSettledEvidence(store.snapshot(), {
      bodies: store.readBodies(),
      charge: 4
    })

    expect(evidence.ledger).toMatchObject({
      charge: 4,
      live: 1,
      unaccounted: 3,
      balanced: false
    })
    expect(evidence.warnings).toContain("PHYSICS_LEDGER_MISMATCH")
  })

  it("counts sediment as accounted for, not as loss", () => {
    const store = new PhysicsPipelineStore({
      fixedDt: 1 / 60,
      bodyLimit: 2,
      sediment: { binAccessor: "windowIndex" },
      kernel: {
        seed: 9,
        gravity: { x: 0, y: 0 },
        sleepSpeed: 100,
        sleepAfter: 0.01
      }
    })
    store.spawnNow(circle("a", 0))
    store.spawnNow(circle("b", 1))
    store.spawnNow(circle("c", 2))
    store.settle()

    const snapshot = store.snapshot()
    const evidence = buildPhysicsSettledEvidence(snapshot, {
      bodies: store.readBodies(),
      charge: 3
    })

    // Whatever the eviction policy retired must show up in the ledger rather
    // than silently reducing the charge.
    expect(
      evidence.ledger!.live +
        evidence.ledger!.queued +
        evidence.ledger!.sedimented +
        evidence.ledger!.unaccounted
    ).toBe(3)
  })
})
