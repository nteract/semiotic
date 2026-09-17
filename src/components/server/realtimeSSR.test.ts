import { describe, it, expect } from "vitest"
import { renderChart } from "./renderToStaticSVG"
import {
  WindowAccumulator,
  statValue,
} from "../realtime/WindowAccumulator"

const points = Array.from({ length: 12 }, (_, i) => ({
  time: i * 10_000,
  value: i + 1,
}))

describe("realtime controlled-data SSR", () => {
  it("renders RealtimeLineChart from a bounded data array", () => {
    const svg = renderChart("RealtimeLineChart", {
      data: points,
      timeAccessor: "time",
      valueAccessor: "value",
      size: [400, 200],
    })
    expect(svg).toContain("<svg")
    expect(svg).toMatch(/<path|<line|<circle/)
  })

  it("aggregates rows with WindowAccumulator before drawing", () => {
    const aggregate = { stat: "mean" as const, size: 30_000, percentiles: [0.95] }
    const svg = renderChart("RealtimeLineChart", {
      data: points,
      timeAccessor: "time",
      valueAccessor: "value",
      aggregate,
      size: [400, 200],
    })
    expect(svg).toContain("<svg")

    const acc = new WindowAccumulator({ size: 30_000, percentiles: [0.95] })
    for (const point of points) acc.push(point.time, point.value)
    const means = acc.emit().map((row) => statValue(row, "mean"))
    expect(means.length).toBeGreaterThan(0)
    expect(means.every((value) => Number.isFinite(value))).toBe(true)
  })

  it("renders RealtimeHistogram from controlled data", () => {
    const svg = renderChart("RealtimeHistogram", {
      data: points,
      timeAccessor: "time",
      valueAccessor: "value",
      size: [400, 200],
    })
    expect(svg).toContain("<svg")
  })
})
