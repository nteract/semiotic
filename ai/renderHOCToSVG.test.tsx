import { describe, expect, it } from "vitest"
import { renderHOCToSVG } from "./renderHOCToSVG"

describe("MCP recipe rendering", () => {
  it("renders both schema-visible recipes through the generic registry host", () => {
    const parallel = renderHOCToSVG("ParallelCoordinatesRecipe", {
      data: [
        { id: "a", mpg: 32, power: 88, weight: 2100 },
        { id: "b", mpg: 18, power: 155, weight: 3400 }
      ],
      layoutConfig: { fields: ["mpg", "power", "weight"] },
      title: "Vehicle profiles",
      description: "Vehicle profiles across independently scaled measures.",
      summary: "The profiles cross.",
      accessibleTable: true
    })
    const calendar = renderHOCToSVG("CalendarHeatmapRecipe", {
      data: [
        { date: "2026-01-01", count: 4 },
        { date: "2026-01-02", count: 9 }
      ],
      layoutConfig: {
        dateAccessor: "date",
        valueAccessor: "count",
        year: 2026
      },
      title: "Daily activity",
      description: "Daily activity by calendar week and weekday.",
      summary: "January 2 is highest.",
      accessibleTable: true
    })

    expect(parallel.error).toBeNull()
    expect(parallel.svg).toContain("<svg")
    expect(parallel.svg).toContain('width="600" height="400"')
    expect(parallel.svg).toContain("Vehicle profiles")
    expect(calendar.error).toBeNull()
    expect(calendar.svg).toContain("<svg")
    expect(calendar.svg).toContain('width="600" height="400"')
    expect(calendar.svg).toContain("Daily activity")
  })
})
