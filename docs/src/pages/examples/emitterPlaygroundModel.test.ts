import { describe, expect, it } from "vitest"
import {
  buildEventDropPhysics,
  createSyntheticEmitter,
  EventDropLedger,
  PhysicsPipelineStore,
} from "semiotic/physics"
import { reconcilePhysicsChart } from "../../../../src/components/charts/physics/physicsChartReconcile"
import {
  createEmitterPlayground,
  RUN_SECONDS,
  EMISSION_SECONDS,
  playgroundSources,
  type EmitterPattern,
  type PlaygroundEvent,
} from "./emitterPlaygroundModel"

function experiment(pattern: EmitterPattern = "regular") {
  const model = createEmitterPlayground(3)
  const emitter = createSyntheticEmitter(playgroundSources(pattern), 42, {
    durationMs: EMISSION_SECONDS * 1000,
    maxEvents: 120,
  })
  const data: PlaygroundEvent[] = []
  // Derive admission at actual board entry without reserved watermarks.
  const oracle = new EventDropLedger(5, { delay: 3 }, ["p1"])
  const seen = new Set<string>()
  const compile = () =>
    buildEventDropPhysics({
      data,
      size: [700, 350],
      timeAccessor: "time",
      arrivalAccessor: "arrivalTime",
      watermarkAtArrivalAccessor: "watermarkAtArrival",
      timeUnit: "s",
      timeExtent: [0, 25],
      windows: { size: 5 },
      watermark: { value: model.read().watermark },
      sources: [{ id: "p1", label: "Emitter" }],
      sourceRail: { side: "left", tileSize: 100 },
      arrival: { mode: "travel", history: "travel", durationMs: 1200 },
      ballRadius: 6,
      seed: 42,
    })
  let layout = compile()
  const store = new PhysicsPipelineStore(layout.config)
  const sync = (incoming: PlaygroundEvent[] = []) => {
    data.push(...incoming)
    const next = compile()
    store.restore(reconcilePhysicsChart(store.snapshot(), layout, next))
    layout = next
  }
  const tick = (active = true) => {
    store.tick(1 / 120)
    for (const body of store.readBodies()) {
      if (body.travel || seen.has(body.id)) continue
      seen.add(body.id)
      const row = body.datum as PlaygroundEvent
      const lateBefore = oracle.getLedger().reduce((sum, window) => sum + window.late, 0)
      oracle.append({ eventTime: row.time, source: row.source, arrivalTime: store.elapsed() })
      const lateAfter = oracle.getLedger().reduce((sum, window) => sum + window.late, 0)
      expect(
        (body.datum as { late: boolean }).late,
        JSON.stringify({
          row,
          enteredAt: store.elapsed(),
          watermark: oracle.getWatermark(),
        }),
      ).toBe(lateAfter > lateBefore)
    }
    const changed = model.observe(store.readBodies())
    model.advance(1 / 120)
    const incoming = emitter.advance(1000 / 120, { active: { p1: active } }).map(model.receive)
    if (changed || incoming.length) sync(incoming)
  }
  return { model, emitter, oracle, store, tick, sync }
}

describe("single emitter docs integration", () => {
  it("counts only board arrivals, closes windows, and conserves late events", () => {
    const { model, store, tick, sync } = experiment()
    for (let i = 0; i < 120; i++) tick()
    expect(model.read()).toMatchObject({ emitted: 2, accepted: 0, travelling: 2 })
    expect(store.readBodies().every((body) => body.travel)).toBe(true)
    for (let i = 0; i < 1200; i++) tick()
    expect(model.read().watermark).toBeGreaterThan(5)
    const old = model.sendOlder()!
    sync([old])
    expect(store.readBodies().find((body) => body.id === old.id)?.travel).toBeDefined()
    for (let i = 0; i < 300; i++) tick()
    expect(model.read().late).toBe(1)
    expect(model.read().rows[0].open).toBe(false)
    const state = model.read()
    expect(state.emitted).toBe(state.travelling + state.accepted + state.late)
    expect(
      (store.readBodies().find((body) => body.id === old.id)!.datum as { late: boolean }).late,
    ).toBe(true)
  })

  it("turns the source off without losing travelling events or accumulating a burst", () => {
    const { model, tick } = experiment()
    for (let i = 0; i < 120; i++) tick()
    for (let i = 0; i < 360; i++) tick(false)
    expect(model.read()).toMatchObject({ emitted: 2, travelling: 0, accepted: 2 })
    for (let i = 0; i < 60; i++) tick()
    expect(model.read().emitted).toBe(3)
  })

  it("finishes a bounded run and gives reduced-motion stepping the same ledger", () => {
    const animated = experiment()
    for (let i = 0; i < RUN_SECONDS * 120 + 2; i++) animated.tick()
    expect(animated.model.read()).toMatchObject({
      emitted: 48,
      accepted: 48,
      travelling: 0,
      complete: true,
    })
    const reduced = experiment()
    for (let i = 0; i < RUN_SECONDS; i++) {
      reduced.model.advance(1)
      reduced.sync(reduced.emitter.advance(1000).map(reduced.model.receive))
      reduced.store.settle()
      reduced.model.observe(reduced.store.readBodies())
    }
    expect(reduced.model.read().rows.map(({ closedAt: _closedAt, ...row }) => row)).toEqual(
      animated.model.read().rows.map(({ closedAt: _closedAt, ...row }) => row),
    )
    expect(reduced.emitter.advance(100000)).toEqual([])
  })

  it.each(["jittered", "bursty"] as const)(
    "reserves ordered admission across travel and conserves %s events",
    (pattern) => {
      const run = experiment(pattern)
      for (let i = 0; i < RUN_SECONDS * 120 + 2; i++) run.tick()
      const state = run.model.read()
      expect(state.emitted).toBeGreaterThan(30)
      expect(state.emitted).toBeLessThanOrEqual(120)
      expect(state.travelling).toBe(0)
      expect(state.accepted + state.late).toBe(state.emitted)
      expect(state.rows.map(({ start, accepted, late }) => ({ start, accepted, late }))).toEqual(
        run.oracle.getLedger().map(({ start, accepted, late }) => ({ start, accepted, late })),
      )
      const lateBodies = run.store
        .readBodies()
        .filter((body) => (body.datum as { late: boolean }).late)
      expect(lateBodies).toHaveLength(state.late)
      if (pattern === "jittered") {
        expect(state.late).toBeGreaterThan(0)
        expect(lateBodies.every((body) => body.x < 200)).toBe(true)
      }
      const reduced = experiment(pattern)
      for (let i = 0; i < RUN_SECONDS; i++) {
        reduced.model.advance(1)
        reduced.sync(reduced.emitter.advance(1000).map(reduced.model.receive))
        reduced.store.settle()
        reduced.model.observe(reduced.store.readBodies())
      }
      expect(reduced.model.read()).toMatchObject({
        emitted: state.emitted,
        accepted: state.accepted,
        late: state.late,
        travelling: 0,
      })
    },
  )
})
