import { describe, it, expect } from "vitest"
import { suggestCharts, scoreChart, explainCapabilityFit } from "./suggestCharts"
import { registerChartCapability, unregisterChartCapability } from "./chartCapabilities"
import type { ChartCapability } from "./chartCapabilityTypes"

const temporalMultiSeries = [
  { month: 1, revenue: 1200, region: "EU" },
  { month: 2, revenue: 1400, region: "EU" },
  { month: 3, revenue: 1100, region: "EU" },
  { month: 4, revenue: 1700, region: "EU" },
  { month: 5, revenue: 1900, region: "EU" },
  { month: 1, revenue: 900, region: "NA" },
  { month: 2, revenue: 1100, region: "NA" },
  { month: 3, revenue: 1500, region: "NA" },
  { month: 4, revenue: 1300, region: "NA" },
  { month: 5, revenue: 1700, region: "NA" },
]

const categorical = [
  { product: "Widget", units: 30 },
  { product: "Gadget", units: 50 },
  { product: "Sprocket", units: 20 },
  { product: "Whatsit", units: 45 },
]

const distributionData = Array.from({ length: 100 }, (_, i) => ({
  observation: 50 + Math.sin(i / 7) * 20 + (i % 3 === 0 ? 30 : 0),
}))

describe("suggestCharts", () => {
  it("ranks LineChart highly for temporal multi-series with intent=trend", () => {
    const suggestions = suggestCharts(temporalMultiSeries, { intent: "trend", includeVariants: false })
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions[0].component).toBe("LineChart")
    expect(suggestions[0].score).toBeGreaterThan(3)
  })

  it("collapses identical-score variants of the same component", () => {
    // With variants enabled, a component with several equally-ranked variants
    // (e.g. BarChart's sort orderings) must appear once per distinct score
    // rather than flooding the list and crowding out diverse components.
    const result = suggestCharts(categorical, {
      intent: "compare-categories",
      includeVariants: true,
      maxResults: 30,
    })
    expect(result.length).toBeGreaterThan(0)
    const seen = new Set<string>()
    for (const s of result) {
      const key = `${s.component}:${s.score.toFixed(4)}`
      expect(seen.has(key)).toBe(false)
      seen.add(key)
    }
  })

  it("ranks BarChart highly for categorical with intent=rank", () => {
    const suggestions = suggestCharts(categorical, { intent: "rank", includeVariants: false })
    expect(suggestions[0].component).toBe("BarChart")
    expect(suggestions[0].props.categoryAccessor).toBe("product")
    expect(suggestions[0].props.valueAccessor).toBe("units")
  })

  it("caveats BarChart when its category axis is really time bins", () => {
    // String month labels profile as plain categories (no real date field),
    // so BarChart fits and ranks — but it is acting as a temporal histogram.
    const monthlyBins = [
      { month: "Jan", count: 12 },
      { month: "Feb", count: 18 },
      { month: "Mar", count: 9 },
      { month: "Apr", count: 22 },
      { month: "May", count: 15 },
      { month: "Jun", count: 27 },
    ]
    const suggestions = suggestCharts(monthlyBins, { intent: "compare-categories", includeVariants: false })
    const bar = suggestions.find((s) => s.component === "BarChart")
    expect(bar).toBeDefined()
    expect(bar!.caveats.some((c) => /time bin|temporal/i.test(c))).toBe(true)
  })

  it("does not caveat BarChart for ordinary (non-temporal) categories", () => {
    const suggestions = suggestCharts(categorical, { intent: "rank", includeVariants: false })
    const bar = suggestions.find((s) => s.component === "BarChart")
    expect(bar).toBeDefined()
    expect(bar!.caveats.some((c) => /time bin|temporal/i.test(c))).toBe(false)
  })

  it("ranks Histogram highly for distribution intent", () => {
    const suggestions = suggestCharts(distributionData, { intent: "distribution", includeVariants: false })
    expect(suggestions[0].component).toBe("Histogram")
  })

  it("down-ranks a many-slice pie for a screen-reader audience and surfaces the receivability caveat", () => {
    const eightCategories = Array.from({ length: 8 }, (_, i) => ({ vendor: `V${i}`, share: 20 - i }))
    const visual = suggestCharts(eightCategories, { intent: "part-to-whole", includeVariants: false })
    const screenReader = suggestCharts(eightCategories, {
      intent: "part-to-whole",
      includeVariants: false,
      audience: { receptionModality: "screen-reader" },
    })
    const pieVisual = visual.find((s) => s.component === "PieChart")!
    const pieSR = screenReader.find((s) => s.component === "PieChart")!
    expect(pieVisual).toBeDefined()
    expect(pieSR).toBeDefined()
    // The non-visual channel pays the data-density penalty; the visual one doesn't.
    expect(pieSR.score).toBeLessThan(pieVisual.score)
    expect(pieSR.reasons.some((r) => r.includes("screen reader"))).toBe(true)
    expect(pieSR.caveats.some((c) => /slice|density/i.test(c))).toBe(true)
    // Visual audience: no receivability caveat injected.
    expect(visual.find((s) => s.component === "PieChart")!.reasons.some((r) => r.includes("screen reader"))).toBe(false)
  })

  it("leaves the visual path unchanged (no audit) when receptionModality is unset", () => {
    const eightCategories = Array.from({ length: 8 }, (_, i) => ({ vendor: `V${i}`, share: 20 - i }))
    const a = suggestCharts(eightCategories, { intent: "part-to-whole", includeVariants: false })
    const b = suggestCharts(eightCategories, { intent: "part-to-whole", includeVariants: false, audience: { name: "X" } })
    expect(a.map((s) => s.component)).toEqual(b.map((s) => s.component))
  })

  it("filters by allow list", () => {
    const suggestions = suggestCharts(temporalMultiSeries, { allow: ["AreaChart"], includeVariants: false })
    expect(suggestions.every((s) => s.component === "AreaChart")).toBe(true)
  })

  it("emits variants by default", () => {
    const suggestions = suggestCharts(temporalMultiSeries, { intent: "trend" })
    const lineVariants = suggestions.filter((s) => s.component === "LineChart" && s.variant)
    expect(lineVariants.length).toBeGreaterThan(0)
  })

  it("smooth variant boosts trend score relative to base for LineChart", () => {
    // Score the variants directly rather than reading them out of the ranked
    // suggestCharts list — that list now collapses variants of one component
    // that tie on score, so for strongly-trending data (where both cap out)
    // only one would survive. scoreChart exposes the per-variant score.
    const base = scoreChart("LineChart", temporalMultiSeries, { intent: "trend", variantKey: "linear" })
    const smooth = scoreChart("LineChart", temporalMultiSeries, { intent: "trend", variantKey: "smooth" })
    expect("score" in base).toBe(true)
    expect("score" in smooth).toBe(true)
    expect((smooth as { score: number }).score).toBeGreaterThanOrEqual((base as { score: number }).score)
  })

  it("annotated-threshold variant boosts the alerting intent (outlier-detection) over base", () => {
    const base = scoreChart("LineChart", temporalMultiSeries, { intent: "outlier-detection", variantKey: "linear" })
    const alert = scoreChart("LineChart", temporalMultiSeries, { intent: "outlier-detection", variantKey: "annotated-threshold" })
    expect("score" in base).toBe(true)
    expect("score" in alert).toBe(true)
    expect((alert as { score: number }).score).toBeGreaterThan((base as { score: number }).score)
  })

  it("excludes PieChart when there are too many categories", () => {
    const tooManyCategories = Array.from({ length: 15 }, (_, i) => ({ name: `Cat${i}`, count: i + 1 }))
    const suggestions = suggestCharts(tooManyCategories)
    expect(suggestions.find((s) => s.component === "PieChart")).toBeUndefined()
  })

  it("excludes StackedBarChart when there is no series field", () => {
    const suggestions = suggestCharts(categorical)
    expect(suggestions.find((s) => s.component === "StackedBarChart")).toBeUndefined()
  })

  it("buildProps returns runnable accessor configuration", () => {
    const suggestions = suggestCharts(temporalMultiSeries, { intent: "trend", allow: ["LineChart"], includeVariants: false })
    const top = suggestions[0]
    expect(top.props.xAccessor).toBe("month")
    expect(top.props.yAccessor).toBe("revenue")
    expect(top.props.lineBy).toBe("region")
    expect(top.props.colorBy).toBe("region")
  })

  it("respects user-registered capabilities", () => {
    const fake: ChartCapability = {
      component: "MyCustomChart",
      family: "custom",
      importPath: "semiotic",
      rubric: { familiarity: 1, accuracy: 5, precision: 5 },
      fits: () => null,
      intentScores: { "trend": 5 },
      buildProps: () => ({ custom: true }),
    }
    registerChartCapability(fake)
    try {
      const suggestions = suggestCharts(temporalMultiSeries, { allow: ["MyCustomChart"] })
      expect(suggestions[0].component).toBe("MyCustomChart")
    } finally {
      unregisterChartCapability("MyCustomChart")
    }
  })
})

