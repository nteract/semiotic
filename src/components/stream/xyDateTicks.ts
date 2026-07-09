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

/**
 * Build a tick formatter for a numeric time domain (ms since epoch).
 * Span-based resolution: hours → day-month → month-year → year.
 */
export function makeDateTickFormatter(
  domain: [number, number]
): (v: number) => string {
  const span = domain[1] - domain[0]

  if (span < MS_DAY) {
    return (v) => {
      const d = new Date(v)
      return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
    }
  }
  if (span < MS_YEAR) {
    return (v) => {
      const d = new Date(v)
      return `${DATE_MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`
    }
  }
  if (span < 5 * MS_YEAR) {
    return (v) => {
      const d = new Date(v)
      return `${DATE_MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`
    }
  }
  return (v) => String(new Date(v).getUTCFullYear())
}
