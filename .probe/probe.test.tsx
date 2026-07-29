import { describe, expect, it } from "vitest"
import { renderChart } from "../src/components/semiotic-server"

describe("probe", () => {
  it("serializes concrete font-size attributes for ordinal axis text", () => {
    const svg = renderChart("BarChart", {
      data: [{ c: "Kafka", v: 80 }, { c: "Flink", v: 60 }],
      categoryAccessor: "c", valueAccessor: "v",
    })
    expect(svg).toContain('font-size="12"')
    expect(svg).toContain(">Kafka<")
  })
  it("serializes concrete font-size attributes for XY ticks and labels", () => {
    const svg = renderChart("LineChart", {
      data: [{ x: 1, y: 2 }, { x: 2, y: 5 }],
      xAccessor: "x", yAccessor: "y", xLabel: "Time", yLabel: "Val",
    })
    expect(svg).toContain('font-size="12"')
    expect(svg).toContain(">Time<")
    expect(svg).toContain(">Val<")
  })
})
