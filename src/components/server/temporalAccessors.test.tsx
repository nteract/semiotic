import { describe, expect, it } from "vitest"
import { renderChartWithEvidence, renderXYToStaticSVG } from "./renderToStaticSVG"

const data = [{ date: "2024-01-01", value: 1 }, { date: "2024-06-01", value: 3 }]

function expectCalendarAxis(svg: string) {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml")
  const labels = Array.from(doc.querySelectorAll("text"), node => node.textContent)
  expect(labels).toEqual(expect.arrayContaining(["Jan 1", "Feb 1", "Mar 1", "Apr 1", "May 1", "Jun 1"]))
  expect(svg).not.toMatch(/NaN|Infinity/)
}

describe("temporal accessor server paths", () => {
  it.each(["LineChart", "AreaChart", "Scatterplot", "RealtimeLineChart", "TemporalHistogram", "RealtimeHistogram", "RealtimeSwarmChart", "RealtimeWaterfallChart", "RealtimeHeatmap"])(
    "%s renders ISO dates and temporal labels through public server entry", component => {
      const { svg, evidence } = renderChartWithEvidence(component, {
        data, xAccessor: "date", yAccessor: "value", timeAccessor: "date", valueAccessor: "value",
        width: 600, height: 300, binSize: 86400000,
        xExtent: [Date.UTC(2024, 0, 1), Date.UTC(2024, 5, 1)],
        timeExtent: [Date.UTC(2024, 0, 1), Date.UTC(2024, 5, 1)]
      })
      expect(evidence.empty).toBe(false)
      expect(evidence.markCount).toBeGreaterThan(0)
      if (component === "RealtimeWaterfallChart") {
        // Waterfall intentionally supplies one authored label per step.
        expect(svg).toContain("2024-01-01")
        expect(svg).toContain("2024-06-01")
        expect(svg).not.toMatch(/NaN|Infinity/)
      } else {
        expectCalendarAxis(svg)
      }
    }
  )

  it("supports omitted xAccessor in the direct static frame", () => {
    const svg = renderXYToStaticSVG({
      chartType: "line", data: data.map(row => ({ x: row.date, y: row.value })), size: [600, 300]
    })
    expectCalendarAxis(svg)
    expect(svg).toMatch(/<path[^>]+d="M/)
  })
})
