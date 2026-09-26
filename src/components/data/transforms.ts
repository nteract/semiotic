import type { Datum } from "../charts/shared/datumTypes"
/**
 * Data transform helpers for common data shapes.
 * Import from "semiotic/data"
 */

/**
 * Bin continuous data into histogram-ready format.
 * Returns { category, value, x0, x1 } rows suitable for BarChart.
 * Values outside a custom domain are excluded; both endpoints are included.
 * Interior bins include x0 and exclude x1; the last bin includes x1.
 * Counts must be integers from 1 through 100,000. Domains must be finite and
 * ascending, with enough precision to represent every requested bin boundary.
 * Accepts finite numbers, nonblank numeric strings, and valid Dates (as epoch
 * milliseconds); missing, nonnumeric, and nonfinite observations are ignored.
 */
export function bin<T extends Datum>(
  data: T[],
  options: {
    field: string
    bins?: number
    domain?: [number, number]
  }
): { category: string; value: number; x0: number; x1: number }[] {
  const { field, bins = 10 } = options
  if (!Number.isInteger(bins) || bins < 1 || bins > 100_000) {
    throw new RangeError("bins must be an integer between 1 and 100000")
  }
  if (
    options.domain !== undefined &&
    (!Array.isArray(options.domain) ||
      options.domain.length !== 2 ||
      !Number.isFinite(options.domain[0]) ||
      !Number.isFinite(options.domain[1]) ||
      options.domain[0] > options.domain[1])
  ) {
    throw new RangeError(
      "bin domain must contain two finite, ascending numbers"
    )
  }
  const values: number[] = []
  let min = Infinity
  let max = -Infinity
  for (const row of data) {
    const raw = row?.[field]
    const value =
      raw instanceof Date
        ? raw.getTime()
        : typeof raw === "number"
          ? raw
          : typeof raw === "string" && raw.trim() !== ""
            ? Number(raw)
            : NaN
    if (Number.isFinite(value)) {
      values.push(value)
      if (value < min) min = value
      if (value > max) max = value
    }
  }

  if (values.length === 0) return []

  if (options.domain) [min, max] = options.domain

  // One shared edge array defines both membership and the returned bounds.
  const edges = min === max ? [min, max] : binEdges(min, max, bins)
  const result = edges.slice(1).map((hi, i) => {
    const lo = edges[i]
    if (!Number.isFinite(hi) || (min !== max && hi <= lo)) {
      throw new RangeError(
        "bin domain is too narrow for the requested number of bins"
      )
    }
    return { category: formatRange(lo, hi), value: 0, x0: lo, x1: hi }
  })

  for (const v of values) {
    if (v < min || v > max) continue
    let lo = 0
    let hi = result.length
    while (lo + 1 < hi) {
      const mid = Math.floor((lo + hi) / 2)
      if (v < edges[mid]) hi = mid
      else lo = mid
    }
    result[lo].value++
  }

  return result
}

function binEdges(min: number, max: number, bins: number): number[] {
  // Interpolate short decimal endpoints as integers first, then parse the
  // decimal result once. This keeps 0.3 an exact boundary in [0.1, 0.9],
  // without a tolerance that would incorrectly admit values just below it.
  const parts = [min, max].map((value) => {
    const [coefficient, power] = value.toExponential().split("e")
    return [
      Number(coefficient.replace(".", "")),
      Number(power) - (coefficient.split(".")[1]?.length ?? 0)
    ]
  })
  const exponent = Math.min(
    ...parts.map(([integer, exponent]) => (integer ? exponent : Infinity))
  )
  const [a, b] = parts.map(([integer, power]) =>
    integer === 0 ? 0 : integer * 10 ** (power - exponent)
  )
  const decimalSafe =
    Number.isSafeInteger(a) &&
    Number.isSafeInteger(b) &&
    Math.max(Math.abs(a), Math.abs(b)) * bins <= Number.MAX_SAFE_INTEGER / 2
  return Array.from({ length: bins + 1 }, (_, i) => {
    if (i === 0) return min
    if (i === bins) return max
    if (decimalSafe)
      return Number(`${(a * (bins - i) + b * i) / bins}e${exponent}`)
    // Full-precision or widely separated endpoints cannot be rescaled safely.
    // Weighted interpolation also avoids overflowing max - min across zero.
    const t = i / bins
    return min * (1 - t) + max * t
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

/** Preserve distinct floating-point boundaries and separate negative signs. */
function formatRange(lo: number, hi: number): string {
  return `${lo}${lo < 0 || hi < 0 ? " – " : "-"}${hi}`
}
