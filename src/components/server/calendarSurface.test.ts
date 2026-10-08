import { describe, expect, it } from "vitest"
import { renderChart } from "./renderToStaticSVG"

const props = {
  width: 640,
  height: 160,
  layoutConfig: {
    dateAccessor: "date", valueAccessor: "value", year: 2025, timeZone: "utc",
    missingColor: "#888888", colorRamp: ["#ffffff", "#0000ff"],
  },
}
const data = [{ date: "2025-01-01", value: 0 }, { date: "2025-01-03", value: 10 }]

describe("standalone calendar recipe SVG", () => {
  it("keeps missing cells distinct and ignores another year's outlier", () => {
    const fills = (rows: typeof data) => {
      const host = document.createElement("div")
      host.innerHTML = renderChart("CalendarHeatmapRecipe", { ...props, data: rows })
      return [...host.querySelectorAll("rect[fill]")].map((rect) => rect.getAttribute("fill"))
    }
    const oneYear = fills(data)
    expect(oneYear).toContain("rgb(255, 255, 255)")
    expect(oneYear).toContain("rgb(0, 0, 255)")
    expect(oneYear.filter((fill) => fill === "#888888")).toHaveLength(363)
    expect(fills([...data, { date: "2024-03-01", value: 10000 }])).toEqual(oneYear)
  })
})
