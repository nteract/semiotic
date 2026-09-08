/**
 * Auto date tick formatting for StreamXYFrame time scales.
 * UTC getters keep SSR and client labels identical across timezones.
 */

const DATE_MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
] as const

const MS_DAY = 8.64e7
const MS_YEAR = 3.156e10

export function formatDateMonthDay(value: number | Date | string): string {
  const date = new Date(value instanceof Date ? value.valueOf() : value)
  return `${DATE_MONTH_SHORT[date.getUTCMonth()]} ${date.getUTCDate()}`
}

/**
 * Build a tick formatter for a numeric time domain (ms since epoch).
 * Span-based resolution: milliseconds → seconds → hours → day-month → month-year → year.
 */
export function makeDateTickFormatter(
  domain: [number, number]
): (v: number | Date | string) => string {
  const span = Math.abs(domain[1] - domain[0])

  if (span < MS_DAY) {
    return (v) => {
      const d = new Date(v instanceof Date ? v.valueOf() : v)
      let label = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
      if (span < 300000) label += `:${String(d.getUTCSeconds()).padStart(2, "0")}`
      if (span < 10000) label += `.${String(d.getUTCMilliseconds()).padStart(3, "0")}`
      return label
    }
  }
  if (span < MS_YEAR) {
    return formatDateMonthDay
  }
  if (span < 5 * MS_YEAR) {
    return (v) => {
      const d = new Date(v instanceof Date ? v.valueOf() : v)
      return `${DATE_MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`
    }
  }
  return (v) => String(new Date(v instanceof Date ? v.valueOf() : v).getUTCFullYear())
}
