import { describe, expect, it } from "vitest"
import { formatProcessSankeyTime, isProcessSankeyDateDomain, toProcessSankeyTime } from "./time"

describe("toProcessSankeyTime", () => {
  it("passes through finite numbers", () => {
    expect(toProcessSankeyTime(0)).toBe(0)
    expect(toProcessSankeyTime(1861.5)).toBe(1861.5)
  })

  it("converts Date to epoch ms", () => {
    const d = new Date("1970-01-01T00:00:00.000Z")
    expect(toProcessSankeyTime(d)).toBe(0)
  })

  it("parses ISO strings", () => {
    expect(toProcessSankeyTime("1970-01-01T00:00:00.000Z")).toBe(0)
    expect(toProcessSankeyTime("2026-02-01T12:30:45.125")).toBe(Date.UTC(2026, 1, 1, 12, 30, 45, 125))
    expect(toProcessSankeyTime("2026-02-01T14:30:45.125+02:00")).toBe(Date.UTC(2026, 1, 1, 12, 30, 45, 125))
    expect(toProcessSankeyTime("2026-2-1")).toBe(Date.UTC(2026, 1, 1))
  })

  it("keeps numeric strings in the numeric domain", () => {
    for (const value of ["12", "14", "1763", "-3.5", "1.25e3", " 0 "]) {
      expect(toProcessSankeyTime(value)).toBe(Number(value))
    }
    expect(isProcessSankeyDateDomain(["1763", "2025"])).toBe(false)
    expect(isProcessSankeyDateDomain(["2026-01-01", "2026-01-02"])).toBe(true)
    expect(isProcessSankeyDateDomain([new Date(0), new Date(1)])).toBe(true)
  })

  it("rejects ambiguous dates, impossible dates, and non-time values", () => {
    for (const value of ["02/01/2026", "February 1 2026", "2026-02-30", "2026-02-30T12:00", "2026-01-01T26:00", "", " ", "Infinity", Infinity, false, {}]) {
      expect(toProcessSankeyTime(value)).toBeNaN()
    }
  })

  it("formats dates without discarding time-of-day and never guesses from magnitude", () => {
    expect(formatProcessSankeyTime(0, true)).toBe("1970-01-01")
    expect(formatProcessSankeyTime(Date.UTC(2026, 0, 1, 12, 30), true)).toBe("2026-01-01T12:30:00Z")
    expect(formatProcessSankeyTime(Date.UTC(2026, 0, 1, 12, 30, 0, 5), true)).toBe("2026-01-01T12:30:00.005Z")
    expect(formatProcessSankeyTime(1e12, false)).toBe("1000000000000")
    expect(formatProcessSankeyTime(0.001, false)).toBe("0.001")
  })

  it("returns NaN for nullish values", () => {
    expect(Number.isNaN(toProcessSankeyTime(null))).toBe(true)
    expect(Number.isNaN(toProcessSankeyTime(undefined))).toBe(true)
  })
})
