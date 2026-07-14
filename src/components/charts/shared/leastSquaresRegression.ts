export type RegressionPoint = [number, number]

export interface LeastSquaresResult {
  points: RegressionPoint[]
  /**
   * Linear: `[slope, intercept]`. Polynomial: highest power first, matching
   * the historical `regression` package result consumed by annotations.
   */
  equation: number[]
}

const PRECISION = 2

function round(number: number): number {
  const factor = 10 ** PRECISION
  return Math.round(number * factor) / factor
}

/**
 * Solve the normal-equation matrix using the same column-oriented Gaussian
 * elimination order as the former dependency. Keeping the operation order is
 * important because coefficients are rounded before predictions are made.
 */
function gaussianElimination(input: number[][], order: number): number[] {
  const matrix = input
  const n = input.length - 1
  const coefficients = [order]

  for (let i = 0; i < n; i++) {
    let maxrow = i
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(matrix[i][j]) > Math.abs(matrix[i][maxrow])) {
        maxrow = j
      }
    }

    for (let k = i; k < n + 1; k++) {
      const tmp = matrix[k][i]
      matrix[k][i] = matrix[k][maxrow]
      matrix[k][maxrow] = tmp
    }

    for (let j = i + 1; j < n; j++) {
      for (let k = n; k >= i; k--) {
        matrix[k][j] -= (matrix[k][i] * matrix[i][j]) / matrix[i][i]
      }
    }
  }

  for (let j = n - 1; j >= 0; j--) {
    let total = 0
    for (let k = j + 1; k < n; k++) {
      total += matrix[k][j] * coefficients[k]
    }
    coefficients[j] = (matrix[n][j] - total) / matrix[j][j]
  }

  return coefficients
}

/** Fit a two-parameter least-squares line with two-decimal output rounding. */
export function linearRegression(
  data: ReadonlyArray<readonly [number, number | null]>
): LeastSquaresResult {
  const sum = [0, 0, 0, 0]
  let len = 0

  for (const [x, y] of data) {
    if (y !== null) {
      len++
      sum[0] += x
      sum[1] += y
      sum[2] += x * x
      sum[3] += x * y
    }
  }

  const run = len * sum[2] - sum[0] * sum[0]
  const rise = len * sum[3] - sum[0] * sum[1]
  const gradient = run === 0 ? 0 : round(rise / run)
  const intercept = round(sum[1] / len - (gradient * sum[0]) / len)
  const points: RegressionPoint[] = data.map(([x]) => [
    round(x),
    round(gradient * x + intercept)
  ])

  return {
    points,
    equation: [gradient, intercept]
  }
}

/**
 * Fit an order-N polynomial using normal equations. Coefficients and predicted
 * points use the former dependency's two-decimal rounding and equation order.
 */
export function polynomialRegression(
  data: ReadonlyArray<readonly [number, number | null]>,
  order = 2
): LeastSquaresResult {
  const lhs: number[] = []
  const rhs: number[][] = []
  const k = order + 1

  for (let i = 0; i < k; i++) {
    let a = 0
    for (const [x, y] of data) {
      if (y !== null) a += (x ** i) * y
    }
    lhs.push(a)

    const row: number[] = []
    for (let j = 0; j < k; j++) {
      let b = 0
      for (const [x, y] of data) {
        if (y !== null) b += x ** (i + j)
      }
      row.push(b)
    }
    rhs.push(row)
  }
  rhs.push(lhs)

  // Ascending power order is used for prediction; the public equation shape
  // is reversed below to retain the dependency's historical contract.
  const coefficients = gaussianElimination(rhs, k).map(round)
  const points: RegressionPoint[] = data.map(([x]) => [
    round(x),
    round(
      coefficients.reduce(
        (sum, coefficient, power) => sum + coefficient * (x ** power),
        0
      )
    )
  ])

  return {
    points,
    equation: [...coefficients].reverse()
  }
}
