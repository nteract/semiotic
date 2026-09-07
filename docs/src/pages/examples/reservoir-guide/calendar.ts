const DAY = 86_400_000

export function dateTime(date: string) {
  const time = Date.parse(`${date}T00:00:00Z`)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(time) ||
    new Date(time).toISOString().slice(0, 10) !== date
  )
    throw new Error(`Invalid calendar date: ${date}`)
  return time
}

export function dateIndex(date: string, start: string) {
  return (dateTime(date) - dateTime(start)) / DAY
}

export function addDays(date: string, amount: number) {
  return new Date(dateTime(date) + amount * DAY).toISOString().slice(0, 10)
}

export function waterYear(date: string) {
  dateTime(date)
  return Number(date.slice(0, 4)) + (date.slice(5, 7) >= "10" ? 1 : 0)
}

export function dateForWaterYear(year: number, monthDay: string): string | null {
  if (!Number.isInteger(year) || year < 1900 || year > 2200 || !/^\d{2}-\d{2}$/.test(monthDay))
    return null
  const date = `${monthDay.slice(0, 2) >= "10" ? year - 1 : year}-${monthDay}`
  try {
    dateTime(date)
    return date
  } catch {
    return null
  }
}

// A leap calendar keeps March aligned across every water year. Non-leap
// February 29 is a nonexistent date, distinct from a missing observation.
export const SEASON_DAYS = Array.from({ length: 366 }, (_, index) =>
  addDays("1999-10-01", index).slice(5),
)

export function cdecStamp(stamp: string) {
  if (!/^\d{8} \d{4}$/.test(stamp)) throw new Error(`Invalid CDEC timestamp: ${stamp}`)
  const date = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`
  const hour = Number(stamp.slice(9, 11))
  const minute = Number(stamp.slice(11, 13))
  if (hour > 23 || minute > 59) throw new Error(`Invalid CDEC clock: ${stamp}`)
  // Scalar arithmetic on the source's fixed PST wall clock; never local DST.
  return dateTime(date) + (hour * 60 + minute) * 60_000
}

export function sourceObservationStamp(date: string, offset: number) {
  const iso = new Date(dateTime(date) + offset * 60_000).toISOString()
  return `${iso.slice(0, 10).replaceAll("-", "")} ${iso.slice(11, 16).replace(":", "")}`
}
