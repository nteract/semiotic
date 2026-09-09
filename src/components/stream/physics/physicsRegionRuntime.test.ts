import { describe, expect, it } from "vitest"
import {
  composePhysicsControllers,
  createCapacityQueueController
} from "./PhysicsControllers"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import {
  cloneRegionStateSnapshot,
  runPhysicsObservedSteps,
  runPhysicsPostTick,
  type InternalStreamPhysicsBodyRegionState
} from "./physicsRegionRuntime"
import type { StreamPhysicsRegionEffect } from "./StreamPhysicsTypes"

const BODY_ID = "body"
const REGION_ID = "field"
const FIXED_DT = 1 / 60

function emptyRegionState(): InternalStreamPhysicsBodyRegionState {
  return {
    activeRegionIds: new Set(),
    regionIds: new Set(),
    charges: {},
    attributes: {},
    energy: 0
  }
}

function makeRuntime(work = 1) {
  const store = new PhysicsPipelineStore({
    fixedDt: FIXED_DT,
    maxSubsteps: 8,
    kernel: {
      gravity: { x: 0, y: 0 },
      velocityDamping: 1,
      sleepAfter: 10,
      sleepSpeed: 0
    }
  })
  store.enqueue({
    id: BODY_ID,
    x: 40,
    y: 40,
    mass: 1,
    shape: { type: "circle", radius: 5 },
    datum: { work }
  })
  store.tick(0)

  const regionState = new Map<string, InternalStreamPhysicsBodyRegionState>([
    [
      BODY_ID,
      {
        activeRegionIds: new Set([REGION_ID]),
        regionIds: new Set([REGION_ID]),
        charges: {},
        attributes: {},
        energy: 0
      }
    ]
  ])

  return { regionState, store }
}

function advance(
  runtime: ReturnType<typeof makeRuntime>,
  deltaSeconds: number,
  options: {
    composed?: ReturnType<typeof composePhysicsControllers>
    regionEffects?: StreamPhysicsRegionEffect[]
    bodyForces?: { x?: number; y?: number }
  } = {}
) {
  const postTick = runPhysicsObservedSteps(
    runtime.store,
    (result) =>
      runPhysicsPostTick({
        store: runtime.store,
        result,
        regionEffects: options.regionEffects ?? [],
        regionState: runtime.regionState,
        bodyForces: options.bodyForces,
        composed: options.composed ?? null
      }),
    { deltaSeconds }
  )
  return { postTick, result: postTick.result }
}

