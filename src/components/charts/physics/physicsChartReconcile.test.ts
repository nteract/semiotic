import { describe, expect, it, vi } from "vitest"
import { PhysicsPipelineStore } from "../../stream/physics/PhysicsPipelineStore"
import { createPhysicsWorkerRuntime } from "../../stream/physics/PhysicsWorkerRuntime"
import { buildGaltonBoardPhysics } from "./galtonBoardPhysics"
import { reconcilePhysicsChart } from "./physicsChartReconcile"

const build = (
  data: Array<{ id: string; value: number; label?: string }>,
  size: [number, number] = [500, 300]
) =>
  buildGaltonBoardPhysics({
    data,
    valueAccessor: "value",
    valueExtent: [0, 10],
    bins: 5,
    ballRadius: 6,
    seed: 1,
    size
  })

describe("physics chart reconciliation", () => {
  it("keeps pending arrival deadlines and tie order when geometry changes", () => {
    const rows = [
      { id: "a", value: 1 },
      { id: "b", value: 3 },
      { id: "c", value: 6 },
      { id: "d", value: 9 }
    ]
    const first = build(rows)
    const store = new PhysicsPipelineStore(first.config)
    store.enqueue(
      first.initialSpawns.map((spawn, index) => ({
        ...spawn,
        spawnAt: [0, 1, 1, 2][index]
      }))
    )
    store.tick(0.1)
    const before = store.snapshot()
    const next = build(rows, [360, 300])
    const result = reconcilePhysicsChart(before, first, next, true)
    expect(result.world.bodies.map((body) => body.id)).toEqual(["a"])
    expect(result.queue).toEqual(
      before.queue.map((spawn) => ({
        ...next.initialSpawns.find((candidate) => candidate.id === spawn.id),
        spawnAt: spawn.spawnAt,
        sequence: spawn.sequence
      }))
    )
    expect(result.elapsedSeconds).toBe(before.elapsedSeconds)

    const worker = createPhysicsWorkerRuntime()
    worker.handle({ type: "init", snapshot: before })
    worker.handle({ type: "restore", snapshot: result })
    store.restore(result)
    store.settle()
    worker.handle({ type: "settle" })
    const response = worker.handle({ type: "snapshot" })
    if (response.type !== "snapshot") throw new Error("Missing snapshot")
    expect(store.readBodies().map((body) => body.id)).toEqual([
      "a",
      "b",
      "c",
      "d"
    ])
    expect(response.snapshot.world.bodies).toEqual(
      store.snapshot().world.bodies
    )
  })

  it("paces only new rows when existing bodies also need new placement", () => {
    const rows = [
      { id: "a", value: 1 },
      { id: "b", value: 3 }
    ]
    const first = build(rows)
    const store = new PhysicsPipelineStore(first.config)
    for (const spawn of first.initialSpawns) store.spawnNow(spawn)
    store.tick(0.1)
    const next = build(
      [...rows, { id: "c", value: 6 }, { id: "d", value: 9 }],
      [360, 300]
    )
    const result = reconcilePhysicsChart(store.snapshot(), first, next, true)
    expect(result.world.bodies.map((body) => body.id)).toEqual(["a", "b", "c"])
    expect(result.queue.map((spawn) => spawn.id)).toEqual(["d"])
    expect(result.queue[0].spawnAt).toBeCloseTo(result.elapsedSeconds + 1 / 55)
  })

  it("does not resurrect removed bodies when the chart resizes", () => {
    const rows = [
      { id: "a", value: 1 },
      { id: "b", value: 3 }
    ]
    const first = build(rows)
    const store = new PhysicsPipelineStore(first.config)
    for (const spawn of first.initialSpawns) store.spawnNow(spawn)
    store.remove(["a"])
    const next = build(rows, [360, 300])
    const result = reconcilePhysicsChart(store.snapshot(), first, next, true)
    expect(result.world.bodies.map((body) => body.id)).toEqual(["b"])
    expect(result.queue).toEqual([])
  })

  it("reports running when a settled body's replacement needs to fall again", () => {
    const rows = [{ id: "a", value: 1 }]
    const first = build(rows)
    const store = new PhysicsPipelineStore(first.config)
    store.enqueue(first.initialSpawns)
    store.settle()
    expect(store.snapshot().simulationState).toBe("settled")
    const next = build(rows, [360, 300])
    const result = reconcilePhysicsChart(store.snapshot(), first, next, true)
    expect(result.world.bodies[0].sleeping).toBe(false)
    expect(result.simulationState).toBe("running")
  })

  it("preserves motion, clock, and authored colliders when a placement stays the same", () => {
    const first = build([{ id: "a", value: 1, label: "before" }])
    const store = new PhysicsPipelineStore(first.config)
    store.spawnNow(first.initialSpawns[0])
    store.tick(0.1)
    store.setColliders([
      ...(first.config.colliders ?? []),
      {
        id: "extra",
        shape: { type: "aabb", x: 0, y: 0, width: 1, height: 1 },
        sensor: true
      }
    ])
    const before = store.snapshot()
    const next = build([
      { id: "a", value: 1, label: "after" },
      { id: "b", value: 8 }
    ])
    const reconciled = reconcilePhysicsChart(before, first, next)
    const { datum: _datum, ...motion } = before.world.bodies[0]
    expect(reconciled.world.bodies[0]).toMatchObject(motion)
    expect(reconciled.world.bodies[0].datum).toMatchObject({ label: "after" })
    expect(reconciled.elapsedSeconds).toBe(before.elapsedSeconds)
    expect(
      reconciled.world.colliders.some((collider) => collider.id === "extra")
    ).toBe(true)
    expect(reconciled.world.bodies.map((body) => body.id)).toEqual(["a", "b"])

    const worker = createPhysicsWorkerRuntime()
    worker.handle({ type: "init", snapshot: before })
    worker.handle({ type: "restore", snapshot: reconciled })
    store.restore(reconciled)
    store.tick(0.1)
    worker.handle({ type: "tick", deltaSeconds: 0.1 })
    const response = worker.handle({ type: "snapshot" })
    if (response.type !== "snapshot") throw new Error("Missing snapshot")
    expect(response.snapshot.world.bodies).toEqual(
      store.snapshot().world.bodies
    )
  })

  it("keeps body-only removals absent on unrelated pushes", () => {
    const first = build([{ id: "a", value: 1 }])
    const store = new PhysicsPipelineStore(first.config)
    store.spawnNow(first.initialSpawns[0])
    store.remove(["a"])
    const next = build([
      { id: "a", value: 1 },
      { id: "b", value: 8 }
    ])
    const result = reconcilePhysicsChart(store.snapshot(), first, next)
    expect(result.world.bodies.map((body) => body.id)).toEqual(["b"])
  })

  it("notifies observers when restore changes simulation state", () => {
    const changed = vi.fn()
    const store = new PhysicsPipelineStore({
      observation: { onSimulationStateChange: changed }
    })
    const before = store.snapshot()
    const first = build([])
    const next = build([{ id: "a", value: 1 }])
    const running = reconcilePhysicsChart(before, first, next)
    store.restore(running)
    expect(changed).toHaveBeenLastCalledWith("running", "settled")
    changed.mockClear()
    store.restore(store.snapshot())
    expect(changed).not.toHaveBeenCalled()
  })
})
