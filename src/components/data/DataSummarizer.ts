import type { Datum } from "../charts/shared/datumTypes"
import { coerceUtcTimeValue } from "../charts/shared/temporalStrings"
import { isMissingValue, parseNumericValue } from "./numericValue"

export type FieldType = "numeric" | "categorical" | "date" | "unknown"

interface FieldSummaryCounts {
  /** Nonmissing cells, including those excluded from the reported statistics. */
  observedCount?: number
  /** Null, undefined, absent, and blank string cells. */
  missingCount?: number
  /** Nonmissing cells not represented by this summary's statistics. */
  excludedCount?: number
}

export interface NumericFieldSummary extends FieldSummaryCounts {
  type: "numeric"
  min: number
  max: number
  mean: number
  median: number
}

export interface DateFieldSummary extends FieldSummaryCounts {
  type: "date"
  min: string
  max: string
}

export interface CategoricalFieldSummary extends FieldSummaryCounts {
  type: "categorical"
  distinctCount: number
  topValues: ReadonlyArray<{ value: string; count: number }>
  distinctValues?: ReadonlyArray<string>
}

export interface UnknownFieldSummary extends FieldSummaryCounts {
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

/** Date-valued cells only: numeric values and numeric strings are not timestamps here. */
export function parseSummaryDate(value: unknown): number {
  return value instanceof Date || (typeof value === "string" && /^\d{4}-/.test(value.trim()))
    ? coerceUtcTimeValue(value) : NaN
}

function median(sorted: ReadonlyArray<number>): number {
  const n = sorted.length
  // A numeric majority guarantees at least one value.
  const mid = n >> 1
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/**
 * Summarize a dataset for an LLM. Returns row count, per-field statistics, and a small sample.
 *
 * Designed so a model can answer questions about ranges, peaks, distributions, and categories
 * without seeing the full dataset. Numeric/date types require a majority of recognized
 * scalar values; ties and mixed columns are categorical. Nonfinite/unsupported values do
 * not vote. Counts disclose missing cells and values excluded from the chosen statistics.
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
    const numeric: number[] = []
    const dates: number[] = []
    let observedCount = 0
    for (const row of data) {
      const v = row?.[key]
      if (isMissingValue(v)) continue
      observedCount++
      const number = parseNumericValue(v)
      if (number !== undefined) {
        if (!Number.isFinite(number)) continue
        numeric.push(number)
      } else {
        const date = parseSummaryDate(v)
        if (Number.isFinite(date)) dates.push(date)
        else if (typeof v !== "string" && typeof v !== "boolean") continue
      }
      raw.push(v)
    }

    const type: FieldType = numeric.length > raw.length / 2 ? "numeric"
      : dates.length > raw.length / 2 ? "date"
      : raw.length > 0 ? "categorical" : "unknown"
    let includedCount = raw.length

    if (type === "numeric" || type === "date") {
      const values = type === "numeric" ? numeric : dates
      includedCount = values.length
      let min = Infinity
      let max = -Infinity
      let sum = 0
      for (const n of values) {
        if (n < min) min = n
        if (n > max) max = n
        sum += n
      }
      if (type === "numeric") {
        // Preserve source order for summation, then sort the local array in place.
        values.sort((a, b) => a - b)
        fields[key] = { type, min, max, mean: sum / values.length, median: median(values) }
      } else {
        fields[key] = { type, min: new Date(min).toISOString(), max: new Date(max).toISOString() }
      }
    } else if (type === "categorical") {
      const categories = new Map<string, number>()
      for (const value of raw) {
        const v = value instanceof Date ? value.toISOString() : String(value)
        categories.set(v, (categories.get(v) ?? 0) + 1)
      }
      const topValues = [...categories.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxDistinct)
        .map(([value, count]) => ({ value, count }))
      fields[key] = {
        type: "categorical",
        distinctCount: categories.size,
        topValues,
        distinctValues:
          categories.size <= maxDistinct ? topValues.map((v) => v.value) : undefined,
      }
    } else {
      fields[key] = { type: "unknown" }
    }
    Object.assign(fields[key], { observedCount, missingCount: data.length - observedCount, excludedCount: observedCount - includedCount })
  }

  return { rowCount: data.length, fields, sample: data.slice(0, sampleSize) }
}
