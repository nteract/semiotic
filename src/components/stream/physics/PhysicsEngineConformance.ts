import type {
  PhysicsEngineAdapterFactory,
  PhysicsEngineDeterminism
} from "./PhysicsEngineAdapter"
import type {
  PhysicsBodyState,
  PhysicsColliderSpec,
  PhysicsKernelEvent,
  PhysicsKernelOptions
} from "./PhysicsKernel"

export interface PhysicsEngineConformanceOptions {
  determinism?: PhysicsEngineDeterminism
  tolerance?: number
}

export interface PhysicsEngineConformanceBody {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  sleeping: boolean
}

export interface PhysicsEngineConformanceResult {
  deterministicReplay: PhysicsEngineConformanceBody[]
  sensorEvents: string[]
  sensorFinalX: number
  sleepWakeEvents: string[]
  snapshotReplay: PhysicsEngineConformanceBody[]
  springBodyX: number
}

function rounded(value: number, precision = 6): number {
  return Number(value.toFixed(precision))
}

function bodyTuple(body: PhysicsBodyState): PhysicsEngineConformanceBody {
  return {
    id: body.id,
    x: rounded(body.x),
    y: rounded(body.y),
    vx: rounded(body.vx),
    vy: rounded(body.vy),
    sleeping: body.sleeping
  }
}

function sortedBodies(
  bodies: PhysicsBodyState[]
): PhysicsEngineConformanceBody[] {
  return bodies
    .map(bodyTuple)
    .sort((a, b) => a.id.localeCompare(b.id))
}

function eventKey(event: PhysicsKernelEvent): string {
  if (event.type === "sensor-enter" || event.type === "sensor-exit") {
    return `${event.type}:${event.sensorId}:${event.bodyId}`
  }
  if (event.type === "contact") {
    return `${event.type}:${event.otherId}:${event.bodyId}`
  }
  return `${event.type}:${event.bodyId}`
}

function step(adapter: ReturnType<PhysicsEngineAdapterFactory>, count: number): void {
  for (let i = 0; i < count; i += 1) adapter.step()
}

function makeDeterminismScenario(
  factory: PhysicsEngineAdapterFactory
): PhysicsEngineConformanceBody[] {
  const adapter = factory({
    seed: 42,
    gravity: { x: 0, y: 400 },
    fixedDt: 1 / 120,
    velocityDamping: 0.998,
    restitution: 0.05,
    friction: 0.08
  })
  const colliders: PhysicsColliderSpec[] = [
    {
      id: "floor",
      shape: { type: "aabb", x: 150, y: 210, width: 320, height: 20 }
    },
    {
      id: "left-wall",
      shape: { type: "aabb", x: -10, y: 90, width: 20, height: 240 }
    },
    {
      id: "peg",
      shape: { type: "segment", x1: 70, y1: 120, x2: 130, y2: 150, thickness: 4 }
    }
  ]
  adapter.setColliders(colliders)
  for (let i = 0; i < 8; i += 1) {
    adapter.spawn({
      id: `ball-${i}`,
      x: 30 + adapter.nextRandom() * 160,
      y: 10 + i * 3,
      vx: -20 + adapter.nextRandom() * 40,
      vy: adapter.nextRandom() * 30,
      shape: { type: "circle", radius: 5 },
      mass: 1 + i * 0.1
    })
  }
  step(adapter, 240)
  const result = sortedBodies(adapter.readState())
  adapter.dispose()
  return result
}

function makeSensorScenario(
  factory: PhysicsEngineAdapterFactory
): { events: string[]; finalX: number } {
  const adapter = factory({
    gravity: { x: 0, y: 0 },
    fixedDt: 1 / 120,
    velocityDamping: 1,
    sleepAfter: 10
  })
  adapter.setColliders([
    {
      id: "window-a",
      sensor: true,
      shape: { type: "aabb", x: 50, y: 0, width: 20, height: 80 }
    }
  ])
  adapter.spawn({
    id: "event",
    x: 0,
    y: 0,
    vx: 240,
    vy: 0,
    shape: { type: "circle", radius: 4 }
  })

  const events: string[] = []
  for (let i = 0; i < 60; i += 1) {
    adapter.step()
    for (const event of adapter.events()) {
      if (event.type === "sensor-enter" || event.type === "sensor-exit") {
        events.push(eventKey(event))
      }
    }
  }
  const [body] = adapter.readState()
  adapter.dispose()
  return { events, finalX: rounded(body.x) }
}

function makeSleepWakeScenario(factory: PhysicsEngineAdapterFactory): string[] {
  const adapter = factory({
    seed: 42,
    gravity: { x: 0, y: 400 },
    fixedDt: 1 / 120,
    velocityDamping: 0.998,
    restitution: 0.05,
    friction: 0.08
  })
  adapter.setColliders([
    { id: "floor", shape: { type: "aabb", x: 0, y: 100, width: 200, height: 20 } }
  ])
  adapter.spawn({
    id: "ball",
    x: 0,
    y: 0,
    shape: { type: "circle", radius: 8 }
  })
  adapter.settle(2000)
  const sleepEvents = adapter.events().map(eventKey)
  adapter.applyImpulse("ball", 80, -200)
  const wakeEvents = adapter.events().map(eventKey)
  adapter.dispose()
  return [...sleepEvents, ...wakeEvents]
}

