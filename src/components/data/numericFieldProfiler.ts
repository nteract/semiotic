import type { Datum } from "../charts/shared/datumTypes"
import { isMissingValue, parseNumericValue } from "./numericValue"

export interface NumericFieldProfile {
  readonly field: string
  readonly observedCount: number
  readonly finiteCount: number
  readonly missingCount: number
  readonly nonFiniteCount: number
  readonly nonNumericCount: number
  readonly zeroCount: number
  readonly negativeCount: number
  readonly fractionalCount: number
  readonly min?: number
  readonly q1?: number
  readonly median?: number
  readonly q3?: number
  readonly max?: number
}

export interface ProfileNumericFieldsOptions {
  /** Include exact quartiles. Disable when another profiler already sorts fields. */
  readonly quantiles?: boolean
}

interface FieldObservation {
  numbers?: number[]
  finite: number
  min: number
  max: number
  missing: number
  nonFinite: number
  nonNumeric: number
  zero: number
  negative: number
  fractional: number
}

function observeField(
  data: ReadonlyArray<Datum>,
  field: string,
  collectNumbers: boolean
): FieldObservation {
  const out: FieldObservation = {
    numbers: collectNumbers ? [] : undefined,
    finite: 0, min: Infinity, max: -Infinity,
    missing: 0, nonFinite: 0, nonNumeric: 0,
    zero: 0, negative: 0, fractional: 0,
  }
  for (const row of data) {
    const raw = row?.[field]
    if (isMissingValue(raw)) {
      out.missing++
      continue
    }
    const value = parseNumericValue(raw)
    if (value === undefined) {
      out.nonNumeric++
      continue
    }
    if (!Number.isFinite(value)) {
      out.nonFinite++
      continue
    }
    out.numbers?.push(value)
    out.finite++
    if (value < out.min) out.min = value
    if (value > out.max) out.max = value
    if (value === 0) out.zero++
    if (value < 0) out.negative++
    if (!Number.isInteger(value)) out.fractional++
  }
  return out
}

/** Linear-interpolation quantile over a pre-sorted array. */
export function quantile(sorted: ReadonlyArray<number>, p: number): number | undefined {
  if (sorted.length === 0) return undefined
  const index = (sorted.length - 1) * p
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  const weight = index - lower
  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

/** Profile invalid/missing numeric candidates without silently dropping them. */
export function profileNumericFields(
  data: ReadonlyArray<Datum> | null | undefined,
  options: ProfileNumericFieldsOptions = {},
): Readonly<Record<string, NumericFieldProfile>> {
  if (!Array.isArray(data) || data.length === 0) return {}
  const keys = new Set<string>()
  for (const row of data) {
    if (!row || typeof row !== "object") continue
    for (const key of Object.keys(row)) keys.add(key)
  }

  const profiles: Record<string, NumericFieldProfile> = {}
  for (const field of keys) {
    const observation = observeField(data, field, options.quantiles !== false)
    // The observation owns this array. Sorting it cannot mutate source rows;
    // callers that only need health counts and extents allocate no value array.
    const sorted = observation.numbers?.sort((a, b) => a - b)
    profiles[field] = {
      field,
      observedCount: data.length - observation.missing,
      finiteCount: observation.finite,
      missingCount: observation.missing,
      nonFiniteCount: observation.nonFinite,
      nonNumericCount: observation.nonNumeric,
      zeroCount: observation.zero,
      negativeCount: observation.negative,
      fractionalCount: observation.fractional,
      ...(observation.finite > 0
        ? {
            min: observation.min,
            ...(sorted
              ? {
                  q1: quantile(sorted, 0.25),
                  median: quantile(sorted, 0.5),
                  q3: quantile(sorted, 0.75),
                }
              : {}),
            max: observation.max,
          }
        : {}),
    }
  }
  return profiles
}
