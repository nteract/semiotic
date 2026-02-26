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
