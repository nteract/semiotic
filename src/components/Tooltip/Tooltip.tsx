import * as React from "react"
import type { Accessor } from "../charts/shared/types"

/**
 * Configuration for a single tooltip field
 */
export interface TooltipField {
  /**
   * Label for this field
   */
  label?: string

  /**
   * Field name or accessor function to get the value
   * (alias for 'accessor')
   */
  key?: Accessor<any>

  /**
   * Field name or accessor function to get the value
   */
  accessor?: Accessor<any>

  /**
   * Optional format function for the value
   */
  format?: (value: any) => string
}

/**
 * Base tooltip configuration
 */
export interface TooltipConfig {
  /**
   * Array of fields to display in the tooltip
   * Can be simple field names or full TooltipField objects
   */
  fields?: Array<string | TooltipField>

  /**
   * Custom title accessor (field name or function)
   */
  title?: Accessor<string>

  /**
   * Custom format function for all values (if fields don't specify their own)
   */
  format?: (value: any) => string

  /**
   * Custom style object for the tooltip container
   */
  style?: React.CSSProperties

  /**
   * Custom className for the tooltip container
   */
  className?: string
}

/**
 * Multi-line tooltip configuration
 */
export interface MultiLineTooltipConfig extends TooltipConfig {
  /**
   * Show field labels (default: true)
   */
  showLabels?: boolean

  /**
   * Separator between label and value (default: ": ")
   */
  separator?: string
}

/**
 * Default tooltip styles following best practices
 */
const defaultTooltipStyle: React.CSSProperties = {
  background: "rgba(0, 0, 0, 0.85)",
  color: "white",
  padding: "8px 12px",
  borderRadius: "4px",
  fontSize: "14px",
  lineHeight: "1.5",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
  pointerEvents: "none",
  maxWidth: "300px",
  wordWrap: "break-word"
}

/**
 * Extract value from data using accessor
 */
function getValue(data: any, accessor: Accessor<any>): any {
  if (typeof accessor === "function") {
    return accessor(data)
  }
  return data[accessor]
}

/**
 * Format a value for display
 */
function formatValue(value: any, format?: (value: any) => string): string {
  if (format) {
    return format(value)
  }

  if (value === null || value === undefined) {
    return ""
  }

  // Format numbers with commas
  if (typeof value === "number") {
    return value.toLocaleString()
  }

  // Format dates
  if (value instanceof Date) {
    return value.toLocaleDateString()
  }

  return String(value)
}

/**
 * Create a simple tooltip that displays a single value or title
 *
 * @example
 * ```tsx
 * <Scatterplot
 *   data={data}
 *   tooltip={Tooltip({ title: "name" })}
 * />
 * ```
 *
 * @example
 * ```tsx
 * <BarChart
 *   data={data}
 *   tooltip={Tooltip({
 *     title: d => `${d.category}: ${d.value}`,
 *     style: { background: "#333" }
 *   })}
 * />
 * ```
 */
export function Tooltip(config: TooltipConfig = {}) {
  const {
    fields,
    title,
    format,
    style = {},
    className = ""
  } = config

  // Return a tooltipContent function that Semiotic expects
  return (data: any) => {
    // Guard against undefined/null data
    if (!data || typeof data !== "object") {
      return null
    }

    let content: React.ReactNode

    if (title) {
      // Show title
      const titleValue = getValue(data, title)
      content = formatValue(titleValue, format)
    } else if (fields && fields.length > 0) {
      // Show first field's value
      const field = fields[0]
      const accessor = typeof field === "string" ? field : (field.accessor || field.key || "")
      const fieldFormat = typeof field === "object" ? field.format : undefined
      const value = getValue(data, accessor)
      content = formatValue(value, fieldFormat || format)
    } else {
      // Default: try common field names
      const commonFields = ["value", "y", "name", "id", "label"]
      for (const field of commonFields) {
        if (data[field] !== undefined) {
          content = formatValue(data[field], format)
          break
        }
      }

      // If still nothing, show first non-internal property
      if (!content) {
        const keys = Object.keys(data).filter(k => !k.startsWith("_"))
        if (keys.length > 0) {
          content = formatValue(data[keys[0]], format)
        }
      }
    }

    const mergedStyle = { ...defaultTooltipStyle, ...style }

    return (
      <div
        className={`semiotic-tooltip ${className}`.trim()}
        style={mergedStyle}
      >
        {content}
      </div>
    )
  }
}

