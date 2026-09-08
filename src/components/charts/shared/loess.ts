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
  const span = Math.min(n, Math.max(2, Math.ceil(bandwidth * n)))
  const canSlide = Number.isFinite(span) && xs.every(Number.isFinite)
  let left = 0
  let right = span - 1

  const result: [number, number][] = []

  for (let i = 0; i < n; i++) {
    const x0 = xs[i]

    let start = 0
    let end = n - 1
    let maxDist: number
    if (canSlide) {
      // The nearest span is contiguous in sorted x order. Its endpoints only
      // move right as x0 increases, eliminating a distance sort at every point.
      // Advance on ties too, so a run of duplicate x values cannot block it.
      while (
        right < n - 1 &&
        Math.abs(xs[right + 1] - x0) <= Math.abs(xs[left] - x0)
      ) {
        left++
        right++
      }
      const radius = Math.max(Math.abs(xs[left] - x0), Math.abs(xs[right] - x0))
      maxDist = radius || 1
      // Points outside a positive-radius span have zero tricube weight.
      // A zero radius historically falls back to 1, so include all points
      // in that case (including duplicates and nearby fractional x values).
      if (radius > 0) {
        start = left
        end = right
      }
    } else {
      // Preserve the existing distance-order behavior for non-finite inputs.
      const distances = xs.map((x) => Math.abs(x - x0)).sort((a, b) => a - b)
      maxDist = distances[span - 1] || 1
    }

    // Weighted least squares: y = a + b*x
    let sumW = 0
    let sumWX = 0
    let sumWY = 0
    let sumWXX = 0
    let sumWXY = 0
    for (let j = start; j <= end; j++) {
      // Compute and consume each tricube weight without a temporary array.
      const u = Math.abs(xs[j] - x0) / maxDist
      const w = u < 1 ? Math.pow(1 - Math.pow(u, 3), 3) : 0
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
