import { describe, expect, it } from "vitest"
import { buildEventDropPhysics, PhysicsPipelineStore } from "semiotic/physics"
import { reconcilePhysicsChart } from "../../../../src/components/charts/physics/physicsChartReconcile"
import {
  createEmitterPlayground,
  RUN_SECONDS,
  type PlaygroundEvent,
} from "./emitterPlaygroundModel"

function experiment() {
  const model = createEmitterPlayground(2, 3)
  const data: PlaygroundEvent[] = []
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
      arrival: { mode: "travel", durationMs: 1200 },
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
    const changed = model.observe(store.readBodies())
    const incoming = model.advance(1 / 120, active)
    if (changed || incoming.length) sync(incoming)
  }
  return { model, store, tick, sync }
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
      reduced.sync(reduced.model.advance(1, true))
      reduced.store.settle()
      reduced.model.observe(reduced.store.readBodies())
    }
    expect(reduced.model.read().rows.map(({ closedAt: _closedAt, ...row }) => row)).toEqual(
      animated.model.read().rows.map(({ closedAt: _closedAt, ...row }) => row),
    )
    expect(reduced.model.advance(100, true)).toEqual([])
  })
})
