import { createRequire } from "node:module"
import { bench, describe, type BenchOptions } from "vitest"
import {
  PhysicsKernelWorld,
  type PhysicsColliderSpec
} from "../../src/components/stream/physics/PhysicsKernel"
import { mulberry32 } from "../../src/components/recipes/random"

// Optional engine benches are registered as skipped unless the package is
// installed locally. This keeps M0 comparison coverage out of the public bundle.
const loadOptional = createRequire(import.meta.url)
// Keep the default matrix suitable for `bench:compare`; opt into stress
// scale locally with SEMIOTIC_PHYSICS_STRESS_BENCH=1.
const DEFAULT_BODY_COUNTS = [250, 1000] as const
const STRESS_BODY_COUNTS = [5000, 20000] as const
const STRESS_BENCH = process.env.SEMIOTIC_PHYSICS_STRESS_BENCH === "1"
const BODY_COUNTS =
  STRESS_BENCH
    ? [...DEFAULT_BODY_COUNTS, ...STRESS_BODY_COUNTS]
    : [...DEFAULT_BODY_COUNTS]
const SCENARIO_SEED = 20260706
const FIXED_DT = 1 / 120
const STEP_COUNT = 120
const SETTLE_STEP_LIMIT = STRESS_BENCH ? 1200 : 300
const BODY_RADIUS = 3
const KERNEL_SLEEP_SPEED = 8
const MATTER_SLEEP_SPEED = 0.08
const WIDTH = 500
const HEIGHT = 540
const SIM_BENCH_OPTIONS: BenchOptions = {
  iterations: 1,
  time: 1,
  warmupIterations: 0,
  warmupTime: 0
}
const PAINT_BENCH_OPTIONS: BenchOptions = {
  iterations: 5,
  time: 50,
  warmupIterations: 1,
  warmupTime: 0
}

interface ScenarioBody {
  id: string
  x: number
  y: number
  vx: number
  vy: number
}

interface OptionalModule {
  default?: unknown
  [key: string]: unknown
}

interface MatterBody {
  speed?: number
  velocity?: { x: number; y: number }
}

interface MatterEngine {
  gravity: { x: number; y: number; scale: number }
  world: unknown
}

interface MatterApi {
  Body: {
    setVelocity: (body: MatterBody, velocity: { x: number; y: number }) => void
  }
  Bodies: {
    circle: (
      x: number,
      y: number,
      radius: number,
      options?: Record<string, unknown>
    ) => MatterBody
    rectangle: (
      x: number,
      y: number,
      width: number,
      height: number,
      options?: Record<string, unknown>
    ) => MatterBody
  }
  Composite: {
    add: (composite: unknown, body: MatterBody | MatterBody[]) => void
  }
  Engine: {
    create: () => MatterEngine
    update: (engine: MatterEngine, deltaMs: number) => void
  }
}

interface RapierVector {
  x: number
  y: number
}

interface RapierRigidBody {
  linvel: () => RapierVector
}

interface RapierRigidBodyDesc {
  setLinvel: (x: number, y: number) => RapierRigidBodyDesc
  setTranslation: (x: number, y: number) => RapierRigidBodyDesc
}

interface RapierColliderDesc {
  setFriction: (friction: number) => RapierColliderDesc
  setRestitution: (restitution: number) => RapierColliderDesc
  setSensor: (sensor: boolean) => RapierColliderDesc
}

interface RapierWorld {
  integrationParameters?: { dt: number }
  createCollider: (desc: RapierColliderDesc, body?: RapierRigidBody) => unknown
  createRigidBody: (desc: RapierRigidBodyDesc) => RapierRigidBody
  free?: () => void
  step: () => void
}

interface RapierApi {
  ColliderDesc: {
    ball: (radius: number) => RapierColliderDesc
    cuboid: (halfWidth: number, halfHeight: number) => RapierColliderDesc
  }
  RigidBodyDesc: {
    dynamic: () => RapierRigidBodyDesc
    fixed: () => RapierRigidBodyDesc
  }
  World: new (gravity: RapierVector) => RapierWorld
  init?: () => Promise<void> | void
}

const COLLIDERS = [
  { id: "floor", x: 250, y: 520, width: 560, height: 24 },
  { id: "left", x: -12, y: 260, width: 24, height: 560 },
  { id: "right", x: 512, y: 260, width: 24, height: 560 },
  {
    id: "middle-sensor",
    x: 250,
    y: 260,
    width: 140,
    height: 80,
    sensor: true
  }
] as const

const KERNEL_COLLIDERS: PhysicsColliderSpec[] = COLLIDERS.map((collider) => ({
  id: collider.id,
  sensor: collider.sensor,
  shape: {
    type: "aabb",
    x: collider.x,
    y: collider.y,
    width: collider.width,
    height: collider.height
  }
}))

const scenarioCache = new Map<number, ScenarioBody[]>()
const paintPointCache = new Map<number, ScenarioBody[]>()
const hasMatter = canResolveOptionalModule("matter-js")
const hasRapier = canResolveOptionalModule("@dimforge/rapier2d-compat")
const hasPaintCanvas = canPaintOffscreenCanvas()
let matterPromise: Promise<MatterApi> | null = null
let rapierPromise: Promise<RapierApi> | null = null

