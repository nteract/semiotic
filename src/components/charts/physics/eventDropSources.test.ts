import { describe, expect, it } from "vitest"
import {
  buildEventDropPhysics,
  type EventDropProjectionMetadata
} from "./eventDropPhysics"
import { eventDropSourcePositions } from "./eventDropSources"
import { physicsChartArea } from "./physicsChartShared"
import { EventDropLiveRuntime } from "./EventDropLiveRuntime"

const size: [number, number] = [600, 400]
const tileSize = 80
const sources = [
  { id: "a", label: "A" },
  { id: "b", label: "B" },
  { id: "c", label: "C", visible: true }
]

describe("event drop source positions", () => {
  it("distributes a right rail down the right edge", () => {
    const rail = { side: "right" as const, tileSize }
    const x = size[0] - tileSize / 2
    expect(eventDropSourcePositions(sources.slice(0, 1), rail, size)).toEqual([
      { source: sources[0], x, y: 200 }
    ])
    expect(eventDropSourcePositions(sources.slice(0, 2), rail, size)).toEqual([
      { source: sources[0], x, y: 100 },
      { source: sources[1], x, y: 300 }
    ])
    expect(
      eventDropSourcePositions(sources, rail, size).map((item) => item.y)
    ).toEqual([0, 1, 2].map((index) => ((index + 0.5) * size[1]) / 3))
    expect(
      eventDropSourcePositions(
        [...sources, { id: "hidden", label: "Hidden", visible: false }],
        rail,
        size
      )
    ).toHaveLength(3)
    expect(eventDropSourcePositions(sources, { side: "none" }, size)).toEqual(
      []
    )
  })
})

describe("right source rail geometry", () => {
  const base = physicsChartArea(size).plot
  function board(side: "left" | "right" | "none") {
    return buildEventDropPhysics({
      data: [
        { id: "fresh", time: 25, arrivalTime: 30, source: "a" },
        { id: "late", time: 5, arrivalTime: 40, source: "b" }
      ],
      sources,
      sourceRail: { side, tileSize },
      timeAccessor: "time",
      arrivalAccessor: "arrivalTime",
      windows: { size: 10 },
      watermark: { value: 20 },
      ballRadius: 6,
      seed: 1,
      size,
      arrival: { mode: "travel", durationMs: 800 }
    })
  }
  const meta = (side: "left" | "right" | "none") =>
    board(side).metadata as unknown as EventDropProjectionMetadata

  it("insets the plot from the right and keeps the late gutter on the left", () => {
    const right = meta("right")
    const left = meta("left")
    expect(right.plot.x).toBe(base.x)
    expect(right.plot.width).toBe(base.width - tileSize)
    expect(right.plot.x + right.plot.width).toBe(base.x + base.width - tileSize)
    expect(left.plot.x).toBe(base.x + tileSize)
    expect(left.plot.width).toBe(right.plot.width)
    expect(left.plot.x + left.plot.width).toBe(base.x + base.width)
    expect(right.gutter.x).toBe(right.plot.x)
    expect(right.gutter.x).toBeLessThan(right.windowPlot.x)
    expect(right.windowPlot.x + right.windowPlot.width).toBeCloseTo(
      right.plot.x + right.plot.width
    )
    expect(meta("none").plot).toEqual(base)
  })

  it("starts travel at the right-hand tile and sends a late event left", () => {
    const layout = board("right")
    const right = layout.metadata as unknown as EventDropProjectionMetadata
    const fresh = layout.initialSpawns.find((spawn) => spawn.id === "fresh")
    const late = layout.initialSpawns.find((spawn) => spawn.id === "late")
    expect(fresh?.travel?.points[0]).toMatchObject({
      x: size[0] - tileSize / 2
    })
    expect(late?.travel?.points[0].x).toBe(size[0] - tileSize / 2)
    const lateEnd = late?.travel?.points.at(-1)
    const freshEnd = fresh?.travel?.points.at(-1)
    expect(lateEnd!.x).toBeLessThan(freshEnd!.x)
    expect(lateEnd!.x).toBeLessThan(
      right.windowPlot.x + right.windowPlot.width / 2
    )
    expect(lateEnd!.x).toBeGreaterThanOrEqual(right.gutter.x)
  })
})

describe("live right source rail", () => {
  it("keeps the viewed gutter left of the windows and travels from the right tile", () => {
    const runtime = new EventDropLiveRuntime({
      live: { follow: "now", horizon: 5, retain: 8 },
      windowSize: 2.5,
      size,
      ballRadius: 4,
      seed: 7,
      timeUnit: "s",
      watermark: { delay: 1 },
      arrival: { mode: "travel", durationMs: 200 },
      sources: [{ id: "a", label: "A" }],
      sourceRail: { side: "right", tileSize }
    })
    const viewed = runtime.metadata()
    expect(viewed.gutter.x).toBeLessThan(viewed.windowPlot.x)
    const camera = runtime.viewTransform().x
    const spawn = runtime.prepare(
      {
        id: "e1",
        x: 0,
        y: 0,
        shape: { type: "circle", radius: 4 },
        datum: { id: "e1", eventTime: 1, source: "a" }
      },
      0
    )
    expect(spawn.travel?.points[0].x).toBeCloseTo(
      size[0] - tileSize / 2 - camera
    )
  })
})
