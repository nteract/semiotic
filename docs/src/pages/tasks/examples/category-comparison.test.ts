import { describe, expect, it } from "vitest"
import { prepareChart } from "semiotic/ai/core"
import { renderChartWithEvidence } from "semiotic/server"
import { categoryComparisonProps, regionalTotals } from "./category-comparison"
import { checkCategoryComparison } from "./check-category-comparison"

describe("category task: values, marks and evidence boundaries", () => {
  it("retains the independently specified category/value mapping and total", () => {
    expect(regionalTotals).toEqual([
      { region: "North", total: 12 },
      { region: "South", total: 30 },
      { region: "West", total: 18 },
    ])
    expect(regionalTotals.reduce((sum, row) => sum + row.total, 0)).toBe(60)
    const result = checkCategoryComparison()
    expect(result.config?.props.data).toEqual(regionalTotals)
    expect(result.evidence!.markCount).toBe(3)
    expect(result.evidence!.empty).toBe(false)
    expect(result.evidence!.sceneHash).toBeTruthy()
  })

  it.each(["vertical", "horizontal"])(
    "preserves proportional geometry and insertion order in %s SVG",
    (orientation) => {
      const { svg, evidence } = renderChartWithEvidence("BarChart", {
        ...categoryComparisonProps,
        orientation,
      })
      const document = new DOMParser().parseFromString(svg, "image/svg+xml")
      // Exclude clip rectangles: these are the three colored data marks.
      const bars = Array.from(document.querySelectorAll("rect")).filter(
        (rect) => !rect.closest("defs") && rect.getAttribute("fill") !== "none",
      )
      expect(evidence.markCount).toBe(3)
      expect(bars).toHaveLength(3)
      const dimension = orientation === "vertical" ? "height" : "width"
      const values = bars.map((bar) => Number(bar.getAttribute(dimension)))
      expect(values[0] / values[1]).toBeCloseTo(12 / 30, 5)
      expect(values[2] / values[1]).toBeCloseTo(18 / 30, 5)
      const coordinate = orientation === "vertical" ? "x" : "y"
      const positions = bars.map((bar) => Number(bar.getAttribute(coordinate)))
      expect(positions[0]).toBeLessThan(positions[1])
      expect(positions[1]).toBeLessThan(positions[2])
      for (const region of ["North", "South", "West"]) expect(svg).toContain(region)
    },
  )

  it("distinguishes configuration checks from rendered evidence and repairs a bad accessor", () => {
    const configOnly = prepareChart({ component: "BarChart", props: categoryComparisonProps })
    expect(configOnly.ok).toBe(true)
    expect(configOnly.evidence).toBeUndefined()
    expect(configOnly.svg).toBeUndefined()
    const bad = prepareChart(
      {
        component: "BarChart",
        props: { ...categoryComparisonProps, valueAccessor: "missingTotal" },
      },
      { render: renderChartWithEvidence },
    )
    expect(bad.ok).toBe(false)
    expect(bad.reasons.length).toBeGreaterThan(0)
    const repaired = checkCategoryComparison()
    expect(repaired.ok).toBe(true)
    expect(repaired.config?.props.data).toEqual(regionalTotals)
  })
})
