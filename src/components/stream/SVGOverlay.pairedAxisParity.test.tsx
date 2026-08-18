import * as React from "react"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SVGOverlay } from "./SVGOverlay"
import type { StreamScales } from "./types"

function makeScales(): StreamScales {
  const x = Object.assign((value: number) => value * 30, {
    ticks: () => [0, 5, 10],
    domain: () => [0, 10],
    range: () => [0, 300],
  })
  const y = Object.assign((value: number) => 180 - value * 20, {
    // The normal nice ticks omit the real 9 maximum so includeMax is visible.
    ticks: () => [0, 2, 4, 6, 8],
    domain: () => [0, 9],
    range: () => [180, 0],
  })
  return { x, y } as unknown as StreamScales
}

const baseProps = {
  width: 300,
  height: 180,
  totalWidth: 360,
  totalHeight: 240,
  margin: { top: 10, right: 20, bottom: 30, left: 40 },
  scales: makeScales(),
  showAxes: true,
}

describe("SVGOverlay paired-right axis parity", () => {
  it("honors includeMax and suppresses duplicate formatted labels", () => {
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        axes={[
          { orient: "bottom" },
          { orient: "left" },
          { orient: "right", includeMax: true, tickFormat: (value) => `R${value}` },
        ]}
      />,
    )
    const labels = Array.from(
      container.querySelectorAll("[data-orient='right'] text.semiotic-axis-tick"),
    ).map((node) => node.textContent)

    expect(labels).toContain("R9")

    const duplicate = render(
      <SVGOverlay
        {...baseProps}
        axes={[
          { orient: "bottom" },
          { orient: "left" },
          { orient: "right", tickFormat: () => "same" },
        ]}
      />,
    ).container
    expect(duplicate.querySelectorAll("[data-orient='right'] text.semiotic-axis-tick")).toHaveLength(1)
  })

  it("renders a jagged paired-right baseline even when the ordinary baseline is disabled", () => {
    const { container } = render(
      <SVGOverlay
        {...baseProps}
        axes={[
          { orient: "bottom" },
          { orient: "left" },
          { orient: "right", baseline: false, jaggedBase: true },
        ]}
      />,
    )
    const rightAxis = container.querySelector("[data-orient='right']")

    expect(rightAxis?.querySelector(":scope > path[fill='none']")).toBeTruthy()
    expect(rightAxis?.querySelector(":scope > line[x1='300'][x2='300']")).toBeNull()
  })
})
