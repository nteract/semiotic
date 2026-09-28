// ── Hierarchical / adaptive time tick formatting ───────────────────────
//
// The idea: the first tick on a time axis should be fully qualified so
// the reader knows the absolute position ("Mon Mar 24, 14:33:52").
// Subsequent ticks only show what changed from the previous tick — if
// the next tick is one second later, just show ":53".  But when a
// higher-order boundary is crossed (new minute, hour, day, month, year)
// the label re-qualifies up to that boundary.
//
// This is a solved pattern in journalism / dashboard design and avoids
// the redundancy of repeating "Mar 24, 2026" on every tick when only
// the seconds are changing.

export type TimeGranularity = "seconds" | "minutes" | "hours" | "days" | "months" | "years"

/**
 * Options for {@link adaptiveTimeTicks}.
 *
 * Timezone resolution (first match wins):
 * 1. `timeZone: "UTC" | "local" | IANA id` (e.g. `"America/Los_Angeles"`)
 * 2. legacy `utc: false` → local wall clock
 * 3. default → UTC (deterministic SSR)
 *
 * `includeYear`, `includeDate`, and `deltaStyle` shape axis labels only
 * (calls with a tick index and the rendered ticks). Value-only calls, such
 * as tooltips, keep the full label.
 */
export interface AdaptiveTimeTickOptions {
  /**
   * Prefer {@link AdaptiveTimeTickOptions.timeZone}. When `timeZone` is
   * omitted, `utc: false` formats in the runtime's local timezone; the
   * default `utc: true` keeps UTC for deterministic SSR.
   */
  utc?: boolean
  /**
   * Timezone for label formatting and calendar-boundary detection.
   * - `"UTC"` — UTC getters (same as the default)
   * - `"local"` — runtime local zone
   * - IANA id (e.g. `"America/New_York"`, `"Europe/Berlin"`) — via `Intl`
   */
  timeZone?: "UTC" | "local" | (string & {})
  /**
   * Year on axis labels. `"always"` (default) keeps every year. `"auto"`
   * drops it from the first label when every tick falls in the year of
   * `referenceTime`. `"never"` also drops it where labels re-qualify at a
   * year boundary. Year granularity always shows the year.
   * @default "always"
   */
  includeYear?: "always" | "auto" | "never"
  /**
   * Date on sub-day axis labels (seconds, minutes, hours). `"always"`
   * (default) keeps it. `"auto"` shows only the time when every tick falls on
   * one calendar day. `"never"` also drops it at day boundaries. Dropping the
   * date drops the year too.
   * @default "always"
   */
  includeDate?: "always" | "auto" | "never"
  /**
   * The current moment for `includeYear: "auto"`, read once when the
   * formatter is created. Defaults to `Date.now()`; pass a fixed value when
   * server and client render the same chart, so they agree across New Year.
   */
  referenceTime?: number | Date
  /**
   * Labels after the first: `"compact"` (default) shows only the unit that
   * changed (`":10"`, `"7"`); `"clock"` shows a readable clock or date
   * (`"12:10"`, `"Oct 7"`).
   * @default "compact"
   */
  deltaStyle?: "compact" | "clock"
}

/** Resolved zone used by the formatter. `"iana"` carries an IANA id. */
type ZoneMode =
  | { kind: "utc" }
  | { kind: "local" }
  | { kind: "iana"; id: string }

const MS_SECOND = 1000
const MS_MINUTE = 60 * MS_SECOND
const MS_HOUR = 60 * MS_MINUTE
const MS_DAY = 24 * MS_HOUR

/**
 * Detect the finest meaningful granularity from a sorted array of
 * epoch-ms tick values by looking at the median gap.
 */
function detectGranularity(ticks: number[]): TimeGranularity {
  if (ticks.length < 2) return "days"
  // Use median gap to be robust against one-off outliers
  const gaps = []
  for (let i = 1; i < ticks.length; i++) gaps.push(ticks[i] - ticks[i - 1])
  gaps.sort((a, b) => a - b)
  const median = gaps[Math.floor(gaps.length / 2)]

  if (median < 2 * MS_MINUTE) return "seconds"
  if (median < 2 * MS_HOUR) return "minutes"
  if (median < 2 * MS_DAY) return "hours"
  if (median < 60 * MS_DAY) return "days"
  if (median < 400 * MS_DAY) return "months"
  return "years"
}

function pad2(n: number): string { return n < 10 ? `0${n}` : String(n) }

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

type TimeParts = { month: number; day: number; year: number; hours: number; minutes: number; seconds: number }

/** Resolve timezone options. `timeZone` wins over the legacy `utc` flag. */
export function resolveAdaptiveTimeZone(options: AdaptiveTimeTickOptions = {}): ZoneMode {
  const tz = options.timeZone
  if (tz === "UTC") return { kind: "utc" }
  if (tz === "local") return { kind: "local" }
  if (typeof tz === "string" && tz.length > 0) return { kind: "iana", id: tz }
  if (options.utc === false) return { kind: "local" }
  return { kind: "utc" }
}

