import { parseWindowDuration } from "./parseWindowDuration"

describe("parseWindowDuration", () => {
  it("passes finite positive numbers through as milliseconds", () => {
    expect(parseWindowDuration(1000)).toBe(1000)
    expect(parseWindowDuration(1)).toBe(1)
  })

  it("rejects non-positive / non-finite numbers", () => {
    expect(parseWindowDuration(0)).toBeNull()
    expect(parseWindowDuration(-5)).toBeNull()
    expect(parseWindowDuration(NaN)).toBeNull()
    expect(parseWindowDuration(Infinity)).toBeNull()
  })

  it("parses single-unit strings", () => {
    expect(parseWindowDuration("500ms")).toBe(500)
    expect(parseWindowDuration("10s")).toBe(10_000)
    expect(parseWindowDuration("1m")).toBe(60_000)
    expect(parseWindowDuration("2h")).toBe(7_200_000)
    expect(parseWindowDuration("1d")).toBe(86_400_000)
  })

  it("disambiguates ms from m", () => {
    expect(parseWindowDuration("1ms")).toBe(1)
    expect(parseWindowDuration("1m")).toBe(60_000)
  })

  it("parses decimal amounts", () => {
    expect(parseWindowDuration("1.5s")).toBe(1500)
    expect(parseWindowDuration("0.5m")).toBe(30_000)
  })

  it("sums compound terms", () => {
    expect(parseWindowDuration("1m30s")).toBe(90_000)
    expect(parseWindowDuration("1h1m1s")).toBe(3_661_000)
  })

  it("trims surrounding whitespace", () => {
    expect(parseWindowDuration("  1m  ")).toBe(60_000)
  })

  it("rejects unparseable strings", () => {
    expect(parseWindowDuration("")).toBeNull()
    expect(parseWindowDuration("   ")).toBeNull()
    expect(parseWindowDuration("10")).toBeNull() // no unit
    expect(parseWindowDuration("abc")).toBeNull()
    expect(parseWindowDuration("1m!")).toBeNull() // trailing junk
    expect(parseWindowDuration("1y")).toBeNull() // unknown unit
    expect(parseWindowDuration("m1")).toBeNull() // wrong order
  })
})
