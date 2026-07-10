import { describe, expect, it } from "vitest"
import {
  composePhysicsControllers,
  createCapacityQueueController
} from "./PhysicsControllers"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import {
  runPhysicsPostTick,
  type InternalStreamPhysicsBodyRegionState
} from "./physicsRegionRuntime"
import type { StreamPhysicsRegionEffect } from "./StreamPhysicsTypes"

const BODY_ID = "body"
const REGION_ID = "field"
const FIXED_DT = 1 / 60

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
  const result = runtime.store.tick(deltaSeconds)
  const postTick = runPhysicsPostTick({
    store: runtime.store,
    result,
    regionEffects: options.regionEffects ?? [],
    regionState: runtime.regionState,
    bodyForces: options.bodyForces,
    composed: options.composed ?? null
  })
  return { postTick, result }
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
