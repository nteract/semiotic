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

/**
 * Full-precision (unrounded) linear fit for forecast prediction-interval
 * math — unlike {@link linearRegression}, which rounds gradient/intercept to
 * two decimals for display. That rounding is fine for a trend-line
 * annotation but would leak into the residual/standard-error/interval math
 * a forecast band computes from `predict`. Returns null when x has zero
 * variance (singular normal equations) rather than falling back to a
 * zero-gradient line, so callers can skip rendering instead of drawing a
 * misleading flat forecast. Shared by the `forecast` annotation rule
 * (`annotationRules.tsx`) and the LineChart forecast-segment overlay
 * (`statisticalOverlays.ts`).
 */
export function fitLinearForForecast(
  points: ReadonlyArray<readonly [number, number]>
): ((x: number) => number) | null {
  const n = points.length
  let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0
  for (const [x, y] of points) {
    sumX += x; sumY += y; sumXX += x * x; sumXY += x * y
  }
  const det = n * sumXX - sumX * sumX
  if (Math.abs(det) < 1e-12) return null
  const slope = (n * sumXY - sumX * sumY) / det
  const intercept = (sumY - slope * sumX) / n
  return (x: number) => intercept + slope * x
}

/**
 * Residual standard error plus the mean/sum-of-squared-deviations of x that
 * a forecast prediction-interval formula needs, given training points and an
 * already-fitted `predict` (linear or polynomial — this part doesn't care
 * which). Shared by the same two forecast call sites as
 * {@link fitLinearForForecast}.
 */
export function forecastIntervalStats(
  points: ReadonlyArray<readonly [number, number]>,
  predict: (x: number) => number
): { se: number; meanX: number; ssX: number } {
  const n = points.length
  const residuals = points.map(([x, y]) => y - predict(x))
  const sse = residuals.reduce((s, r) => s + r * r, 0)
  const se = Math.sqrt(sse / Math.max(n - 2, 1))
  const meanX = points.reduce((s, p) => s + p[0], 0) / n
  const ssX = points.reduce((s, p) => s + (p[0] - meanX) ** 2, 0)
  return { se, meanX, ssX }
}

/**
 * Approximate z-score for the common one/two-sided confidence levels a
 * forecast/envelope prediction interval rounds to. Shared by the same two
 * forecast call sites as {@link fitLinearForForecast}.
 */
export function confidenceZScore(confidence: number): number {
  return confidence >= 0.99 ? 2.576
    : confidence >= 0.95 ? 1.96
    : confidence >= 0.9 ? 1.645
    : 1.0
}
