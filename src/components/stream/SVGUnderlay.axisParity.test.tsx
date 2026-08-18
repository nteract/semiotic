import * as React from "react"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SVGUnderlay } from "./SVGUnderlay"
import type { StreamScales } from "./types"

function makeScales(): StreamScales {
  const x = Object.assign((value: number) => value * 30, {
    ticks: () => [0, 2, 4, 6, 8],
    domain: () => [0, 9],
    range: () => [0, 270]
  })
  const y = Object.assign((value: number) => 180 - value * 20, {
    ticks: () => [0, 2, 4, 6, 8],
    domain: () => [0, 9],
    range: () => [180, 0]
  })
  return { x, y } as unknown as StreamScales
}

describe("SVGUnderlay axis tick parity", () => {
  it("keeps includeMax grid lines aligned with visible XY axes", () => {
    const scales = makeScales()
    const plotWidth = 300
    const plotHeight = 180
    const domainMax = 9
    const { container } = render(
      <SVGUnderlay
        width={plotWidth}
        height={plotHeight}
        totalWidth={360}
        totalHeight={240}
        margin={{ top: 10, right: 20, bottom: 30, left: 40 }}
        scales={scales}
        showAxes={true}
        showGrid={true}
        axes={[
          { orient: "bottom", includeMax: true },
          { orient: "left", includeMax: true }
        ]}
      />
    )

    const lines = Array.from(container.getElementsByTagName("line"))
    const xMax = String(scales.x(domainMax))
    const yMax = String(scales.y(domainMax))

    expect(
      lines.some(
        (line) =>
          line.getAttribute("x1") === xMax &&
          line.getAttribute("x2") === xMax &&
          line.getAttribute("y1") === "0" &&
          line.getAttribute("y2") === String(plotHeight)
      )
    ).toBe(true)
    expect(
      lines.some(
        (line) =>
          line.getAttribute("y1") === yMax &&
          line.getAttribute("y2") === yMax &&
          line.getAttribute("x1") === "0" &&
          line.getAttribute("x2") === String(plotWidth)
      )
    ).toBe(true)
  })
})
