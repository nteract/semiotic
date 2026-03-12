import { describe, it, expect } from "vitest"
import { loess } from "./loess"

describe("loess", () => {
  // ── Edge cases ────────────────────────────────────────────────────────

  it("returns an empty array for empty input", () => {
    expect(loess([])).toEqual([])
  })

  it("returns the single point unchanged for single-element input", () => {
    const result = loess([[5, 10]])
    expect(result).toEqual([[5, 10]])
  })

  it("returns both points unchanged for two-element input", () => {
    const result = loess([
      [1, 2],
      [3, 6],
    ])
    expect(result).toHaveLength(2)
    expect(result[0][0]).toBe(1)
    expect(result[1][0]).toBe(3)
    // With only two points, the fit should pass through (or very close to) them
    expect(result[0][1]).toBeCloseTo(2, 5)
    expect(result[1][1]).toBeCloseTo(6, 5)
  })

  // ── Linear data (y = 2x) ─────────────────────────────────────────────

  it("approximates a line for linear data (y = 2x)", () => {
    const points: [number, number][] = []
    for (let x = 0; x <= 10; x++) {
      points.push([x, 2 * x])
    }

    const result = loess(points, 0.5)
    expect(result).toHaveLength(points.length)

    // Each smoothed value should be very close to the true value
    for (const [x, ySmoothed] of result) {
      expect(ySmoothed).toBeCloseTo(2 * x, 1)
    }
  })

  it("returns results sorted by x even when input is unsorted", () => {
    const points: [number, number][] = [
      [5, 10],
      [1, 2],
      [3, 6],
      [2, 4],
      [4, 8],
    ]

    const result = loess(points)
    for (let i = 1; i < result.length; i++) {
      expect(result[i][0]).toBeGreaterThanOrEqual(result[i - 1][0])
    }
  })

  // ── Quadratic data (y = x^2) ─────────────────────────────────────────

  it("follows a quadratic curve (y = x^2) with low bandwidth", () => {
    const points: [number, number][] = []
    for (let x = -5; x <= 5; x++) {
      points.push([x, x * x])
    }

    const result = loess(points, 0.4)
    expect(result).toHaveLength(points.length)

    // LOESS with reasonable bandwidth should track the curve
    // Allow some deviation since it's locally linear, not quadratic
    for (const [x, ySmoothed] of result) {
      const trueY = x * x
      // Interior points should be reasonably close
      if (Math.abs(x) <= 3) {
        expect(Math.abs(ySmoothed - trueY)).toBeLessThan(5)
      }
    }
  })

  // ── Outlier smoothing ─────────────────────────────────────────────────

  it("smooths outliers in otherwise linear data", () => {
    const points: [number, number][] = []
    for (let x = 0; x <= 20; x++) {
      points.push([x, x])
    }
    // Insert an extreme outlier
    points[10] = [10, 100]

    const result = loess(points, 0.5)
    const smoothedAt10 = result.find(([x]) => x === 10)
    expect(smoothedAt10).toBeDefined()

    // The smoothed value at x=10 should be pulled toward the true line (y=10)
    // rather than staying at the outlier value (100)
    expect(smoothedAt10![1]).toBeLessThan(50)
  })

  // ── Bandwidth effects ─────────────────────────────────────────────────

  it("produces a smoother curve with higher bandwidth", () => {
    // Noisy sine wave
    const points: [number, number][] = []
    for (let i = 0; i < 30; i++) {
      const x = i / 3
      const noise = (i % 3 - 1) * 2
      points.push([x, Math.sin(x) + noise])
    }

    const lowBandwidth = loess(points, 0.2)
    const highBandwidth = loess(points, 0.8)

    // Calculate variance of second differences (measure of roughness)
    const roughness = (result: [number, number][]) => {
      let sum = 0
      for (let i = 1; i < result.length - 1; i++) {
        const d2 = result[i - 1][1] - 2 * result[i][1] + result[i + 1][1]
        sum += d2 * d2
      }
      return sum
    }

    // Higher bandwidth should give a smoother (less rough) curve
    expect(roughness(highBandwidth)).toBeLessThan(roughness(lowBandwidth))
  })

  it("with bandwidth = 1.0 uses all points for each local fit", () => {
    const points: [number, number][] = [
      [1, 2],
      [2, 4],
      [3, 6],
      [4, 8],
      [5, 10],
    ]

    const result = loess(points, 1.0)
    expect(result).toHaveLength(5)

    // With all points used, for perfectly linear data it should still be exact
    for (const [x, ySmoothed] of result) {
      expect(ySmoothed).toBeCloseTo(2 * x, 1)
    }
  })

  // ── Constant data ─────────────────────────────────────────────────────

  it("handles constant y values", () => {
    const points: [number, number][] = [
      [1, 5],
      [2, 5],
      [3, 5],
      [4, 5],
      [5, 5],
    ]

    const result = loess(points, 0.5)
    for (const [, ySmoothed] of result) {
      expect(ySmoothed).toBeCloseTo(5, 5)
    }
  })

  // ── Duplicate x values ────────────────────────────────────────────────

  it("handles duplicate x values gracefully", () => {
    const points: [number, number][] = [
      [1, 2],
      [1, 4],
      [2, 6],
      [2, 8],
      [3, 10],
    ]

    const result = loess(points, 0.5)
    expect(result).toHaveLength(5)
    // Should not throw or produce NaN
    for (const [, ySmoothed] of result) {
      expect(isFinite(ySmoothed)).toBe(true)
    }
  })
})
