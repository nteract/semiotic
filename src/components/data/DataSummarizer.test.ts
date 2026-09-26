import { describe, it, expect } from "vitest"
import { summarizeData } from "./DataSummarizer"

describe("summarizeData", () => {
  it("discloses missing and unsupported cells even when no type can be inferred", () => {
    expect(summarizeData([{ v: null }, { v: " " }, {}, { v: {} }, { v: NaN }]).fields.v).toEqual({
      type: "unknown", observedCount: 2, missingCount: 3, excludedCount: 2
    })
  })

  it("infers from the whole column, independently of row order", () => {
    for (const values of [["1", "abc", "def", "ghi"], [1, "A", "B", true, new Date(0)]]) {
      for (const ordered of [values, [...values].reverse()]) {
        const field = summarizeData(ordered.map(v => ({ v }))).fields.v
        expect(field).toMatchObject({ type: "categorical", observedCount: values.length, missingCount: 0, excludedCount: 0 })
      }
    }
  })

  it("discloses excluded and missing values without coercing booleans or Dates into numbers", () => {
    const values = [1, "2", ".5", "+5", 3, true, new Date(0), "bad", NaN, null, " ", undefined]
    expect(summarizeData(values.map(v => ({ v }))).fields.v).toEqual({
      type: "numeric", min: 0.5, max: 5, mean: 2.3, median: 2,
      observedCount: 9, missingCount: 3, excludedCount: 4
    })
  })

  it("keeps padded identifiers and nondecimal strings categorical", () => {
    for (const value of ["02134", "001", "0x10", "0b11", "0o7"]) {
      expect(summarizeData([{ v: value }]).fields.v).toMatchObject({
        type: "categorical", distinctValues: [value]
      })
    }
  })

  it("uses UTC ISO dates and discloses unsupported date syntax", () => {
    expect(summarizeData([
      { v: "2020-01-01" }, { v: "2020-01-01T00:00:00" },
      { v: "2019-12-31T16:00:00-08:00" }, { v: "2020/01/01" }, { v: "2020-02-30" }
    ]).fields.v).toEqual({
      type: "date", min: "2020-01-01T00:00:00.000Z", max: "2020-01-01T00:00:00.000Z",
      observedCount: 5, missingCount: 0, excludedCount: 2
    })
    expect(summarizeData([{ v: "2020-01-15" }, { v: "Q3" }, { v: "n/a" }]).fields.v.type).toBe("categorical")
  })

  it("preserves source order and summation order while computing the median", () => {
    const data = [
      Object.freeze({ value: 1e16 }),
      Object.freeze({ value: 1 }),
      Object.freeze({ value: -1e16 }),
      Object.freeze({ value: "3" }),
      Object.freeze({ value: NaN })
    ]
    const summary = summarizeData(Object.freeze(data))
    expect(summary.fields.value).toEqual({
      type: "numeric", min: -1e16, max: 1e16, mean: 0.75, median: 2,
      observedCount: 5, missingCount: 0, excludedCount: 1
    })
    expect(summary.sample).toEqual(data)
    expect(summary.sample[0]).toBe(data[0])
  })

  it("preserves the first signed zero for numeric extents", () => {
    expect(summarizeData([{ value: 0 }, { value: -0 }]).fields.value).toMatchObject({ min: 0, max: 0 })
    expect(summarizeData([{ value: -0 }, { value: 0 }]).fields.value).toMatchObject({ min: -0, max: -0 })
  })

  it("ignores invalid dates when determining the date extent", () => {
    expect(summarizeData([
      { date: new Date(NaN) },
      { date: "2024-12-31" },
      { date: "invalid" },
      { date: new Date("2024-01-01") }
    ]).fields.date).toEqual({
      type: "date", min: "2024-01-01T00:00:00.000Z", max: "2024-12-31T00:00:00.000Z",
      observedCount: 4, missingCount: 0, excludedCount: 2
    })
    expect(summarizeData([{ date: new Date(NaN) }]).fields.date).toEqual({
      type: "unknown", observedCount: 1, missingCount: 0, excludedCount: 1
    })
  })

  it("summarizes numeric fields with min/max/mean/median", () => {
    const data = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 30 },
      { x: 4, y: 40 },
    ]
    const summary = summarizeData(data)
    expect(summary.rowCount).toBe(4)
    const x = summary.fields.x
    expect(x.type).toBe("numeric")
    if (x.type === "numeric") {
      expect(x.min).toBe(1)
      expect(x.max).toBe(4)
      expect(x.mean).toBe(2.5)
      expect(x.median).toBe(2.5)
    }
  })

  it("summarizes categorical fields with top values and distinct count", () => {
    const data = [
      { category: "A" },
      { category: "A" },
      { category: "B" },
      { category: "C" },
    ]
    const summary = summarizeData(data)
    const c = summary.fields.category
    expect(c.type).toBe("categorical")
    if (c.type === "categorical") {
      expect(c.distinctCount).toBe(3)
      expect(c.topValues[0]).toEqual({ value: "A", count: 2 })
      expect(c.distinctValues).toEqual(["A", "B", "C"])
    }
  })

  it("detects ISO-like date strings", () => {
    const data = [{ d: "2024-01-15" }, { d: "2024-06-30" }]
    const summary = summarizeData(data)
    const d = summary.fields.d
    expect(d.type).toBe("date")
    if (d.type === "date") {
      expect(d.min.startsWith("2024-01-15")).toBe(true)
      expect(d.max.startsWith("2024-06-30")).toBe(true)
    }
  })

  it("handles Date instances", () => {
    const data = [{ d: new Date("2024-01-01") }, { d: new Date("2024-12-31") }]
    const summary = summarizeData(data)
    expect(summary.fields.d.type).toBe("date")
  })

  it("handles empty data gracefully", () => {
    const summary = summarizeData([])
    expect(summary.rowCount).toBe(0)
    expect(summary.fields).toEqual({})
    expect(summary.sample).toEqual([])
  })

  it("handles null/undefined input", () => {
    expect(summarizeData(null).rowCount).toBe(0)
    expect(summarizeData(undefined).rowCount).toBe(0)
  })

  it("discovers fields across ragged rows", () => {
    const data = [{ a: 1 }, { b: 2 }, { a: 3, b: 4 }]
    const summary = summarizeData(data)
    expect(Object.keys(summary.fields).sort()).toEqual(["a", "b"])
  })

  it("scales to large numeric arrays without stack overflow", () => {
    const data = Array.from({ length: 200_000 }, (_, i) => ({ v: i }))
    const summary = summarizeData(data)
    const v = summary.fields.v
    expect(v.type).toBe("numeric")
    if (v.type === "numeric") {
      expect(v.min).toBe(0)
      expect(v.max).toBe(199_999)
    }
  })

  it("limits sample to sampleSize", () => {
    const data = Array.from({ length: 50 }, (_, i) => ({ i }))
    const summary = summarizeData(data, { sampleSize: 3 })
    expect(summary.sample.length).toBe(3)
  })

  it("returns 'unknown' for fields with only null values", () => {
    const data = [{ x: null }, { x: null }]
    expect(summarizeData(data).fields.x.type).toBe("unknown")
  })
})
