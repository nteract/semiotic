/**
 * Shared time coercion for ProcessSankey domain, accessors, axis ticks, and
 * default tooltips. One implementation keeps NaN/null handling consistent.
 */
export {
  coerceUtcTimeValue as toProcessSankeyTime,
  hasCalendarTimeValues as isProcessSankeyDateDomain
} from "../../shared/temporalStrings"

export type ProcessSankeyTimeLike = number | Date | string

export function formatProcessSankeyTime(time: number, dateDomain: boolean): string {
  if (!Number.isFinite(time)) return ""
  if (!dateDomain) return String(time)
  const date = new Date(time)
  if (!Number.isFinite(date.getTime())) return ""
  const iso = date.toISOString()
  return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, -14) : iso.replace(/\.000Z$/, "Z")
}
