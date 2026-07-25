/**
 * Reduced-motion / snapshot settle contract.
 *
 * Every physics chart's promise is "the settled projection is the chart; motion
 * is explanatory context". That promise is only kept if the path with no motion
 * still reaches the end state. Two things used to break it: a settle admitted
 * only the spawns already due at t=0, and it never advanced `elapsedSeconds`,
 * so paced arrivals stayed queued forever and elapsed-time event tapes froze.
 */
import { describe, expect, it } from "vitest"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import { buildGaltonBoardPhysics } from "../../charts/physics/galtonBoardPhysics"
import { buildPhysicsPile } from "../../charts/physics/physicsPilePhysics"

function galtonRows(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `row-${index}`,
    value: index % 21
  }))
}

function pacedStore(count: number) {
  const layout = buildGaltonBoardPhysics({
    data: galtonRows(count),
    valueAccessor: "value",
    bins: 21,
    ballRadius: 6,
    seed: 1,
    size: [700, 420]
  })
  const store = new PhysicsPipelineStore(layout.config)
  store.enqueue(layout.initialSpawns, layout.initialSpawnPacing)
  return { store, layout }
}

describe("reduced-motion settle admits paced arrivals", () => {
  it("settleWithObservations drains a paced queue instead of stopping at t=0", () => {
    const { store, layout } = pacedStore(60)
    // Sanity: the layout really does stagger arrivals, otherwise this test
    // would pass for the wrong reason.
    expect(layout.initialSpawnPacing).toBeTruthy()
    expect(store.queueSize()).toBe(60)

    const result = store.settleWithObservations()

    expect(store.queueSize()).toBe(0)
    expect(result.spawned).toHaveLength(60)
    expect(store.readBodies()).toHaveLength(60)
  })

  it("the settled body count matches the projection the overlay draws", () => {
    const { store, layout } = pacedStore(48)
    store.settleWithObservations()

    const projected = layout.projectionRows.reduce((sum, row) => sum + row.value, 0)
    expect(store.readBodies()).toHaveLength(projected)
  })

  it("advances elapsedSeconds so elapsed-time event tapes can fire", () => {
    const { store } = pacedStore(60)
    const result = store.settleWithObservations()

    // Gauntlet/ChainReaction read `result.elapsedSeconds` to decide which
    // authored gate events are due. At 0 no event past t=0 ever applies.
    expect(result.elapsedSeconds).toBeGreaterThan(0)
    expect(store.elapsed()).toBe(result.elapsedSeconds)
  })

  it("reports settled only once the queue is actually empty", () => {
    const { store } = pacedStore(60)
    store.settleWithObservations()

    const snapshot = store.snapshot()
    expect(snapshot.queue).toHaveLength(0)
    expect(store.hasPendingWork()).toBe(false)
  })

  it("plain settle() drains the queue too", () => {
    const { store } = pacedStore(40)
    store.settle()

    expect(store.queueSize()).toBe(0)
    expect(store.readBodies()).toHaveLength(40)
  })

  it("holds for UnitPileChart pacing as well", () => {
    const layout = buildPhysicsPile({
      data: [
        { category: "North", value: 9 },
        { category: "South", value: 7 },
        { category: "West", value: 5 }
      ],
      categoryAccessor: "category",
      valueAccessor: "value",
      unitValue: 1,
      ballRadius: 8,
      seed: 3,
      size: [700, 380]
    })
    const store = new PhysicsPipelineStore(layout.config)
    store.enqueue(layout.initialSpawns, layout.initialSpawnPacing)
    const queued = store.queueSize()
    expect(queued).toBe(21)

    store.settleWithObservations()

    expect(store.queueSize()).toBe(0)
    expect(store.readBodies()).toHaveLength(queued)
  })

  it("respects a paused store (settle stays a no-op)", () => {
    const { store } = pacedStore(20)
    store.setPaused(true)
    const result = store.settleWithObservations()

    expect(result.steps).toBe(0)
    expect(result.spawned).toHaveLength(0)
    expect(store.elapsed()).toBe(0)
  })

  it("still honors bodyLimit while draining", () => {
    const layout = buildGaltonBoardPhysics({
      data: galtonRows(40),
      valueAccessor: "value",
      bins: 21,
      ballRadius: 6,
      seed: 1,
      size: [700, 420]
    })
    const store = new PhysicsPipelineStore({ ...layout.config, bodyLimit: 12 })
    store.enqueue(layout.initialSpawns, layout.initialSpawnPacing)
    store.settleWithObservations()

    expect(store.queueSize()).toBe(0)
    expect(store.readBodies().length).toBeLessThanOrEqual(12)
  })
})
