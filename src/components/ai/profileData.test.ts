import { describe, it, expect } from "vitest"
import { profileData } from "./profileData"
import { rederiveProfile } from "./deriveProfileFields"

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
    expect(profile.numericFields!.units).toMatchObject({
      finiteCount: 3,
      nonFiniteCount: 0,
      nonNumericCount: 0,
      min: 20,
      max: 50,
    })
    expect(profile.numericFields!.product).toMatchObject({
      finiteCount: 0,
      nonNumericCount: 3,
    })
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

  it("excludes declared GraphQL identifiers from every encoding role", () => {
    const data = [
      { id: 101, accountId: 9001, region: "west", throughput: 42 },
      { id: 102, accountId: 9002, region: "east", throughput: 57 },
      { id: 103, accountId: 9003, region: "west", throughput: 49 },
    ]
    const profile = profileData(data, {
      identifiers: ["id", "accountId"],
    })

    expect(profile.identifiers).toEqual(["id", "accountId"])
    expect(profile.primary.y).toBe("throughput")
    expect(profile.primary.category).toBe("region")
    expect(profile.categoryCount).toBe(2)
    for (const candidates of Object.values(profile.candidates)) {
      expect(candidates.some(({ field }) => field === "id")).toBe(false)
      expect(candidates.some(({ field }) => field === "accountId")).toBe(false)
    }
  })

  it("honors semantic and exact per-field role hints", () => {
    const data = [
      { rowKey: 1, bucket: 10, recordedAt: "2025-01-01", totalBytes: 400 },
      { rowKey: 2, bucket: 20, recordedAt: "2025-01-02", totalBytes: 650 },
      { rowKey: 3, bucket: 10, recordedAt: "2025-01-03", totalBytes: 500 },
    ]
    const profile = profileData(data, {
      fieldRoles: {
        rowKey: "identifier",
        bucket: "category",
        recordedAt: "temporal",
        totalBytes: "measure",
      },
    })

    expect(profile.primary).toMatchObject({
      x: "recordedAt",
      y: "totalBytes",
      category: "bucket",
      time: "recordedAt",
    })
    expect(profile.candidates.category[0]).toMatchObject({
      field: "bucket",
      hinted: true,
    })
    expect(profile.fieldRoles?.totalBytes).toEqual(["measure"])
  })

  it("re-derives primary fields and dependent counts after candidate edits", () => {
    const profile = profileData([
      { id: 1, region: "west", product: "A", amount: 10 },
      { id: 2, region: "east", product: "A", amount: 20 },
      { id: 3, region: "west", product: "B", amount: 30 },
    ], { identifiers: ["id"] })

    const edited = rederiveProfile({
      ...profile,
      candidates: {
        ...profile.candidates,
        category: [
          ...profile.candidates.category.filter((candidate) => candidate.field === "product"),
          ...profile.candidates.category.filter((candidate) => candidate.field !== "product"),
        ],
        series: [
          ...profile.candidates.series.filter((candidate) => candidate.field === "region"),
          ...profile.candidates.series.filter((candidate) => candidate.field !== "region"),
        ],
      },
    })
    expect(edited.primary.category).toBe("product")
    expect(edited.categoryCount).toBe(2)
    expect(edited.primary.series).toBe("region")
    expect(edited.seriesCount).toBe(2)
    expect(profile.primary).not.toBe(edited.primary)

    expect(() =>
      rederiveProfile(
        { ...profile, fieldRoles: undefined },
        { primary: { y: "id" } },
      ),
    ).toThrow(/identifier, ignored, or not a candidate/i)
  })
})
