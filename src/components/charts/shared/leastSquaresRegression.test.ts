import { describe, expect, it } from "vitest"
import {
  linearRegression,
  polynomialRegression,
  forecastIntervalStats
} from "./leastSquaresRegression"

import { forecastModel } from "./forecastModel"

const epoch = Date.UTC(2026, 0, 1)
const day = 86400000

describe("least-squares annotation regression", () => {
  it("retains full precision for a noisy least-squares fit", () => {
    const fit = linearRegression([
      [-1, -0.1],
      [0, 1.234],
      [1, 2.718],
      [2, 4.01]
    ])
    expect(fit.points).toHaveLength(4)
    expect(fit.predict(1) - fit.predict(0)).toBeCloseTo(1.3814, 12)
    expect(fit.predict(0)).toBeCloseTo(1.2748, 12)
  })

  it("retains small slopes and predictions on timestamp domains", () => {
    const points: [number, number][] = Array.from({ length: 30 }, (_, i) => [
      epoch + i * day,
      10 + 5 * i
    ])
    const fit = linearRegression(points)
    expect(fit.predict(epoch + 1) - fit.predict(epoch)).toBeCloseTo(5 / day, 14)
    expect(fit.points).toHaveLength(points.length)
    fit.points.forEach((p, i) => expect(p[1]).toBeCloseTo(10 + 5 * i, 10))
    expect(forecastModel(points, {})!.predict(epoch + 30 * day)).toBeCloseTo(160, 10)
  })

  it("does not quantize small x or y coordinates", () => {
    const points: [number, number][] = [
      [0, 0],
      [0.001, 0.003],
      [0.002, 0.006],
      [0.003, 0.009]
    ]
    linearRegression(points).points.forEach(([x, y], i) => {
      expect(x).toBe(points[i][0])
      expect(y).toBeCloseTo(points[i][1], 14)
    })
  })

  it("retains a mean trend but declines forecasting a singular x domain", () => {
    const points: [number, number][] = [
      [2, 1],
      [2, 4],
      [2, 7]
    ]
    expect(linearRegression(points).points).toEqual([
      [2, 4],
      [2, 4],
      [2, 4]
    ])
    expect(forecastModel(points, {})).toBeNull()
  })

  it("fits and extrapolates quadratic and cubic data", () => {
    for (const coefficients of [
      [2, 3, 4],
      [1.01, 0.26, 0.19, 1.24]
    ]) {
      const points: [number, number][] = Array.from({ length: 9 }, (_, i) => {
        const x = i - 4
        return [x, coefficients.reduce((y, c) => y * x + c, 0)]
      })
      const fit = polynomialRegression(points, coefficients.length - 1)
      expect(fit.predict(5)).toBeCloseTo(
        coefficients.reduce((y, c) => y * 5 + c, 0),
        10
      )
      expect(fit.points).toHaveLength(points.length)
      fit.points.forEach((p, i) => expect(p[1]).toBeCloseTo(points[i][1], 10))
    }
  })

  it("uses polynomial leverage and residual degrees of freedom for intervals", () => {
    const points: [number, number][] = [
      [-2, 1],
      [-1, 2],
      [0, 1],
      [1, 2],
      [2, 1]
    ]
    const fit = polynomialRegression(points)
    // For x = -2,-1,0,1,2, the quadratic design has leverage 17/35 at
    // x=0 and 23/5 at x=3. Its residual SSE here is 32/35 on two df.
    expect(fit.leverage!(0)).toBeCloseTo(17 / 35, 12)
    expect(fit.leverage!(3)).toBeCloseTo(23 / 5, 12)
    expect(forecastIntervalStats(points, fit.predict, 3).se).toBeCloseTo(
      Math.sqrt(16 / 35),
      12
    )
  })

  it("fits polynomial timestamp domains without cancellation", () => {
    const points: [number, number][] = Array.from({ length: 10 }, (_, i) => [
      epoch + i * day,
      2 * i * i + 3 * i + 4
    ])
    const fit = polynomialRegression(points)
    expect(fit.points).toHaveLength(points.length)
    fit.points.forEach((p, i) => expect(p[1]).toBeCloseTo(points[i][1], 8))
  })
})
