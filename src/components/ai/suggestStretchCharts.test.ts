import { describe, it, expect } from "vitest"
import { suggestStretchCharts } from "./suggestStretchCharts"
import { suggestDashboard } from "./suggestDashboard"
import type { AudienceProfile } from "./audienceProfile"

const satisfactionByCohort = Array.from({ length: 150 }, (_, i) => ({
  respondent: i + 1,
  satisfaction: Math.max(1, Math.min(10, 6 + Math.sin(i / 7) * 2 + Math.random() * 3 - 1)),
  cohort: ["Beta", "GA", "Enterprise"][i % 3],
}))

const productSales = [
  { product: "A", units: 30 },
  { product: "B", units: 50 },
  { product: "C", units: 20 },
  { product: "D", units: 45 },
]

const executiveAudience: AudienceProfile = {
  name: "Exec",
  familiarity: { BarChart: 5, LineChart: 5, PieChart: 5, BoxPlot: 2, ViolinPlot: 1, SwarmPlot: 1 },
  targets: {
    BoxPlot: { direction: "increase", weight: 2, reason: "growing distribution literacy" },
  },
  exposureLevel: 1,
}

describe("suggestStretchCharts", () => {
  it("returns empty array when no audience is supplied", () => {
    const result = suggestStretchCharts(satisfactionByCohort)
    expect(result).toEqual([])
  })

  it("surfaces audience-targeted increase charts as stretches", () => {
    const result = suggestStretchCharts(satisfactionByCohort, {
      audience: executiveAudience,
      intent: "compare-categories",
    })
    expect(result.some((s) => s.suggestion.component === "BoxPlot")).toBe(true)
  })

  it("each stretch carries a non-empty rationale", () => {
    const result = suggestStretchCharts(satisfactionByCohort, {
      audience: executiveAudience,
      intent: "compare-categories",
    })
    for (const s of result) {
      expect(s.rationale.length).toBeGreaterThan(0)
    }
  })

  it("uses target reason verbatim when one is provided", () => {
    const result = suggestStretchCharts(satisfactionByCohort, {
      audience: executiveAudience,
      intent: "compare-categories",
    })
    const boxStretch = result.find((s) => s.suggestion.component === "BoxPlot")
    expect(boxStretch?.rationale).toContain("growing distribution literacy")
  })

  it("respects the familiarity ceiling — never recommends a chart the audience already knows", () => {
    const result = suggestStretchCharts(productSales, {
      audience: executiveAudience,
      intent: "rank",
    })
    // BarChart is familiarity 5; should never appear as a stretch
    expect(result.some((s) => s.suggestion.component === "BarChart")).toBe(false)
  })

  it("does not return charts that fail the fits gate", () => {
    // 4-row product data can't fit ViolinPlot/RidgelinePlot
    const result = suggestStretchCharts(productSales, {
      audience: executiveAudience,
      intent: "rank",
    })
    expect(result.some((s) => s.suggestion.component === "RidgelinePlot")).toBe(false)
  })

  it("widens the ceiling at exposureLevel 2", () => {
    // bump exposure level — Scatterplot is familiarity 3 (executive default)
    const audience: AudienceProfile = {
      ...executiveAudience,
      familiarity: { ...executiveAudience.familiarity, Scatterplot: 3 },
      exposureLevel: 2,
    }
    const dataWith2Numerics = Array.from({ length: 30 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
    }))
    const result = suggestStretchCharts(dataWith2Numerics, {
      audience,
      intent: "correlation",
    })
    expect(result.some((s) => s.suggestion.component === "Scatterplot")).toBe(true)
  })
})

describe("suggestDashboard × stretchPanels", () => {
  it("includes stretchPanels when audience has exposureLevel >= 1", () => {
    const dashboard = suggestDashboard(satisfactionByCohort, {
      audience: executiveAudience,
    })
    expect(dashboard.stretchPanels.length).toBeGreaterThan(0)
  })

  it("returns no stretchPanels when exposureLevel is 0", () => {
    const audience = { ...executiveAudience, exposureLevel: 0 as const }
    const dashboard = suggestDashboard(satisfactionByCohort, { audience })
    expect(dashboard.stretchPanels).toEqual([])
  })

  it("returns no stretchPanels when no audience is supplied", () => {
    const dashboard = suggestDashboard(satisfactionByCohort)
    expect(dashboard.stretchPanels).toEqual([])
  })

  it("stretchPanels do not duplicate main panels", () => {
    const dashboard = suggestDashboard(satisfactionByCohort, {
      audience: executiveAudience,
    })
    const panelComponents = new Set(dashboard.panels.map((p) => p.suggestion.component))
    for (const stretch of dashboard.stretchPanels) {
      expect(panelComponents.has(stretch.suggestion.component)).toBe(false)
    }
  })
})
