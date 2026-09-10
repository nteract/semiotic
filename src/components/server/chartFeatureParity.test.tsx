import React from "react"
import { expect, it } from "vitest"
import { renderChart, renderXYToStaticSVG } from "./renderToStaticSVG"

it("exports the default gauge readout as portable SVG while preserving custom HTML", () => {
  const svg = renderChart("GaugeChart", { value: 64, width: 300, height: 250 })
  expect(svg).not.toContain("foreignObject")
  expect(svg).toContain('fill="#007bff"')
  expect(svg).toContain(">64</text>")
  expect(svg).toContain(">0 – 100</text>")
  expect(
    renderChart("GaugeChart", { value: 64, centerContent: <div>Custom</div> })
  ).toContain("foreignObject")
})

it("supports x and y threshold circle end caps at the plot edges", () => {
  const svg = renderChart("LineChart", {
    data: [
      { x: 0, y: 0 },
      { x: 10, y: 10 }
    ],
    width: 400,
    height: 200,
    annotations: [
      {
        type: "x-threshold",
        value: 5,
        endCap: { radius: 6 }
      },
      { type: "y-threshold", value: 5, endCap: "circle" }
    ]
  })
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml")
  expect(
    doc.querySelectorAll(".semiotic-threshold-end-cap")
  ).toHaveLength(2)
  expect(doc.querySelectorAll('circle[r="6"]')).toHaveLength(1)
})

it("hides the chosen primary or paired XY axes in static SVG", () => {
  const svg = renderXYToStaticSVG({
    chartType: "line",
    data: [
      { x: 0, y: 0 },
      { x: 1, y: 1 }
    ],
    axes: [
      { orient: "top", visible: false },
      { orient: "left", visible: false },
      { orient: "right" }
    ]
  })
  expect(svg).not.toContain('data-orient="top"')
  expect(svg).not.toContain('data-orient="left"')
  expect(svg).toContain('data-orient="right"')
})
