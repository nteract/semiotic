import { getMax, getMin, getMinMax } from "./minMax"

describe("loop-based numeric extrema", () => {
  it("measures large inputs without exceeding the function argument limit", () => {
    const values = Array.from({ length: 300_000 }, (_, index) => index - 150_000)
    expect(getMinMax(values)).toEqual([-150_000, 149_999])
    expect(getMin(values)).toBe(-150_000)
    expect(getMax(values)).toBe(149_999)
  })

  it("supports iterable values and geometry accessors", () => {
    expect(getMinMax(new Set([8, -4, 3]))).toEqual([-4, 8])
    expect(getMinMax([{ x: 8 }, { x: -4 }], (point) => point.x)).toEqual([-4, 8])
    expect(getMin(new Set([8, -4]))).toBe(-4)
    expect(getMax(new Set([8, -4]))).toBe(8)
  })

  it("retains empty-input fallbacks and skips NaN", () => {
    expect(getMinMax([])).toEqual([Infinity, -Infinity])
    expect(getMin([], 0)).toBe(0)
    expect(getMax([], 1)).toBe(1)
    expect(getMinMax([NaN, 4, -2])).toEqual([-2, 4])
    expect(getMinMax([Infinity, -Infinity])).toEqual([-Infinity, Infinity])
  })
})
