import { describe, expect, it } from "vitest"
import {
  type PhysicsObservationEvent,
  PhysicsPipelineStore,
  collidersFromPlotBounds,
  collidersFromXScaleBins,
  schedulePhysicsSpawns
} from "./PhysicsPipelineStore"
import {
  BuiltInPhysicsEngineAdapter,
  createDefaultPhysicsEngineAdapter,
  type PhysicsEngineAdapter
} from "./PhysicsEngineAdapter"
import type { PhysicsKernelOptions } from "./PhysicsKernel"

function circle(id: string, x = 0, y = 0) {
  return {
    id,
    x,
    y,
    shape: { type: "circle" as const, radius: 2 },
    mass: 1
  }
}

function stateTuple(
  store: PhysicsPipelineStore
): Array<[string, number, number]> {
  return store
    .readBodies()
    .map((body) => [
      body.id,
      Number(body.x.toFixed(6)),
      Number(body.y.toFixed(6))
    ])
}

describe("PhysicsPipelineStore", () => {
  it("uses the public built-in physics engine adapter by default", () => {
    const engine = createDefaultPhysicsEngineAdapter({
      gravity: { x: 0, y: 0 }
    })

    expect(engine.id).toBe("builtin")
    expect(engine.capabilities).toMatchObject({
      engine: "builtin",
      determinism: "strict",
      sensors: true
    })

    engine.spawn(circle("adapter-body"))
    engine.step(1 / 60)
    expect(engine.readState().map((body) => body.id)).toEqual([
      "adapter-body"
    ])
  })

  it("accepts a custom engine adapter factory without changing store semantics", () => {
    const createdWith: PhysicsKernelOptions[] = []
    let adapter: PhysicsEngineAdapter | null = null
    const store = new PhysicsPipelineStore({
      fixedDt: 0.1,
      engine: (options) => {
        createdWith.push(options ?? {})
        adapter = new BuiltInPhysicsEngineAdapter(options)
        return adapter
      },
      kernel: {
        gravity: { x: 0, y: 10 },
        velocityDamping: 1,
        sleepAfter: 999
      }
    })

    expect(createdWith).toHaveLength(1)
    expect(createdWith[0]).toMatchObject({ fixedDt: 0.1 })

    store.spawnNow(circle("factory-body"))
    store.tick(0.1)
    expect(store.readBodies()[0].y).toBeCloseTo(0.1)
    expect(adapter?.snapshot().bodies.map((body) => body.id)).toEqual([
      "factory-body"
    ])
  })

  it("round-trips pipeline snapshots through a supplied engine adapter", () => {
    const store = new PhysicsPipelineStore({
      fixedDt: 1 / 60,
      engine: (options) => new BuiltInPhysicsEngineAdapter(options),
      kernel: {
        seed: 7,
        gravity: { x: 0, y: 20 },
        velocityDamping: 1,
        sleepAfter: 999
      }
    })
    store.spawnNow({ ...circle("a"), vx: 4 })
    store.tick(0.2)
    const snapshot = store.snapshot()
    store.tick(0.2)
    const afterFirstRun = stateTuple(store)

    store.restore(snapshot)
    store.tick(0.2)

    expect(stateTuple(store)).toEqual(afterFirstRun)
  })

  it("schedules spawn batches with immediate, fixed-rate, and arrival pacing", () => {
    const spawns = [
      { ...circle("a"), datum: { arrivalTime: 10 } },
      { ...circle("b"), datum: { arrivalTime: 14 } },
      { ...circle("c"), datum: { arrivalTime: 19 } }
    ]

    expect(
      schedulePhysicsSpawns(spawns, { pacing: "immediate", startAt: 3 }).map(
        (spawn) => spawn.spawnAt
      )
    ).toEqual([3, 3, 3])
    expect(
      schedulePhysicsSpawns(spawns, {
        pacing: { ratePerSec: 2 },
        startAt: 3
      }).map((spawn) => spawn.spawnAt)
    ).toEqual([3, 3.5, 4])
    // timeScale is playback speed: higher = faster. Arrivals [10,14,19] have
    // deltas [0,4,9] from the first; at 2x speed they compress to [0,2,4.5]
    // added onto startAt 2.
    expect(
      schedulePhysicsSpawns(spawns, {
        pacing: "arrival",
        startAt: 2,
        timeScale: 2
      }).map((spawn) => spawn.spawnAt)
    ).toEqual([2, 4, 6.5])
  })

  it("advances the kernel on a fixed timestep accumulator", () => {
    const store = new PhysicsPipelineStore({
      fixedDt: 0.1,
      maxSubsteps: 4,
      kernel: {
        gravity: { x: 0, y: 10 },
        velocityDamping: 1,
        sleepAfter: 999
      }
    })
    store.spawnNow(circle("a"))

    expect(store.tick(0.05).steps).toBe(0)
    expect(store.readBodies()[0].y).toBe(0)

    expect(store.tick(0.05).steps).toBe(1)
    const [body] = store.readBodies()
    expect(body.vy).toBeCloseTo(1)
    expect(body.y).toBeCloseTo(0.1)
  })

  it("keeps warm world state while queued bodies arrive", () => {
    const store = new PhysicsPipelineStore({
      fixedDt: 0.1,
      kernel: {
        gravity: { x: 0, y: 0 },
        sleepAfter: 999
      }
    })
    store.spawnNow(circle("existing", 1, 1))
    store.enqueue([
      { ...circle("later"), spawnAt: 0.2 },
      { ...circle("first"), spawnAt: 0.1 }
    ])

    expect(store.tick(0.09).spawned).toEqual([])
    expect(store.readBodies().map((body) => body.id)).toEqual(["existing"])

    expect(store.tick(0.02).spawned).toEqual(["first"])
    expect(store.readBodies().map((body) => body.id)).toEqual([
      "existing",
      "first"
    ])

    expect(store.tick(0.09).spawned).toEqual(["later"])
    expect(store.readBodies().map((body) => body.id)).toEqual([
      "existing",
      "first",
      "later"
    ])
  })

  it("does not advance elapsed time or spawn while paused or hidden", () => {
    const store = new PhysicsPipelineStore()
    store.enqueue({ ...circle("a"), spawnAt: 0.1 })
    store.setPaused(true)

    let tick = store.tick(1)
    expect(tick.elapsedSeconds).toBe(0)
    expect(tick.spawned).toEqual([])
    expect(tick.shouldContinue).toBe(false)
    expect(store.queueSize()).toBe(1)

    store.setPaused(false)
    store.setVisible(false)
    tick = store.tick(1)
    expect(tick.elapsedSeconds).toBe(0)
    expect(tick.spawned).toEqual([])
    expect(tick.shouldContinue).toBe(false)
    expect(store.queueSize()).toBe(1)
  })

  it("reports no pending work after a settled empty queue", () => {
    const store = new PhysicsPipelineStore({
      fixedDt: 1 / 60,
      kernel: {
        gravity: { x: 0, y: 0 },
        sleepSpeed: 100,
        sleepAfter: 0.01
      }
    })
    store.spawnNow(circle("sleepy"))

    const steps = store.settle()
    expect(steps).toBeGreaterThan(0)
    expect(store.allSleeping()).toBe(true)
    expect(store.hasPendingWork()).toBe(false)
    expect(store.tick(1 / 60).shouldContinue).toBe(false)
  })

  it("evicts oldest live bodies when bodyLimit is exceeded", () => {
    const store = new PhysicsPipelineStore({
      bodyLimit: 2,
      fixedDt: 0.1,
      kernel: {
        gravity: { x: 0, y: 0 },
        sleepAfter: 999
      }
    })

    store.spawnNow(circle("a"))
    store.spawnNow(circle("b"))
    store.spawnNow(circle("c"))

    expect(store.liveBodyCount()).toBe(2)
    expect(store.readBodies().map((body) => body.id)).toEqual(["b", "c"])
  })

  it("compacts budget overflow into sediment bins", () => {
    const observations: PhysicsObservationEvent[] = []
    const store = new PhysicsPipelineStore({
      bodyLimit: 2,
      sediment: {
        binAccessor: "lane",
        valueAccessor: "weight",
        retainBodyIds: 1
      },
      observation: {
        chartId: "sediment",
        chartType: "PhysicsPileChart",
        onObservation: (event) => observations.push(event)
      },
      kernel: {
        gravity: { x: 0, y: 0 },
        sleepAfter: 999
      }
    })

    store.spawnNow({ ...circle("a"), datum: { lane: "alpha", weight: 2 } })
    store.spawnNow({ ...circle("b"), datum: { lane: "beta", weight: 3 } })
    store.spawnNow({ ...circle("c"), datum: { lane: "alpha", weight: 5 } })
    store.spawnNow({ ...circle("d"), datum: { lane: "alpha", weight: 7 } })

    expect(store.readBodies().map((body) => body.id)).toEqual(["c", "d"])
    expect(store.sedimentTotals()).toEqual({ bins: 2, count: 2, total: 5 })
    expect(store.readSediment()).toMatchObject([
      {
        id: "alpha",
        count: 1,
        total: 2,
        bodyIds: ["a"],
        value: { count: 1, total: 2, mean: 2 }
      },
      {
        id: "beta",
        count: 1,
        total: 3,
        bodyIds: ["b"],
        value: { count: 1, total: 3, mean: 3 }
      }
    ])
    expect(
      observations.filter((event) => event.type === "physics-sediment")
    ).toEqual([
      expect.objectContaining({
        bodyId: "a",
        binId: "alpha",
        count: 1,
        total: 2
      }),
      expect.objectContaining({
        bodyId: "b",
        binId: "beta",
        count: 1,
        total: 3
      })
    ])

    expect(
      store.sedimentHeightfield({
        baselineY: 100,
        binWidth: 20,
        maxHeight: 50,
        value: "total"
      })
    ).toMatchObject([
      {
        binId: "alpha",
        x: 0,
        y: expect.closeTo(100 - 100 / 3),
        height: expect.closeTo(100 / 3)
      },
      { binId: "beta", x: 22, y: 50, height: 50 }
    ])
  })

  it("reports sedimented ids from tick results and snapshots the sediment ledger", () => {
    const store = new PhysicsPipelineStore({
      bodyLimit: 1,
      sediment: { binAccessor: "lane" },
      fixedDt: 0.1,
      kernel: {
        gravity: { x: 0, y: 0 },
        sleepAfter: 999
      }
    })

    store.enqueue([
      { ...circle("a"), datum: { lane: "0" }, spawnAt: 0 },
      { ...circle("b"), datum: { lane: "1" }, spawnAt: 0 }
    ])
    const result = store.tick(0)
    expect(result.evicted).toEqual(["a"])
    expect(result.sedimented).toEqual(["a"])
    expect(store.sedimentTotals()).toEqual({ bins: 1, count: 1, total: 1 })

    const snapshot = store.snapshot()
    store.spawnNow({ ...circle("c"), datum: { lane: "1" } })
    expect(store.sedimentTotals().count).toBe(2)

    store.restore(snapshot)
    expect(store.readBodies().map((body) => body.id)).toEqual(["b"])
    expect(store.sedimentTotals()).toEqual({ bins: 1, count: 1, total: 1 })
    expect(store.readSediment()[0]).toMatchObject({
      id: "0",
      bodyIds: ["a"]
    })
  })

  it("reports body-budget warning and overflow decisions before compaction", () => {
    const observations: PhysicsObservationEvent[] = []
    const store = new PhysicsPipelineStore({
      bodyLimit: 2,
      bodyBudget: { warnAt: 2 },
      sediment: { binAccessor: "lane" },
      observation: {
        chartId: "budget",
        chartType: "PhysicsPileChart",
        onObservation: (event) => observations.push(event)
      },
      kernel: {
        gravity: { x: 0, y: 0 },
        sleepAfter: 999
      }
    })

    store.enqueue([
      { ...circle("a"), datum: { lane: "0" }, spawnAt: 0 },
      { ...circle("b"), datum: { lane: "1" }, spawnAt: 0 }
    ])
    const warning = store.tick(0)
    expect(warning.budget).toMatchObject({
      action: "continue",
      bodyLimit: 2,
      liveBodies: 2,
      overflow: 0,
      projectedBodies: 2,
      state: "warning",
      warnAt: 2
    })

    store.enqueue({ ...circle("c"), datum: { lane: "1" }, spawnAt: 0 })
    const overflow = store.tick(0)
    expect(overflow.budget).toMatchObject({
      action: "sediment",
      bodyLimit: 2,
      liveBodies: 3,
      overflow: 1,
      projectedBodies: 3,
      state: "overflow"
    })
    expect(overflow.evicted).toEqual(["a"])
    expect(overflow.sedimented).toEqual(["a"])
    expect(store.liveBodyCount()).toBe(2)

    expect(observations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "physics-budget-warning",
          budgetAction: "continue",
          liveBodies: 2,
          projectedBodies: 2
        }),
        expect.objectContaining({
          type: "physics-budget-overflow",
          budgetAction: "sediment",
          liveBodies: 3,
          overflow: 1
        })
      ])
    )
  })

  it("keeps accelerated long streams bounded through sediment", () => {
    const observations: PhysicsObservationEvent[] = []
    const bodyLimit = 24
    const simulatedHours = 24
    const ticksPerHour = 12
    const spawnsPerTick = 6
    const laneCount = 6
    const store = new PhysicsPipelineStore({
      bodyLimit,
      bodyBudget: { warnAt: 18, limit: bodyLimit, action: "sediment" },
      sediment: {
        binAccessor: "lane",
        valueAccessor: "weight",
        retainBodyIds: 2
      },
      fixedDt: 1 / 120,
      maxDeltaSeconds: 1 / 30,
      maxSubsteps: 4,
      observation: {
        chartId: "soak",
        chartType: "PhysicsPileChart",
        onObservation: (event) => observations.push(event)
      },
      kernel: {
        gravity: { x: 0, y: 0 },
        seed: 11,
        sleepAfter: 999,
        velocityDamping: 1
      }
    })

    let maxLiveBodies = 0
    let maxSteps = 0
    let totalSpawned = 0
    let totalSedimented = 0

    for (let tick = 0; tick < simulatedHours * ticksPerHour; tick += 1) {
      const spawns = Array.from({ length: spawnsPerTick }, (_, index) => ({
        ...circle(`soak-${tick}-${index}`, index * 4, tick % laneCount),
        datum: {
          lane: `lane-${(tick + index) % laneCount}`,
          weight: (index % 3) + 1
        }
      }))

      store.enqueue(spawns)
      const result = store.tick(1 / 30)
      totalSpawned += result.spawned.length
      totalSedimented += result.sedimented.length
      maxLiveBodies = Math.max(maxLiveBodies, store.liveBodyCount())
      maxSteps = Math.max(maxSteps, result.steps)

      expect(store.liveBodyCount()).toBeLessThanOrEqual(bodyLimit)
      if (tick > 0 && tick % ticksPerHour === 0) {
        store.restore(store.snapshot())
      }
    }

    const sedimentTotals = store.sedimentTotals()
    expect(totalSpawned).toBe(simulatedHours * ticksPerHour * spawnsPerTick)
    expect(totalSedimented).toBe(sedimentTotals.count)
    expect(maxLiveBodies).toBe(bodyLimit)
    expect(maxSteps).toBeLessThanOrEqual(4)
    expect(sedimentTotals).toMatchObject({
      bins: laneCount,
      count: totalSpawned - store.liveBodyCount()
    })
    expect(store.sedimentHeightfield({ value: "total" })).toHaveLength(
      laneCount
    )
    expect(
      observations.filter((event) => event.type === "physics-budget-overflow")
        .length
    ).toBeGreaterThan(0)
    expect(
      observations.filter((event) => event.type === "physics-sediment").length
    ).toBe(sedimentTotals.count)
  })

  it("round-trips the body-budget policy through snapshots", () => {
    const store = new PhysicsPipelineStore({
      bodyLimit: 4,
      bodyBudget: { warnAt: 3 },
      kernel: { gravity: { x: 0, y: 0 } }
    })
    store.spawnNow(circle("a"))
    const snapshot = store.snapshot()
    store.updateConfig({ bodyBudget: false })

    expect(store.bodyBudgetStatus().warnAt).toBeUndefined()
    store.restore(snapshot)
    expect(store.bodyBudgetStatus()).toMatchObject({
      bodyLimit: 4,
      liveBodies: 1,
      state: "ok",
      warnAt: 3
    })
  })

  it("evicts sleeping bodies before awake bodies when requested", () => {
    const store = new PhysicsPipelineStore({
      bodyLimit: 2,
      eviction: "sleeping-first",
      fixedDt: 1 / 60,
      kernel: {
        gravity: { x: 0, y: 0 },
        sleepSpeed: 100,
        sleepAfter: 0.01
      }
    })

    store.spawnNow(circle("sleeping"))
    store.settle()
    store.spawnNow({ ...circle("awake-a"), vx: 20 })
    store.spawnNow({ ...circle("awake-b"), vx: 20 })

    expect(store.readBodies().map((body) => body.id)).toEqual([
      "awake-a",
      "awake-b"
    ])
  })

  it("removes live and queued bodies without reporting missing ids", () => {
    const store = new PhysicsPipelineStore({
      fixedDt: 0.1,
      kernel: { gravity: { x: 0, y: 0 } }
    })
    store.spawnNow(circle("live"))
    store.enqueue({ ...circle("queued"), spawnAt: 1 })

    expect(store.remove(["live", "queued", "missing"])).toEqual([
      "live",
      "queued"
    ])
    expect(store.readBodies()).toHaveLength(0)
    expect(store.queueSize()).toBe(0)
  })

  it("hit-tests bodies with a revision-keyed lazy quadtree", () => {
    const store = new PhysicsPipelineStore({
      fixedDt: 0.1,
      maxDeltaSeconds: 1,
      kernel: {
        gravity: { x: 0, y: 0 },
        velocityDamping: 1,
        sleepAfter: 999
      }
    })
    store.spawnNow({
      ...circle("moving"),
      shape: { type: "circle", radius: 0.25 },
      vx: 10
    })

    expect(store.hitTest(0, 0)?.id).toBe("moving")
    store.tick(0.3)
    const [moved] = store.readBodies()
    expect(store.hitTest(0, 0, 0)).toBeNull()
    expect(store.hitTest(moved.x, 0, 0.25)?.id).toBe("moving")
  })

  it("exposes a frame-friendly control surface", () => {
    const store = new PhysicsPipelineStore({
      fixedDt: 0.1,
      kernel: {
        gravity: { x: 0, y: 0 },
        sleepAfter: 999
      }
    })
    const controls = store.controls()

    controls.push({ ...circle("queued"), spawnAt: 0.1 })
    controls.pause()
    expect(controls.step(0.2).spawned).toEqual([])
    controls.resume()
    expect(controls.step(0.2).spawned).toEqual(["queued"])
    expect(controls.hitTest(0, 0)?.id).toBe("queued")
    expect(controls.remove(["queued"])).toEqual(["queued"])
    expect(controls.readBodies()).toHaveLength(0)
  })

  it("paces queued pushes through the control surface without resetting live bodies", () => {
    const store = new PhysicsPipelineStore({
      fixedDt: 0.1,
      maxDeltaSeconds: 1,
      maxSubsteps: 1,
      kernel: {
        gravity: { x: 0, y: 0 },
        sleepAfter: 999
      }
    })
    store.spawnNow(circle("existing", 4, 4))
    const controls = store.controls()

    controls.pushMany(
      [circle("a"), circle("b"), circle("c")],
      { pacing: { ratePerSec: 2 }, startAt: 0 }
    )

    expect(controls.step(0).spawned).toEqual(["a"])
    expect(store.readBodies().map((body) => body.id)).toEqual([
      "existing",
      "a"
    ])
    expect(store.queueSize()).toBe(2)

    expect(controls.step(0.49).spawned).toEqual([])
    expect(controls.step(0.02).spawned).toEqual(["b"])
    expect(controls.step(0.5).spawned).toEqual(["c"])
    expect(store.readBodies().map((body) => body.id)).toEqual([
      "existing",
      "a",
      "b",
      "c"
    ])
  })

  it("records domain observations with the standard observation envelope", () => {
    const callbackEvents: PhysicsObservationEvent[] = []
    const store = new PhysicsPipelineStore({
      observation: {
        chartId: "watermark",
        chartType: "EventDropChart",
        onObservation: (event) => callbackEvents.push(event)
      }
    })

    const lateEvent = store.recordObservation({
      type: "physics-late",
      bodyId: "event-1",
      datum: { label: "Event 1" },
      binId: "0-12s",
      x: 10,
      y: 20
    })
    const barrierEvent = store.controls().recordObservation({
      type: "physics-barrier-cross",
      barrierId: "watermark",
      barrierValue: 12,
      binId: "0-12s"
    })

    expect(lateEvent).toMatchObject({
      type: "physics-late",
      timestamp: 0,
      chartId: "watermark",
      chartType: "EventDropChart",
      bodyId: "event-1",
      datum: { label: "Event 1" },
      binId: "0-12s",
      x: 10,
      y: 20
    })
    expect(barrierEvent).toMatchObject({
      type: "physics-barrier-cross",
      timestamp: 0,
      chartId: "watermark",
      chartType: "EventDropChart",
      barrierId: "watermark",
      barrierValue: 12,
      binId: "0-12s"
    })
    expect(callbackEvents).toEqual([lateEvent, barrierEvent])
  })

  it("emits semantic observations for spawn and sensor transitions", () => {
    const callbackEvents: PhysicsObservationEvent[] = []
    const store = new PhysicsPipelineStore({
      fixedDt: 0.1,
      maxSubsteps: 4,
      colliders: [
        {
          id: "sensor-window-a",
          sensor: true,
          shape: { type: "aabb", x: 5, y: 0, width: 4, height: 20 }
        }
      ],
      observation: {
        chartId: "chart-1",
        chartType: "EventDropChart",
        sensors: { "sensor-window-a": { binId: "window-a" } },
        onObservation: (event) => callbackEvents.push(event)
      },
      kernel: {
        gravity: { x: 0, y: 0 },
        velocityDamping: 1,
        sleepAfter: 999
      }
    })
    store.enqueue({
      ...circle("event", 0, 0),
      vx: 20,
      datum: { label: "A" },
      spawnAt: 0
    })

    const observations: PhysicsObservationEvent[] = []
    for (let i = 0; i < 6; i += 1) {
      observations.push(...store.tick(0.1).observations)
    }

    expect(observations.map((event) => event.type)).toEqual([
      "physics-spawn",
      "sim-active",
      "physics-bin-enter",
      "physics-bin-exit"
    ])
    expect(observations[0]).toMatchObject({
      chartId: "chart-1",
      chartType: "EventDropChart",
      bodyId: "event",
      datum: { label: "A" }
    })
    expect(observations[2]).toMatchObject({
      bodyId: "event",
      sensorId: "sensor-window-a",
      binId: "window-a"
    })
    expect(callbackEvents).toEqual(observations)
  })

  it("emits simulation lifecycle observations and state callbacks", () => {
    const observations: PhysicsObservationEvent[] = []
    const states: Array<[string, string]> = []
    const store = new PhysicsPipelineStore({
      fixedDt: 0.1,
      maxSubsteps: 2,
      observation: {
        chartId: "sim",
        chartType: "StreamPhysicsFrame",
        onObservation: (event) => observations.push(event),
        onSimulationStateChange: (state, previous) =>
          states.push([previous, state])
      },
      kernel: {
        gravity: { x: 0, y: 0 },
        sleepSpeed: 100,
        sleepAfter: 0.05
      }
    })
    store.enqueue({ ...circle("sleepy"), spawnAt: 0 })

    const result = store.tick(0.1)
    expect(result.observations.map((event) => event.type)).toEqual([
      "physics-spawn",
      "sim-active",
      "physics-settle",
      "sim-idle"
    ])
    expect(result.observations[1]).toMatchObject({
      type: "sim-active",
      simulationState: "running",
      previousSimulationState: "settled"
    })
    expect(result.observations[3]).toMatchObject({
      type: "sim-idle",
      simulationState: "settled",
      previousSimulationState: "running"
    })
    expect(states).toEqual([
      ["settled", "running"],
      ["running", "settled"]
    ])
    expect(observations).toEqual(result.observations)
  })

  it("does not duplicate bin-enter observations when colliders regenerate", () => {
    const sensor = {
      id: "sensor-window-a",
      sensor: true,
      shape: { type: "aabb" as const, x: 0, y: 0, width: 20, height: 20 }
    }
    const store = new PhysicsPipelineStore({
      fixedDt: 0.1,
      maxSubsteps: 1,
      colliders: [sensor],
      observation: {
        sensors: { "sensor-window-a": { binId: "window-a" } }
      },
      kernel: {
        gravity: { x: 0, y: 0 },
        velocityDamping: 1,
        sleepAfter: 999
      }
    })
    store.spawnNow(circle("event", 0, 0))

    const observations: PhysicsObservationEvent[] = []
    for (let i = 0; i < 4; i += 1) {
      store.setColliders([sensor])
      observations.push(...store.tick(0.1).observations)
    }

    expect(
      observations.filter((event) => event.type === "physics-bin-enter")
    ).toHaveLength(1)
  })

  it("maps sleep events to settle observations", () => {
    const store = new PhysicsPipelineStore({
      fixedDt: 0.1,
      kernel: {
        gravity: { x: 0, y: 0 },
        sleepSpeed: 100,
        sleepAfter: 0.05
      }
    })
    store.enqueue({ ...circle("sleepy"), spawnAt: 0 })

    const result = store.tick(0.1)
    expect(result.observations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "physics-spawn",
          bodyId: "sleepy"
        }),
        expect.objectContaining({
          type: "physics-settle",
          bodyId: "sleepy"
        })
      ])
    )
  })

  it("settles synchronously with semantic observations for reduced motion", () => {
    const callbackEvents: PhysicsObservationEvent[] = []
    const store = new PhysicsPipelineStore({
      fixedDt: 0.1,
      maxSubsteps: 1,
      colliders: [
        {
          id: "sensor-window-a",
          sensor: true,
          shape: { type: "aabb", x: 0, y: 0, width: 20, height: 20 }
        }
      ],
      observation: {
        chartId: "reduced-motion",
        chartType: "EventDropChart",
        sensors: { "sensor-window-a": { binId: "window-a" } },
        onObservation: (event) => callbackEvents.push(event)
      },
      kernel: {
        gravity: { x: 0, y: 0 },
        sleepSpeed: 100,
        sleepAfter: 0.05
      }
    })
    store.enqueue({ ...circle("event"), spawnAt: 0 })

    const result = store.controls().settleWithObservations()

    expect(result.steps).toBeGreaterThan(0)
    expect(result.shouldContinue).toBe(false)
    expect(result.sleeping).toBe(true)
    expect(result.spawned).toEqual(["event"])
    expect(result.observations.map((event) => event.type)).toEqual([
      "physics-spawn",
      "sim-active",
      "physics-settle",
      "physics-bin-enter",
      "sim-idle"
    ])
    expect(result.observations[3]).toMatchObject({
      bodyId: "event",
      sensorId: "sensor-window-a",
      binId: "window-a"
    })
    expect(callbackEvents).toEqual(result.observations)
  })

  it("preserves kernel options when clearing live state", () => {
    const store = new PhysicsPipelineStore({
      fixedDt: 0.1,
      kernel: {
        gravity: { x: 0, y: 10 },
        velocityDamping: 1,
        sleepAfter: 999
      }
    })

    store.spawnNow(circle("before-clear"))
    store.tick(0.1)
    expect(store.readBodies()[0].y).toBeCloseTo(0.1)

    store.clear()
    store.spawnNow(circle("after-clear"))
    store.tick(0.1)
    expect(store.readBodies()[0].y).toBeCloseTo(0.1)
  })

  it("round-trips snapshot and restore deterministically", () => {
    const store = new PhysicsPipelineStore({
      fixedDt: 1 / 60,
      maxSubsteps: 8,
      kernel: {
        seed: 42,
        gravity: { x: 0, y: 20 },
        velocityDamping: 1,
        sleepAfter: 999
      }
    })
    store.spawnNow({ ...circle("a"), vx: 2, vy: 0 })
    store.enqueue({ ...circle("b", 10, 0), spawnAt: 0.2 })
    store.tick(0.17)

    const snapshot = store.snapshot()
    store.tick(0.2)
    const afterFirstRun = stateTuple(store)

    store.restore(snapshot)
    store.tick(0.2)
    expect(stateTuple(store)).toEqual(afterFirstRun)
  })
})

describe("physics collider helpers", () => {
  it("builds physical walls from plot bounds", () => {
    const colliders = collidersFromPlotBounds(
      { x: 10, y: 20, width: 100, height: 50 },
      { idPrefix: "chart", wallThickness: 10 }
    )

    expect(colliders.map((collider) => collider.id)).toEqual([
      "chart-floor",
      "chart-left-wall",
      "chart-right-wall"
    ])
    expect(colliders[0].shape).toEqual({
      type: "aabb",
      x: 60,
      y: 75,
      width: 120,
      height: 10
    })
  })

  it("builds bin walls and closed-window lids from an x scale", () => {
    const colliders = collidersFromXScaleBins({
      idPrefix: "window",
      count: 4,
      domainStart: 0,
      domainStep: 10,
      xScale: (value) => value * 2,
      yTop: 20,
      yBottom: 100,
      closedBefore: 25,
      lidY: 30
    })

    expect(
      colliders.filter((collider) => collider.id.includes("wall"))
    ).toHaveLength(5)
    expect(
      colliders
        .filter((collider) => collider.id.includes("lid"))
        .map((collider) => collider.id)
    ).toEqual(["window-lid-0", "window-lid-1"])
  })
})
