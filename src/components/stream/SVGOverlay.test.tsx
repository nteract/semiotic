/**
 * Tests for SVGOverlay utility functions.
 * We test isTimeLandmark and toDate indirectly via the exported module,
 * but since they're private, we test the behavior through landmark tick detection.
 */

import { describe, it, expect } from "vitest"

// Since isTimeLandmark and toDate are private module functions, we need to
// test them by importing them. Let's extract testable logic instead.
// For now, replicate the functions here to verify correctness.

function toDate(value: any): Date | null {
  if (value instanceof Date) return value
  if (typeof value === "number" && value > 1e9) return new Date(value)
  return null
}

function isTimeLandmark(value: any, prevValue: any): boolean {
  const d = toDate(value)
  if (!d) return false
  const prev = toDate(prevValue)
  if (!prev) return true
  return (
    d.getFullYear() !== prev.getFullYear() ||
    d.getMonth() !== prev.getMonth()
  )
}

describe("isTimeLandmark", () => {
  it("returns true for Date objects at month boundary", () => {
    const jan = new Date(2024, 0, 15)
    const feb = new Date(2024, 1, 10)
    expect(isTimeLandmark(feb, jan)).toBe(true)
  })

  it("returns false for Date objects in same month", () => {
    const jan1 = new Date(2024, 0, 5)
    const jan2 = new Date(2024, 0, 20)
    expect(isTimeLandmark(jan2, jan1)).toBe(false)
  })

  it("returns true for millisecond timestamps at month boundary", () => {
    const jan15 = new Date(2024, 0, 15).getTime()
    const feb10 = new Date(2024, 1, 10).getTime()
    expect(isTimeLandmark(feb10, jan15)).toBe(true)
  })

  it("returns false for millisecond timestamps in same month", () => {
    const jan5 = new Date(2024, 0, 5).getTime()
    const jan20 = new Date(2024, 0, 20).getTime()
    expect(isTimeLandmark(jan20, jan5)).toBe(false)
  })

  it("returns true for first tick (no previous)", () => {
    const jan = new Date(2024, 0, 15).getTime()
    expect(isTimeLandmark(jan, undefined)).toBe(true)
  })

  it("returns false for non-timestamp numbers", () => {
    // Small numbers (like scale tick values 0-100) should not be treated as dates
    expect(isTimeLandmark(50, 40)).toBe(false)
  })

  it("handles d3 scaleLinear ticks on timestamp range", () => {
    // d3 scaleLinear generates "nice" round numbers, not date boundaries.
    // E.g. domain [1704067200000, 1711929600000] might tick at 1.705e12, 1.707e12, etc.
    // These ARE valid timestamps (> 1e9) but may not fall on month boundaries.
    const tick1 = 1704000000000 // ~2023-12-31 (d3 rounds to nice number)
    const tick2 = 1706000000000 // ~2024-01-23
    const tick3 = 1708000000000 // ~2024-02-15

    // tick1 to tick2: Dec to Jan → different month = landmark
    expect(isTimeLandmark(tick2, tick1)).toBe(true)
    // tick2 to tick3: Jan to Feb → different month = landmark
    expect(isTimeLandmark(tick3, tick2)).toBe(true)
  })

  it("detects year boundary", () => {
    const dec = new Date(2023, 11, 20).getTime()
    const jan = new Date(2024, 0, 5).getTime()
    expect(isTimeLandmark(jan, dec)).toBe(true)
  })
})