describe("runPhysicsPostTick simulated time", () => {
  it("does not apply region or body forces when the pipeline advances zero steps", () => {
    const runtime = makeRuntime()
    const regionEffects: StreamPhysicsRegionEffect[] = [
      {
        id: REGION_ID,
        shape: { type: "aabb", x: 40, y: 40, width: 20, height: 20 },
        force: { x: 60, y: 0 }
      }
    ]

    const { postTick, result } = advance(runtime, 0, {
      regionEffects,
      bodyForces: { x: 0, y: 120 }
    })

    expect(result.steps).toBe(0)
    expect(postTick.regionEffectsApplied).toBe(false)
    expect(postTick.bodyForcesApplied).toBe(false)
    expect(runtime.store.readBodies()[0]).toMatchObject({ vx: 0, vy: 0 })
  })

  it("applies equal force impulse for equal simulated time across tick chunking", () => {
    const oneChunk = makeRuntime()
    const twoChunks = makeRuntime()
    const regionEffects: StreamPhysicsRegionEffect[] = [
      {
        id: REGION_ID,
        shape: { type: "aabb", x: 40, y: 40, width: 20, height: 20 },
        force: { x: 60, y: 0 }
      }
    ]
    const options = {
      regionEffects,
      bodyForces: { x: 0, y: 120 }
    }

    expect(advance(oneChunk, 1 / 30, options).result.steps).toBe(2)
    expect(advance(twoChunks, 1 / 60, options).result.steps).toBe(1)
    expect(advance(twoChunks, 1 / 60, options).result.steps).toBe(1)

    const oneBody = oneChunk.store.readBodies()[0]
    const twoBody = twoChunks.store.readBodies()[0]
    expect(oneBody.vx).toBeCloseTo(2, 8)
    expect(oneBody.vy).toBeCloseTo(4, 8)
    expect(twoBody.vx).toBeCloseTo(oneBody.vx, 8)
    expect(twoBody.vy).toBeCloseTo(oneBody.vy, 8)
    expect(twoBody.x).toBeCloseTo(oneBody.x, 8)
    expect(twoBody.y).toBeCloseTo(oneBody.y, 8)
  })

  it("has identical trajectories and per-step admissions in RAF batches and a bounded settle", () => {
    const run = (deltas: number[] | null) => {
      const runtime = makeRuntime()
      let admitted = false
      const arrivals: string[] = []
      const post = (
        result: Parameters<typeof runPhysicsPostTick>[0]["result"]
      ) =>
        runPhysicsPostTick({
          ...runtime,
          result,
          regionEffects: [],
          bodyForces: { x: 60, y: 0 },
          composed: null,
          onTick: (step, controls) => {
            arrivals.push(...step.spawned)
            if (!admitted && step.elapsedSeconds >= 0.5) {
              admitted = true
              controls.push({
                id: "arrival",
                x: 100,
                y: 100,
                shape: { type: "circle", radius: 5 }
              })
            }
          }
        })
      if (deltas)
        deltas.forEach((deltaSeconds) =>
          runPhysicsObservedSteps(runtime.store, post, { deltaSeconds })
        )
      else {
        const outcome = runPhysicsObservedSteps(runtime.store, post, {
          maxSteps: 60,
          continueWhile: () => true
        })
        expect(outcome.result.steps).toBe(60)
        expect(outcome.result.shouldContinue).toBe(true)
      }
      return {
        bodies: runtime.store.readBodies(),
        arrivals,
        elapsed: runtime.store.elapsed()
      }
    }
    const frames = run(Array(60).fill(1 / 60))
    expect(frames.bodies[0].x).toBeCloseTo(69.5, 8)
    expect(frames.bodies[0].vx).toBeCloseTo(60, 8)
    expect(frames.arrivals).toEqual(["arrival"])
    expect(run(Array(10).fill(0.1))).toEqual(frames)
    expect(run(null)).toEqual(frames)
  })

  it("lets a controller pause a batched run at a step boundary", () => {
    const runtime = makeRuntime()
    const outcome = runPhysicsObservedSteps(
      runtime.store,
      (result) =>
        runPhysicsPostTick({
          ...runtime,
          result,
          regionEffects: [],
          bodyForces: undefined,
          composed: null,
          onTick: (step, controls) => {
            if (step.elapsedSeconds >= 3 * FIXED_DT) controls.pause()
          }
        }),
      { maxSteps: 60, continueWhile: () => true }
    )
    expect(outcome.result.steps).toBe(3)
    expect(outcome.snapshot.paused).toBe(true)
    expect(outcome.result.shouldContinue).toBe(false)
  })

  it("does not drain controller work on step zero and is chunking invariant", () => {
    const makeCapacityRuntime = () => {
      const runtime = makeRuntime(1)
      const controller = createCapacityQueueController({
        regionId: REGION_ID,
        unitsPerSecond: 6,
        unitAccessor: "work",
        queueLayout: "none"
      })
      return {
        ...runtime,
        controller,
        composed: composePhysicsControllers([controller])
      }
    }
    const oneChunk = makeCapacityRuntime()
    const twoChunks = makeCapacityRuntime()

    expect(
      advance(oneChunk, 0, { composed: oneChunk.composed }).result.steps
    ).toBe(0)
    expect(oneChunk.controller.getSnapshot?.()).toMatchObject({
      queueDepth: 1,
      remainingWork: 1,
      processedCount: 0
    })

    advance(oneChunk, 1 / 30, { composed: oneChunk.composed })
    advance(twoChunks, 1 / 60, { composed: twoChunks.composed })
    advance(twoChunks, 1 / 60, { composed: twoChunks.composed })

    const oneSnapshot = oneChunk.controller.getSnapshot?.() as {
      remainingWork: number
    }
    const twoSnapshot = twoChunks.controller.getSnapshot?.() as {
      remainingWork: number
    }
    expect(oneSnapshot.remainingWork).toBeCloseTo(0.8, 8)
    expect(twoSnapshot.remainingWork).toBeCloseTo(oneSnapshot.remainingWork, 8)
  })
})

describe("cloneRegionStateSnapshot", () => {
  it("retains special body ids as own keys without replacing the prototype", () => {
    const snapshot = cloneRegionStateSnapshot(
      new Map([
        ["__proto__", emptyRegionState()],
        ["constructor", emptyRegionState()],
        ["toString", emptyRegionState()]
      ])
    )

    expect(Object.keys(snapshot)).toEqual([
      "__proto__",
      "constructor",
      "toString"
    ])
    expect(snapshot["__proto__"].energy).toBe(0)
    expect(Object.getPrototypeOf(snapshot)).toBe(Object.prototype)
  })
})
