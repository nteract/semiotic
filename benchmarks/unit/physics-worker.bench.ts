import { bench, describe, type BenchOptions } from "vitest"
import { mulberry32 } from "../../src/components/recipes/random"
import {
  PhysicsPipelineStore,
  collidersFromPlotBounds,
  type PhysicsPipelineConfig,
  type PhysicsQueuedSpawn
} from "../../src/components/stream/physics/PhysicsPipelineStore"
import { createPhysicsWorkerRuntime } from "../../src/components/stream/physics/PhysicsWorkerRuntime"
import { createPhysicsWorkerConfig } from "../../src/components/stream/physics/PhysicsWorkerProtocol"

const DEFAULT_BODY_COUNTS = [250, 1000] as const
const STRESS_BODY_COUNTS = [5000, 20000] as const
const STRESS_BENCH = process.env.SEMIOTIC_PHYSICS_STRESS_BENCH === "1"
const BODY_COUNTS = STRESS_BENCH
  ? [...DEFAULT_BODY_COUNTS, ...STRESS_BODY_COUNTS]
  : [...DEFAULT_BODY_COUNTS]
const FIXED_DT = 1 / 120
const FRAME_DT = 1 / 60
const FRAME_COUNT = STRESS_BENCH ? 120 : 60
const SCENARIO_SEED = 20260707
const BODY_RADIUS = 3
const WIDTH = 640
const HEIGHT = 360
const BENCH_OPTIONS: BenchOptions = {
  iterations: 1,
  time: 1,
  warmupIterations: 0,
  warmupTime: 0
}

const CONFIG: PhysicsPipelineConfig = {
  fixedDt: FIXED_DT,
  maxDeltaSeconds: 1 / 30,
  maxSubsteps: 4,
  colliders: collidersFromPlotBounds(
    { x: 0, y: 0, width: WIDTH, height: HEIGHT },
    { idPrefix: "worker-bench", wallThickness: 24 }
  ),
  kernel: {
    seed: SCENARIO_SEED,
    gravity: { x: 0, y: 420 },
    cellSize: 32,
    collisionIterations: 3,
    sleepAfter: 999,
    velocityDamping: 0.998
  }
}

const spawnCache = new Map<number, PhysicsQueuedSpawn[]>()

function spawnsFor(bodyCount: number): PhysicsQueuedSpawn[] {
  const cached = spawnCache.get(bodyCount)
  if (cached) return cached

  const random = mulberry32(SCENARIO_SEED)
  const spawns: PhysicsQueuedSpawn[] = []
  for (let i = 0; i < bodyCount; i += 1) {
    spawns.push({
      id: `body-${i}`,
      x: 24 + random() * (WIDTH - 48),
      y: 24 + (i % 16) * BODY_RADIUS * 2,
      vx: -30 + random() * 60,
      vy: random() * 12,
      mass: 1,
      shape: { type: "circle", radius: BODY_RADIUS }
    })
  }

  spawnCache.set(bodyCount, spawns)
  return spawns
}

function runSyncFrames(bodyCount: number): number {
  const store = new PhysicsPipelineStore(CONFIG)
  store.enqueue(spawnsFor(bodyCount))
  let steps = 0
  for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
    steps += store.tick(FRAME_DT).steps
  }
  return steps + store.liveBodyCount()
}

function runWorkerRuntimeFrames(bodyCount: number): number {
  const runtime = createPhysicsWorkerRuntime()
  runtime.handle({
    type: "init",
    config: createPhysicsWorkerConfig(CONFIG),
    initialSpawns: spawnsFor(bodyCount)
  })
  let steps = 0
  let positions = 0
  for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
    const payload = runtime.handle({ type: "tick", deltaSeconds: FRAME_DT })
    if (payload.type !== "frame") throw new Error("expected worker frame")
    steps += payload.frame.result.steps
    positions += payload.frame.positions.length
  }
  return steps + positions
}

describe("PhysicsPipelineStore frame execution cost", () => {
  for (const bodyCount of BODY_COUNTS) {
    bench(
      `physics-sync-${bodyCount}-bodies-${FRAME_COUNT}-frames`,
      () => {
        runSyncFrames(bodyCount)
      },
      BENCH_OPTIONS
    )
  }
})

describe("Physics worker runtime frame execution cost", () => {
  for (const bodyCount of BODY_COUNTS) {
    bench(
      `physics-worker-runtime-${bodyCount}-bodies-${FRAME_COUNT}-frames`,
      () => {
        runWorkerRuntimeFrames(bodyCount)
      },
      BENCH_OPTIONS
    )
  }
})
