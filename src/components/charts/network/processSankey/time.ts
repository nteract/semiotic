/**
 * Shared time coercion for ProcessSankey domain, accessors, axis ticks, and
 * default tooltips. One implementation keeps NaN/null handling consistent.
 */

/** Values accepted on domain, accessors, and axis tick dates. */
export type ProcessSankeyTimeLike = number | Date | string

/**
 * Coerce a time-like to a finite number when possible.
 * `null`/`undefined` → `NaN` so callers can gate with `Number.isFinite`.
 */
export function toProcessSankeyTime(
  value: ProcessSankeyTimeLike | null | undefined,
): number {
  if (value == null) return NaN
  if (value instanceof Date) return value.getTime()
  if (typeof value === "number") return value
  return new Date(value).getTime()
}
