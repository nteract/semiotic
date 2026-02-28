export interface Bin {
  start: number
  end: number
  total: number
  categories: Map<string, number>
}

export function computeBins(
  data: Iterable<Record<string, any>>,
  getTime: (d: Record<string, any>) => number,
  getValue: (d: Record<string, any>) => number,
  binSize: number,
  getCategory?: (d: Record<string, any>) => string
): Map<number, Bin> {
  const bins = new Map<number, Bin>()

  for (const d of data) {
    const t = getTime(d)
    const v = getValue(d)

    if (t == null || v == null || Number.isNaN(t) || Number.isNaN(v)) continue

    const binStart = Math.floor(t / binSize) * binSize

    let bin = bins.get(binStart)
    if (!bin) {
      bin = { start: binStart, end: binStart + binSize, total: 0, categories: new Map() }
      bins.set(binStart, bin)
    }

    bin.total += v

    if (getCategory) {
      const cat = getCategory(d)
      bin.categories.set(cat, (bin.categories.get(cat) || 0) + v)
    }
  }

  return bins
}

export function computeBinExtent(
  data: Iterable<Record<string, any>>,
  getTime: (d: Record<string, any>) => number,
  getValue: (d: Record<string, any>) => number,
  binSize: number,
  getCategory?: (d: Record<string, any>) => string
): [number, number] {
  const bins = computeBins(data, getTime, getValue, binSize, getCategory)

  if (bins.size === 0) return [0, 0]

  let maxTotal = 0
  for (const bin of bins.values()) {
    if (bin.total > maxTotal) maxTotal = bin.total
  }

  return [0, maxTotal]
}
