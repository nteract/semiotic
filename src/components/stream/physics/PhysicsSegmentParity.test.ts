import { expect, it } from "vitest"
import {
  PhysicsPipelineStore,
  type PhysicsPipelineConfig,
  type PhysicsQueuedSpawn
} from "./PhysicsPipelineStore"
import { createPhysicsWorkerRuntime } from "./PhysicsWorkerRuntime"
import { createPhysicsWorkerConfig } from "./PhysicsWorkerProtocol"
import { renderPhysicsSettledSVG } from "./PhysicsSettledSVG"

const config: PhysicsPipelineConfig = {
  fixedDt: 1 / 60,
  kernel: { restitution: 0 },
  colliders: [
    {
      id: "floor",
      shape: { type: "segment", x1: 0, y1: 140, x2: 300, y2: 140 }
    }
  ]
}
const spawns: PhysicsQueuedSpawn[] = [
  {
    id: "circle",
    x: 70,
    y: 10,
    vy: 1600,
    shape: { type: "circle", radius: 2 },
    datum: { label: "Small circle" }
  },
  {
    id: "box",
    x: 150,
    y: 10,
    vy: 1600,
    shape: { type: "aabb", width: 20, height: 12 },
    datum: { label: "Wide box" }
  }
]

it("forwards a glancing endpoint contact through both sync and worker results", () => {
  const config: PhysicsPipelineConfig = {
    fixedDt: 1 / 120,
    kernel: {
      gravity: { x: 0, y: 0 },
      velocityDamping: 1,
      restitution: 0,
      friction: 0
    },
    colliders: [
      { id: "wall", shape: { type: "segment", x1: 0, y1: 0, x2: 10, y2: 0 } }
    ]
  }
  const spawns: PhysicsQueuedSpawn[] = [
    { id: "body", x: -4, y: -1, vx: 960, shape: { type: "circle", radius: 2 } }
  ]
  const store = new PhysicsPipelineStore(config)
  store.enqueue(spawns)
  store.tick(0)
  const runtime = createPhysicsWorkerRuntime()
  runtime.handle({
    type: "init",
    config: createPhysicsWorkerConfig(config),
    initialSpawns: spawns
  })
  const sync = store.tick(1 / 120)
  const response = runtime.handle({ type: "tick", deltaSeconds: 1 / 120 })
  if (response.type !== "frame") throw new Error("Expected worker frame")
  expect(sync.events).toEqual([
    { type: "contact", bodyId: "body", otherId: "wall", sensor: false }
  ])
  expect(response.frame.result.events).toEqual(sync.events)
})

it("matches sync and worker contacts, sleeping, and snapshot replay", () => {
  const store = new PhysicsPipelineStore(config)
  store.enqueue(spawns)
  store.tick(0)
  const runtime = createPhysicsWorkerRuntime()
  runtime.handle({
    type: "init",
    config: createPhysicsWorkerConfig(config),
    initialSpawns: spawns
  })
  for (let i = 0; i < 120; i++) {
    const result = store.tick(1 / 60)
    const response = runtime.handle({ type: "tick", deltaSeconds: 1 / 60 })
    expect(response.type).toBe("frame")
    if (response.type !== "frame") throw new Error("Expected worker frame")
    expect(response.frame.result.events).toEqual(result.events)
    expect(Array.from(response.frame.positions)).toEqual(
      Array.from(
        Float32Array.from(store.readBodies().flatMap(({ x, y }) => [x, y]))
      )
    )
    if (i === 6) {
      const checkpoint = runtime.handle({ type: "snapshot" })
      if (checkpoint.type !== "snapshot")
        throw new Error("Expected worker snapshot")
      runtime.handle({ type: "restore", snapshot: checkpoint.snapshot })
      store.restore(store.snapshot())
    }
  }
  const bodies = store.readBodies()
  expect(bodies.map(({ sleeping }) => sleeping)).toEqual([true, true])
  expect(bodies[0].y).toBeCloseTo(138.005, 6)
  expect(bodies[1].y).toBeCloseTo(134.005, 6)
  const snapshot = runtime.handle({ type: "snapshot" })
  if (snapshot.type !== "snapshot") throw new Error("Expected worker snapshot")
  expect(snapshot.snapshot.world).toEqual(store.snapshot().world)
})

it("exports the actual floor contacts as SVG with a balanced settled evidence ledger", () => {
  const store = new PhysicsPipelineStore(config)
  store.enqueue(spawns)
  const result = renderPhysicsSettledSVG(store, {
    width: 300,
    height: 180,
    charge: 2
  })
  expect(result.evidence).toMatchObject({
    bodyCount: 2,
    sleepingCount: 2,
    settled: true,
    ledger: { charge: 2, live: 2, queued: 0, balanced: true }
  })
  const svg = new DOMParser().parseFromString(result.svg, "image/svg+xml")
  const circle = svg.querySelector("circle")!
  const box = svg.querySelector('rect[width="20"]')!
  expect(
    Number(circle.getAttribute("cy")) + Number(circle.getAttribute("r"))
  ).toBeCloseTo(140.005, 6)
  expect(
    Number(box.getAttribute("y")) + Number(box.getAttribute("height"))
  ).toBeCloseTo(140.005, 6)
  expect(result.svg).not.toMatch(/NaN|Infinity/)
})
