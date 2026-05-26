import { describe, it, expect } from "vitest"
import { profileData } from "./profileData"
import { diffProfile } from "./diffProfile"

describe("diffProfile", () => {
  it("reports unchanged when profiles are equivalent", () => {
    const data = [{ a: 1, b: "x" }, { a: 2, b: "y" }]
    const diff = diffProfile(profileData(data), profileData(data))
    expect(diff.unchanged).toBe(true)
    expect(diff.added).toEqual([])
    expect(diff.removed).toEqual([])
  })

  it("reports row count change", () => {
    const a = profileData([{ x: 1 }, { x: 2 }])
    const b = profileData([{ x: 1 }, { x: 2 }, { x: 3 }])
    const diff = diffProfile(a, b)
    expect(diff.rowCountChange).toBe(1)
  })

  it("reports added and removed fields", () => {
    const a = profileData([{ a: 1, b: 2 }])
    const b = profileData([{ b: 2, c: 3 }])
    const diff = diffProfile(a, b)
    expect(diff.added).toEqual(["c"])
    expect(diff.removed).toEqual(["a"])
  })

  it("reports field type changes", () => {
    const a = profileData([{ x: 1, score: 10 }, { x: 2, score: 20 }])
    const b = profileData([{ x: 1, score: "high" }, { x: 2, score: "low" }])
    const diff = diffProfile(a, b)
    expect(diff.typeChanges.some((c) => c.field === "score" && c.from === "numeric" && c.to === "categorical")).toBe(true)
  })

  it("reports primary role re-assignments", () => {
    const a = profileData([{ value: 10, region: "EU" }, { value: 20, region: "NA" }])
    // Adding a time field should move x's primary from numeric to time
    const b = profileData([
      { value: 10, region: "EU", date: "2025-01-01" },
      { value: 20, region: "NA", date: "2025-02-01" },
    ])
    const diff = diffProfile(a, b)
    const xChange = diff.primaryChanges.find((c) => c.role === "x")
    const timeChange = diff.primaryChanges.find((c) => c.role === "time")
    expect(xChange || timeChange).toBeDefined()
    if (timeChange) {
      expect(timeChange.from).toBeUndefined()
      expect(timeChange.to).toBe("date")
    }
  })

  it("reports charts that become fit/unfit", () => {
    // Single row → 50 rows: histogram should become fit
    const a = profileData([{ value: 10 }])
    const b = profileData(Array.from({ length: 50 }, (_, i) => ({ value: i + Math.random() * 5 })))
    const diff = diffProfile(a, b)
    expect(diff.becameFit).toContain("Histogram")
  })

  it("becameUnfit and becameFit are disjoint", () => {
    const a = profileData([{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 6 }])
    const b = profileData([{ category: "A", value: 10 }, { category: "B", value: 20 }])
    const diff = diffProfile(a, b)
    const overlap = diff.becameFit.filter((c) => diff.becameUnfit.includes(c))
    expect(overlap).toEqual([])
  })
})
