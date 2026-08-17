import { describe, expect, it } from "vitest"
import {
  renderNetworkToStaticSVG,
  renderOrdinalToStaticSVG,
  renderXYToStaticSVG,
} from "./renderToStaticSVG"

describe("direct static frame defaults", () => {
  it("reserves the same axis chrome as live XY and ordinal frames", () => {
    const xy = renderXYToStaticSVG({
      chartType: "line",
      data: [{ x: 1, y: 2 }, { x: 2, y: 4 }],
      xAccessor: "x",
      yAccessor: "y",
      size: [500, 320],
      xLabel: "Month",
      yLabel: "Revenue",
    })
    const ordinal = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: [{ category: "A", value: 2 }],
      oAccessor: "category",
      rAccessor: "value",
      size: [500, 320],
      oLabel: "Department",
      rLabel: "Headcount",
    })

    for (const svg of [xy, ordinal]) {
      expect(svg).toContain('transform="translate(70,50)"')
    }
  })

  it("matches live network defaults for directional and centered layouts", () => {
    const sankey = renderNetworkToStaticSVG({
      chartType: "sankey",
      edges: [{ source: "Revenue", target: "COGS", value: 10 }],
      size: [500, 320],
    })
    const force = renderNetworkToStaticSVG({
      chartType: "force",
      nodes: [{ id: "A" }, { id: "B" }],
      edges: [{ source: "A", target: "B", value: 1 }],
      size: [500, 320],
    })

    expect(sankey).toContain('transform="translate(80,20)"')
    expect(force).toContain('transform="translate(40,40)"')
  })
})
