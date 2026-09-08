import { describe, it, expect } from "vitest"
import { loess } from "./loess"

function variance(values: number[]): number {
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  return values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
}

describe("loess", () => {
  it("returns a copy for 0 points", () => {
    const input: [number, number][] = []
    const result = loess(input)
    expect(result).toEqual([])
    expect(result).not.toBe(input)
  })

  it("returns a copy for 1 point", () => {
    const input: [number, number][] = [[5, 10]]
    const result = loess(input)
    expect(result).toEqual([[5, 10]])
    expect(result).not.toBe(input)
  })

  it("works with 2 points and returns same x values", () => {
    const result = loess([[1, 2], [3, 6]])
    expect(result).toHaveLength(2)
    expect(result[0][0]).toBe(1)
    expect(result[1][0]).toBe(3)
  })

  it("produces values close to original for linear data (y = 2x + 1)", () => {
    const points: [number, number][] = []
    for (let i = 0; i < 20; i++) {
      points.push([i, 2 * i + 1])
    }
    const result = loess(points)
    for (let i = 0; i < result.length; i++) {
      const expected = 2 * result[i][0] + 1
      expect(result[i][1]).toBeCloseTo(expected, 5)
    }
  })

  it("reduces variance compared to noisy input", () => {
    const noiseValues = [
      3.2, -2.1, 4.5, -1.8, 2.9, -3.4, 1.7, -0.5, 3.8, -2.7,
      1.1, -4.0, 2.3, -1.2, 3.6, -0.9, 2.0, -3.1, 4.2, -2.4,
    ]
    const points: [number, number][] = []
    for (let i = 0; i < 20; i++) {
      points.push([i, i + noiseValues[i]])
    }

    const result = loess(points)
    const inputYVariance = variance(points.map((p) => p[1]))
    const outputYVariance = variance(result.map((p) => p[1]))
    expect(outputYVariance).toBeLessThan(inputYVariance)
  })

  it("sorts output by x regardless of input order", () => {
    const points: [number, number][] = [[5, 10], [1, 2], [3, 6], [2, 4], [4, 8]]
    const result = loess(points)
    for (let i = 1; i < result.length; i++) {
      expect(result[i][0]).toBeGreaterThanOrEqual(result[i - 1][0])
    }
  })

  it("higher bandwidth produces smoother (lower variance) output", () => {
    const noiseValues = [
      1.5, -0.8, 2.1, -1.3, 0.9, -2.0, 1.2, -0.4, 1.8, -1.6,
      0.7, -2.3, 1.4, -0.6, 2.0, -1.1, 0.5, -1.9, 1.7, -0.3,
    ]
    const points: [number, number][] = []
    for (let i = 0; i < 20; i++) {
      points.push([i, i + noiseValues[i]])
    }

    const lowBW = loess(points, 0.2)
    const highBW = loess(points, 0.8)
    const lowVariance = variance(lowBW.map((p) => p[1]))
    const highVariance = variance(highBW.map((p) => p[1]))
    expect(highVariance).toBeLessThanOrEqual(lowVariance)
  })

  it("preserves x coordinates (output xs match sorted input xs)", () => {
    const points: [number, number][] = [[10, 5], [3, 7], [7, 2], [1, 9], [5, 4]]
    const result = loess(points)
    const sortedXs = points.map((p) => p[0]).sort((a, b) => a - b)
    const resultXs = result.map((p) => p[0])
    expect(resultXs).toEqual(sortedXs)
  })

  it("handles duplicate x values", () => {
    const points: [number, number][] = [[1, 2], [1, 4], [2, 6], [3, 8]]
    const result = loess(points)
    expect(result).toHaveLength(4)
    for (const [x, y] of result) {
      expect(Number.isFinite(x)).toBe(true)
      expect(Number.isFinite(y)).toBe(true)
    }
  })

  it("moves past duplicate x values to reach a distant cluster", () => {
    const points: [number, number][] = [[0, 1], [0, 2], [0, 3], [10, 20], [10.5, 40], [11, 45]]
    const result = loess(points, 0)
    expect(result.slice(3)).toEqual([[10, 20], [10.5, 40], [11, 45]])
  })

  it("uses every coincident point when the neighbor radius is zero", () => {
    const points: [number, number][] = [[2, 1], [2, 4], [2, 7], [2, 12]]
    expect(loess(points, 0)).toEqual(points.map(([x]) => [x, 6]))
  })

  it("includes nearby fractional x values in the zero-radius fallback", () => {
    const points: [number, number][] = [[0, 2], [0, 4], [0, 6], [0.25, 9], [0.5, -4], [2, 7]]
    const result = loess(points, 0)
    for (const point of result.slice(0, 3)) {
      expect(point).toEqual([0, 4.996750539638965])
    }
    expect(result.slice(3)).toEqual(points.slice(3))
  })

  it("assigns zero weight to points exactly on the neighbor radius", () => {
    const result = loess([[-1, 100], [0, 5], [1, 99], [2, 11]], 0.75)
    expect(result[1]).toEqual([0, 5])
  })

  it("preserves the input order and point tuples", () => {
    const points: [number, number][] = [[4, 3], [1, 5], [3, 2], [2, 8]]
    const original = points.map((point) => [...point])
    points.forEach(Object.freeze)
    Object.freeze(points)
    expect(loess(points).map(([x]) => x)).toEqual([1, 2, 3, 4])
    expect(points).toEqual(original)
  })

  it("handles constant y values — output should be that constant", () => {
    const points: [number, number][] = [[1, 5], [2, 5], [3, 5], [4, 5], [5, 5]]
    const result = loess(points)
    for (const [, y] of result) {
      expect(y).toBeCloseTo(5, 10)
    }
  })

  it("returns the same number of points as the input", () => {
    const points: [number, number][] = []
    for (let i = 0; i < 50; i++) {
      points.push([i, Math.sin(i / 5)])
    }
    const result = loess(points)
    expect(result).toHaveLength(points.length)
  })
})
