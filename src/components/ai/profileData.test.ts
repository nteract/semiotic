import { describe, it, expect } from "vitest"
import { profileData } from "./profileData"

describe("profileData", () => {
  it("identifies time/x/y/series candidates from a temporal dataset", () => {
    const data = [
      { date: "2024-01-01", revenue: 1200, region: "EU" },
      { date: "2024-02-01", revenue: 1400, region: "EU" },
      { date: "2024-03-01", revenue: 1100, region: "EU" },
      { date: "2024-01-01", revenue: 900, region: "NA" },
      { date: "2024-02-01", revenue: 1100, region: "NA" },
      { date: "2024-03-01", revenue: 1500, region: "NA" },
    ]
    const profile = profileData(data)
    expect(profile.hasTimeAxis).toBe(true)
    expect(profile.primary.time).toBe("date")
    expect(profile.primary.x).toBe("date")
    expect(profile.primary.y).toBe("revenue")
    expect(profile.primary.series).toBe("region")
    expect(profile.seriesCount).toBe(2)
    expect(profile.hasRepeatedX).toBe(true)
  })

  it("handles a categorical dataset (bar-chart-shaped)", () => {
    const data = [
      { product: "Widget", units: 30 },
      { product: "Gadget", units: 50 },
      { product: "Sprocket", units: 20 },
    ]
    const profile = profileData(data)
    expect(profile.primary.category).toBe("product")
    expect(profile.primary.y).toBe("units")
    expect(profile.categoryCount).toBe(3)
    expect(profile.hasTimeAxis).toBe(false)
  })

  it("detects monotonic x", () => {
    const data = Array.from({ length: 10 }, (_, i) => ({ x: i, y: Math.random() }))
    const profile = profileData(data)
    expect(profile.monotonicX).toBe(true)
  })

  it("detects hierarchy structure via rawInput", () => {
    const profile = profileData([], { rawInput: { name: "root", children: [{ name: "a", value: 1 }] } })
    expect(profile.hasHierarchy).toBe(true)
    expect(profile.hasNetwork).toBe(false)
  })

  it("detects network structure via rawInput", () => {
    const profile = profileData([], { rawInput: { nodes: [{}], edges: [{}] } })
    expect(profile.hasNetwork).toBe(true)
  })

  it("detects geo structure via rawInput", () => {
    const profile = profileData([], { rawInput: { type: "FeatureCollection", features: [] } })
    expect(profile.hasGeo).toBe(true)
  })
})