describe("suggestCharts — structural shapes", () => {
  it("recommends ForceDirectedGraph for {nodes, edges}", () => {
    const network = {
      nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
      edges: [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
      ],
    }
    const suggestions = suggestCharts([], { rawInput: network, allow: ["ForceDirectedGraph", "SankeyDiagram", "ChordDiagram"] })
    expect(suggestions.length).toBeGreaterThan(0)
    expect(["network", "flow"]).toContain(suggestions[0].family)
    expect((suggestions[0].props.nodes as unknown[]).length).toBe(3)
  })

  it("recommends Treemap/TreeDiagram for hierarchies", () => {
    const hierarchy = {
      name: "root",
      children: [
        { name: "a", value: 10 },
        { name: "b", value: 20, children: [{ name: "b1", value: 5 }] },
      ],
    }
    const suggestions = suggestCharts([], { rawInput: hierarchy, intent: "hierarchy" })
    expect(suggestions.some((s) => s.family === "hierarchy")).toBe(true)
  })

  it("recommends ChoroplethMap for GeoJSON", () => {
    const geo = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", geometry: { type: "Polygon", coordinates: [] }, properties: { value: 5 } },
        { type: "Feature", geometry: { type: "Polygon", coordinates: [] }, properties: { value: 10 } },
      ],
    }
    const suggestions = suggestCharts([], { rawInput: geo, intent: "geo" })
    expect(suggestions.some((s) => s.component === "ChoroplethMap")).toBe(true)
  })
})

