import { describe, expect, it, vi } from "vitest"
import { activeCountOverDomain } from "./intervals"

describe("activeCountOverDomain", () => {
  it.each([
    ["closed", [2, 1, 3, 3, 5, 2, 2]],
    ["half-open", [1, 1, 3, 3, 2, 1, 2]]
  ] as const)(
    "preserves %s boundaries, duplicates, and unbounded intervals",
    (bounds, expected) => {
      const intervals = Object.freeze(
        [
          { start: -Infinity, end: Infinity },
          { start: 0, end: 2 },
          { start: 2, end: 3 },
          { start: 0, end: 2 },
          { start: 2, end: 2 },
          { start: 3, end: 1 },
          { start: NaN, end: 4 },
          { start: 1, end: NaN },
          { start: -Infinity, end: -2 },
          { start: 4, end: Infinity }
        ].map(Object.freeze)
      )
      const counts = activeCountOverDomain(intervals, {
        domain: [-2, 4],
        bounds
      })
      expect(counts.map((point) => point.value)).toEqual([
        -2, -1, 0, 1, 2, 3, 4
      ])
      expect(counts.map((point) => point.count)).toEqual(expected)
    }
  )

  it.each(["closed", "half-open"] as const)(
    "keeps floating-point sample positions and %s endpoint comparisons",
    (bounds) => {
      const intervals = [
        { start: 0.3, end: 0.8 },
        { start: 0, end: 0.3 },
        { start: 0.8, end: 1 },
        { start: 0.6, end: 0.6 }
      ]
      const expected = []
      for (let value = 0; value <= 1; value += 0.1) {
        expected.push({
          value,
          count: intervals.filter(
            ({ start, end }) =>
              start <= value &&
              (bounds === "half-open" ? value < end : value <= end)
          ).length
        })
      }
      expect(
        activeCountOverDomain(intervals, { domain: [0, 1], step: 0.1, bounds })
      ).toEqual(expected)
      expect(expected.at(-1)!.value).toBe(0.9999999999999999)
    }
  )

  it("resolves each endpoint once for a densely sampled domain", () => {
    const intervals = [
      { from: 3, to: 80 },
      { from: 10, to: 40 },
      { from: 50, to: 90 }
    ]
    const start = vi.fn((item: (typeof intervals)[number]) => item.from)
    const end = vi.fn((item: (typeof intervals)[number]) => item.to)
    const counts = activeCountOverDomain(intervals, {
      domain: [0, 100],
      start,
      end
    })
    expect(counts).toHaveLength(101)
    expect(counts[20]).toEqual({ value: 20, count: 2 })
    expect(counts[85]).toEqual({ value: 85, count: 1 })
    expect(start).toHaveBeenCalledTimes(intervals.length)
    expect(end).toHaveBeenCalledTimes(intervals.length)
  })

  it("retains direct counting for a single sample of many intervals", () => {
    const intervals = Array.from({ length: 1000 }, (_, i) => ({
      start: i,
      end: i + 10
    }))
    expect(activeCountOverDomain(intervals, { domain: [100, 100] })).toEqual([
      { value: 100, count: 11 }
    ])
    expect(
      activeCountOverDomain(intervals, {
        domain: [100, 100],
        bounds: "half-open"
      })
    ).toEqual([{ value: 100, count: 10 }])
  })

  it("retains field accessor coercion for dates, numeric strings, and null", () => {
    const intervals = [
      { from: new Date(0), to: new Date(5) },
      { from: "2", to: "7" },
      { from: null, to: "2" },
      { from: undefined, to: "7" }
    ]
    const counts = activeCountOverDomain(intervals, {
      domain: [0, 8],
      start: "from",
      end: "to"
    })
    expect(counts.map((point) => point.count)).toEqual([
      2, 2, 3, 2, 2, 2, 1, 1, 0
    ])
  })

  it("does not read items when the domain contains no samples", () => {
    const start = vi.fn(() => 0)
    expect(activeCountOverDomain([{}], { domain: [2, 1], start })).toEqual([])
    expect(
      activeCountOverDomain([{}], { domain: [2, 1], step: -0.1, start })
    ).toEqual([])
    expect(activeCountOverDomain([{}], { domain: [NaN, 1], start })).toEqual([])
    expect(start).not.toHaveBeenCalled()
    expect(activeCountOverDomain([], { domain: [0, 2] })).toEqual([
      { value: 0, count: 0 },
      { value: 1, count: 0 },
      { value: 2, count: 0 }
    ])
  })
})
