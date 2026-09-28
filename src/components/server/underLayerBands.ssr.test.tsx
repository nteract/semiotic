import { describe, expect, it } from "vitest"
import React from "react"
import { renderToString } from "react-dom/server"
import { renderChart } from "./renderToStaticSVG"
import { LineChart } from "../charts/xy/LineChart"

const data = [
  { x: 0, y: 10 },
  { x: 10, y: 50 },
  { x: 20, y: 30 },
]
const annotations = [
  { type: "band", y0: 20, y1: 40, fill: "#123456", fillOpacity: 0.35, layer: "under", label: "Target" },
  { type: "x-band", x0: 5, x1: 8, fill: "#654321", fillOpacity: 0.35, layer: "under" },
]

describe("layer: \"under\" bands", () => {
  it("render their fills beneath the marks, clipped to the plot, in renderChart", () => {
    const svg = renderChart("LineChart", { data, xAccessor: "x", yAccessor: "y", width: 400, height: 240, annotations })
    const clip = svg.indexOf("clip-path=")
    const bandFill = svg.indexOf('fill="#123456"')
    const xBandFill = svg.indexOf('fill="#654321"')
    const line = svg.indexOf("<path", bandFill)
    expect(bandFill).toBeGreaterThan(clip)
    expect(xBandFill).toBeGreaterThan(clip)
    expect(line).toBeGreaterThan(Math.max(bandFill, xBandFill))
    // One fill each (none in the annotation overlay); the label still renders.
    expect(svg.match(/fill="#123456"/g)).toHaveLength(1)
    expect(svg).toContain(">Target<")
  })

  it("render their fills before the marks in the component's SSR output", () => {
    const svg = renderToString(<LineChart data={data} xAccessor="x" yAccessor="y" width={400} height={240} annotations={annotations} />)
    const bandFill = svg.indexOf('fill="#123456"')
    expect(bandFill).toBeGreaterThan(-1)
    expect(svg.indexOf("<path", bandFill)).toBeGreaterThan(bandFill)
    expect(svg).toContain(">Target<")
  })

  it("default an unfilled band to the theme's annotation color, like overlay bands", () => {
    const bare = [{ type: "band", y0: 20, y1: 40, layer: "under" }]
    const under = renderChart("LineChart", { data, xAccessor: "x", yAccessor: "y", width: 400, height: 240, annotations: bare })
    const over = renderChart("LineChart", { data, xAccessor: "x", yAccessor: "y", width: 400, height: 240, annotations: [{ ...bare[0], layer: undefined }] })
    const bandFill = (svg: string) => svg.match(/<rect[^>]*fill-opacity="0.1"[^>]*>/)?.[0].match(/ fill="([^"]+)"/)?.[1]
    expect(bandFill(under)).toBeTruthy()
    expect(bandFill(under)).toBe(bandFill(over))
  })

  it("keep their fill in the overlay on frames without an under-layer pass", () => {
    const svg = renderChart("BarChart", {
      data: [{ category: "a", value: 10 }, { category: "b", value: 30 }],
      categoryAccessor: "category", valueAccessor: "value", width: 400, height: 240,
      annotations: [{ type: "band", y0: 5, y1: 15, fill: "#123456", layer: "under" }],
    })
    expect(svg).toContain('fill="#123456"')
  })

  it("leave default bands in the overlay, above the marks", () => {
    const over = [{ ...annotations[0], layer: undefined }]
    const svg = renderChart("LineChart", { data, xAccessor: "x", yAccessor: "y", width: 400, height: 240, annotations: over })
    const bandFill = svg.indexOf('fill="#123456"')
    expect(bandFill).toBeGreaterThan(svg.lastIndexOf("<path"))
  })
})
