import { describe, expect, it } from "vitest"
import { PhysicsPipelineStore } from "../../stream/physics/PhysicsPipelineStore"
import {
  buildEventDropPhysics,
  placeEventDropSpawn,
  readEventDropOccupancy,
  type EventDropProjectionMetadata
} from "./eventDropPhysics"
import { reconcilePhysicsChart } from "./physicsChartReconcile"

const early = { id: "early", time: 6, arrivalTime: 7, admission: -11 }
const delayed = { id: "late", time: 6, arrivalTime: 62, admission: 44 }
function board(
  value: number,
  data = [early],
  size: [number, number] = [440, 300]
) {
  return buildEventDropPhysics({
    data,
    size,
    watermark: { value },
    windows: { size: 12 },
    timeAccessor: "time",
    arrivalAccessor: "arrivalTime",
    watermarkAtArrivalAccessor: "admission",
    ballRadius: 10,
    seed: 47,
    timeScale: 12
  })
}
const metadata = (layout: ReturnType<typeof board>) =>
  layout.metadata as unknown as EventDropProjectionMetadata

describe("EventDrop physical meaning", () => {
  it("admits, closes above retained history, and diverts the next arrival to the far-left bin", () => {
    const open = board(-11)
    const store = new PhysicsPipelineStore(open.config)
    store.enqueue(open.initialSpawns, open.initialSpawnPacing)
    expect(
      readEventDropOccupancy(metadata(open), store.readBodies())
    ).toMatchObject({ accepted: [0, 0], late: 0 })
    store.settle(600)
    const original = { ...store.readBodies()[0] }
    expect(readEventDropOccupancy(metadata(open), store.readBodies())).toEqual({
      accepted: [1, 0],
      late: 0,
      inFlight: 0,
      total: 1
    })

    const closed = board(13)
    store.restore(reconcilePhysicsChart(store.snapshot(), open, closed))
    expect(store.readBodies()[0]).toEqual(original)
    expect(
      closed.config.colliders!.every((collider) => !collider.bodyFilter)
    ).toBe(true)
    const lid = metadata(closed).lidSegments[0]
    expect(original.y).toBeGreaterThan(Math.max(lid.y1, lid.y2))

    const arrival = board(44, [early, delayed])
    store.restore(reconcilePhysicsChart(store.snapshot(), closed, arrival))
    expect(
      readEventDropOccupancy(metadata(arrival), store.readBodies())
    ).toEqual({ accepted: [1, 0], late: 0, inFlight: 1, total: 2 })
    store.settle(600)
    expect(
      readEventDropOccupancy(metadata(arrival), store.readBodies())
    ).toEqual({ accepted: [1, 0], late: 1, inFlight: 0, total: 2 })
    expect(
      store.readBodies().find((body) => body.id === "late")!.x
    ).toBeLessThan(metadata(arrival).windowPlot.x)
  })

  it("blocks a new body even if its datum claims it was accepted", () => {
    const layout = board(44)
    const store = new PhysicsPipelineStore(layout.config)
    store.enqueue([
      {
        ...layout.initialSpawns[0],
        spawnAt: undefined,
        y: metadata(layout).plot.y + 12
      }
    ])
    store.settle(600)
    expect(store.readBodies()[0].datum).toMatchObject({ late: false })
    expect(
      readEventDropOccupancy(metadata(layout), store.readBodies())
    ).toEqual({ accepted: [0, 0], late: 1, inFlight: 0, total: 1 })
  })

  it("rebuilds physical membership when a source correction changes admission", () => {
    const accepted = board(44)
    const rejected = board(44, [{ ...early, admission: 44 }])
    const store = new PhysicsPipelineStore(accepted.config)
    store.enqueue(accepted.initialSpawns, accepted.initialSpawnPacing)
    store.settle(600)
    store.restore(reconcilePhysicsChart(store.snapshot(), accepted, rejected))
    store.settle(600)
    expect(
      readEventDropOccupancy(metadata(rejected), store.readBodies())
    ).toEqual({
      accepted: [0, 0],
      late: 1,
      inFlight: 0,
      total: 1
    })
    store.restore(reconcilePhysicsChart(store.snapshot(), rejected, accepted))
    store.settle(600)
    expect(
      readEventDropOccupancy(metadata(accepted), store.readBodies())
    ).toEqual({
      accepted: [1, 0],
      late: 0,
      inFlight: 0,
      total: 1
    })
  })

  it("keeps recorded rejections in the far-left bin when current policy is rewound", () => {
    const layout = board(-11, [early, delayed])
    const store = new PhysicsPipelineStore(layout.config)
    store.enqueue(layout.initialSpawns, layout.initialSpawnPacing)
    store.settle(600)
    expect(metadata(layout).lidSegments).toEqual([])
    expect(
      readEventDropOccupancy(metadata(layout), store.readBodies())
    ).toEqual({
      accepted: [1, 0],
      late: 1,
      inFlight: 0,
      total: 2
    })
    const placed = placeEventDropSpawn(delayed, 1, metadata(layout), {
      timeAccessor: "time",
      arrivalAccessor: "arrivalTime",
      watermarkAtArrivalAccessor: "admission",
      ballRadius: 10
    })!
    expect(placed.x).toBeLessThan(metadata(layout).windowPlot.x)
    expect(placed.y).toBeGreaterThan(
      metadata(layout).windowPlot.y + metadata(layout).windowPlot.height * 0.48
    )
  })

  it.each([
    [440, 300],
    [280, 300]
  ] as [number, number][])(
    "places a historical snapshot below the solid lid at %s × %s",
    (width, height) => {
      const layout = board(44, [early, delayed], [width, height])
      const store = new PhysicsPipelineStore(layout.config)
      store.enqueue(layout.initialSpawns, layout.initialSpawnPacing)
      store.settle(1200)
      expect(
        readEventDropOccupancy(metadata(layout), store.readBodies())
      ).toEqual({ accepted: [1, 0], late: 1, inFlight: 0, total: 2 })
      const placed = placeEventDropSpawn(early, 0, metadata(layout), {
        timeAccessor: "time",
        arrivalAccessor: "arrivalTime",
        watermarkAtArrivalAccessor: "admission",
        ballRadius: 10
      })!
      expect(placed.y).toBe(layout.initialSpawns[0].y)
      expect(placed.y).toBeGreaterThan(
        Math.max(
          metadata(layout).lidSegments[0].y1,
          metadata(layout).lidSegments[0].y2
        )
      )
    }
  )
})
