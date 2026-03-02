/**
 * Data transform helpers for common data shapes.
 * Import from "semiotic/data"
 */

/**
 * Bin continuous data into histogram-ready format.
 * Returns array of { category, value } objects suitable for BarChart.
 */
export function bin<T extends Record<string, any>>(
  data: T[],
  options: {
    field: string
    bins?: number
    domain?: [number, number]
  }
): { category: string; value: number }[] {
  const { field, bins = 10 } = options

  const values = data.map((d) => Number(d[field])).filter((v) => !isNaN(v))

  if (values.length === 0) return []

  const min = options.domain ? options.domain[0] : Math.min(...values)
  const max = options.domain ? options.domain[1] : Math.max(...values)

  if (min === max) {
    return [{ category: `${min}-${max}`, value: values.length }]
  }

  const binWidth = (max - min) / bins
  const counts = new Array(bins).fill(0)

  for (const v of values) {
    let idx = Math.floor((v - min) / binWidth)
    if (idx === bins) idx = bins - 1
    if (idx >= 0 && idx < bins) {
      counts[idx]++
    }
  }

  return counts.map((count, i) => {
    const lo = min + i * binWidth
    const hi = lo + binWidth
    return {
      category: `${formatNum(lo)}-${formatNum(hi)}`,
      value: count
    }
  })
}

/**
 * Group and aggregate data.
 * Returns array of { [groupBy]: string, value: number } objects.
 */
export function rollup<T extends Record<string, any>>(
  data: T[],
  options: {
    groupBy: string
    value: string
    agg?: "sum" | "mean" | "count" | "min" | "max"
  }
): Record<string, any>[] {
  const { groupBy: groupField, value: valueField, agg = "sum" } = options

  const groups = new Map<string, number[]>()

  for (const d of data) {
    const key = String(d[groupField])
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(Number(d[valueField]))
  }

  const result: Record<string, any>[] = []

  for (const [key, vals] of groups) {
    let aggregated: number

    switch (agg) {
      case "count":
        aggregated = vals.length
        break
      case "mean":
        aggregated = vals.reduce((a, b) => a + b, 0) / vals.length
        break
      case "min":
        aggregated = Math.min(...vals)
        break
      case "max":
        aggregated = Math.max(...vals)
        break
      case "sum":
      default:
        aggregated = vals.reduce((a, b) => a + b, 0)
        break
    }

    result.push({ [groupField]: key, value: aggregated })
  }

  return result
}

/**
 * Group flat rows into line-chart-ready nested format.
 * Returns array of { id, coordinates } objects for LineChart with lineBy.
 */
export function groupBy<T extends Record<string, any>>(
  data: T[],
  options: {
    key: string
    fields?: string[]
  }
): { id: string; coordinates: Record<string, any>[] }[] {
  const { key, fields } = options

  const groups = new Map<string, Record<string, any>[]>()

  for (const d of data) {
    const groupKey = String(d[key])
    if (!groups.has(groupKey)) {
      groups.set(groupKey, [])
    }

    if (fields) {
      const filtered: Record<string, any> = {}
      for (const f of fields) {
        if (f in d) {
          filtered[f] = d[f]
        }
      }
      groups.get(groupKey)!.push(filtered)
    } else {
      groups.get(groupKey)!.push({ ...d })
    }
  }

  const result: { id: string; coordinates: Record<string, any>[] }[] = []

  for (const [id, coordinates] of groups) {
    result.push({ id, coordinates })
  }

  return result
}

/**
 * Pivot wide data to long format.
 * Converts column-per-variable to row-per-variable.
 */
export function pivot<T extends Record<string, any>>(
  data: T[],
  options: {
    columns: string[]
    nameField?: string
    valueField?: string
  }
): Record<string, any>[] {
  const { columns, nameField = "name", valueField = "value" } = options

  const columnsSet = new Set(columns)
  const result: Record<string, any>[] = []

  for (const row of data) {
    const base: Record<string, any> = {}
    for (const k of Object.keys(row)) {
      if (!columnsSet.has(k)) {
        base[k] = row[k]
      }
    }

    for (const col of columns) {
      result.push({
        ...base,
        [nameField]: col,
        [valueField]: row[col]
      })
    }
  }

  return result
}

/** Round to avoid long floating-point strings in bin labels. */
function formatNum(n: number): string {
  const rounded = Math.round(n * 1000) / 1000
  return String(rounded)
}
