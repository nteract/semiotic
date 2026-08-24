import { describe, expect, it } from "vitest"
import {
  CALENDAR_HEATMAP_RECIPE_ID,
  PARALLEL_COORDINATES_RECIPE_ID
} from "../ai/builtInChartRecipes"
import { renderChartWithEvidence } from "./renderToStaticSVG"

describe("built-in recipe server rendering", () => {
  it("renders parallel coordinates with connector evidence", () => {
    const { svg, evidence } = renderChartWithEvidence(
      PARALLEL_COORDINATES_RECIPE_ID,
      {
        data: [
          { id: "a", mpg: 32, power: 88, weight: 2100 },
          { id: "b", mpg: 18, power: 155, weight: 3400 },
          { id: "c", mpg: 25, power: 110, weight: 2700 }
        ],
        layoutConfig: { fields: ["mpg", "power", "weight"], showPoints: true },
        title: "Vehicle profiles",
        description:
          "Three vehicle profiles compared across fuel economy, power, and weight.",
        summary:
          "The profiles cross, showing that no vehicle dominates every measure.",
        accessibleTable: true
      }
    )

    expect(svg).toContain("Vehicle profiles")
    expect(evidence.empty).toBe(false)
    expect(evidence.markCountByType.connector).toBe(6)
    expect(evidence.markCountByType.point).toBe(9)
    expect(evidence.ariaLabel).toBe(
      "Three vehicle profiles compared across fuel economy, power, and weight."
    )
  })

  it("renders a calendar year with rect evidence", () => {
    const { svg, evidence } = renderChartWithEvidence(
      CALENDAR_HEATMAP_RECIPE_ID,
      {
        data: [
          { date: "2026-01-01", count: 4 },
          { date: "2026-01-02", count: 9 },
          { date: "2026-01-03", count: 2 }
        ],
        layoutConfig: {
          dateAccessor: "date",
          valueAccessor: "count",
          year: 2026
        },
        title: "Daily activity",
        description: "Daily activity positioned by calendar week and weekday.",
        summary: "January 2 has the highest authored value in this sample.",
        accessibleTable: true
      }
    )

    expect(svg).toContain("Daily activity")
    expect(evidence.empty).toBe(false)
    expect(evidence.markCountByType.rect).toBe(365)
    expect(evidence.ariaLabel).toBe(
      "Daily activity positioned by calendar week and weekday."
    )
  })
})
