import type { Datum } from "../charts/shared/datumTypes"
import { coerceUtcTimeValue } from "../charts/shared/temporalStrings"

/** Authored Year semantics differ from raw epoch milliseconds. */
export function coerceAdapterTemporalRows(
  data: Datum[] | undefined,
  field: string | undefined,
  semantic?: string
): { data: Datum[] | undefined; failed: boolean } {
  if (!data || !field) return { data, failed: false }
  const isYear = semantic?.toLowerCase() === "year"
  let changed = false
  let failed = false
  const result = data.map((row) => {
    const value = row[field]
    if (value == null || (!isYear && typeof value !== "string")) return row
    let parsed: number
    if (isYear) {
      const year =
        typeof value === "number"
          ? value
          : typeof value === "string" && /^\d{4}$/.test(value.trim())
            ? Number(value)
            : NaN
      parsed =
        Number.isInteger(year) && year >= 1000 && year <= 9999
          ? Date.UTC(year, 0, 1)
          : NaN
    } else parsed = coerceUtcTimeValue(value)
    changed = true
    if (!Number.isFinite(parsed)) failed = true
    return { ...row, [field]: parsed }
  })
  return { data: changed ? result : data, failed }
}
