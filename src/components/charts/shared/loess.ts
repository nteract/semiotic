/**
 * LOESS (Locally Weighted Scatterplot Smoothing) regression.
 *
 * For each x-point, fits a local weighted linear regression using tricube
 * weights, producing a smooth curve that follows the data more closely
 * than global polynomial regression.
 *
 * @param points - Array of [x, y] pairs (need not be sorted)
 * @param bandwidth - Smoothing parameter 0-1. Lower = more local detail,
 *                    higher = smoother. Default 0.3.
 * @returns Array of [x, y_smoothed] pairs sorted by x
 */
export function loess(
  points: [number, number][],
  bandwidth: number = 0.3
): [number, number][] {
  const n = points.length
  if (n < 2) return points.slice()

  // Sort by x
  const sorted = points.slice().sort((a, b) => a[0] - b[0])
  const xs = sorted.map((p) => p[0])
  const ys = sorted.map((p) => p[1])

  // Number of neighbors to include
  const span = Math.max(2, Math.ceil(bandwidth * n))

  const result: [number, number][] = []

  for (let i = 0; i < n; i++) {
    const x0 = xs[i]

    // Find distances to all points, pick the span nearest
    const dists = xs.map((x) => Math.abs(x - x0))
    const sortedDists = dists.slice().sort((a, b) => a - b)
    const maxDist = sortedDists[Math.min(span - 1, n - 1)] || 1

    // Compute tricube weights: w(u) = (1 - |u|^3)^3 for |u| < 1
    const weights: number[] = []
    for (let j = 0; j < n; j++) {
      const u = maxDist === 0 ? 0 : dists[j] / maxDist
      weights[j] = u < 1 ? Math.pow(1 - Math.pow(u, 3), 3) : 0
    }

    // Weighted least squares: y = a + b*x
    let sumW = 0
    let sumWX = 0
    let sumWY = 0
    let sumWXX = 0
    let sumWXY = 0
    for (let j = 0; j < n; j++) {
      const w = weights[j]
      if (w === 0) continue
      sumW += w
      sumWX += w * xs[j]
      sumWY += w * ys[j]
      sumWXX += w * xs[j] * xs[j]
      sumWXY += w * xs[j] * ys[j]
    }

    if (sumW === 0) {
      result.push([x0, ys[i]])
      continue
    }

    const det = sumW * sumWXX - sumWX * sumWX
    if (Math.abs(det) < 1e-12) {
      // Degenerate — return weighted mean
      result.push([x0, sumWY / sumW])
    } else {
      const b = (sumW * sumWXY - sumWX * sumWY) / det
      const a = (sumWY - b * sumWX) / sumW
      result.push([x0, a + b * x0])
    }
  }

  return result
}
