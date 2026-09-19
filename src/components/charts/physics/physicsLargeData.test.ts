import { describe, expect, it } from "vitest"
import { buildCollisionSwarmPhysics } from "./collisionSwarmPhysics"
import { buildEventDropPhysics } from "./eventDropPhysics"
import { buildGaltonBoardPhysics } from "./galtonBoardPhysics"
import { projectionRowsToSemanticItems } from "./physicsChartShared"
import { sedimentHeightfield } from "../../stream/physics/PhysicsSediment"

// Exceeds V8's function argument limit without running a large simulation.
const count = 150_000
const size: [number, number] = [360, 200]

describe("physics large-data ranges", () => {
  it("retains all Galton observations and derives the full value extent", () => {
    const layout = buildGaltonBoardPhysics({
      data: Array.from({ length: count }, (_, value) => ({ value })),
      valueAccessor: "value",
      bins: 2,
      ballRadius: 4,
      seed: 1,
      size
    })

    expect(layout.initialSpawns).toHaveLength(count)
    expect(layout.metadata).toMatchObject({ valueExtent: [0, count - 1] })
    expect(layout.projectionRows.map((row) => row.value)).toEqual([
      count / 2,
      count / 2
    ])
  })

  it("retains EventDrop arrivals and computes projection totals", () => {
    const layout = buildEventDropPhysics({
      data: Array.from({ length: count }, (_, index) => ({
        time: index % 2,
        arrivalTime: count - index
      })),
      timeAccessor: "time",
      arrivalAccessor: "arrivalTime",
      windows: { size: 10 },
      watermark: { delay: 1000 },
      ballRadius: 4,
      seed: 1,
      size
    })

    expect(layout.initialSpawns).toHaveLength(count)
    expect(layout.initialSpawns[0].spawnAt).toBe(count)
    expect(layout.initialSpawns[count - 1].spawnAt).toBe(1)
    expect(layout.projectionRows.reduce((sum, row) => sum + row.value, 0)).toBe(
      count
    )
  })

  it("preserves swarm extent, radius, and counts when dense packing falls back", () => {
    const layout = buildCollisionSwarmPhysics({
      data: Array.from({ length: count }, (_, index) => ({ value: index % 2 })),
      xAccessor: "value",
      pointRadius: 4,
      seed: 1,
      size
    })

    expect(layout.initialSpawns).toHaveLength(count)
    expect(layout.initialSpawns[count - 1].shape).toEqual({
      type: "circle",
      radius: 4
    })
    expect(layout.metadata).toMatchObject({
      xExtent: [0, 1],
      groups: [{ count, overlapping: true }]
    })
  })

  it("scales semantic projection geometry across large row collections", () => {
    const items = projectionRowsToSemanticItems(
      Array.from({ length: count }, (_, index) => ({
        id: String(index),
        label: String(index),
        value: index === count - 1 ? 2 : 1
      })),
      size,
      "events"
    )

    expect(items).toHaveLength(count)
    expect(items[count - 1].height).toBe(items[0].height! * 2)
  })

  it("scales large sediment heightfields by the selected value", () => {
    const stats = { count: 1, total: 0, mean: 0, min: 0, max: 0, variance: 0 }
    const columns = sedimentHeightfield(
      Array.from({ length: count }, (_, index) => ({
        id: String(index),
        label: String(index),
        count: 1,
        total: index === count - 1 ? 2 : 1,
        bodyIds: [],
        x: stats,
        y: stats,
        value: stats
      })),
      { value: "total", maxHeight: 80 }
    )

    expect(columns).toHaveLength(count)
    expect(columns[0].height).toBe(40)
    expect(columns[count - 1].height).toBe(80)
  })
})
