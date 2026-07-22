import type { Datum } from "../charts/shared/datumTypes"

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
  numbers: number[]
  missing: number
  nonFinite: number
  nonNumeric: number
  zero: number
  negative: number
  fractional: number
}

function observeField(data: ReadonlyArray<Datum>, field: string): FieldObservation {
  const out: FieldObservation = {
    numbers: [], missing: 0, nonFinite: 0, nonNumeric: 0,
    zero: 0, negative: 0, fractional: 0,
  }
  for (const row of data) {
    const raw = row?.[field]
    if (raw == null || raw === "") {
      out.missing++
      continue
    }
    let value: number | undefined
    if (typeof raw === "number") {
      value = raw
    } else if (typeof raw === "string") {
      const trimmed = raw.trim()
      if (trimmed === "") {
        // Whitespace-only ("  ") is a blank cell, not a non-numeric one.
        out.missing++
        continue
      }
      const parsed = Number(trimmed)
      if (!Number.isNaN(parsed)) {
        // A finite number or a real ±Infinity token/overflow — both are
        // legitimate parses; nonFinite vs. finite is decided below.
        value = parsed
      } else if (/^[+-]?nan$/i.test(trimmed)) {
        // `Number()` maps both an explicit "NaN" string and unparseable
        // garbage ("abc") to NaN. Distinguish them by the literal token so an
        // authored "NaN" reports as a non-finite hazard, not silently as
        // "not a number at all" alongside real garbage.
        value = parsed
      }
      // Anything else (unparseable garbage) leaves `value` undefined below.
    }
    if (value === undefined) {
      out.nonNumeric++
      continue
    }
    if (!Number.isFinite(value)) {
      out.nonFinite++
      continue
    }
    out.numbers.push(value)
    if (value === 0) out.zero++
    if (value < 0) out.negative++
    if (!Number.isInteger(value)) out.fractional++
  }
  return out
}

function quantile(sorted: ReadonlyArray<number>, p: number): number | undefined {
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
    const observation = observeField(data, field)
    let min = Infinity
    let max = -Infinity
    for (const value of observation.numbers) {
      if (value < min) min = value
      if (value > max) max = value
    }
    const sorted = options.quantiles === false
      ? undefined
      : [...observation.numbers].sort((a, b) => a - b)
    profiles[field] = {
      field,
      observedCount: data.length - observation.missing,
      finiteCount: observation.numbers.length,
      missingCount: observation.missing,
      nonFiniteCount: observation.nonFinite,
      nonNumericCount: observation.nonNumeric,
      zeroCount: observation.zero,
      negativeCount: observation.negative,
      fractionalCount: observation.fractional,
      ...(observation.numbers.length > 0
        ? {
            min,
            ...(sorted
              ? {
                  q1: quantile(sorted, 0.25),
                  median: quantile(sorted, 0.5),
                  q3: quantile(sorted, 0.75),
                }
              : {}),
            max,
          }
        : {}),
    }
  }
  return profiles
}
