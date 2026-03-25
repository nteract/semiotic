import * as React from "react"
import { timeFormat } from "d3-time-format"
import { format as d3Format } from "d3-format"

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
): (d: any) => string {
  const { decimals = 0, format: customFormat, currency = "$" } = options || {}

  switch (type) {
    case "date":
      return (d) => formatDate(d, customFormat || "%b %d")

    case "percent":
      return (d) => formatNumber(d, customFormat || `.${decimals}%`)

    case "currency":
      return (d) => `${currency}${formatNumber(d, customFormat || `,.${decimals}f`)}`

    case "number":
    default:
      return (d) => formatNumber(d, customFormat || `,.${decimals}f`)
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
  formatters?: Record<string, (v: any) => string>,
  labels?: Record<string, string>
): (d: any) => JSX.Element {
  return (d: any) => {
    return React.createElement(
      "div",
      { className: "tooltip-content", style: { padding: "8px" } },
      fields.map((field) => {
        const label = labels?.[field] || field
        const value = d[field]
        const formatter = formatters?.[field]
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
export function smartTickFormat(value: any): string {
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

type TimeGranularity = "seconds" | "minutes" | "hours" | "days" | "months" | "years"

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

/** Full anchor label — gives the reader absolute context. Uses UTC for SSR determinism. */
function fullLabel(d: Date, granularity: TimeGranularity): string {
  const mon = MONTH_SHORT[d.getUTCMonth()]
  const day = d.getUTCDate()
  const year = d.getUTCFullYear()
  const hh = pad2(d.getUTCHours())
  const mm = pad2(d.getUTCMinutes())
  const ss = pad2(d.getUTCSeconds())

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
 * Re-qualifies upward when a boundary is crossed. Uses UTC for SSR determinism.
 */
function deltaLabel(d: Date, prev: Date, granularity: TimeGranularity): string {
  const yearChanged  = d.getUTCFullYear() !== prev.getUTCFullYear()
  const monthChanged = yearChanged || d.getUTCMonth() !== prev.getUTCMonth()
  const dayChanged   = monthChanged || d.getUTCDate() !== prev.getUTCDate()
  const hourChanged  = dayChanged || d.getUTCHours() !== prev.getUTCHours()
  const minChanged   = hourChanged || d.getUTCMinutes() !== prev.getUTCMinutes()

  const mon = MONTH_SHORT[d.getUTCMonth()]
  const day = d.getUTCDate()
  const year = d.getUTCFullYear()
  const hh = pad2(d.getUTCHours())
  const mm = pad2(d.getUTCMinutes())
  const ss = pad2(d.getUTCSeconds())

  switch (granularity) {
    case "seconds":
      if (dayChanged) return `${mon} ${day} ${hh}:${mm}:${ss}`
      if (hourChanged) return `${hh}:${mm}:${ss}`
      if (minChanged) return `${mm}:${ss}`
      return `:${ss}`

    case "minutes":
      if (dayChanged) return `${mon} ${day} ${hh}:${mm}`
      if (hourChanged) return `${hh}:${mm}`
      return `:${mm}`

    case "hours":
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
 *
 * @example
 * ```tsx
 * import { adaptiveTimeTicks } from "semiotic"
 *
 * // Auto-detect granularity from the data
 * <LineChart data={ts} xFormat={adaptiveTimeTicks()} />
 *
 * // Explicit granularity
 * <LineChart data={ts} xFormat={adaptiveTimeTicks("minutes")} />
 * ```
 */
export function adaptiveTimeTicks(
  granularity?: TimeGranularity
): (value: any, index?: number, allTicks?: number[]) => string {
  let resolved: TimeGranularity | undefined = granularity
  let lastTicksRef: number[] | undefined

  return (value: any, index?: number, allTicks?: number[]): string => {
    const d = value instanceof Date ? value : new Date(value)

    // Re-detect granularity when ticks change (responsive resize, zoom/pan)
    if (!granularity && allTicks && allTicks.length >= 2 && allTicks !== lastTicksRef) {
      lastTicksRef = allTicks
      resolved = detectGranularity(allTicks)
    }
    const gran = resolved || "days"

    // First tick: full anchor label
    if (index == null || index === 0 || !allTicks || allTicks.length === 0) {
      return fullLabel(d, gran)
    }

    // Subsequent ticks: show only what changed
    const prev = new Date(allTicks[index - 1])
    return deltaLabel(d, prev, gran)
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
