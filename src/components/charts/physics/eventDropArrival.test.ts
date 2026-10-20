import { describe, expect, it } from "vitest"
import {
  buildEventDropPhysics,
  readEventDropOccupancy
} from "./eventDropPhysics"
import type { EventDropProjectionMetadata } from "./eventDropPhysics"
import { PhysicsPipelineStore } from "../../stream/physics/PhysicsPipelineStore"
import { createPhysicsWorkerRuntime } from "../../stream/physics/PhysicsWorkerRuntime"
import {
  createPhysicsWorkerConfig,
  isPhysicsWorkerPacingSupported
} from "../../stream/physics/PhysicsWorkerProtocol"
import { mulberry32 } from "../../recipes/random"
import { reconcilePhysicsChart } from "./physicsChartReconcile"
import type { EventDropArrival } from "./eventDropArrival"

const options = {
  data: [
    { id: "newer", time: 25, arrivalTime: 10, source: "p1" },
    { id: "older", time: 5, arrivalTime: 10.5, source: "p2" }
  ],
  sources: [
    { id: "p1", label: "P1" },
    { id: "p2", label: "P2" }
  ],
  sourceRail: { side: "top" as const },
  timeAccessor: "time" as const,
  arrivalAccessor: "arrivalTime" as const,
  timeUnit: "s" as const,
  windows: { size: 10 },
  watermark: { delay: 100 },
  seed: 42,
  ballRadius: 5,
  size: [600, 400] as [number, number]
}
const travel: EventDropArrival = { mode: "travel", durationMs: 1000 }
const build = (arrival: EventDropArrival = travel) =>
  buildEventDropPhysics({ ...options, arrival })

function storeFor(layout: ReturnType<typeof build>) {
  const store = new PhysicsPipelineStore(layout.config)
  store.enqueue(layout.initialSpawns, layout.initialSpawnPacing)
  return store
}

