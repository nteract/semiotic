export type RegressionPoint = [number, number]

export interface LeastSquaresResult {
  points: RegressionPoint[]
  parameterCount: number
  /** Evaluate in the centered fitting coordinates to avoid cancellation. */
  predict: (x: number) => number
  /** Variance multiplier for the fitted mean. */
  leverage: (x: number) => number
}

/** Accept numeric fields and Dates, excluding missing and non-finite values. */
export function regressionNumber(value: unknown): number | null {
  if (value instanceof Date) value = value.getTime()
  if (typeof value === "string" && value.trim() !== "") value = Number(value)
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

export function regressionPoints(
  data: ReadonlyArray<readonly [unknown, unknown]>
): RegressionPoint[] {
  const points: RegressionPoint[] = []
  for (const [rawX, rawY] of data) {
    const x = regressionNumber(rawX)
    const y = regressionNumber(rawY)
    if (x !== null && y !== null) points.push([x, y])
  }
  return points.sort((a, b) => a[0] - b[0])
}

function emptyFit(): LeastSquaresResult {
  return {
    points: [],
    parameterCount: 0,
    predict: () => NaN,
    leverage: () => NaN
  }
}

/** Fit in centered coordinates; retain full precision through prediction. */
export function linearRegression(
  data: ReadonlyArray<readonly [unknown, unknown]>
): LeastSquaresResult {
  const points = regressionPoints(data)
  if (!points.length) return emptyFit()
  const origin = points[0][0]
  const meanX = points.reduce(
    (sum, [x]) => sum + (x - origin) / points.length,
    0
  )
  const meanY = points.reduce((sum, [, y]) => sum + y / points.length, 0)
  let xx = 0
  let xy = 0
  for (const [x, y] of points) {
    const dx = x - origin - meanX
    xx += dx * dx
    xy += dx * (y - meanY)
  }
  const slope = xx === 0 ? 0 : xy / xx
  const predict = (x: number) => meanY + slope * (x - origin - meanX)
  return {
    points: points.map(([x]) => [x, predict(x)]),
    parameterCount: 2,
    leverage: (x) =>
      1 / points.length + (xx > 0 ? (x - origin - meanX) ** 2 / xx : 0),
    predict
  }
}

/**
 * Fit a normalized Vandermonde matrix with reorthogonalized QR. Normalizing
 * x keeps epoch timestamps and small coordinates well scaled; QR avoids
 * squaring the condition number as normal equations do.
 * Singular or underdetermined fits produce no geometry.
 */
export function polynomialRegression(
  data: ReadonlyArray<readonly [unknown, unknown]>,
  order = 2
): LeastSquaresResult {
  const points = regressionPoints(data)
  if (!Number.isInteger(order) || order < 0 || order >= points.length)
    return emptyFit()
  const origin = points[0][0] / 2 + points[points.length - 1][0] / 2
  const scale =
    Math.max(
      Math.abs(points[0][0] - origin),
      Math.abs(points[points.length - 1][0] - origin)
    ) || 1
  const xs = points.map(([x]) => (x - origin) / scale)
  const q: number[][] = []
  const r = Array.from({ length: order + 1 }, () =>
    Array<number>(order + 1).fill(0)
  )
  for (let j = 0; j <= order; j++) {
    const column = xs.map((x) => x ** j)
    for (let pass = 0; pass < 2; pass++) {
      for (let k = 0; k < j; k++) {
        const dot = column.reduce((sum, v, i) => sum + v * q[k][i], 0)
        r[k][j] += dot
        for (let i = 0; i < column.length; i++) column[i] -= dot * q[k][i]
      }
    }
    const norm = Math.sqrt(column.reduce((sum, v) => sum + v * v, 0))
    if (!Number.isFinite(norm) || norm <= Number.EPSILON * points.length)
      return emptyFit()
    r[j][j] = norm
    q.push(column.map((v) => v / norm))
  }
  const coefficients = q.map((column) =>
    column.reduce((sum, v, i) => sum + v * points[i][1], 0)
  )
  for (let j = order; j >= 0; j--) {
    for (let k = j + 1; k <= order; k++)
      coefficients[j] -= r[j][k] * coefficients[k]
    coefficients[j] /= r[j][j]
  }
  const predict = (x: number) => {
    const t = (x - origin) / scale
    let value = 0
    for (let j = order; j >= 0; j--) value = value * t + coefficients[j]
    return value
  }
  const leverage = (x: number) => {
    const t = (x - origin) / scale
    // Solve R-transpose * v = [1, t, t², ...]; ||v||² is the leverage.
    const v: number[] = []
    for (let j = 0; j <= order; j++) {
      let value = t ** j
      for (let k = 0; k < j; k++) value -= r[k][j] * v[k]
      v.push(value / r[j][j])
    }
    return v.reduce((sum, value) => sum + value * value, 0)
  }
  return {
    points: points.map(([x]) => [x, predict(x)]),
    parameterCount: order + 1,
    predict,
    leverage
  }
}

/** Residual standard error using the fitted model's parameter count. */
export function forecastIntervalStats(
  points: ReadonlyArray<readonly [number, number]>,
  predict: (x: number) => number,
  parameterCount = 2
): { se: number } {
  const n = points.length
  const sse = points.reduce((sum, [x, y]) => sum + (y - predict(x)) ** 2, 0)
  const se = Math.sqrt(sse / Math.max(n - parameterCount, 1))
  return { se }
}

/**
 * Approximate z-score for the common one/two-sided confidence levels a
 * forecast/envelope prediction interval rounds to.
 */
export function confidenceZScore(confidence: number): number {
  return confidence >= 0.99
    ? 2.576
    : confidence >= 0.95
      ? 1.96
      : confidence >= 0.9
        ? 1.645
        : 1.0
}
