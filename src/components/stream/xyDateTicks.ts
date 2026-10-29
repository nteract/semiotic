/**
 * Auto date tick formatting for StreamXYFrame time scales.
 * UTC getters keep SSR and client labels identical across timezones.
 */
import { heatmapBandTicks } from "./heatmapBandTicks"

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

/** Epoch milliseconds from March 1973 up to the last valid Date. */
const EPOCH_MS_MIN = 1e11
const EPOCH_MS_MAX = 8.64e15

/**
 * Whether a numeric time domain reads as epoch milliseconds. Streaming time
 * axes fed `Date.now()` numbers use this to get clock labels instead of raw
 * 13-digit integers; tick counters and seconds stay far below the threshold.
 */
export function isEpochMsDomain(domain: readonly unknown[]): boolean {
  return (
    domain.length >= 2 &&
    domain.every(
      (value) =>
        typeof value === "number" &&
        value >= EPOCH_MS_MIN &&
        value <= EPOCH_MS_MAX
    )
  )
}

/**
 * The automatic x-axis formatter for a frame without its own: calendar labels
 * for Date/date-string x values, and for streaming time axes whose numeric
 * domain is epoch milliseconds. Shared by the live frame and static SVG.
 */
export function resolveAutoDateTickFormatter(options: {
  xIsDate: boolean
  streaming: boolean
  domain: readonly (number | Date)[]
}): ReturnType<typeof makeDateTickFormatter> | undefined {
  const domain = options.domain.map((value) => value.valueOf())
  if (options.xIsDate) {
    return makeDateTickFormatter([domain[0], domain[domain.length - 1]])
  }
  if (!options.streaming || !isEpochMsDomain(domain)) return undefined
  const format = makeDateTickFormatter([domain[0], domain[domain.length - 1]])
  epochTickFormatters.add(format)
  return format
}

/**
 * Automatic x labels for a frame with no explicit formatter: date labels for
 * a date axis or a streaming epoch-ms axis, none for heatmap band axes.
 */
export function resolveFrameAutoXFormat(
  store: { xIsDate: boolean } | null | undefined,
  scales: { x: { domain(): readonly (number | Date)[] } } | null | undefined,
  streaming: boolean
): ReturnType<typeof makeDateTickFormatter> | undefined {
  if (!store || !scales || heatmapBandTicks(scales.x)) return undefined
  return resolveAutoDateTickFormatter({ xIsDate: store.xIsDate, streaming, domain: scales.x.domain() })
}

// Formatters for epoch-ms values on a linear scale. Axis tick generation
// places their ticks on UTC calendar boundaries, as a time scale would.
const epochTickFormatters = new WeakSet<object>()

/** Whether `format` labels epoch-ms values plotted on a linear scale. */
export function isEpochTickFormatter(format: unknown): boolean {
  return typeof format === "function" && epochTickFormatters.has(format)
}

function toTime(v: number | Date | string): number {
  return new Date(v instanceof Date ? v.valueOf() : v).valueOf()
}

/**
 * Build a tick formatter for a numeric time domain (ms since epoch).
 * Span-based resolution: milliseconds → seconds → hours → day-month → month-year → year.
 * When the axis passes its tick values (horizontal axes do), sub-day labels
 * carry exactly the precision those ticks need: whole-second ticks drop
 * `.000`, and off-minute or sub-second ticks gain seconds / milliseconds so
 * neighbouring labels never collapse to the same text.
 */
export function makeDateTickFormatter(
  domain: [number, number]
): (v: number | Date | string, index?: number, values?: readonly number[]) => string {
  const span = Math.abs(domain[1] - domain[0])

  if (span < MS_DAY) {
    let cachedValues: readonly number[] | undefined
    let cachedUnits = { seconds: span < 300000, ms: span < 10000 }
    const unitsFor = (values: readonly number[] | undefined) => {
      if (!values || values.length === 0) {
        return { seconds: span < 300000, ms: span < 10000 }
      }
      if (values === cachedValues) return cachedUnits
      let hasSeconds = false
      let hasMs = false
      for (const value of values) {
        const time = toTime(value)
        if (!Number.isFinite(time)) continue
        const ms = ((time % 1000) + 1000) % 1000
        if (ms !== 0) hasMs = true
        if (((time % 60000) + 60000) % 60000 !== 0) hasSeconds = true
      }
      cachedValues = values
      cachedUnits = { seconds: span < 300000 || hasSeconds, ms: hasMs }
      return cachedUnits
    }
    return (v, _index, values) => {
      const d = new Date(toTime(v))
      const units = unitsFor(values)
      let label = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
      if (units.seconds || units.ms) label += `:${String(d.getUTCSeconds()).padStart(2, "0")}`
      if (units.ms) label += `.${String(d.getUTCMilliseconds()).padStart(3, "0")}`
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