function canResolveOptionalModule(name: string): boolean {
  try {
    loadOptional.resolve(name)
    return true
  } catch {
    return false
  }
}

function canPaintOffscreenCanvas(): boolean {
  if (typeof OffscreenCanvas === "undefined") return false
  try {
    const canvas = new OffscreenCanvas(1, 1)
    return Boolean(canvas.getContext("2d"))
  } catch {
    return false
  }
}

function unwrapOptionalModule<T>(module: OptionalModule): T {
  return (module.default ?? module) as T
}

async function importOptionalModule<T>(name: string): Promise<T> {
  const module = (await import(/* @vite-ignore */ name)) as OptionalModule
  return unwrapOptionalModule<T>(module)
}

function matterApi(): Promise<MatterApi> {
  matterPromise ??= importOptionalModule<MatterApi>("matter-js")
  return matterPromise
}

function rapierApi(): Promise<RapierApi> {
  rapierPromise ??= importOptionalModule<RapierApi>(
    "@dimforge/rapier2d-compat"
  ).then(async (rapier) => {
    await rapier.init?.()
    return rapier
  })
  return rapierPromise
}

function bodySpecsFor(bodyCount: number): ScenarioBody[] {
  const cached = scenarioCache.get(bodyCount)
  if (cached) return cached

  const random = mulberry32(SCENARIO_SEED)
  const bodies: ScenarioBody[] = []
  for (let i = 0; i < bodyCount; i += 1) {
    bodies.push({
      id: `body-${i}`,
      x: 24 + random() * 452,
      y: -bodyCount * 0.15 + i * 0.35,
      vx: -30 + random() * 60,
      vy: random() * 20
    })
  }

  scenarioCache.set(bodyCount, bodies)
  return bodies
}

function paintPointsFor(bodyCount: number): ScenarioBody[] {
  const cached = paintPointCache.get(bodyCount)
  if (cached) return cached

  const bodies = bodySpecsFor(bodyCount).map((body, index) => ({
    ...body,
    y: 28 + ((index * 7) % (HEIGHT - 56))
  }))
  paintPointCache.set(bodyCount, bodies)
  return bodies
}

function makeKernelWorld(bodyCount: number): PhysicsKernelWorld {
  const world = new PhysicsKernelWorld({
    seed: SCENARIO_SEED,
    gravity: { x: 0, y: 500 },
    fixedDt: FIXED_DT,
    velocityDamping: 0.998,
    cellSize: 32
  })
  world.setColliders(KERNEL_COLLIDERS)

  for (const body of bodySpecsFor(bodyCount)) {
    world.spawn({
      id: body.id,
      x: body.x,
      y: body.y,
      vx: body.vx,
      vy: body.vy,
      shape: { type: "circle", radius: BODY_RADIUS },
      mass: 1
    })
  }
  return world
}

function makeMatterWorld(
  matter: MatterApi,
  bodyCount: number
): { bodies: MatterBody[]; engine: MatterEngine } {
  const engine = matter.Engine.create()
  engine.gravity.x = 0
  engine.gravity.y = 1
  engine.gravity.scale = 0.001

  const staticBodies = COLLIDERS.map((collider) =>
    matter.Bodies.rectangle(
      collider.x,
      collider.y,
      collider.width,
      collider.height,
      {
        isSensor: collider.sensor,
        isStatic: true
      }
    )
  )
  const bodies = bodySpecsFor(bodyCount).map((body) => {
    const matterBody = matter.Bodies.circle(body.x, body.y, BODY_RADIUS, {
      friction: 0.04,
      restitution: 0.1
    })
    matter.Body.setVelocity(matterBody, { x: body.vx, y: body.vy })
    return matterBody
  })

  matter.Composite.add(engine.world, [...staticBodies, ...bodies])
  return { bodies, engine }
}

function makeRapierWorld(
  rapier: RapierApi,
  bodyCount: number
): { bodies: RapierRigidBody[]; world: RapierWorld } {
  const world = new rapier.World({ x: 0, y: 500 })
  if (world.integrationParameters) world.integrationParameters.dt = FIXED_DT

  for (const collider of COLLIDERS) {
    const fixedBody = world.createRigidBody(
      rapier.RigidBodyDesc.fixed().setTranslation(collider.x, collider.y)
    )
    const colliderDesc = rapier.ColliderDesc.cuboid(
      collider.width / 2,
      collider.height / 2
    )
      .setFriction(0.04)
      .setRestitution(0.1)
      .setSensor(Boolean(collider.sensor))
    world.createCollider(colliderDesc, fixedBody)
  }

  const bodies = bodySpecsFor(bodyCount).map((body) => {
    const rigidBody = world.createRigidBody(
      rapier.RigidBodyDesc.dynamic()
        .setTranslation(body.x, body.y)
        .setLinvel(body.vx, body.vy)
    )
    world.createCollider(
      rapier.ColliderDesc.ball(BODY_RADIUS)
        .setFriction(0.04)
        .setRestitution(0.1),
      rigidBody
    )
    return rigidBody
  })

  return { bodies, world }
}