describe("EventDrop arrival choreography", () => {
  it("can travel recorded history without changing its admission, including worker transport", () => {
    const recorded = {
      ...options,
      windows: { size: 5 },
      watermark: { value: 5 },
      watermarkAtArrivalAccessor: "recorded" as const,
      data: [
        { id: "accepted", time: 1, arrivalTime: 0, source: "p1", recorded: -1 },
        { id: "rejected", time: 11, arrivalTime: 0, source: "p2", recorded: 20 }
      ]
    }
    const present = buildEventDropPhysics({ ...recorded, arrival: travel })
    expect(present.initialSpawns.every((spawn) => !spawn.travel)).toBe(true)
    const moving = buildEventDropPhysics({
      ...recorded,
      arrival: { ...travel, history: "travel" }
    })
    expect(moving.projectionRows).toEqual(present.projectionRows)
    expect(moving.initialSpawns.every((spawn) => spawn.travel)).toBe(true)
    const sync = storeFor(moving)
    sync.tick(0)
    const worker = createPhysicsWorkerRuntime()
    worker.handle({ type: "init", snapshot: sync.snapshot() })
    for (let i = 0; i < 60; i++) {
      sync.tick(1 / 120)
      worker.handle({ type: "tick", deltaSeconds: 1 / 120 })
    }
    expect(sync.readBodies().every((body) => body.travel)).toBe(true)
    const result = worker.handle({ type: "snapshot" })
    expect(result.type).toBe("snapshot")
    if (result.type === "snapshot")
      expect(result.snapshot).toEqual(sync.snapshot())
    sync.settle()
    expect(sync.readBodies().every((body) => !body.travel)).toBe(true)
    expect(
      sync.readBodies().map((body) => (body.datum as { late: boolean }).late)
    ).toEqual([false, true])
    expect(() =>
      build({
        mode: "travel",
        history: "unknown" as "present"
      })
    ).toThrow(/arrival.history/)
  })

  it("preserves admission and projection across 5000 seeded out-of-order arrivals", () => {
    const rng = mulberry32(151)
    const data = Array.from({ length: 5000 }, (_, i) => ({
      id: `event-${i}`,
      time: i / 10 - rng() * 12,
      arrivalTime: i / 10,
      source: i % 2 ? "p1" : "p2"
    }))
    const drop = buildEventDropPhysics({
      ...options,
      data,
      watermark: { delay: 3 }
    })
    const moving = buildEventDropPhysics({
      ...options,
      data,
      watermark: { delay: 3 },
      arrival: travel
    })
    expect(moving.projectionRows).toEqual(drop.projectionRows)
    expect(moving.metadata).toEqual(drop.metadata)
    expect(
      moving.initialSpawns.map((s) => (s.datum as { late: boolean }).late)
    ).toEqual(
      drop.initialSpawns.map((s) => (s.datum as { late: boolean }).late)
    )
    expect(isPhysicsWorkerPacingSupported(moving.initialSpawnPacing)).toBe(true)
    expect(isPhysicsWorkerPacingSupported(drop.initialSpawnPacing)).toBe(true)
  })

  it.each(["straight", "connector"] as const)(
    "schedules %s board entry, gates occupancy, and releases exactly on deadline",
    (path) => {
      const layout = build({ ...travel, path })
      const store = storeFor(layout)
      for (let i = 0; i < 90; i++) store.tick(1 / 120)
      expect(
        store
          .readBodies()
          .map((body) => (body.datum as { __phase: string }).__phase)
      ).toEqual(["travel", "travel"])
      expect(
        readEventDropOccupancy(
          layout.metadata as unknown as EventDropProjectionMetadata,
          store.readBodies()
        )
      ).toMatchObject({ accepted: [0, 0, 0, 0], late: 0, inFlight: 2 })
      for (let i = 0; i < 30; i++) store.tick(1 / 120)
      expect(
        store.readBodies().find((body) => body.id === "newer")?.datum
      ).toMatchObject({ __phase: "board" })
      expect(
        store.readBodies().find((body) => body.id === "older")?.datum
      ).toMatchObject({ __phase: "travel" })
      for (let i = 0; i < 60; i++) store.tick(1 / 120)
      expect(
        store.readBodies().find((body) => body.id === "older")?.datum
      ).toMatchObject({ __phase: "board" })
    }
  )

  it("uses chart time units and speed without changing relative entry deadlines", () => {
    const layout = buildEventDropPhysics({
      ...options,
      data: options.data.map((d) => ({
        ...d,
        time: d.time * 1000,
        arrivalTime: d.arrivalTime * 1000
      })),
      windows: { size: 10000 },
      watermark: { delay: 100000 },
      timeUnit: "ms",
      timeScale: 2,
      arrival: { mode: "travel", speedPxPerSec: 200 }
    })
    const queued = storeFor(layout).snapshot().queue
    const deadlines = new Map(
      queued.map((s) => [s.id, s.spawnAt + s.travel!.durationSeconds])
    )
    expect(deadlines.get("older")! - deadlines.get("newer")!).toBeCloseTo(
      0.25,
      12
    )
  })

  it("matches sync and worker snapshots exactly after 20 seconds", () => {
    const layout = build()
    const sync = storeFor(layout)
    sync.tick(0)
    const worker = createPhysicsWorkerRuntime()
    worker.handle({
      type: "init",
      config: createPhysicsWorkerConfig(layout.config),
      initialSpawns: layout.initialSpawns,
      initialSpawnPacing: layout.initialSpawnPacing
    })
    for (let i = 0; i < 2400; i++) {
      sync.tick(1 / 120)
      worker.handle({ type: "tick", deltaSeconds: 1 / 120 })
    }
    const result = worker.handle({ type: "snapshot" })
    expect(result.type).toBe("snapshot")
    if (result.type === "snapshot")
      expect(result.snapshot).toEqual(sync.snapshot())
  })

  it("settles into exactly the same scene as drop, adding settled phase metadata", () => {
    const drop = storeFor(build("drop"))
    const moving = storeFor(build())
    drop.settle()
    moving.settle()
    expect(
      moving.readBodies().map((body) => {
        const { __phase, ...datum } = body.datum as Record<string, unknown>
        expect(__phase).toBe("settled")
        return { ...body, datum }
      })
    ).toEqual(drop.readBodies())
    expect(moving.snapshot().queue).toEqual([])
  })

  it("retains travel progress on resize and never sends an admitted body back to its source", () => {
    const initial = build()
    const resized = buildEventDropPhysics({
      ...options,
      size: [720, 400],
      arrival: travel
    })
    const store = storeFor(initial)
    for (let i = 0; i < 60; i++) store.tick(1 / 120)
    store.restore(reconcilePhysicsChart(store.snapshot(), initial, resized))
    expect(store.readBodies()[0].travel?.elapsedSeconds).toBeCloseTo(0.5)
    store.settle()
    store.restore(reconcilePhysicsChart(store.snapshot(), resized, initial))
    expect(store.readBodies().every((body) => !body.travel)).toBe(true)
    expect(store.readBodies().map((body) => body.datum)).toEqual(
      options.data.map((datum) =>
        expect.objectContaining({ id: datum.id, __phase: "board" })
      )
    )
  })

  it("compiles custom paths once and rejects invalid endpoints", () => {
    const layout = build({
      mode: "travel",
      path: (from, to) => [from, { x: 200, y: 20 }, to]
    })
    expect(layout.initialSpawns[0].travel?.points).toHaveLength(3)
    expect(() =>
      build({
        mode: "travel",
        path: () => [
          { x: 0, y: 0 },
          { x: 1, y: 1 }
        ]
      })
    ).toThrow(/endpoints|start at/)
    expect(() => build({ mode: "travel", durationMs: 0 })).toThrow(RangeError)
    expect(() =>
      build({ mode: "travel", durationMs: 100, speedPxPerSec: 30 })
    ).toThrow(/Choose/)
  })

  it("uses one duration for unequal paths so tied arrivals keep their settled positions", () => {
    const data = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      time: 5,
      arrivalTime: 0,
      source: i % 2 ? "p1" : "p2"
    }))
    const dropped = buildEventDropPhysics({ ...options, data })
    const moving = buildEventDropPhysics({
      ...options,
      data,
      arrival: { mode: "travel", speedPxPerSec: 100 }
    })
    expect(
      new Set(
        moving.initialSpawns.map((spawn) => spawn.travel?.durationSeconds)
      ).size
    ).toBe(1)
    const settle = (layout: ReturnType<typeof build>) => {
      const store = storeFor(layout)
      store.settle()
      return store
        .readBodies()
        .map(({ id, x, y, sleeping }) => ({ id, x, y, sleeping }))
    }
    expect(settle(moving)).toEqual(settle(dropped))
  })

  it("keeps admitted body positions when closure converts travel spawns to historical drops", () => {
    const initial = build()
    const closed = buildEventDropPhysics({
      ...options,
      arrival: travel,
      watermark: { value: 11 },
      watermarkAtArrivalAccessor: () => -100
    })
    const store = storeFor(initial)
    store.settle()
    const before = store.readBodies().map(({ id, x, y }) => ({ id, x, y }))
    store.restore(reconcilePhysicsChart(store.snapshot(), initial, closed))
    expect(store.readBodies().map(({ id, x, y }) => ({ id, x, y }))).toEqual(
      before
    )
    expect(store.readBodies().every((body) => !body.travel)).toBe(true)
  })
})
