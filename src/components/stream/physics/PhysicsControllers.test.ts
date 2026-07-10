import { describe, expect, it, vi } from "vitest"
import {
  composePhysicsControllers,
  createCapacityQueueController,
  createPortalController,
  type CapacityQueueSnapshot
} from "./PhysicsControllers"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import type { StreamPhysicsBodyRegionState } from "./StreamPhysicsFrame"

function makeStore() {
  return new PhysicsPipelineStore({
    kernel: {
      seed: 1,
      gravity: { x: 0, y: 0 },
      velocityDamping: 1,
      sleepAfter: 10,
      sleepSpeed: 0.01
    },
    colliders: [],
    fixedDt: 1 / 60,
    maxSubsteps: 4
  })
}

function controllerContext(
  store: PhysicsPipelineStore,
  getRegionState: (bodyId: string) => StreamPhysicsBodyRegionState | undefined,
  dt = 0.2,
  elapsed = dt
) {
  return {
    result: {
      budget: {
        action: "ok",
        liveBodies: store.liveBodyCount(),
        queuedBodies: store.queueSize(),
        projectedBodies: store.liveBodyCount() + store.queueSize(),
        bodyLimit: 1000
      } as never,
      elapsedSeconds: elapsed,
      evicted: [],
      events: [],
      observations: [],
      queueSize: store.queueSize(),
      revision: 1,
      shouldContinue: true,
      sleeping: false,
      sedimented: [],
      spawned: [],
      steps: 1
    },
    controls: store.controls(),
    dt,
    elapsed,
    getRegionState
  }
}

