import { describe, expect, it } from "vitest"
import { PhysicsPipelineStore } from "../../stream/physics/PhysicsPipelineStore"
import { createPhysicsWorkerRuntime } from "../../stream/physics/PhysicsWorkerRuntime"
import { buildLiveEventDropLayout } from "./useEventDropLive"
import { EventDropLedger } from "./eventDropLedger"
import type { EventDropLiveConfig } from "./EventDropLiveRuntime"

const live: EventDropLiveConfig = {
  live: { follow: "now", horizon: 5, retain: 20 },
  windowSize: 2.5,
  size: [720, 400],
  ballRadius: 4,
  seed: 42,
  timeUnit: "s",
  watermark: { delay: 1 },
  sources: [{ id: "source", label: "Source" }],
  arrival: { mode: "travel", durationMs: 200 }
}
const layout = () =>
  buildLiveEventDropLayout(live, {
    emitters: {
      sources: [{ id: "source", ratePerSec: 10, jitter: "watermarks" }],
      seed: 42
    }
  })

describe("live EventDrop runtime", () => {
  it("advances finite manual batches even with no active sources or moving bodies", () => {
    const store = new PhysicsPipelineStore({ ...layout().config, emitters: false })
    const before = store.viewTransform().x
    const result = store.settleWithObservations(120)
    expect(result.steps).toBe(120)
    expect(store.elapsed()).toBeCloseTo(1)
    expect(store.viewTransform().x).toBeLessThan(before)
    expect(store.readBodies()).toEqual([])
    expect(store.eventDropState()!.metadata.arrivalFrontier).toBeCloseTo(1)
  })
  it("uses explicit origins and HOC speed without losing source gating", () => {
    const config = { ...live, originTime: 100, arrival: "drop" as const }
    const store = new PhysicsPipelineStore(
      buildLiveEventDropLayout(config, {
        timeScale: 2,
        emitters: { sources: [{ id: "source", ratePerSec: 10 }] },
        sources: [{ id: "source", label: "Source" }]
      }).config
    )
    for (let i = 0; i < 60; i++) store.tick(1 / 60)
    expect(store.elapsed()).toBeCloseTo(2)
    expect(
      store.eventDropState()!.metadata.ledger!.every((row) => row.start >= 100)
    ).toBe(true)
    expect(store.snapshot().emitters!.progress.emitted).toBe(20)
    store.updateConfig(
      buildLiveEventDropLayout(config, {
        timeScale: 2,
        emitters: { sources: [{ id: "source", ratePerSec: 10 }] },
        sources: [{ id: "source", label: "Source", active: false }]
      }).config
    )
    for (let i = 0; i < 60; i++) store.tick(1 / 60)
    expect(store.elapsed()).toBeCloseTo(4)
    expect(store.snapshot().emitters!.progress.emitted).toBe(20)
  })

  it("advances per-source idle policies without new admissions", () => {
    const store = new PhysicsPipelineStore(
      buildLiveEventDropLayout(
        {
          ...live,
          arrival: "drop",
          sources: [
            { id: "source", label: "Source" },
            { id: "idle", label: "Idle" }
          ],
          watermark: { perSource: true, idleTimeout: 1, delay: 0 }
        },
        {}
      ).config
    )
    store.enqueue({
      id: "event",
      x: 0,
      y: 0,
      shape: { type: "circle", radius: 4 },
      datum: { time: 5, source: "source" }
    })
    const observations = []
    for (let i = 0; i < 120; i++)
      observations.push(...store.tick(1 / 60).observations)
    expect(
      observations.some(
        (event) =>
          event.type === "physics-source-idle" && event.sourceId === "idle"
      )
    ).toBe(true)
    expect(store.runtimeState().simulationState).toBe("running")
  })
  it("retires bodies and geometry while preserving every admission", () => {
    const store = new PhysicsPipelineStore(layout().config)
    const oracle = new EventDropLedger(2.5, { delay: 1 })
    const seen = new Set<string>()
    let total = 0
    let maximum = 0
    for (let i = 0; i < 6000; i++) {
      store.tick(1 / 60)
      const bodies = store.readBodies()
      // Independent accounting from emitted source data, at its real handoff.
      for (const body of bodies) {
        const d = body.datum as {
          eventTime: number
          arrivalTime: number
          __phase: string
          id?: string
        }
        if (d.__phase === "travel" || seen.has(body.id)) continue
        seen.add(body.id)
        oracle.append({
          eventTime: d.eventTime,
          arrivalTime: d.arrivalTime,
          source: "source"
        })
        total++
      }
      maximum = Math.max(maximum, bodies.length)
      if (i % 600 === 0)
        expect(store.snapshot().world.colliders.length).toBeLessThan(40)
    }
    const history = store.eventDropState()!.metadata.ledger!
    expect(history).toEqual(oracle.getLedger())
    expect(history.reduce((sum, row) => sum + row.accepted + row.late, 0)).toBe(
      total
    )
    expect(total).toBeGreaterThan(990)
    expect(maximum).toBeLessThan(250)
    expect(store.snapshot().world.bodies.length).toBeLessThan(250)
    expect(history.length).toBeGreaterThan(35)
  }, 15_000)

  it("keeps settled world coordinates unchanged as its camera follows time", () => {
    const store = new PhysicsPipelineStore({
      ...layout().config,
      emitters: false,
      kernel: { gravity: { x: 0, y: 0 } }
    })
    store.enqueue({
      id: "a",
      x: 0,
      y: 0,
      shape: { type: "circle", radius: 4 },
      datum: { time: 5, source: "source" }
    })
    for (let i = 0; i < 30; i++) store.tick(1 / 60)
    const before = store.readBodies()[0]
    const camera = store.viewTransform().x
    for (let i = 0; i < 60; i++) store.tick(1 / 60)
    expect(store.readBodies()[0].x).toBe(before.x)
    expect(store.readBodies()[0].y).toBe(before.y)
    expect(store.viewTransform().x).toBeLessThan(camera)
  })

  it("replays a saved live world identically through sync and worker execution", () => {
    const store = new PhysicsPipelineStore(layout().config)
    for (let i = 0; i < 120; i++) store.tick(1 / 60)
    const saved = store.snapshot()
    const resumed = new PhysicsPipelineStore()
    resumed.restore(structuredClone(saved))
    const worker = createPhysicsWorkerRuntime()
    worker.handle({ type: "init", snapshot: structuredClone(saved) })
    for (let i = 0; i < 120; i++) {
      store.tick(1 / 60)
      resumed.tick(1 / 60)
      worker.handle({ type: "tick", deltaSeconds: 1 / 60 })
    }
    const response = worker.handle({ type: "snapshot" })
    if (response.type !== "snapshot") throw new Error("Expected snapshot")
    expect(resumed.snapshot()).toEqual(store.snapshot())
    expect(response.snapshot).toEqual(store.snapshot())
  })

  it("freezes the camera, watermark and emitter together when paused or hidden", () => {
    const store = new PhysicsPipelineStore(layout().config)
    store.tick(0.1)
    store.setPaused(true)
    const before = store.snapshot()
    for (let i = 0; i < 20; i++) store.tick(0.1)
    expect(store.snapshot()).toEqual(before)
    store.setPaused(false)
    store.setVisible(false)
    const hidden = store.snapshot()
    store.tick(1)
    expect(store.snapshot()).toEqual(hidden)
  })

  it("rejects corrupted live snapshots before changing the retained world", () => {
    const store = new PhysicsPipelineStore(layout().config)
    for (let i = 0; i < 60; i++) store.tick(1 / 60)
    const before = store.snapshot()
    for (const change of [
      (snapshot: typeof before) => {
        snapshot.eventDrop!.elapsed = NaN
      },
      (snapshot: typeof before) => {
        snapshot.eventDrop!.ledger.windows[0].accepted = -1
      },
      (snapshot: typeof before) => {
        snapshot.emitters!.progress.emitted = -1
      }
    ]) {
      const bad = structuredClone(before)
      change(bad)
      expect(() => store.restore(bad)).toThrow()
      expect(store.snapshot()).toEqual(before)
    }
  })

  it("invalidates the spatial index after live resize and keeps admissions unchanged", () => {
    const store = new PhysicsPipelineStore({
      ...layout().config,
      kernel: { gravity: { x: 0, y: 0 } }
    })
    for (let i = 0; i < 120; i++) store.tick(1 / 60)
    const before = store.readBodies().find((body) => !body.travel)!
    expect(store.hitTest(before.x, before.y)?.id).toBe(before.id)
    const ledger = store.eventDropState()!.metadata.ledger
    store.updateConfig({
      eventDrop: {
        ...live,
        size: [390, 400],
        sourceRail: { side: "top", tileSize: 70 }
      }
    })
    const after = store.readBodies().find((body) => body.id === before.id)!
    expect(after.x).not.toBe(before.x)
    expect(store.hitTest(after.x, after.y)?.id).toBe(after.id)
    expect(store.eventDropState()!.metadata.ledger).toEqual(ledger)
  })
})
