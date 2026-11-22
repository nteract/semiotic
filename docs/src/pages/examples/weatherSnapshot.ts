/** UTC calendar shared by the baked climate demos and their default API request. */
export const SNAPSHOT_TODAY = "2026-06-26"
export const SNAPSHOT_END = "2026-07-08"
export const SNAPSHOT_YEAR = new Date(SNAPSHOT_TODAY).getUTCFullYear()

export function dateFromDay(day: number, year = SNAPSHOT_YEAR): Date {
  return new Date(Date.UTC(year, 0, 1 + day))
}

const start = dateFromDay(0).getTime()
export const TODAY_DAY = (Date.parse(SNAPSHOT_TODAY) - start) / 86_400_000
export const END_DAY = (Date.parse(SNAPSHOT_END) - start) / 86_400_000
