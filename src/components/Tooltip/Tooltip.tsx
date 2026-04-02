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
  key?: Accessor

  /**
   * Field name or accessor function to get the value
   */
  accessor?: Accessor

  /**
   * Optional format function for the value
   */
  format?: (value: unknown) => string
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
  format?: (value: unknown) => string

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
export const defaultTooltipStyle: React.CSSProperties = {
  background: "var(--semiotic-tooltip-bg, rgba(0, 0, 0, 0.85))",
  color: "var(--semiotic-tooltip-text, white)",
  padding: "8px 12px",
  borderRadius: "var(--semiotic-tooltip-radius, 6px)",
  fontSize: "var(--semiotic-tooltip-font-size, 14px)",
  fontFamily: "var(--semiotic-font-family, inherit)",
  lineHeight: "1.5",
  boxShadow: "var(--semiotic-tooltip-shadow, 0 2px 8px rgba(0, 0, 0, 0.15))",
  pointerEvents: "none",
  maxWidth: "300px",
  wordWrap: "break-word"
}

/**
 * Extract value from data using accessor
 */
function getValue(data: Record<string, unknown>, accessor: Accessor): unknown {
  if (typeof accessor === "function") {
    return accessor(data)
  }
  return data[accessor]
}

/**
 * Format a value for display
 */
function formatValue(value: unknown, format?: (value: unknown) => string): string {
  if (format) {
    return format(value)
  }

  if (value === null || value === undefined) {
    return ""
  }

  // Only add commas for numbers > 9999 to avoid formatting years (2005 → "2,005")
  if (typeof value === "number") {
    return Math.abs(value) > 9999 ? value.toLocaleString() : String(value)
  }

  // Format dates
  if (value instanceof Date) {
    return value.toLocaleDateString()
  }

  // Handle objects (e.g. resolved network nodes with an id property)
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>
    if (obj.id !== undefined) return String(obj.id)
    if (obj.name !== undefined) return String(obj.name)
    return JSON.stringify(value)
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
  return (data: Record<string, unknown>) => {
    // Guard against undefined/null data
    if (!data || typeof data !== "object") {
      return null
    }

    let titleContent: React.ReactNode
    const fieldLines: Array<{ label?: string; value: string }> = []

    if (title) {
      const titleValue = getValue(data, title)
      titleContent = formatValue(titleValue, format)
    }

    if (fields && fields.length > 0) {
      fields.forEach((field) => {
        let label: string | undefined
        let accessor: Accessor
        let fieldFormat: ((value: unknown) => string) | undefined

        if (typeof field === "string") {
          label = field
          accessor = field
          fieldFormat = format
        } else {
          label = field.label
          accessor = field.accessor || field.key || ""
          fieldFormat = field.format || format
        }

        const value = getValue(data, accessor)
        fieldLines.push({
          label,
          value: formatValue(value, fieldFormat)
        })
      })
    } else if (!title) {
      // Default: try common field names (only when no title or fields specified)
      const commonFields = ["value", "y", "name", "id", "label"]
      for (const field of commonFields) {
        if (data[field] !== undefined) {
          titleContent = formatValue(data[field], format)
          break
        }
      }

      // If still nothing, show first non-internal property
      if (!titleContent) {
        const keys = Object.keys(data).filter(k => !k.startsWith("_"))
        if (keys.length > 0) {
          titleContent = formatValue(data[keys[0]], format)
        }
      }
    }

    const mergedStyle = { ...defaultTooltipStyle, ...style }

    return (
      <div
        className={`semiotic-tooltip ${className}`.trim()}
        style={mergedStyle}
      >
        {titleContent && <div style={{ fontWeight: fieldLines.length > 0 ? "bold" : "normal" }}>{titleContent}</div>}
        {fieldLines.map((line, index) => (
          <div key={index} style={{ marginTop: index === 0 && titleContent ? "4px" : 0 }}>
            {line.label && <span>{line.label}: </span>}
            {line.value}
          </div>
        ))}
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
  return (data: Record<string, unknown>) => {
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
        let accessor: Accessor
        let fieldFormat: ((value: unknown) => string) | undefined

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
  | "multi"
  | ((data: Record<string, unknown>) => React.ReactNode)
  | ReturnType<typeof Tooltip>
  | ReturnType<typeof MultiLineTooltip>
  | TooltipConfig

/**
 * The function signature that Stream Frames expect for tooltipContent.
 * Compatible with HoverData and any Record-based hover object.
 */
export type TooltipContentFn = (d: Record<string, any>) => React.ReactNode

/**
 * Multi-point tooltip: shows all series values at the hovered X position
 * with color swatches (legend-style). Used when tooltipMode="multi".
 */
export function MultiPointTooltip(): TooltipContentFn {
  return (d: Record<string, any>) => {
    const allSeries = d.allSeries as Array<{ group: string; value: number; color: string }> | undefined
    if (!allSeries || allSeries.length === 0) {
      // Fallback to single-datum display
      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          <div>{formatValue(d.value ?? d.y)}</div>
        </div>
      )
    }

    return (
      <div className="semiotic-tooltip" style={defaultTooltipStyle}>
        {d.time != null && (
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: "0.9em", borderBottom: "1px solid var(--semiotic-border, #eee)", paddingBottom: 4 }}>
            {formatValue(d.time)}
          </div>
        )}
        {allSeries.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "1px 0" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: s.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: "0.85em" }}>{s.group}</span>
            <span style={{ fontWeight: 500, fontSize: "0.85em" }}>{formatValue(s.value)}</span>
          </div>
        ))}
      </div>
    )
  }
}

/**
 * Convert a tooltip prop to the format Semiotic expects.
 * Returns `false` to disable, or a `TooltipContentFn` compatible with
 * all Stream Frame `tooltipContent` signatures.
 */
export function normalizeTooltip(tooltip: TooltipProp | undefined): false | TooltipContentFn {
  if (tooltip === true) {
    // Enable default tooltip — return generic Tooltip function
    return Tooltip()
  }

  if (typeof tooltip === "function") {
    // Wrap user function to fix two common issues:
    // 1. The Stream Frame calls tooltipContent with HoverData ({ data, x, y, ... }),
    //    but HOC users expect their raw datum. We unwrap automatically.
    // 2. Returning a plain string/number renders as an unstyled text node.
    //    We wrap all results in the standard tooltip chrome.
    const userFn = tooltip as (data: Record<string, unknown>) => React.ReactNode
    return (hoverData: Record<string, any>) => {
      // Unwrap HoverData → raw datum so user functions receive the data they expect.
      // Only unwrap when hoverData matches the HoverData shape from Stream Frames
      // (has .type of "node"/"edge" AND .data object). This avoids mis-unwrapping
      // user data that happens to have a .data property.
      const isHoverWrapper = hoverData
        && typeof hoverData.data === "object"
        && hoverData.data !== null
        && (hoverData.type === "node" || hoverData.type === "edge")
      const datum = isHoverWrapper ? hoverData.data : hoverData
      const result = userFn(datum)
      if (result === null || result === undefined) return null
      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          {result}
        </div>
      )
    }
  }

  if (tooltip === false || tooltip === undefined) {
    // No tooltip
    return false
  }

  // Config object with fields/title — convert to a tooltip function
  if (typeof tooltip === "object" && tooltip !== null && ("fields" in tooltip || "title" in tooltip)) {
    const config = tooltip as TooltipConfig
    return Tooltip(config)
  }

  // Should not reach here but return a generic tooltip
  return Tooltip()
}
