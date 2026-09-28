import React from "react"
import { expect, it } from "vitest"
import { renderToString } from "react-dom/server"
import { renderChart, renderXYToStaticSVG } from "./renderToStaticSVG"
import { GaugeChart } from "../charts/ordinal/GaugeChart"

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

it("exports primitive gauge centers and centerLabel as native SVG text", () => {
  for (const centerContent of ["64%", 64, () => "64%"]) {
    const svg = renderChart("GaugeChart", { value: 64, centerContent, width: 300, height: 250 })
    expect(svg).not.toContain("foreignObject")
    expect(svg).toMatch(/>64%?<\/text>/)
    expect(svg).not.toContain(">0 – 100</text>")
  }
  const labeled = renderChart("GaugeChart", { value: 64, centerLabel: "CPU", width: 300, height: 250 })
  expect(labeled).not.toContain("foreignObject")
  expect(labeled).toContain(">64</text>")
  expect(labeled).toContain(">0 – 100</text>")
  expect(labeled).toContain(">CPU</text>")
  // Donut and Pie string centers keep their HTML overlay.
  const donut = renderChart("DonutChart", {
    data: [{ category: "a", value: 1 }, { category: "b", value: 2 }],
    categoryAccessor: "category",
    valueAccessor: "value",
    centerContent: "Total",
  })
  expect(donut).toContain("foreignObject")
})

it("takes gauge compactness and scale labels from the resolved mode on both paths", () => {
  const thresholds = [{ value: 40, color: "#2a2", label: "Low" }, { value: 100, color: "#a22", label: "High" }]
  const contextByRule = [{ when: { maxWidth: 100000 }, transform: { mode: "context" as const } }]
  const props = { value: 50, thresholds, width: 300, height: 250, responsiveRules: contextByRule }
  const server = renderChart("GaugeChart", props)
  const browser = renderToString(<GaugeChart {...props} />)
  for (const svg of [server, browser]) {
    expect(svg).not.toContain(">0 – 100</text>")
    expect(svg).not.toContain(">Low<")
  }
  expect(renderChart("GaugeChart", { ...props, showScaleLabels: true })).toContain(">Low<")
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
