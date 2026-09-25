import React from "react"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { AriaLiveTooltip } from "./AriaLiveTooltip"

const stats = { n: 6, min: 1, q1: 2, median: 3.5, q3: 5, max: 5, mean: 20 }
const outlier = { category: "Alpha", value: 100 }
const scene = [
  { type: "boxplot", datum: [outlier, { category: "Alpha", value: 2 }], stats, category: "Alpha" },
  { type: "point", datum: outlier }
]

describe("distribution live announcements", () => {
  it("distinguishes summary statistics from an outlier sharing its source row", () => {
    const { container, rerender } = render(<AriaLiveTooltip scene={scene} hoverPoint={{ data: outlier, stats, category: "Alpha" }} />)
    expect(container.textContent).toContain("median: 3.5")
    expect(container.textContent).not.toContain("value: 100")
    rerender(<AriaLiveTooltip scene={scene} hoverPoint={{ data: outlier }} />)
    expect(container.textContent).toBe("Data point: category: Alpha, value: 100")
  })

  it("preserves authored accessible metadata over automatic statistics", () => {
    const { container } = render(<AriaLiveTooltip scene={[
      { ...scene[0], accessibleDatum: { note: "Median result", median: 3.5 } }
    ]} hoverPoint={{ data: outlier, stats }} />)
    expect(container.textContent).toBe("Data point: note: Median result, median: 3.5")
  })
})
