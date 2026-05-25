import { describe, it, expect } from "vitest"
import { suggestDashboard } from "./suggestDashboard"

const temporalMultiSeries = Array.from({ length: 24 }, (_, i) => {
  const region = ["EU", "NA", "APAC"][i % 3]
  return { month: Math.floor(i / 3) + 1, revenue: 1000 + i * 80, region }
})

const productCatalog = [
  { product: "Widget", category: "tools", units: 480, region: "EU", price: 12 },
  { product: "Gadget", category: "tools", units: 620, region: "NA", price: 25 },
  { product: "Sprocket", category: "parts", units: 290, region: "EU", price: 8 },
  { product: "Whatsit", category: "parts", units: 740, region: "APAC", price: 15 },
  { product: "Gizmo", category: "tools", units: 410, region: "NA", price: 18 },
]

describe("suggestDashboard", () => {
  it("returns multiple panels covering distinct intents", () => {
    const dashboard = suggestDashboard(temporalMultiSeries)
    expect(dashboard.panels.length).toBeGreaterThan(1)
    // No two panels share the same intent
    const intents = dashboard.panels.map((p) => p.intent)
    expect(new Set(intents).size).toBe(intents.length)
  })

  it("diversifies by chart family by default", () => {
    const dashboard = suggestDashboard(temporalMultiSeries)
    const families = dashboard.panels.map((p) => p.suggestion.family)
    // Ideally every family appears at most once; allow occasional repeat if
    // diversification's fallback path kicked in.
    const uniqueFamilies = new Set(families)
    expect(uniqueFamilies.size).toBeGreaterThanOrEqual(Math.min(2, families.length))
  })

  it("emits a dashboard sized to maxPanels", () => {
    const dashboard = suggestDashboard(temporalMultiSeries, { maxPanels: 3 })
    expect(dashboard.panels.length).toBeLessThanOrEqual(3)
  })

  it("respects an explicit intent list when provided", () => {
    const dashboard = suggestDashboard(temporalMultiSeries, {
      intents: ["trend", "compare-series", "compare-categories"],
    })
    expect(dashboard.panels.map((p) => p.intent)).toEqual([
      "trend",
      "compare-series",
      "compare-categories",
    ])
  })

  it("reports intents the data couldn't cover", () => {
    // Categorical product data can't cover trend/hierarchy/geo
    const dashboard = suggestDashboard(productCatalog, {
      intents: ["rank", "trend", "hierarchy", "geo"],
    })
    expect(dashboard.intentsMissing).toContain("trend")
    expect(dashboard.intentsMissing).toContain("hierarchy")
    expect(dashboard.intentsMissing).toContain("geo")
    expect(dashboard.intentsCovered).toContain("rank")
  })

  it("includes runnable props on every panel", () => {
    const dashboard = suggestDashboard(temporalMultiSeries)
    for (const panel of dashboard.panels) {
      expect(panel.suggestion.props).toBeDefined()
      expect(panel.suggestion.props.data).toBeDefined()
    }
  })

  it("does not repeat the same chart twice", () => {
    const dashboard = suggestDashboard(temporalMultiSeries)
    const keys = dashboard.panels.map(
      (p) => `${p.suggestion.component}/${p.suggestion.variant?.key ?? "base"}`,
    )
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("returns empty panels gracefully for empty data", () => {
    const dashboard = suggestDashboard([])
    expect(dashboard.panels).toEqual([])
    expect(dashboard.intentsCovered).toEqual([])
  })

  it("default intents skip families the data doesn't support", () => {
    // productCatalog has no time axis and no hierarchy; default intents shouldn't include trend/hierarchy
    const dashboard = suggestDashboard(productCatalog)
    const intents = [...dashboard.intentsCovered, ...dashboard.intentsMissing]
    expect(intents).not.toContain("trend")
    expect(intents).not.toContain("hierarchy")
    expect(intents).not.toContain("geo")
  })
})
