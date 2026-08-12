import * as React from "react"
import { timeFormat } from "./timeFormat"
import { format as d3Format } from "./numberFormat"
import type { Datum } from "./datumTypes"

/**
 * Format number with specified format string
 *
 * @param value - Number to format
 * @param formatString - D3 format string (e.g., ".2f", ",.0f", ".1%")
 * @returns Formatted string
 *
 * @see https://github.com/d3/d3-format#format for format string options
 */
export function formatNumber(value: number, formatString: string = ",.0f"): string {
  try {
    return d3Format(formatString)(value)
  } catch {
    return String(value)
  }
}

/**
 * Format date with specified format string
 *
 * @param value - Date to format
 * @param formatString - D3 time format string (e.g., "%Y-%m-%d", "%b %d")
 * @returns Formatted string
 *
 * @see https://github.com/d3/d3-time-format#timeFormat for format string options
 */
export function formatDate(value: Date | number | string, formatString: string = "%b %d, %Y"): string {
  try {
    const date = value instanceof Date ? value : new Date(value)
    return timeFormat(formatString)(date)
  } catch {
    return String(value)
  }
}

/**
 * Creates a formatting function based on the type
 *
 * @param type - Type of formatting: 'number', 'date', 'percent', or 'currency'
 * @param options - Optional configuration for the formatter
 * @returns Formatting function
 *
 * @example
 * ```ts
 * const fmt = formatAxis('number', { decimals: 2 })
 * fmt(1234.567) // "1,234.57"
 *
 * const dateFmt = formatAxis('date', { format: '%b %Y' })
 * dateFmt(new Date()) // "Jan 2024"
 * ```
 */
export function formatAxis(
  type: "number" | "date" | "percent" | "currency" = "number",
  options?: {
    decimals?: number
    format?: string
    currency?: string
  }
): (d: number | string | Date) => string {
  const { decimals = 0, format: customFormat, currency = "$" } = options || {}

  switch (type) {
    case "date":
      return (d) => formatDate(d as number | string | Date, customFormat || "%b %d")

    case "percent":
      return (d) => formatNumber(d as number, customFormat || `.${decimals}%`)

    case "currency":
      return (d) => `${currency}${formatNumber(d as number, customFormat || `,.${decimals}f`)}`

    case "number":
    default:
      return (d) => formatNumber(d as number, customFormat || `,.${decimals}f`)
  }
}

/**
 * Creates a tooltip content generator
 *
 * @param fields - Array of field names to display
 * @param formatters - Optional map of field names to formatting functions
 * @param labels - Optional map of field names to display labels
 * @returns React element generator function
 *
 * @example
 * ```ts
 * const tooltip = createTooltip(
 *   ['category', 'value'],
 *   { value: d => formatNumber(d, ',.2f') },
 *   { category: 'Category', value: 'Value' }
 * )
 * ```
 */
export function createTooltip(
  fields: string[],
  formatters?: Record<string, (value: string | number | Date) => string>,
  labels?: Record<string, string>
): (d: Datum) => React.JSX.Element {
  return (d: Datum) => {
    return React.createElement(
      "div",
      { className: "tooltip-content", style: { padding: "8px" } },
      fields.map((field) => {
        const configuredLabel =
          labels && Object.prototype.hasOwnProperty.call(labels, field)
            ? labels[field]
            : undefined
        const label =
          typeof configuredLabel === "string" && configuredLabel
            ? configuredLabel
            : field
        const value = d[field]
        const configuredFormatter =
          formatters && Object.prototype.hasOwnProperty.call(formatters, field)
            ? formatters[field]
            : undefined
        const formatter =
          typeof configuredFormatter === "function"
            ? configuredFormatter
            : undefined
        const displayValue = formatter ? formatter(value) : String(value)

        return React.createElement(
          "div",
          { key: field, style: { marginBottom: "4px" } },
          React.createElement("strong", null, `${label}: `),
          displayValue
        )
      })
    )
  }
}

/**
 * Formats large numbers with K/M/B suffixes
 *
 * @param value - Number to format
 * @param decimals - Number of decimal places
 * @returns Formatted string with suffix
 *
 * @example
 * ```ts
 * formatLargeNumber(1234) // "1.2K"
 * formatLargeNumber(1234567) // "1.2M"
 * formatLargeNumber(1234567890) // "1.2B"
 * ```
 */
export function formatLargeNumber(value: number, decimals: number = 1): string {
  if (value >= 1e9) {
    return (value / 1e9).toFixed(decimals) + "B"
  }
  if (value >= 1e6) {
    return (value / 1e6).toFixed(decimals) + "M"
  }
  if (value >= 1e3) {
    return (value / 1e3).toFixed(decimals) + "K"
  }
  return value.toFixed(decimals)
}

/**
 * Smart default tick format for axis labels.
 *
 * Handles the common problems with raw number-to-string conversion:
 * - Floating-point noise (0.30000000000000004 → "0.3")
 * - Excessive precision (62.123456789 → "62.1235")
 * - Large numbers (1500000 → "1.5M")
 * - Strings/non-numbers pass through unchanged
 *
 * Used as the default axis tickFormat when no explicit format is provided.
 */
