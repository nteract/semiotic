import { describe, expect, it, vi } from "vitest"
import {
  composePhysicsControllers,
  createCapacityQueueController,
  createPortalController
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