describe("explainCapabilityFit", () => {
  it("returns both fitting and rejected capabilities", () => {
    const { fitting, rejected, profile } = explainCapabilityFit(categorical)
    expect(fitting.length).toBeGreaterThan(0)
    expect(rejected.length).toBeGreaterThan(0)
    // BarChart should fit categorical data; StackedBarChart should be rejected
    expect(fitting.some((s) => s.component === "BarChart")).toBe(true)
    expect(rejected.some((r) => r.component === "StackedBarChart")).toBe(true)
    expect(profile.rowCount).toBe(categorical.length)
  })

  it("rejection reasons are human-readable strings", () => {
    const { rejected } = explainCapabilityFit(categorical)
    for (const r of rejected) {
      expect(typeof r.reason).toBe("string")
      expect(r.reason.length).toBeGreaterThan(0)
    }
  })

  it("respects allow/deny lists", () => {
    const { fitting, rejected } = explainCapabilityFit(categorical, {
      allow: ["BarChart", "Histogram", "DotPlot"],
    })
    for (const s of fitting) expect(["BarChart", "Histogram", "DotPlot"]).toContain(s.component)
    for (const r of rejected) expect(["BarChart", "Histogram", "DotPlot"]).toContain(r.component)
  })

  it("rejection set + fitting set is disjoint", () => {
    const { fitting, rejected } = explainCapabilityFit(temporalMultiSeries)
    const fittingNames = new Set(fitting.map((s) => s.component))
    for (const r of rejected) {
      expect(fittingNames.has(r.component)).toBe(false)
    }
  })
})

describe("scoreChart", () => {
  it("returns a suggestion for a fitting chart", () => {
    const result = scoreChart("LineChart", temporalMultiSeries, { intent: "trend" })
    expect("score" in result).toBe(true)
    if ("score" in result) {
      expect(result.score).toBeGreaterThan(3)
      expect(result.props.xAccessor).toBe("month")
    }
  })

  it("returns a reason when the chart doesn't fit", () => {
    const result = scoreChart("StackedBarChart", categorical)
    expect("reason" in result).toBe(true)
  })

  it("returns a reason for unknown components", () => {
    const result = scoreChart("DoesNotExist", categorical)
    expect("reason" in result).toBe(true)
  })
})
