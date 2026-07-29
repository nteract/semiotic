import { describe, it } from "vitest"
import { renderChart } from "../src/components/semiotic-server"

describe("probe", () => {
  it("bar", () => {
    const svg = renderChart("BarChart", {
      data: [{ c: "Kafka", v: 80 }, { c: "Flink", v: 60 }],
      categoryAccessor: "c", valueAccessor: "v",
    })
    console.log("BAR FONT-SIZE COUNT:", (svg.match(/font-size/g) || []).length)
    ;(svg.match(/<text[^>]*>[^<]*<\/text>/g) || []).slice(0, 12).forEach(t => console.log(t))
  })
  it("line", () => {
    const svg = renderChart("LineChart", {
      data: [{ x: 1, y: 2 }, { x: 2, y: 5 }],
      xAccessor: "x", yAccessor: "y", xLabel: "Time", yLabel: "Val",
    })
    console.log("LINE FONT-SIZE COUNT:", (svg.match(/font-size/g) || []).length)
    ;(svg.match(/<text[^>]*>[^<]*<\/text>/g) || []).slice(0, 10).forEach(t => console.log(t))
  })
})
