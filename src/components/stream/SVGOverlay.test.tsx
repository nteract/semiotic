/**
 * Tests for time landmark detection used by SVGOverlay tick rendering.
 * Tests the shared isTimeLandmark/toDate functions from hitTestUtils.
 */
import { describe, it, expect } from "vitest"
import { toDate, isTimeLandmark } from "./hitTestUtils"

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
    expect(isTimeLandmark(50, 40)).toBe(false)
  })

  it("detects year boundary", () => {
    const dec = new Date(2023, 11, 20).getTime()
    const jan = new Date(2024, 0, 5).getTime()
    expect(isTimeLandmark(jan, dec)).toBe(true)
  })
})

describe("toDate", () => {
  it("returns Date for Date input", () => {
    const d = new Date(2024, 0, 1)
    expect(toDate(d)).toBe(d)
  })

  it("returns Date for large number (timestamp)", () => {
    const ts = new Date(2024, 0, 1).getTime()
    const result = toDate(ts)
    expect(result).toBeInstanceOf(Date)
    expect(result!.getFullYear()).toBe(2024)
  })

  it("returns null for small numbers", () => {
    expect(toDate(42)).toBeNull()
  })

  it("returns null for strings", () => {
    expect(toDate("2024-01-01")).toBeNull()
  })

  it("returns null for null/undefined", () => {
    expect(toDate(null)).toBeNull()
    expect(toDate(undefined)).toBeNull()
  })
})
