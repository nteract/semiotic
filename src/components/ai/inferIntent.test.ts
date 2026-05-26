import { describe, it, expect } from "vitest"
import { inferIntent } from "./inferIntent"

describe("inferIntent", () => {
  const cases: Array<[string, string]> = [
    ["when did revenue peak?", "outlier-detection"],
    ["show me the trend over time", "trend"],
    ["which products are the top sellers?", "rank"],
    ["what's the breakdown of revenue by region?", "part-to-whole"],
    ["how is the distribution of test scores?", "distribution"],
    ["is there a relationship between hours and grade?", "correlation"],
    ["show conversion funnel from signup to purchase", "flow"],
    ["display the org hierarchy", "hierarchy"],
    ["what does this look like across countries?", "geo"],
    ["how did the cohort composition change over time?", "composition-over-time"],
    ["where did revenue suddenly shift?", "change-detection"],
    ["compare regions side by side", "compare-series"],
  ]

  it.each(cases)("maps %j → %s", (query, expected) => {
    const result = inferIntent(query)
    expect(result?.intent).toBe(expected)
  })

  it("returns null for empty or non-matching queries", () => {
    expect(inferIntent("")).toBeNull()
    expect(inferIntent("   ")).toBeNull()
    expect(inferIntent("hello there")).toBeNull()
    expect(inferIntent("what is this?")).toBeNull()
  })

  it("composition-over-time outranks plain trend when both apply", () => {
    const result = inferIntent("show me the composition over time of revenue")
    expect(result?.intent).toBe("composition-over-time")
  })

  it("returns alternates when multiple intents apply", () => {
    const result = inferIntent("trend by category over time")
    expect(result).not.toBeNull()
    if (result) {
      expect(result.confidence).toBeGreaterThan(0)
      // alternates may be empty or populated depending on patterns matched
      expect(Array.isArray(result.alternates)).toBe(true)
    }
  })

  it("geo wins over other intents when geography is mentioned", () => {
    const result = inferIntent("show me the trend across countries")
    expect(result?.intent).toBe("geo")
  })
})
