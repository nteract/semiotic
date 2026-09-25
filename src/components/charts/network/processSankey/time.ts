/**
 * Shared time coercion for ProcessSankey domain, accessors, axis ticks, and
 * default tooltips. One implementation keeps NaN/null handling consistent.
 */
import { parseDateLikeString } from "../../shared/temporalStrings"

/** Values accepted on domain, accessors, and axis tick dates. */
export type ProcessSankeyTimeLike = number | Date | string

/**
 * Coerce a time-like to a finite number when possible.
 * `null`/`undefined` → `NaN` so callers can gate with `Number.isFinite`.
 */
export function toProcessSankeyTime(
  value: unknown,
): number {
  if (value instanceof Date) return value.getTime()
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN
  if (typeof value !== "string" || !value.trim()) return NaN
  const text = value.trim()
  const numeric = Number(text)
  if (!Number.isNaN(numeric)) return Number.isFinite(numeric) ? numeric : NaN
  if (/^\d{4}-\d{1,2}(?:-\d{1,2})?$/.test(text)) {
    return parseDateLikeString(text)
  }
  // Accept ISO datetimes only. A missing zone means UTC, so server and browser
  // layouts never depend on their host's local timezone or locale parser.
  const datetime = /^(\d{4}-\d{2}-\d{2})[Tt ](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)([Zz]|[+-]\d{2}:?\d{2})?$/.exec(text)
  if (!datetime || !Number.isFinite(parseDateLikeString(datetime[1]))) return NaN
  return Date.parse(`${datetime[1]}T${datetime[2]}${datetime[3] || "Z"}`)
}

/** The authored domain, not timestamp magnitude, selects the formatter input. */
export function isProcessSankeyDateDomain(domain: readonly unknown[]): boolean {
  return domain.some(value =>
    (value instanceof Date || (typeof value === "string" && Number.isNaN(Number(value)))) &&
    Number.isFinite(toProcessSankeyTime(value))
  )
}

export function formatProcessSankeyTime(time: number, dateDomain: boolean): string {
  if (!Number.isFinite(time)) return ""
  if (!dateDomain) return String(time)
  const date = new Date(time)
  if (!Number.isFinite(date.getTime())) return ""
  const iso = date.toISOString()
  return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, -14) : iso.replace(/\.000Z$/, "Z")
}
