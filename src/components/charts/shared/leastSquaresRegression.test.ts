import { describe, expect, it } from "vitest"
import { linearRegression, polynomialRegression } from "./leastSquaresRegression"

describe("least-squares annotation regression", () => {
  it("matches the historical two-decimal linear fit and point shape", () => {
    expect(
      linearRegression([
        [-1, -0.1],
        [0, 1.234],
        [1, 2.718],
        [2, 4.01]
      ])
    ).toEqual({
      points: [
        [-1, -0.1],
        [0, 1.28],
        [1, 2.66],
        [2, 4.04]
      ],
      equation: [1.38, 1.28]
    })
  })

  it("retains the zero-gradient behavior for a vertical input domain", () => {
    expect(linearRegression([[2, 1], [2, 4], [2, 7]])).toEqual({
      points: [[2, 4], [2, 4], [2, 4]],
      equation: [0, 4]
    })
  })

  it("matches quadratic coefficient order, rounding, and fitted points", () => {
    expect(
      polynomialRegression([
        [-2, 7.3],
        [-1, 2.1],
        [0, 1.2],
        [1, 3.9],
        [2, 10.2]
      ], 2)
    ).toEqual({
      points: [
        [-2, 7.22],
        [-1, 2.28],
        [0, 1.14],
        [1, 3.8],
        [2, 10.26]
      ],
      // Polynomial equations historically arrive highest-power first.
      equation: [1.9, 0.76, 1.14]
    })
  })

  it("preserves cubic normal-equation operation order", () => {
    expect(
      polynomialRegression([
        [-2, -6.2],
        [-1, 0.4],
        [0, 1.1],
        [1, 2.8],
        [2, 10.7],
        [3, 31.4]
      ], 3)
    ).toEqual({
      points: [
        [-2, -6.18],
        [-1, 0.3],
        [0, 1.24],
        [1, 2.7],
        [2, 10.74],
        [3, 31.42]
      ],
      equation: [1.01, 0.26, 0.19, 1.24]
    })
  })
})
