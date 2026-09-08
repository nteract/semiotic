import { describe, expect, it } from "vitest"
import { numericTickFormatter } from "./numericTickFormatter"

describe("numeric presentation defaults", () => {
  it.each([
    [0.001, "0.001"],
    [-0.00025, "-0.00025"],
    [1e-308, "1e-308"],
    [1e308, "1e+308"],
    [0.30000000000000004, "0.3"],
    [123.456789, "123.457"],
    [-0, "0"],
    [Infinity, "Infinity"],
    [NaN, "NaN"]
  ])("formats %s as %s", (value, expected) => {
    expect(numericTickFormatter([])(value as number)).toBe(expected)
  })

  it("retains significant digits for narrow domains in either direction", () => {
    const values = [1.000001, 1.000002, 1.000003]
    for (const ticks of [values, [...values].reverse()]) {
      const format = numericTickFormatter(ticks)
      expect(values.map(format)).toEqual(["1.000001", "1.000002", "1.000003"])
    }
  })
})
