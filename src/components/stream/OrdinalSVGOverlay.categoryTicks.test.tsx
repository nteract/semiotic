import { scaleBand, scaleLinear } from "d3-scale"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { OrdinalSVGOverlay } from "./OrdinalSVGOverlay"
import { OrdinalPipelineStore } from "./OrdinalPipelineStore"

const margin = { top: 50, right: 40, bottom: 60, left: 70 }

function renderVerticalCategoryAxis(categories: string[]) {
  // This is the 360px BarChart content width after its primary-mode margins.
  // Its 40px default bar padding becomes scaleBand padding(40 / 250).
  const width = 250
  const scales = {
    o: scaleBand<string>()
      .domain(categories)
      .range([0, width])
      .padding(40 / width),
    r: scaleLinear().domain([0, 100]).range([130, 0]),
    projection: "vertical" as const
  }

  return render(
    <OrdinalSVGOverlay
      width={width}
      height={130}
      totalWidth={360}
      totalHeight={240}
      margin={margin}
      scales={scales}
      showAxes
    />
  )
}

describe("OrdinalSVGOverlay category tick thinning", () => {
  it.each(["vertical", "horizontal"] as const)(
    "anchors variable-width %s ticks to their columns after updates",
    (projection) => {
      const store = new OrdinalPipelineStore({
        chartType: "bar",
        oAccessor: "category",
        rAccessor: "value",
        windowSize: 10,
        windowMode: "sliding",
        projection,
        dynamicColumnWidth: "weight",
        oSort: false,
        barPadding: 0,
        extentPadding: 0
      })
      const props = {
        width: 400,
        height: 300,
        totalWidth: 510,
        totalHeight: 410,
        margin,
        showAxes: true
      }
      const { container, rerender } = render(
        <OrdinalSVGOverlay {...props} scales={null} />
      )
      for (const weights of [
        [10, 0, 30],
        [30, 0, 10]
      ]) {
        store.ingest({
          inserts: weights.map((weight, i) => ({
            category: String.fromCharCode(65 + i),
            weight,
            value: 1
          })),
          bounded: true
        })
        store.computeScene({ width: 400, height: 300 })
        rerender(
          <OrdinalSVGOverlay
            {...props}
            scales={store.scales}
            columns={store.columns}
          />
        )
        const axis = projection === "vertical" ? "bottom" : "left"
        const ticks = [
          ...container.querySelectorAll(
            `.semiotic-axis-${axis} .semiotic-axis-tick`
          )
        ]
        expect(ticks).toHaveLength(3)
        for (const tick of ticks) {
          const column = store.columns[tick.textContent!]
          expect(tick.parentElement!.getAttribute("transform")).toBe(
            projection === "vertical"
              ? `translate(${column.middle},300)`
              : `translate(0,${column.middle})`
          )
        }
      }
    }
  )

  it("keeps a five-category 360px BarChart axis when adjacent labels fit", () => {
    const categories = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"]
    const { container } = renderVerticalCategoryAxis(categories)

    const labels = Array.from(
      container.querySelectorAll(".semiotic-axis-bottom .semiotic-axis-tick")
    ).map((node) => node.textContent)

    // Regression: the former longest-label heuristic treated every gap as
    // Epsilon-to-Epsilon and incorrectly removed Beta and Delta.
    expect(labels).toEqual(categories)
  })

  it("still thins genuinely crowded category axes", () => {
    const categories = Array.from(
      { length: 40 },
      (_, index) => `2026-${String(index + 1).padStart(2, "0")}`
    )
    const { container } = renderVerticalCategoryAxis(categories)

    const labels = container.querySelectorAll(
      ".semiotic-axis-bottom .semiotic-axis-tick"
    )
    expect(labels.length).toBeGreaterThan(0)
    expect(labels.length).toBeLessThan(categories.length)
  })

  it("retains short labels that fit after a crowded long label", () => {
    const categories = ["A very long category", "B", "C", "D", "E"]
    const { container } = renderVerticalCategoryAxis(categories)
    const labels = [
      ...container.querySelectorAll(".semiotic-axis-bottom .semiotic-axis-tick")
    ].map((node) => node.textContent)
    expect(labels).toEqual([categories[0], "C", "D", "E"])
  })
})