export function smartTickFormat(value: string | number | Date | null | undefined): string {
  if (value == null) return ""
  if (typeof value !== "number") return String(value)
  if (!isFinite(value)) return String(value)
  if (value === 0) return "0"

  // Clean floating-point noise (e.g., 0.30000000000000004 → 0.3)
  const cleaned = parseFloat(value.toPrecision(12))
  const abs = Math.abs(cleaned)

  // Large numbers: compact suffixes
  if (abs >= 1e9) return `${parseFloat((cleaned / 1e9).toPrecision(3))}B`
  if (abs >= 1e6) return `${parseFloat((cleaned / 1e6).toPrecision(3))}M`
  if (abs >= 1e4) return `${parseFloat((cleaned / 1e3).toPrecision(3))}K`

  // Integers: no decimals needed
  if (Number.isInteger(cleaned)) return String(cleaned)

  // Floats: up to 6 significant digits, trailing zeros stripped
  return String(parseFloat(cleaned.toPrecision(6)))
}

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

/** Full anchor label — gives the reader absolute context. */
function fullLabel(d: Date, granularity: TimeGranularity, partsOf: (d: Date) => TimeParts): string {
  const { month, day, year, hours, minutes, seconds } = partsOf(d)
  const mon = MONTH_SHORT[month]
  const hh = pad2(hours)
  const mm = pad2(minutes)
  const ss = pad2(seconds)

  switch (granularity) {
    case "seconds":  return `${mon} ${day}, ${year} ${hh}:${mm}:${ss}`
    case "minutes":  return `${mon} ${day}, ${year} ${hh}:${mm}`
    case "hours":    return `${mon} ${day}, ${year} ${hh}:${mm}`
    case "days":     return `${mon} ${day}, ${year}`
    case "months":   return `${mon} ${year}`
    case "years":    return `${year}`
  }
}

/**
 * Contextual label — only shows units that changed from `prev`.
 * Re-qualifies upward when a boundary is crossed.
 */
function deltaLabel(
  d: Date,
  prev: Date,
  granularity: TimeGranularity,
  partsOf: (d: Date) => TimeParts,
): string {
  const current = partsOf(d)
  const previous = partsOf(prev)
  const yearChanged  = current.year !== previous.year
  const monthChanged = yearChanged || current.month !== previous.month
  const dayChanged   = monthChanged || current.day !== previous.day
  const hourChanged  = dayChanged || current.hours !== previous.hours
  const minChanged   = hourChanged || current.minutes !== previous.minutes

  const mon = MONTH_SHORT[current.month]
  const { day, year } = current
  const hh = pad2(current.hours)
  const mm = pad2(current.minutes)
  const ss = pad2(current.seconds)

  switch (granularity) {
    case "seconds":
      if (yearChanged) return `${mon} ${day}, ${year} ${hh}:${mm}:${ss}`
      if (dayChanged) return `${mon} ${day} ${hh}:${mm}:${ss}`
      if (hourChanged) return `${hh}:${mm}:${ss}`
      if (minChanged) return `${mm}:${ss}`
      return `:${ss}`

    case "minutes":
      if (yearChanged) return `${mon} ${day}, ${year} ${hh}:${mm}`
      if (dayChanged) return `${mon} ${day} ${hh}:${mm}`
      if (hourChanged) return `${hh}:${mm}`
      return `:${mm}`

    case "hours":
      if (yearChanged) return `${mon} ${day}, ${year} ${hh}:00`
      if (monthChanged) return `${mon} ${day} ${hh}:${mm}`
      if (dayChanged) return `${mon} ${day} ${hh}:00`
      return `${hh}:00`

    case "days":
      if (yearChanged) return `${mon} ${day}, ${year}`
      if (monthChanged) return `${mon} ${day}`
      return `${day}`

    case "months":
      if (yearChanged) return `${mon} ${year}`
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
 *   `utc: false` for local. Default is UTC for deterministic SSR.
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
 * ```
 */
export function adaptiveTimeTicks(
  granularity?: TimeGranularity,
  options: AdaptiveTimeTickOptions = {}
): (value: string | number | Date, index?: number, allTicks?: number[]) => string {
  let resolved: TimeGranularity | undefined = granularity
  let lastTicksRef: number[] | undefined
  const partsOf = makeTimePartsReader(resolveAdaptiveTimeZone(options))

  return (value: string | number | Date, index?: number, allTicks?: number[]): string => {
    const d = value instanceof Date ? value : new Date(value)

    // Re-detect granularity when ticks change (responsive resize, zoom/pan)
    if (!granularity && allTicks && allTicks.length >= 2 && allTicks !== lastTicksRef) {
      lastTicksRef = allTicks
      resolved = detectGranularity(allTicks)
    }
    const gran = resolved || "days"

    // First tick: full anchor label
    if (index == null || index === 0 || !allTicks || allTicks.length === 0) {
      return fullLabel(d, gran, partsOf)
    }

    // Subsequent ticks: show only what changed
    const prev = new Date(allTicks[index - 1])
    return deltaLabel(d, prev, gran, partsOf)
  }
}

/**
 * Truncates text to specified length with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number = 20): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.slice(0, maxLength - 3) + "..."
}
