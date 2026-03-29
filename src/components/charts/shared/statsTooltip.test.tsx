import * as React from "react"
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { buildStatsTooltip } from "./statsTooltip"

describe("buildStatsTooltip", () => {
  it("renders full stats when d.stats is present", () => {
    const tooltip = buildStatsTooltip()
    const { container } = render(
      tooltip({
        category: "Group A",
        stats: { n: 50, min: 1, q1: 3, median: 5, q3: 7, max: 10, mean: 5.2 },
      }) as React.ReactElement
    )
    const text = container.textContent!
    expect(text).toContain("Group A")
    expect(text).toContain("n = 50")
    expect(text).toContain("Median: 5")
    expect(text).toContain("Q1: 3")
    expect(text).toContain("Q3: 7")
    expect(text).toContain("Min: 1")
    expect(text).toContain("Max: 10")
    expect(text).toContain("Mean: 5.2")
  })

  it("renders category-only when stats is missing and no valueAccessor", () => {
    const tooltip = buildStatsTooltip()
    const { container } = render(
      tooltip({ category: "Group B" }) as React.ReactElement
    )
    expect(container.textContent).toBe("Group B")
  })

  it("computes fallback median from raw data with string valueAccessor", () => {
    const tooltip = buildStatsTooltip({ valueAccessor: "val" })
    const { container } = render(
      tooltip({
        category: "Test",
        data: [{ val: 10 }, { val: 20 }, { val: 30 }],
      }) as React.ReactElement
    )
    const text = container.textContent!
    expect(text).toContain("n = 3")
    expect(text).toContain("Median: 20")
  })

  it("computes true median for even-length arrays", () => {
    const tooltip = buildStatsTooltip({ valueAccessor: "v" })
    const { container } = render(
      tooltip({
        category: "Even",
        data: [{ v: 2 }, { v: 4 }, { v: 6 }, { v: 8 }],
      }) as React.ReactElement
    )
    // True median of [2,4,6,8] is (4+6)/2 = 5
    expect(container.textContent).toContain("Median: 5")
  })

  it("filters non-finite values in fallback computation", () => {
    const tooltip = buildStatsTooltip({ valueAccessor: "x" })
    const { container } = render(
      tooltip({
        category: "Filtered",
        data: [{ x: 1 }, { x: NaN }, { x: Infinity }, { x: 3 }, { x: 5 }],
      }) as React.ReactElement
    )
    // Only [1, 3, 5] survive — median is 3
    const text = container.textContent!
    expect(text).toContain("n = 3")
    expect(text).toContain("Median: 3")
  })

  it("works with function valueAccessor", () => {
    const tooltip = buildStatsTooltip({ valueAccessor: (d: any) => d.nested.val })
    const { container } = render(
      tooltip({
        category: "Fn",
        data: [{ nested: { val: 100 } }, { nested: { val: 200 } }, { nested: { val: 300 } }],
      }) as React.ReactElement
    )
    expect(container.textContent).toContain("Median: 200")
  })

  it("extracts stats from d.data.stats (wrapped datum)", () => {
    const tooltip = buildStatsTooltip()
    const { container } = render(
      tooltip({
        data: { stats: { n: 10, min: 0, q1: 2, median: 4, q3: 6, max: 8 } },
        category: "Wrapped",
      }) as React.ReactElement
    )
    expect(container.textContent).toContain("Median: 4")
  })

  it("omits mean line when stats.mean is not present", () => {
    const tooltip = buildStatsTooltip()
    const { container } = render(
      tooltip({
        category: "NoMean",
        stats: { n: 5, min: 1, q1: 2, median: 3, q3: 4, max: 5 },
      }) as React.ReactElement
    )
    expect(container.textContent).not.toContain("Mean:")
  })
})