function matterAllSettled(bodies: MatterBody[]): boolean {
  for (const body of bodies) {
    const velocity = body.velocity ?? { x: 0, y: 0 }
    const speed = body.speed ?? Math.hypot(velocity.x, velocity.y)
    if (speed > MATTER_SLEEP_SPEED) return false
  }
  return true
}

function rapierAllSettled(bodies: RapierRigidBody[]): boolean {
  for (const body of bodies) {
    const velocity = body.linvel()
    if (Math.hypot(velocity.x, velocity.y) > KERNEL_SLEEP_SPEED) return false
  }
  return true
}

function paintCircles(bodyCount: number): void {
  const canvas = new OffscreenCanvas(WIDTH, HEIGHT)
  const context = canvas.getContext("2d")
  if (!context) throw new Error("OffscreenCanvas 2D context is unavailable")

  context.clearRect(0, 0, WIDTH, HEIGHT)
  context.fillStyle = "#2f80ed"
  context.strokeStyle = "#0b2d4f"
  context.lineWidth = 1

  for (const body of paintPointsFor(bodyCount)) {
    context.beginPath()
    context.arc(body.x, body.y, BODY_RADIUS, 0, Math.PI * 2)
    context.fill()
    context.stroke()
  }
}

describe("PhysicsKernelWorld step cost", () => {
  for (const bodyCount of BODY_COUNTS) {
    bench(
      `kernel-${bodyCount}-bodies-${STEP_COUNT}-steps`,
      () => {
        const world = makeKernelWorld(bodyCount)
        for (let i = 0; i < STEP_COUNT; i += 1) world.step()
      },
      SIM_BENCH_OPTIONS
    )
  }
})

describe("PhysicsKernelWorld settle cost", () => {
  for (const bodyCount of BODY_COUNTS) {
    bench(
      `kernel-${bodyCount}-bodies-settle-${SETTLE_STEP_LIMIT}-step-limit`,
      () => {
        const world = makeKernelWorld(bodyCount)
        world.settle(SETTLE_STEP_LIMIT)
      },
      SIM_BENCH_OPTIONS
    )
  }
})

describe("matter-js optional step cost", () => {
  const runBench = hasMatter ? bench : bench.skip

  for (const bodyCount of BODY_COUNTS) {
    runBench(
      `matter-${bodyCount}-bodies-${STEP_COUNT}-steps`,
      async () => {
        const matter = await matterApi()
        const { engine } = makeMatterWorld(matter, bodyCount)
        for (let i = 0; i < STEP_COUNT; i += 1) {
          matter.Engine.update(engine, FIXED_DT * 1000)
        }
      },
      SIM_BENCH_OPTIONS
    )
  }
})

describe("matter-js optional settle cost", () => {
  const runBench = hasMatter ? bench : bench.skip

  for (const bodyCount of BODY_COUNTS) {
    runBench(
      `matter-${bodyCount}-bodies-settle-${SETTLE_STEP_LIMIT}-step-limit`,
      async () => {
        const matter = await matterApi()
        const { bodies, engine } = makeMatterWorld(matter, bodyCount)
        let steps = 0
        while (steps < SETTLE_STEP_LIMIT && !matterAllSettled(bodies)) {
          matter.Engine.update(engine, FIXED_DT * 1000)
          steps += 1
        }
      },
      SIM_BENCH_OPTIONS
    )
  }
})

describe("@dimforge/rapier2d-compat optional step cost", () => {
  const runBench = hasRapier ? bench : bench.skip

  for (const bodyCount of BODY_COUNTS) {
    runBench(
      `rapier-${bodyCount}-bodies-${STEP_COUNT}-steps`,
      async () => {
        const rapier = await rapierApi()
        const { world } = makeRapierWorld(rapier, bodyCount)
        try {
          for (let i = 0; i < STEP_COUNT; i += 1) world.step()
        } finally {
          world.free?.()
        }
      },
      SIM_BENCH_OPTIONS
    )
  }
})

describe("@dimforge/rapier2d-compat optional settle cost", () => {
  const runBench = hasRapier ? bench : bench.skip

  for (const bodyCount of BODY_COUNTS) {
    runBench(
      `rapier-${bodyCount}-bodies-settle-${SETTLE_STEP_LIMIT}-step-limit`,
      async () => {
        const rapier = await rapierApi()
        const { bodies, world } = makeRapierWorld(rapier, bodyCount)
        try {
          let steps = 0
          while (steps < SETTLE_STEP_LIMIT && !rapierAllSettled(bodies)) {
            world.step()
            steps += 1
          }
        } finally {
          world.free?.()
        }
      },
      SIM_BENCH_OPTIONS
    )
  }
})

describe("Canvas 2D paint cost", () => {
  const runBench = hasPaintCanvas ? bench : bench.skip

  for (const bodyCount of BODY_COUNTS) {
    runBench(
      `canvas-paint-${bodyCount}-circles`,
      () => {
        paintCircles(bodyCount)
      },
      PAINT_BENCH_OPTIONS
    )
  }
})
