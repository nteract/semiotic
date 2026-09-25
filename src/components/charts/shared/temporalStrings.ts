import type { Datum } from "./datumTypes"

const ISO_CALENDAR_DATE = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/

export function parseDateLikeString(value: string): number {
  const trimmed = value.trim()
  if (!trimmed || !Number.isNaN(Number(trimmed))) return NaN
  // Calendar dates have no authored timezone. Normalize every padding variant
  // to UTC, matching automatic XY labels and avoiding SSR/client zone drift.
  const calendar = ISO_CALENDAR_DATE.exec(trimmed)
  if (calendar) {
    const year = Number(calendar[1])
    const month = Number(calendar[2]) - 1
    const day = Number(calendar[3] ?? 1)
    const date = new Date(0)
    date.setUTCFullYear(year, month, day)
    return date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day
      ? date.getTime()
      : NaN
  }
  if (trimmed.length < 10) return NaN
  const parsed = Date.parse(trimmed)
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