function timePartsUtcOrLocal(d: Date, utc: boolean): TimeParts {
  return utc
    ? {
      month: d.getUTCMonth(), day: d.getUTCDate(), year: d.getUTCFullYear(),
      hours: d.getUTCHours(), minutes: d.getUTCMinutes(), seconds: d.getUTCSeconds(),
    }
    : {
      month: d.getMonth(), day: d.getDate(), year: d.getFullYear(),
      hours: d.getHours(), minutes: d.getMinutes(), seconds: d.getSeconds(),
    }
}

/**
 * Calendar parts for an IANA zone via `Intl.DateTimeFormat.formatToParts`.
 * Uses `hourCycle: "h23"` so midnight is 0 (not 24) and months stay 0-indexed
 * for MONTH_SHORT. Falls back to UTC if the engine rejects the zone id.
 */
function createIanaPartsReader(timeZone: string): (d: Date) => TimeParts {
  let formatter: Intl.DateTimeFormat
  try {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hourCycle: "h23",
    })
  } catch {
    return (d: Date) => timePartsUtcOrLocal(d, true)
  }

  return (d: Date): TimeParts => {
    const bag: Record<string, string> = {}
    for (const part of formatter.formatToParts(d)) {
      if (part.type !== "literal") bag[part.type] = part.value
    }
    return {
      // Intl month is 1–12; MONTH_SHORT is 0-indexed.
      month: Math.max(0, (Number(bag.month) || 1) - 1),
      day: Number(bag.day) || 1,
      year: Number(bag.year) || 1970,
      hours: Number(bag.hour) || 0,
      minutes: Number(bag.minute) || 0,
      seconds: Number(bag.second) || 0,
    }
  }
}

function makeTimePartsReader(zone: ZoneMode): (d: Date) => TimeParts {
  if (zone.kind === "utc") return (d) => timePartsUtcOrLocal(d, true)
  if (zone.kind === "local") return (d) => timePartsUtcOrLocal(d, false)
  return createIanaPartsReader(zone.id)
}

/** Which calendar units a label may name. The defaults reproduce the classic labels. */
interface LabelUnits {
  year: boolean
  date: boolean
}

const ALL_UNITS: LabelUnits = { year: true, date: true }

/** Full anchor label — gives the reader absolute context. */
function fullLabel(
  d: Date,
  granularity: TimeGranularity,
  partsOf: (d: Date) => TimeParts,
  units: LabelUnits = ALL_UNITS,
): string {
  const { month, day, year, hours, minutes, seconds } = partsOf(d)
  const mon = MONTH_SHORT[month]
  const hh = pad2(hours)
  const mm = pad2(minutes)
  const ss = pad2(seconds)
  const date = units.year ? `${mon} ${day}, ${year} ` : `${mon} ${day} `

  switch (granularity) {
    case "seconds":  return `${units.date ? date : ""}${hh}:${mm}:${ss}`
    case "minutes":  return `${units.date ? date : ""}${hh}:${mm}`
    case "hours":    return `${units.date ? date : ""}${hh}:${mm}`
    case "days":     return units.year ? `${mon} ${day}, ${year}` : `${mon} ${day}`
    case "months":   return units.year ? `${mon} ${year}` : `${mon}`
    case "years":    return `${year}`
  }
}

/**
 * Contextual label — only shows units that changed from `prev`.
 * Re-qualifies upward when a boundary is crossed, up to the units allowed.
 */
function deltaLabel(
  d: Date,
  prev: Date,
  granularity: TimeGranularity,
  partsOf: (d: Date) => TimeParts,
  units: LabelUnits = ALL_UNITS,
  clock = false,
): string {
  const current = partsOf(d)
  const previous = partsOf(prev)
  const yearChanged  = current.year !== previous.year
  const monthChanged = yearChanged || current.month !== previous.month
  const dayChanged   = monthChanged || current.day !== previous.day
  const hourChanged  = dayChanged || current.hours !== previous.hours
  const minChanged   = hourChanged || current.minutes !== previous.minutes
  // A sub-day label without its date never re-qualifies to the day or year.
  const subDayDate = units.date
  const withYear = yearChanged && units.year

  const mon = MONTH_SHORT[current.month]
  const { day, year } = current
  const hh = pad2(current.hours)
  const mm = pad2(current.minutes)
  const ss = pad2(current.seconds)

  switch (granularity) {
    case "seconds":
      if (withYear && subDayDate) return `${mon} ${day}, ${year} ${hh}:${mm}:${ss}`
      if (dayChanged && subDayDate) return `${mon} ${day} ${hh}:${mm}:${ss}`
      if (hourChanged || clock) return `${hh}:${mm}:${ss}`
      if (minChanged) return `${mm}:${ss}`
      return `:${ss}`

    case "minutes":
      if (withYear && subDayDate) return `${mon} ${day}, ${year} ${hh}:${mm}`
      if (dayChanged && subDayDate) return `${mon} ${day} ${hh}:${mm}`
      if (hourChanged || clock) return `${hh}:${mm}`
      return `:${mm}`

    case "hours":
      if (withYear && subDayDate) return `${mon} ${day}, ${year} ${hh}:${mm}`
      if (dayChanged && subDayDate) return `${mon} ${day} ${hh}:${mm}`
      return `${hh}:${mm}`

    case "days":
      if (withYear) return `${mon} ${day}, ${year}`
      if (monthChanged || clock) return `${mon} ${day}`
      return `${day}`

    case "months":
      if (withYear) return `${mon} ${year}`
      return `${mon}`

    case "years":
      return `${year}`
  }
}

