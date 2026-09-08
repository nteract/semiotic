import type { Datum } from "../charts/shared/datumTypes"
import { getMinMax } from "../charts/shared/minMax"
/**
 * Data transform helpers for common data shapes.
 * Import from "semiotic/data"
 */

/**
 * Bin continuous data into histogram-ready format.
 * Returns array of { category, value } objects suitable for BarChart.
 */
export function bin<T extends Datum>(
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

  const [dataMin, dataMax] = getMinMax(values)
  const min = options.domain ? options.domain[0] : dataMin
  const max = options.domain ? options.domain[1] : dataMax

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
export function rollup<T extends Datum>(
  data: T[],
  options: {
    groupBy: string
    value: string
    agg?: "sum" | "mean" | "count" | "min" | "max"
  }
): Datum[] {
  const { groupBy: groupField, value: valueField, agg = "sum" } = options

  // Retain only the aggregate and count instead of every group's values.
  const groups = new Map<string, { total: number; count: number }>()
  const initial = agg === "min" ? Infinity : agg === "max" ? -Infinity : 0

  for (const d of data) {
    const key = String(d[groupField])
    let group = groups.get(key)
    if (!group) {
      group = { total: initial, count: 0 }
      groups.set(key, group)
    }
    const value = Number(d[valueField])
    group.count++
    switch (agg) {
      case "count":
        break
      case "min":
        if (value < group.total) group.total = value
        break
      case "max":
        if (value > group.total) group.total = value
        break
      default:
        group.total += value
        break
    }
  }

  const result: Datum[] = []

  for (const [key, group] of groups) {
    const aggregated =
      agg === "count"
        ? group.count
        : agg === "mean"
          ? group.total / group.count
          : group.total

    result.push({ [groupField]: key, value: aggregated })
  }

  return result
}

/**
 * Group flat rows into line-chart-ready nested format.
 * Returns array of { id, coordinates } objects for LineChart with lineBy.
 */
export function groupBy<T extends Datum>(
  data: T[],
  options: {
    key: string
    fields?: string[]
  }
): { id: string; coordinates: Datum[] }[] {
  const { key, fields } = options

  const groups = new Map<string, Datum[]>()

  for (const d of data) {
    const groupKey = String(d[key])
    if (!groups.has(groupKey)) {
      groups.set(groupKey, [])
    }

    if (fields) {
      const filtered: Datum = {}
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

  const result: { id: string; coordinates: Datum[] }[] = []

  for (const [id, coordinates] of groups) {
    result.push({ id, coordinates })
  }

  return result
}

/**
 * Pivot wide data to long format.
 * Converts column-per-variable to row-per-variable.
 */
export function pivot<T extends Datum>(
  data: T[],
  options: {
    columns: string[]
    nameField?: string
    valueField?: string
  }
): Datum[] {
  const { columns, nameField = "name", valueField = "value" } = options

  const columnsSet = new Set(columns)
  const result: Datum[] = []

  for (const row of data) {
    const base: Datum = {}
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
