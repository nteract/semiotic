import type { Datum } from "../charts/shared/datumTypes"

export type FieldType = "numeric" | "categorical" | "date" | "unknown"

export interface NumericFieldSummary {
  type: "numeric"
  min: number
  max: number
  mean: number
  median: number
}

export interface DateFieldSummary {
  type: "date"
  min: string
  max: string
}

export interface CategoricalFieldSummary {
  type: "categorical"
  distinctCount: number
  topValues: ReadonlyArray<{ value: string; count: number }>
  distinctValues?: ReadonlyArray<string>
}

export interface UnknownFieldSummary {
  type: "unknown"
}

export type FieldSummary =
  | NumericFieldSummary
  | DateFieldSummary
  | CategoricalFieldSummary
  | UnknownFieldSummary

export interface DataSummary {
  rowCount: number
  fields: Record<string, FieldSummary>
  sample: ReadonlyArray<Datum>
}

export interface SummarizeOptions {
  maxDistinct?: number
  sampleSize?: number
  /** Scan up to this many rows when discovering field keys (handles ragged rows). */
  keyScanRows?: number
}

const DATE_LIKE = /^\d{4}[-/]\d{2}/
const NUMERIC_STRING = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/

function inferType(val: unknown): FieldType {
  if (typeof val === "number") return Number.isFinite(val) ? "numeric" : "unknown"
  if (val instanceof Date) return "date"
  if (typeof val === "string") {
    if (DATE_LIKE.test(val) && !Number.isNaN(Date.parse(val))) return "date"
    // CSV/JSON often carries numerics as strings ("42", "3.14e6"). The numeric
    // branch later coerces via Number(), so classify those as numeric up-front
    // rather than dropping them into categorical and losing min/max/mean.
    if (NUMERIC_STRING.test(val) && Number.isFinite(Number(val))) return "numeric"
    return "categorical"
  }
  if (typeof val === "boolean") return "categorical"
  return "unknown"
}

function median(sorted: ReadonlyArray<number>): number {
  const n = sorted.length
  if (n === 0) return NaN
  const mid = n >> 1
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/**
 * Summarize a dataset for an LLM. Returns row count, per-field statistics, and a small sample.
 *
 * Designed so a model can answer questions about ranges, peaks, distributions, and categories
 * without seeing the full dataset.
 */
export function summarizeData(
  data: ReadonlyArray<Datum> | null | undefined,
  options: SummarizeOptions = {}
): DataSummary {
  const { maxDistinct = 10, sampleSize = 5, keyScanRows = 100 } = options

  if (!Array.isArray(data) || data.length === 0) {
    return { rowCount: 0, fields: {}, sample: [] }
  }

  // Discover keys across the first N rows so ragged data doesn't drop fields.
  const keys = new Set<string>()
  const scanLimit = Math.min(data.length, keyScanRows)
  for (let i = 0; i < scanLimit; i++) {
    const row = data[i]
    if (row && typeof row === "object") {
      for (const k of Object.keys(row)) keys.add(k)
    }
  }

  const fields: Record<string, FieldSummary> = {}

  for (const key of keys) {
    const raw: unknown[] = []
    for (let i = 0; i < data.length; i++) {
      const v = data[i]?.[key]
      if (v != null) raw.push(v)
    }

    if (raw.length === 0) {
      fields[key] = { type: "unknown" }
      continue
    }

    const type = inferType(raw[0])

    if (type === "numeric") {
      const nums: number[] = []
      let min = Infinity
      let max = -Infinity
      let sum = 0
      for (let i = 0; i < raw.length; i++) {
        const n = Number(raw[i])
        if (!Number.isFinite(n)) continue
        nums.push(n)
        if (n < min) min = n
        if (n > max) max = n
        sum += n
      }
      if (nums.length === 0) {
        fields[key] = { type: "unknown" }
        continue
      }
      // nums is local; preserve source order for summation, then sort in place.
      nums.sort((a, b) => a - b)
      fields[key] = {
        type: "numeric",
        min,
        max,
        mean: sum / nums.length,
        median: median(nums),
      }
    } else if (type === "date") {
      let min = Infinity
      let max = -Infinity
      for (let i = 0; i < raw.length; i++) {
        const v = raw[i]
        const t = v instanceof Date ? v.getTime() : Date.parse(v as string)
        if (!Number.isFinite(t)) continue
        if (t < min) min = t
        if (t > max) max = t
      }
      if (min === Infinity) {
        fields[key] = { type: "unknown" }
        continue
      }
      fields[key] = {
        type: "date",
        min: new Date(min).toISOString(),
        max: new Date(max).toISOString(),
      }
    } else if (type === "categorical") {
      const counts = new Map<string, number>()
      for (let i = 0; i < raw.length; i++) {
        const v = String(raw[i])
        counts.set(v, (counts.get(v) ?? 0) + 1)
      }
      const topValues = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxDistinct)
        .map(([value, count]) => ({ value, count }))
      fields[key] = {
        type: "categorical",
        distinctCount: counts.size,
        topValues,
        distinctValues:
          counts.size <= maxDistinct ? topValues.map((v) => v.value) : undefined,
      }
    } else {
      fields[key] = { type: "unknown" }
    }
  }

  return { rowCount: data.length, fields, sample: data.slice(0, sampleSize) }
}