function makeSnapshotScenario(
  factory: PhysicsEngineAdapterFactory
): PhysicsEngineConformanceBody[] {
  const options: PhysicsKernelOptions = {
    seed: 42,
    gravity: { x: 0, y: 400 },
    fixedDt: 1 / 120,
    velocityDamping: 0.998,
    restitution: 0.05,
    friction: 0.08
  }
  const first = factory(options)
  first.setColliders([
    { id: "floor", shape: { type: "aabb", x: 0, y: 140, width: 200, height: 20 } }
  ])
  first.spawn({
    id: "ball",
    x: -20,
    y: 0,
    vx: 40,
    shape: { type: "circle", radius: 8 }
  })
  step(first, 80)

  const snapshot = first.snapshot()
  const restored = factory(options)
  restored.restore(snapshot)
  step(first, 100)
  step(restored, 100)

  const firstResult = sortedBodies(first.readState())
  const restoredResult = sortedBodies(restored.readState())
  first.dispose()
  restored.dispose()
  if (!bodiesNear(firstResult, restoredResult, 0)) {
    throw new Error("snapshot restore diverged within the same engine")
  }
  return restoredResult
}

function makeSpringScenario(factory: PhysicsEngineAdapterFactory): number {
  const adapter = factory({
    gravity: { x: 0, y: 0 },
    fixedDt: 1 / 120,
    velocityDamping: 0.999,
    sleepAfter: 10
  })
  adapter.spawn({
    id: "body",
    x: 0,
    y: 0,
    shape: { type: "circle", radius: 4 }
  })
  adapter.setConstraint({
    bodyId: "body",
    target: { type: "point", x: 100, y: 0 },
    restLength: 0,
    stiffness: 20,
    damping: 1
  })
  step(adapter, 40)
  const [body] = adapter.readState()
  adapter.dispose()
  return rounded(body.x)
}

export function runPhysicsEngineConformance(
  factory: PhysicsEngineAdapterFactory,
  _options: PhysicsEngineConformanceOptions = {}
): PhysicsEngineConformanceResult {
  const sensor = makeSensorScenario(factory)
  return {
    deterministicReplay: makeDeterminismScenario(factory),
    sensorEvents: sensor.events,
    sensorFinalX: sensor.finalX,
    sleepWakeEvents: makeSleepWakeScenario(factory),
    snapshotReplay: makeSnapshotScenario(factory),
    springBodyX: makeSpringScenario(factory)
  }
}

function numbersNear(a: number, b: number, tolerance: number): boolean {
  return Math.abs(a - b) <= tolerance
}

function bodiesNear(
  actual: PhysicsEngineConformanceBody[],
  expected: PhysicsEngineConformanceBody[],
  tolerance: number
): boolean {
  if (actual.length !== expected.length) return false
  for (let i = 0; i < actual.length; i += 1) {
    const a = actual[i]
    const b = expected[i]
    if (
      a.id !== b.id ||
      a.sleeping !== b.sleeping ||
      !numbersNear(a.x, b.x, tolerance) ||
      !numbersNear(a.y, b.y, tolerance) ||
      !numbersNear(a.vx, b.vx, tolerance) ||
      !numbersNear(a.vy, b.vy, tolerance)
    ) {
      return false
    }
  }
  return true
}

export function comparePhysicsEngineConformance(
  actual: PhysicsEngineConformanceResult,
  expected: PhysicsEngineConformanceResult,
  options: PhysicsEngineConformanceOptions = {}
): string[] {
  const tolerance =
    options.determinism === "strict" ? 0 : (options.tolerance ?? 1e-3)
  const failures: string[] = []

  if (!bodiesNear(actual.deterministicReplay, expected.deterministicReplay, tolerance)) {
    failures.push("deterministic replay body state diverged")
  }
  if (!bodiesNear(actual.snapshotReplay, expected.snapshotReplay, tolerance)) {
    failures.push("snapshot replay body state diverged")
  }
  if (actual.sensorEvents.join("|") !== expected.sensorEvents.join("|")) {
    failures.push("sensor event sequence diverged")
  }
  if (!numbersNear(actual.sensorFinalX, expected.sensorFinalX, tolerance)) {
    failures.push("sensor final position diverged")
  }
  if (actual.sleepWakeEvents.join("|") !== expected.sleepWakeEvents.join("|")) {
    failures.push("sleep/wake event sequence diverged")
  }
  if (!numbersNear(actual.springBodyX, expected.springBodyX, tolerance)) {
    failures.push("spring constraint position diverged")
  }

  return failures
}