describe("createCapacityQueueController", () => {
  it("drains a FIFO queue at unitsPerSecond and releases with impulse", () => {
    const store = makeStore()
    store.enqueue([
      {
        id: "a",
        x: 100,
        y: 100,
        mass: 1,
        shape: { type: "circle", radius: 5 },
        datum: { work: 2 }
      },
      {
        id: "b",
        x: 110,
        y: 100,
        mass: 1,
        shape: { type: "circle", radius: 5 },
        datum: { work: 2 }
      }
    ])
    // materialize bodies
    store.tick(0)
    store.tick(1 / 60)

    const processed: string[] = []
    const controller = createCapacityQueueController({
      regionId: "review",
      unitsPerSecond: 10, // 10 work units / sec
      unitAccessor: "work",
      releaseImpulse: { x: 50, y: 0 },
      queueLayout: "none",
      onProcessed: (body) => processed.push(body.id)
    })

    const regionMembers = new Set(["a", "b"])
    const getRegionState = (
      bodyId: string
    ): StreamPhysicsBodyRegionState | undefined => {
      if (!regionMembers.has(bodyId)) return undefined
      return {
        activeRegionIds: ["review"],
        regionIds: ["review"],
        charges: {},
        attributes: {},
        energy: 0
      }
    }

    const controls = store.controls()
    // 0.25s * 10 u/s = 2.5 units → processes body a fully (2) and starts b
    controller.tick({
      result: {
        budget: {
          action: "ok",
          liveBodies: 2,
          queuedBodies: 0,
          projectedBodies: 2,
          bodyLimit: 1000
        } as never,
        elapsedSeconds: 0.25,
        evicted: [],
        events: [],
        observations: [],
        queueSize: 0,
        revision: 1,
        shouldContinue: true,
        sleeping: false,
        sedimented: [],
        spawned: [],
        steps: 15
      },
      controls,
      dt: 0.25,
      elapsed: 0.25,
      getRegionState
    })

    expect(processed).toEqual(["a"])
    const bodyA = controls.readBodies().find((body) => body.id === "a")
    // released body should have received +vx impulse
    expect(bodyA && bodyA.vx).toBeGreaterThan(0)

    // another 0.25s finishes b
    controller.tick({
      result: {
        budget: {
          action: "ok",
          liveBodies: 2,
          queuedBodies: 0,
          projectedBodies: 2,
          bodyLimit: 1000
        } as never,
        elapsedSeconds: 0.5,
        evicted: [],
        events: [],
        observations: [],
        queueSize: 0,
        revision: 2,
        shouldContinue: true,
        sleeping: false,
        sedimented: [],
        spawned: [],
        steps: 15
      },
      controls,
      dt: 0.25,
      elapsed: 0.5,
      getRegionState
    })
    expect(processed).toEqual(["a", "b"])
  })

  it("processes a body once per active-region visit and re-arms after exit", () => {
    const store = makeStore()
    store.enqueue({
      id: "reviewed",
      x: 100,
      y: 100,
      mass: 1,
      shape: { type: "circle", radius: 5 },
      datum: { work: 1 }
    })
    store.tick(0)

    let active = true
    const getRegionState = (): StreamPhysicsBodyRegionState => ({
      activeRegionIds: active ? ["review"] : [],
      regionIds: ["review"],
      charges: {},
      attributes: {},
      energy: 0
    })
    const onProcessed = vi.fn()
    const controller = createCapacityQueueController({
      regionId: "review",
      unitsPerSecond: 10,
      unitAccessor: "work",
      queueLayout: "none",
      onProcessed
    })

    controller.tick(controllerContext(store, getRegionState))
    controller.tick(controllerContext(store, getRegionState, 0.2, 0.4))
    expect(onProcessed).toHaveBeenCalledTimes(1)

    active = false
    controller.tick(controllerContext(store, getRegionState, 0.2, 0.6))
    expect(controller.getSnapshot?.()).toMatchObject({
      processedCount: 1,
      queueDepth: 0
    })

    active = true
    controller.tick(controllerContext(store, getRegionState, 0.2, 0.8))
    expect(onProcessed).toHaveBeenCalledTimes(2)
  })

  it("filters queue admission with collider body-filter semantics", () => {
    const store = makeStore()
    store.enqueue([
      {
        id: "core",
        x: 100,
        y: 100,
        mass: 1,
        shape: { type: "circle", radius: 5 },
        datum: { kind: "core", work: 1 }
      },
      {
        id: "satellite",
        x: 110,
        y: 100,
        mass: 1,
        shape: { type: "circle", radius: 3 },
        datum: { kind: "satellite", work: 1 }
      }
    ])
    store.tick(0)

    const getRegionState = (): StreamPhysicsBodyRegionState => ({
      activeRegionIds: ["review"],
      regionIds: ["review"],
      charges: {},
      attributes: {},
      energy: 0
    })
    const processed: string[] = []
    const controller = createCapacityQueueController({
      regionId: "review",
      unitsPerSecond: 10,
      unitAccessor: "work",
      bodyFilter: { property: "datum.kind", equals: "core" },
      queueLayout: "none",
      onProcessed: (body) => processed.push(body.id)
    })

    controller.tick(controllerContext(store, getRegionState))

    expect(processed).toEqual(["core"])
    expect(controller.getSnapshot?.()).toMatchObject({
      processedCount: 1,
      queueDepth: 0
    })
  })

  it("emits queued observations with stable visit ids and increments them after re-entry", () => {
    const store = makeStore()
    store.enqueue({
      id: "root-a",
      x: 100,
      y: 100,
      mass: 1,
      shape: { type: "circle", radius: 5 },
      datum: { jobId: "job-a", work: 2 }
    })
    store.tick(0)

    const active = new Set(["root-a"])
    const getRegionState = (
      bodyId: string
    ): StreamPhysicsBodyRegionState | undefined =>
      active.has(bodyId)
        ? {
            activeRegionIds: ["review"],
            regionIds: ["review"],
            charges: {},
            attributes: {},
            energy: 0
          }
        : undefined
    const onQueued = vi.fn()
    const observationSpy = vi.spyOn(store, "recordObservation")
    const controller = createCapacityQueueController({
      regionId: "review",
      unitsPerSecond: 0,
      unitAccessor: "work",
      jobKey: "jobId",
      queueLayout: "none",
      onQueued
    })

    controller.tick(controllerContext(store, getRegionState, 0, 0))
    controller.tick(controllerContext(store, getRegionState, 0, 0))
    expect(onQueued).toHaveBeenCalledTimes(1)
    expect(onQueued.mock.calls[0][1]).toMatchObject({
      bodyId: "root-a",
      jobId: "job-a",
      regionId: "review",
      visit: 1,
      visitId: "review:job-a:1"
    })

    active.clear()
    controller.tick(controllerContext(store, getRegionState, 0, 0))
    active.add("root-a")
    controller.tick(controllerContext(store, getRegionState, 0, 0))

    expect(onQueued).toHaveBeenCalledTimes(2)
    expect(onQueued.mock.calls[1][1]).toMatchObject({
      jobId: "job-a",
      visit: 2,
      visitId: "review:job-a:2"
    })
    const queuedObservations = observationSpy.mock.calls
      .map(([observation]) => observation)
      .filter((observation) => observation.type === "physics-capacity-queued")
    expect(queuedObservations).toHaveLength(2)
    expect(
      queuedObservations.map((observation) => observation.visitId)
    ).toEqual(["review:job-a:1", "review:job-a:2"])
  })

  it("reports waiting work, queue age, peaks, utilization, and pressure", () => {
    const store = makeStore()
    store.enqueue([
      {
        id: "a",
        x: 100,
        y: 100,
        mass: 1,
        shape: { type: "circle", radius: 5 },
        datum: { work: 2 }
      },
      {
        id: "b",
        x: 110,
        y: 100,
        mass: 1,
        shape: { type: "circle", radius: 5 },
        datum: { work: 4 }
      }
    ])
    store.tick(0)
    const getRegionState = (): StreamPhysicsBodyRegionState => ({
      activeRegionIds: ["review"],
      regionIds: ["review"],
      charges: {},
      attributes: {},
      energy: 0
    })
    const controller = createCapacityQueueController({
      regionId: "review",
      unitsPerSecond: 2,
      unitAccessor: "work",
      queueLayout: "none"
    })

    controller.tick(controllerContext(store, getRegionState, 0, 0))
    controller.tick(controllerContext(store, getRegionState, 1, 1))
    const snapshot = controller.getSnapshot?.() as CapacityQueueSnapshot

    expect(snapshot).toMatchObject({
      queueDepth: 1,
      waitingWork: 4,
      remainingWork: 4,
      processedWork: 2,
      completedWork: 2,
      peakQueueDepth: 2,
      peakRemainingWork: 6,
      queueAge: {
        count: 1,
        meanSeconds: 1,
        p50Seconds: 1,
        p95Seconds: 1,
        oldestSeconds: 1
      },
      window: {
        seconds: 1,
        arrivals: 2,
        arrivalWork: 6,
        completions: 1,
        processedWork: 2,
        utilization: 1,
        pressure: 3
      }
    })
  })

  it("keeps overflow blocked and admits it with the same visit after capacity opens", () => {
    const store = makeStore()
    store.enqueue([
      {
        id: "a",
        x: 100,
        y: 100,
        mass: 1,
        shape: { type: "circle", radius: 5 },
        datum: { work: 1 }
      },
      {
        id: "b",
        x: 110,
        y: 100,
        mass: 1,
        shape: { type: "circle", radius: 5 },
        datum: { work: 1 }
      }
    ])
    store.tick(0)
    const getRegionState = (): StreamPhysicsBodyRegionState => ({
      activeRegionIds: ["review"],
      regionIds: ["review"],
      charges: {},
      attributes: {},
      energy: 0
    })
    const onQueued = vi.fn()
    const onBlocked = vi.fn()
    const controller = createCapacityQueueController({
      regionId: "review",
      unitsPerSecond: 1,
      unitAccessor: "work",
      maxQueue: 1,
      queueLayout: "none",
      onQueued,
      onBlocked
    })

    controller.tick(controllerContext(store, getRegionState, 0, 0))
    expect(controller.getSnapshot?.()).toMatchObject({
      queueDepth: 1,
      blockedDepth: 1,
      blockedCount: 1,
      admittedCount: 1,
      waitingWork: 2
    })
    expect(onBlocked).toHaveBeenCalledTimes(1)
    const blockedVisitId = onBlocked.mock.calls[0][1].visitId

    controller.tick(controllerContext(store, getRegionState, 1, 1))
    expect(controller.getSnapshot?.()).toMatchObject({
      queueDepth: 1,
      blockedDepth: 0,
      admittedCount: 2,
      processedCount: 1,
      waitingWork: 1
    })
    expect(onQueued).toHaveBeenCalledTimes(2)
    expect(onQueued.mock.calls[1][0].id).toBe("b")
    expect(onQueued.mock.calls[1][1]).toMatchObject({
      visit: 1,
      visitId: blockedVisitId,
      queuedAt: 0
    })
  })

  it("records abandonment when admitted work leaves before completion", () => {
    const store = makeStore()
    store.enqueue({
      id: "a",
      x: 100,
      y: 100,
      mass: 1,
      shape: { type: "circle", radius: 5 },
      datum: { work: 2 }
    })
    store.tick(0)
    const active = new Set(["a"])
    const getRegionState = (
      bodyId: string
    ): StreamPhysicsBodyRegionState | undefined =>
      active.has(bodyId)
        ? {
            activeRegionIds: ["review"],
            regionIds: ["review"],
            charges: {},
            attributes: {},
            energy: 0
          }
        : undefined
    const onAbandoned = vi.fn()
    const observationSpy = vi.spyOn(store, "recordObservation")
    const controller = createCapacityQueueController({
      regionId: "review",
      unitsPerSecond: 1,
      unitAccessor: "work",
      queueLayout: "none",
      onAbandoned
    })

    controller.tick(controllerContext(store, getRegionState, 0, 0))
    controller.tick(controllerContext(store, getRegionState, 0.5, 0.5))
    active.clear()
    controller.tick(controllerContext(store, getRegionState, 0.25, 0.75))
    controller.tick(controllerContext(store, getRegionState, 0.25, 1))

    expect(onAbandoned).toHaveBeenCalledTimes(1)
    expect(onAbandoned.mock.calls[0][1]).toMatchObject({
      bodyId: "a",
      visit: 1,
      visitId: "review:a:1",
      work: 2,
      remainingWork: 1.5,
      abandonedAt: 0.75,
      queueSeconds: 0.75
    })
    expect(controller.getSnapshot?.()).toMatchObject({
      queueDepth: 0,
      waitingWork: 0,
      abandonedCount: 1,
      abandonedWork: 1.5,
      processedWork: 0.5
    })
    expect(
      observationSpy.mock.calls.filter(
        ([observation]) => observation.type === "physics-capacity-abandoned"
      )
    ).toHaveLength(1)
  })

  it("deduplicates compound bodies that resolve to the same semantic job", () => {
    const store = makeStore()
    store.enqueue([
      {
        id: "root",
        x: 100,
        y: 100,
        mass: 1,
        shape: { type: "circle", radius: 5 },
        datum: { jobId: "bus-7", kind: "root", work: 1 }
      },
      {
        id: "satellite",
        x: 106,
        y: 100,
        mass: 1,
        shape: { type: "circle", radius: 3 },
        datum: { jobId: "bus-7", kind: "satellite", work: 1 }
      }
    ])
    store.tick(0)
    const getRegionState = (): StreamPhysicsBodyRegionState => ({
      activeRegionIds: ["review"],
      regionIds: ["review"],
      charges: {},
      attributes: {},
      energy: 0
    })
    const onQueued = vi.fn()
    const onProcessed = vi.fn()
    const controller = createCapacityQueueController({
      regionId: "review",
      unitsPerSecond: 10,
      unitAccessor: "work",
      jobKey: "jobId",
      queueLayout: "none",
      onQueued,
      onProcessed
    })

    controller.tick(controllerContext(store, getRegionState, 0.2, 0.2))
    controller.tick(controllerContext(store, getRegionState, 0.2, 0.4))

    expect(onQueued).toHaveBeenCalledTimes(1)
    expect(onProcessed).toHaveBeenCalledTimes(1)
    expect(onQueued.mock.calls[0][1]).toMatchObject({
      jobId: "bus-7",
      visit: 1,
      visitId: "review:bus-7:1"
    })
    expect(controller.getSnapshot?.()).toMatchObject({
      arrivalCount: 1,
      admittedCount: 1,
      processedCount: 1,
      completedWork: 1
    })
  })

  it("does not advance queue time or rolling metrics on zero-dt ticks", () => {
    const store = makeStore()
    store.enqueue({
      id: "a",
      x: 100,
      y: 100,
      mass: 1,
      shape: { type: "circle", radius: 5 },
      datum: { work: 2 }
    })
    store.tick(0)
    const getRegionState = (): StreamPhysicsBodyRegionState => ({
      activeRegionIds: ["review"],
      regionIds: ["review"],
      charges: {},
      attributes: {},
      energy: 0
    })
    const controller = createCapacityQueueController({
      regionId: "review",
      unitsPerSecond: 1,
      unitAccessor: "work",
      queueLayout: "none"
    })

    controller.tick(controllerContext(store, getRegionState, 0.5, 0.5))
    const before = controller.getSnapshot?.() as CapacityQueueSnapshot
    controller.tick(controllerContext(store, getRegionState, 0, 10))
    const after = controller.getSnapshot?.() as CapacityQueueSnapshot

    expect(after.simulatedAt).toBe(before.simulatedAt)
    expect(after.queueAge).toEqual(before.queueAge)
    expect(after.window).toEqual(before.window)
    expect(after.processedWork).toBe(before.processedWork)
    expect(after.remainingWork).toBe(before.remainingWork)
    expect(after.metricRevision).toBe(before.metricRevision)
  })

  it("composes controllers into a continuous bodyForce and onTick", () => {
    const tickA = vi.fn()
    const tickB = vi.fn()
    const composed = composePhysicsControllers([
      {
        id: "a",
        continuous: true,
        tick: tickA,
        bodyForce: () => ({ x: 1, y: 0 })
      },
      {
        id: "b",
        continuous: false,
        tick: tickB,
        bodyForce: () => ({ x: 2, y: 3 })
      }
    ])
    expect(composed?.continuous).toBe(true)
    const bodyForce = composed?.bodyForce
    const force =
      typeof bodyForce === "function"
        ? bodyForce({
            body: { id: "x", x: 0, y: 0, vx: 0, vy: 0, mass: 1 } as never,
            bodies: [],
            index: 0,
            simulationState: "running"
          })
        : bodyForce
    expect(force).toEqual({ x: 3, y: 3 })
    composed?.onTick(
      {
        budget: {
          action: "ok",
          liveBodies: 0,
          queuedBodies: 0,
          projectedBodies: 0,
          bodyLimit: 1
        } as never,
        elapsedSeconds: 0,
        evicted: [],
        events: [],
        observations: [],
        queueSize: 0,
        revision: 0,
        shouldContinue: false,
        sleeping: true,
        sedimented: [],
        spawned: [],
        steps: 0
      },
      makeStore().controls(),
      {
        dt: 0.016,
        elapsed: 0,
        getRegionState: () => undefined
      }
    )
    expect(tickA).toHaveBeenCalledOnce()
    expect(tickB).toHaveBeenCalledOnce()
  })
})

