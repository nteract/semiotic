/**
 * Shared time coercion for ProcessSankey domain, accessors, axis ticks, and
 * default tooltips. One implementation keeps NaN/null handling consistent.
 */
import { coerceUtcTimeValue, hasCalendarTimeValues } from "../../shared/temporalStrings"

/** Values accepted on domain, accessors, and axis tick dates. */
export type ProcessSankeyTimeLike = number | Date | string

/**
 * Coerce a time-like to a finite number when possible.
 * `null`/`undefined` → `NaN` so callers can gate with `Number.isFinite`.
 */
export function toProcessSankeyTime(
  value: unknown,
): number {
  return coerceUtcTimeValue(value)
}

/** The authored domain, not timestamp magnitude, selects the formatter input. */
export function isProcessSankeyDateDomain(domain: readonly unknown[]): boolean {
  return hasCalendarTimeValues(domain)
}

export function formatProcessSankeyTime(time: number, dateDomain: boolean): string {
  if (!Number.isFinite(time)) return ""
  if (!dateDomain) return String(time)
  const date = new Date(time)
  if (!Number.isFinite(date.getTime())) return ""
  const iso = date.toISOString()
  return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, -14) : iso.replace(/\.000Z$/, "Z")
}
