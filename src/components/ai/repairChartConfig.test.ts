import { describe, it, expect } from "vitest"
import { repairChartConfig } from "./repairChartConfig"

const productSales = [
  { product: "Widget", units: 480 },
  { product: "Gadget", units: 620 },
  { product: "Sprocket", units: 290 },
  { product: "Whatsit", units: 740 },
  { product: "Doohickey", units: 410 },
  { product: "Gizmo", units: 200 },
  { product: "Thingamajig", units: 320 },
  { product: "Item-8", units: 110 },
  { product: "Item-9", units: 90 },
  { product: "Item-10", units: 75 },
]

const temporal = Array.from({ length: 12 }, (_, i) => ({
  month: i + 1,
  revenue: 1000 + i * 120 + Math.sin(i) * 80,
}))

describe("repairChartConfig", () => {
  it("returns ok when the chart fits", () => {
    const result = repairChartConfig("BarChart", productSales.slice(0, 5))
    expect(result.status).toBe("ok")
    if (result.status === "ok") {
      expect(result.component).toBe("BarChart")
    }
  })

  it("proposes alternatives when the chart doesn't fit", () => {
    // PieChart can't handle 10 categories
    const result = repairChartConfig("PieChart", productSales, { intent: "rank" })
    expect(result.status).toBe("alternative")
    if (result.status === "alternative") {
      expect(result.reason).toMatch(/slices/)
      expect(result.alternatives.length).toBeGreaterThan(0)
      // BarChart or DotPlot should be the strongest replacement for rank
      expect(["BarChart", "DotPlot"]).toContain(result.alternatives[0].component)
    }
  })

  it("excludes the requested component from alternatives", () => {
    const result = repairChartConfig("StackedBarChart", productSales)
    expect(result.status).toBe("alternative")
    if (result.status === "alternative") {
      for (const alt of result.alternatives) {
        expect(alt.component).not.toBe("StackedBarChart")
      }
    }
  })

  it("returns unknown for components without a registered capability", () => {
    const result = repairChartConfig("NotARealChart", temporal, { intent: "trend" })
    expect(result.status).toBe("unknown")
    if (result.status === "unknown") {
      expect(result.alternatives.length).toBeGreaterThan(0)
      // Top alt for trend on temporal should be LineChart
      expect(result.alternatives[0].component).toBe("LineChart")
    }
  })

  it("includes profile in every result for caller inspection", () => {
    const result = repairChartConfig("PieChart", productSales)
    expect(result.profile).toBeDefined()
    expect(result.profile.rowCount).toBe(productSales.length)
  })

  it("alternatives carry runnable props", () => {
    const result = repairChartConfig("PieChart", productSales, { intent: "rank" })
    if (result.status === "alternative") {
      const top = result.alternatives[0]
      expect(top.props).toBeDefined()
      expect(top.props.data).toBeDefined()
    }
  })
})
