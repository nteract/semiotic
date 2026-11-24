import type { Datum } from "../shared/datumTypes"

export function matrixHistogramBins(data: Datum[], field: string, requestedBins: number): Datum[][] {
  let min = Infinity
  let max = -Infinity
  const values = data.map(row => {
    const value = Number(row[field] ?? NaN)
    if (Number.isFinite(value)) {
      min = Math.min(min, value)
      max = Math.max(max, value)
    }
    return value
  })
  if (min > max) return []

  const count = Number.isFinite(requestedBins) ? Math.max(1, Math.floor(requestedBins)) : 20
  const bins = Array.from({ length: count }, (): Datum[] => [])
  // Opposite finite extremes can overflow when subtracted at their original scale.
  const scale = Number.isFinite(max - min) ? 1 : 0.5
  const start = min * scale
  const span = max * scale - start
  values.forEach((value, i) => {
    if (!Number.isFinite(value)) return
    const fraction = span ? (value * scale - start) / span : 0
    bins[Math.min(count - 1, Math.floor(fraction * count))].push(data[i])
  })
  return bins
}
