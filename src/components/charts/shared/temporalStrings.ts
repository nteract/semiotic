import type { Datum } from "./datumTypes"

const ISO_YEAR_MONTH = /^\d{4}-\d{1,2}$/

export function parseDateLikeString(value: string): number {
  const trimmed = value.trim()
  if (!trimmed || !Number.isNaN(Number(trimmed))) return NaN
  const normalized = ISO_YEAR_MONTH.test(trimmed) ? `${trimmed}-01` : trimmed
  if (normalized === trimmed && trimmed.length < 10) return NaN
  const parsed = Date.parse(normalized)
  return Number.isFinite(parsed) ? parsed : NaN
}

export function coerceDateLikeValue(value: unknown): number {
  if (value instanceof Date) return value.getTime()
  if (typeof value === "string") return parseDateLikeString(value)
  return +(value as number)
}

export function coerceTemporalStringRows(
  data: Datum[] | undefined,
  fieldName: string | undefined,
): { data: Datum[] | undefined; failed: boolean } {
  if (!data || !fieldName) return { data, failed: false }

  let changed = false
  let failed = false
  const next = data.map((row) => {
    const raw = row[fieldName]
    if (typeof raw !== "string") return row

    const parsed = parseDateLikeString(raw)
    changed = true
    if (!Number.isFinite(parsed)) {
      failed = true
      return { ...row, [fieldName]: NaN }
    }
    return { ...row, [fieldName]: parsed }
  })

  return { data: changed ? next : data, failed }
}