/**
 * Creates a hierarchical time axis formatter.
 *
 * The first tick is fully qualified (e.g., "Mar 24, 2026 14:33:52").
 * Subsequent ticks show only the significant unit change (e.g., ":53").
 * When a time boundary is crossed (new minute, hour, day, etc.), the
 * label re-qualifies up to that boundary (e.g., "14:34:00").
 *
 * Designed to be passed as `xFormat` on any Semiotic XY chart.
 * Uses the extended `(value, index, allTicks)` signature.
 *
 * @param granularity - Optional explicit granularity. If omitted,
 *   auto-detected from the tick spacing on first call.
 * @param options - Timezone: `timeZone: "local" | "UTC" | IANA`, or legacy
 *   `utc: false` for local. Default is UTC for deterministic SSR. Opt-in
 *   `includeYear`, `includeDate`, `referenceTime`, and `deltaStyle` shorten
 *   axis labels; their defaults keep the classic labels.
 *
 * @example
 * ```tsx
 * import { adaptiveTimeTicks } from "semiotic"
 *
 * // Auto-detect granularity from the data (UTC labels)
 * <LineChart data={ts} xFormat={adaptiveTimeTicks()} />
 *
 * // Explicit granularity
 * <LineChart data={ts} xFormat={adaptiveTimeTicks("minutes")} />
 *
 * // Viewer local wall-clock time
 * <LineChart data={ts} xFormat={adaptiveTimeTicks("minutes", { timeZone: "local" })} />
 *
 * // Explicit IANA zone (dashboard pinned to a product region)
 * <LineChart data={ts} xFormat={adaptiveTimeTicks("minutes", { timeZone: "America/Los_Angeles" })} />
 *
 * // A one-day monitoring window: times only, readable clock labels
 * <LineChart data={ts} xFormat={adaptiveTimeTicks(undefined, { includeDate: "auto", deltaStyle: "clock" })} />
 * ```
 */
export function adaptiveTimeTicks(
  granularity?: TimeGranularity,
  options: AdaptiveTimeTickOptions = {}
): (value: string | number | Date, index?: number, allTicks?: number[]) => string {
  let resolved: TimeGranularity | undefined = granularity
  let lastTicksRef: number[] | undefined
  const partsOf = makeTimePartsReader(resolveAdaptiveTimeZone(options))
  const { includeYear = "always", includeDate = "always" } = options
  const clock = options.deltaStyle === "clock"
  const referenceYear = includeYear === "auto"
    ? partsOf(new Date(options.referenceTime ?? Date.now())).year
    : undefined
  // Whether every rendered tick shares the reference year / one calendar day.
  let scopeTicksRef: number[] | undefined
  let scope = { referenceYear: false, oneDay: false }
  const scopeOf = (ticks: number[]) => {
    if (ticks !== scopeTicksRef) {
      scopeTicksRef = ticks
      const parts = ticks.map((tick) => partsOf(new Date(tick)))
      const [first] = parts
      scope = {
        referenceYear: parts.every((p) => p.year === referenceYear),
        oneDay: parts.every((p) => p.year === first.year && p.month === first.month && p.day === first.day),
      }
    }
    return scope
  }

  return (value: string | number | Date, index?: number, allTicks?: number[]): string => {
    const d = value instanceof Date ? value : new Date(value)

    // Re-detect granularity when ticks change (responsive resize, zoom/pan)
    if (!granularity && allTicks && allTicks.length >= 2 && allTicks !== lastTicksRef) {
      lastTicksRef = allTicks
      resolved = detectGranularity(allTicks)
    }
    const gran = resolved || "days"

    // Value-only calls (tooltips, vertical axes) keep the full label.
    if (index == null || !allTicks || allTicks.length === 0) {
      return fullLabel(d, gran, partsOf)
    }

    const subDay = gran === "seconds" || gran === "minutes" || gran === "hours"
    const units: LabelUnits = includeYear === "always" && includeDate === "always"
      ? ALL_UNITS
      : { year: gran === "years" || includeYear !== "never", date: !subDay || includeDate !== "never" }

    // First tick: full anchor label
    if (index === 0) {
      if (units === ALL_UNITS) return fullLabel(d, gran, partsOf)
      const { referenceYear: inReferenceYear, oneDay } =
        includeYear === "auto" || includeDate === "auto" ? scopeOf(allTicks) : scope
      const date = units.date && !(subDay && includeDate === "auto" && oneDay)
      const year = date && units.year && !(gran !== "years" && includeYear === "auto" && inReferenceYear)
      return fullLabel(d, gran, partsOf, { year: year || gran === "years", date })
    }

    // Subsequent ticks: show only what changed
    const prev = new Date(allTicks[index - 1])
    return deltaLabel(d, prev, gran, partsOf, units, clock)
  }
}