describe("createPortalController", () => {
  it("fires once per active-region visit and re-arms after exit", () => {
    const store = makeStore()
    store.enqueue({
      id: "p1",
      x: 50,
      y: 50,
      mass: 1,
      shape: { type: "circle", radius: 4 },
      datum: {}
    })
    store.tick(0)
    const onPortal = vi.fn()
    const controller = createPortalController({
      fromRegionId: "revision",
      impulse: { x: -40, y: 0 },
      onPortal
    })
    let active = true
    const getRegionState = (): StreamPhysicsBodyRegionState => ({
      activeRegionIds: active ? ["revision"] : [],
      regionIds: ["revision"],
      charges: {},
      attributes: {},
      energy: 0
    })
    const ctx = {
      result: {
        budget: {
          action: "ok",
          liveBodies: 1,
          queuedBodies: 0,
          projectedBodies: 1,
          bodyLimit: 10
        } as never,
        elapsedSeconds: 0,
        evicted: [],
        events: [],
        observations: [],
        queueSize: 0,
        revision: 1,
        shouldContinue: true,
        sleeping: false,
        sedimented: [],
        spawned: [],
        steps: 1
      },
      controls: store.controls(),
      dt: 1 / 60,
      elapsed: 0,
      getRegionState
    }
    controller.tick(ctx)
    controller.tick(ctx)
    expect(onPortal).toHaveBeenCalledTimes(1)

    active = false
    controller.tick(ctx)
    active = true
    controller.tick(ctx)

    const body = store.controls().readBodies()[0]
    expect(body.vx).toBeLessThan(0)
    expect(onPortal).toHaveBeenCalledTimes(2)
  })
})