/**
 * Create a multi-line tooltip that displays multiple fields
 *
 * @example
 * ```tsx
 * <Scatterplot
 *   data={data}
 *   tooltip={MultiLineTooltip({
 *     fields: ["name", "value", "category"]
 *   })}
 * />
 * ```
 *
 * @example
 * ```tsx
 * <LineChart
 *   data={data}
 *   tooltip={MultiLineTooltip({
 *     title: "series",
 *     fields: [
 *       { label: "X", accessor: "x", format: v => v.toFixed(2) },
 *       { label: "Y", accessor: "y", format: v => v.toFixed(2) },
 *       { label: "Category", accessor: "category" }
 *     ]
 *   })}
 * />
 * ```
 *
 * @example
 * ```tsx
 * <BarChart
 *   data={data}
 *   tooltip={MultiLineTooltip({
 *     fields: [
 *       { label: "Category", accessor: "category" },
 *       { label: "Sales", accessor: "value", format: v => `$${v.toLocaleString()}` }
 *     ],
 *     showLabels: true
 *   })}
 * />
 * ```
 */
export function MultiLineTooltip(config: MultiLineTooltipConfig = {}) {
  const {
    fields = [],
    title,
    format,
    style = {},
    className = "",
    showLabels = true,
    separator = ": "
  } = config

  // Return a tooltipContent function that Semiotic expects
  return (data: any) => {
    // Guard against undefined/null data
    if (!data || typeof data !== "object") {
      return null
    }

    const lines: Array<{ label?: string; value: string }> = []

    // Add title line if specified
    if (title) {
      const titleValue = getValue(data, title)
      lines.push({
        value: formatValue(titleValue, format)
      })
    }

    // Add field lines
    if (fields && Array.isArray(fields) && fields.length > 0) {
      fields.forEach((field) => {
        let label: string | undefined
        let accessor: Accessor<any>
        let fieldFormat: ((value: any) => string) | undefined

        if (typeof field === "string") {
          // Simple string field name
          label = field
          accessor = field
          fieldFormat = format
        } else {
          // Full TooltipField object
          // Support both 'key' and 'accessor' for backward compatibility
          label = field.label
          accessor = field.accessor || field.key || ""
          fieldFormat = field.format || format
        }

        const value = getValue(data, accessor)
        const formattedValue = formatValue(value, fieldFormat)

        lines.push({
          label: showLabels ? label : undefined,
          value: formattedValue
        })
      })
    } else {
      // Default: show all non-internal properties
      const keys = Object.keys(data).filter(
        (k) => !k.startsWith("_") && k !== "data"
      )
      keys.forEach((key) => {
        lines.push({
          label: showLabels ? key : undefined,
          value: formatValue(data[key], format)
        })
      })
    }

    const mergedStyle = { ...defaultTooltipStyle, ...style }

    // Safety check: ensure lines is an array
    if (!Array.isArray(lines) || lines.length === 0) {
      return null
    }

    return (
      <div
        className={`semiotic-tooltip semiotic-tooltip-multiline ${className}`.trim()}
        style={mergedStyle}
      >
        {lines.map((line, index) => (
          <div key={index} style={{ marginBottom: index < lines.length - 1 ? "4px" : 0 }}>
            {line.label && (
              <strong>
                {line.label}
                {separator}
              </strong>
            )}
            {line.value}
          </div>
        ))}
      </div>
    )
  }
}

/**
 * Type for tooltip prop that chart components accept
 */
export type TooltipProp =
  | boolean
  | ((data: any) => React.ReactNode)
  | ReturnType<typeof Tooltip>
  | ReturnType<typeof MultiLineTooltip>

/**
 * Convert a tooltip prop to the format Semiotic expects
 */
export function normalizeTooltip(tooltip: TooltipProp): any {
  if (tooltip === true) {
    // Enable default tooltip
    return true
  }

  if (typeof tooltip === "function") {
    // Already a tooltip function, use it as tooltipContent
    return tooltip
  }

  if (tooltip === false || tooltip === undefined) {
    // No tooltip
    return false
  }

  // Should not reach here but return the value as-is
  return tooltip
}
