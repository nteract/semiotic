import type { Datum } from "../charts/shared/datumTypes"
export interface Bin {
  start: number
  end: number
  total: number
  categories: Map<string, number>
  /** Raw rows retained only when a scene needs aggregate selection provenance. */
  rows?: Datum[]
  /** Per-category raw rows for stacked aggregate marks. */
  categoryRows?: Map<string, Datum[]>
}

export function computeBins(
  data: Iterable<Datum>,
  getTime: (d: Datum) => number,
  getValue: (d: Datum) => number,
  binSize: number,
  getCategory?: (d: Datum) => string,
  trackRows = false
): Map<number, Bin> {
  const bins = new Map<number, Bin>()

  for (const d of data) {
    const t = getTime(d)
    const v = getValue(d)

    if (t == null || v == null || Number.isNaN(t) || Number.isNaN(v)) continue

    const binStart = Math.floor(t / binSize) * binSize

    let bin = bins.get(binStart)
    if (!bin) {
      bin = {
        start: binStart,
        end: binStart + binSize,
        total: 0,
        categories: new Map(),
        ...(trackRows ? { rows: [], categoryRows: new Map() } : {})
      }
      bins.set(binStart, bin)
    }

    bin.total += v
    bin.rows?.push(d)

    if (getCategory) {
      const cat = getCategory(d)
      bin.categories.set(cat, (bin.categories.get(cat) || 0) + v)
      if (bin.categoryRows) {
        let rows = bin.categoryRows.get(cat)
        if (!rows) {
          rows = []
          bin.categoryRows.set(cat, rows)
        }
        rows.push(d)
      }
    }
  }

  return bins
}

export function computeBinExtent(
  data: Iterable<Datum>,
  getTime: (d: Datum) => number,
  getValue: (d: Datum) => number,
  binSize: number,
  getCategory?: (d: Datum) => string
): [number, number] {
  const bins = computeBins(data, getTime, getValue, binSize, getCategory)

  if (bins.size === 0) return [0, 0]

  let maxTotal = 0
  for (const bin of bins.values()) {
    if (bin.total > maxTotal) maxTotal = bin.total
  }

  return [0, maxTotal]
}
