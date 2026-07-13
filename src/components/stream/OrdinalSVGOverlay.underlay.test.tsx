import { scaleBand, scaleLinear } from "d3-scale"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { OrdinalSVGOverlay } from "./OrdinalSVGOverlay"

const scales = {
  o: scaleBand<string>().domain(["A", "B"]).range([0, 120]),
  r: scaleLinear().domain([0, 10]).range([80, 0]),
  projection: "vertical" as const
}

const props = {
  width: 120,
  height: 80,
  totalWidth: 160,
  totalHeight: 120,
  margin: { top: 10, right: 10, bottom: 30, left: 30 },
  scales,
  showAxes: true,
  showGrid: true,
  underlayRendered: true
}

describe("OrdinalSVGOverlay underlay composition", () => {
  it("repeats the grid above an opaque canvas", () => {
    const { container } = render(
      <OrdinalSVGOverlay {...props} canvasObscuresUnderlay />
    )

    expect(container.querySelectorAll("g.ordinal-grid line").length).toBeGreaterThan(0)
  })

  it("leaves the visible underlay as the single grid source", () => {
    const { container } = render(
      <OrdinalSVGOverlay {...props} canvasObscuresUnderlay={false} />
    )

    expect(container.querySelectorAll("g.ordinal-grid line")).toHaveLength(0)
  })
})
