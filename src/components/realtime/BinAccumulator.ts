import type { Datum } from "../charts/shared/datumTypes"

export type BinAlign = "start" | "center"

/** Half-open bins on a zero-anchored grid; centered bins surround each grid timestamp. */
export function histogramBinStart(time: number, binSize: number, binAlign: BinAlign = "start"): number {
  const offset = binAlign === "center" ? binSize / 2 : 0
  return Math.floor((time + offset) / binSize) * binSize - offset
}
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
  trackRows = false,
  binAlign: BinAlign = "start"
): Map<number, Bin> {
  const bins = new Map<number, Bin>()

  for (const d of data) {
    const t = getTime(d)
    const v = getValue(d)

    if (t == null || v == null || Number.isNaN(t) || Number.isNaN(v)) continue

    const binStart = histogramBinStart(t, binSize, binAlign)

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
  getCategory?: (d: Datum) => string,
  binAlign: BinAlign = "start"
): [number, number] {
  const bins = computeBins(data, getTime, getValue, binSize, getCategory, false, binAlign)

  if (bins.size === 0) return [0, 0]

  let maxTotal = 0
  for (const bin of bins.values()) {
    if (bin.total > maxTotal) maxTotal = bin.total
  }

  return [0, maxTotal]
}
