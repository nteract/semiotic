import { formatTooltipNumber } from "./formatTooltipNumber"
import * as React from "react"
import type { Accessor } from "../charts/shared/types"
import type { Datum } from "../charts/shared/datumTypes"
import type { HoverData } from "../realtime/types"
import { normalizeTooltipDatum } from "./normalizeTooltipDatum"
import { formatTooltipDate } from "./formatTooltipDate"
import { smartTooltipEntries } from "../charts/shared/smartTooltip"
import {
  TooltipRoot,
  TooltipChromeScope,
  hasOwnTooltipChrome,
  hasTooltipContent,
  markTooltipChrome,
} from "./tooltipChrome"

export {
  TooltipRoot,
  defaultTooltipStyle,
  hasOwnTooltipChrome,
  hasTooltipContent,
  markTooltipChrome,
} from "./tooltipChrome"
export type { TooltipRootProps, TooltipChromeMode } from "./tooltipChrome"

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
  /** Explicit chrome policy; otherwise inherits theme.tooltip.chrome. */
  chrome?: "default" | "none"
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

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return String(value)
    return formatTooltipNumber(value)
  }

  // Format dates
  if (value instanceof Date) {
    return formatTooltipDate(value)
  }

  // Handle objects (e.g. resolved network nodes with an id property)
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>
    if (obj.id !== undefined) return String(obj.id)
    if (obj.name !== undefined) return String(obj.name)
    try {
      return JSON.stringify(value)
    } catch {
      // Layout engines commonly add parent/source/target references to user
      // data, turning otherwise ordinary objects into cycles. A tooltip must
      // degrade to a readable placeholder instead of taking down the chart.
      return Array.isArray(value) ? `[Array(${value.length})]` : "[Object]"
    }
  }

  return String(value)
}

function formattedTooltipField(data: Record<string, unknown>, field: string | TooltipField, format?: (value: unknown) => string) {
  const accessor = typeof field === "string" ? field : field.accessor || field.key || ""
  return {
    label: typeof field === "string" ? field : field.label,
    value: formatValue(getValue(data, accessor), typeof field === "string" ? format : field.format || format)
  }
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
    chrome,
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
      fieldLines.push(...fields.map((field) => formattedTooltipField(data, field, format)))
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

    return (
      <TooltipRoot chrome={chrome} className={className} style={style}>
        {titleContent && <div style={{ fontWeight: fieldLines.length > 0 ? "bold" : "normal" }}>{titleContent}</div>}
        {fieldLines.map((line, index) => (
          <div key={index} style={{ marginTop: index === 0 && titleContent ? "4px" : 0 }}>
            {line.label && <span>{line.label}: </span>}
            {line.value}
          </div>
        ))}
      </TooltipRoot>
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
    chrome,
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

    const lines: Array<{ label?: string; value: string; bold?: boolean }> = []

    // Add title line if specified
    if (title) {
      const titleValue = getValue(data, title)
      lines.push({
        value: formatValue(titleValue, format)
      })
    }

    // Add field lines
    if (fields && Array.isArray(fields) && fields.length > 0) {
      for (const field of fields) {
        const line = formattedTooltipField(data, field, format)
        lines.push({ ...line, label: showLabels ? line.label : undefined })
      }
    } else {
      // Default (no fields declared): use the smart heuristic — a bold title
      // (name/label), then a type, a value, and the rest — instead of dumping
      // every property in object order. `skipPositional: false` keeps x/y here
      // because in a generic datum they are usually the data, not pixel coords.
      const smart = smartTooltipEntries(data, { skipPositional: false })
      if (smart.title != null) {
        lines.push({ label: undefined, value: formatValue(smart.title, format), bold: true })
      }
      smart.entries.forEach((entry) => {
        lines.push({
          label: showLabels ? entry.key : undefined,
          value: formatValue(entry.value, format)
        })
      })
    }

    // Safety check: ensure lines is an array
    if (!Array.isArray(lines) || lines.length === 0) {
      return null
    }

    return (
      <TooltipRoot chrome={chrome} className={`semiotic-tooltip-multiline ${className}`.trim()} style={style}>
        {lines.map((line, index) => (
          <div
            key={index}
            style={{
              marginBottom: index < lines.length - 1 ? "4px" : 0,
              fontWeight: line.bold ? "bold" : undefined,
            }}
          >
            {line.label && (
              <strong>
                {line.label}
                {separator}
              </strong>
            )}
            {line.value}
          </div>
        ))}
      </TooltipRoot>
    )
  }
}

/**
 * First-class multi-series tooltip: enable hover-anywhere multi mode and
 * optionally supply a custom renderer that receives the unwrapped datum
 * with `allSeries` / `xValue` re-attached.
 *
 * @example
 * ```tsx
 * // Built-in multi renderer
 * <LineChart tooltip="multi" />
 * <LineChart tooltip={{ mode: "multi" }} />
 *
 * // Custom multi renderer (no frameProps.tooltipMode needed)
 * <LineChart
 *   tooltip={{
 *     mode: "multi",
 *     content: (d) => <MyRows series={d.allSeries} x={d.xValue} />,
 *   }}
 * />
 * ```
 */
export interface MultiTooltipConfig {
  mode: "multi"
  /** Custom content owns the surface when set to "none". */
  chrome?: "default" | "none"
  /**
   * Custom renderer. Receives the raw hover datum with multi-series
   * context (`allSeries`, `xValue`) re-attached after unwrap. When
   * omitted, the built-in multi-series renderer is used.
   */
  content?: (data: Record<string, unknown>) => React.ReactNode
}

/** Custom datum renderer with an explicit chrome policy, without mutating the function. */
export interface CustomTooltipConfig {
  content: (data: Record<string, unknown>) => React.ReactNode
  /** "none" leaves all visual chrome to the content. Defaults to the theme policy. */
  chrome?: "default" | "none"
}

/**
 * Type for tooltip prop that chart components accept.
 * `false` disables the tooltip without disabling hover observations. A custom
 * renderer receives authored data; return `null` directly to omit a datum's
 * tooltip (including its background). Other React-empty results also suppress
 * it; numeric zero remains visible. Use TooltipRoot for custom chrome, or
 * markTooltipChrome(renderer) when chrome is inside wrapper components.
 */
export type TooltipProp =
  | boolean
  | "multi"
  | MultiTooltipConfig
  | CustomTooltipConfig
  | ((data: Record<string, unknown>) => React.ReactNode)
  | ReturnType<typeof Tooltip>
  | ReturnType<typeof MultiLineTooltip>
  | TooltipConfig

/**
 * Backward-compatible tooltip input for charts that historically supplied the
 * complete HoverData wrapper to a plain callback.
 */
export type TooltipPropWithHoverCallback =
  | TooltipProp
  | ((data: HoverData) => React.ReactNode)

/**
 * The function signature that Stream Frames expect for tooltipContent.
 * Compatible with HoverData and any Record-based hover object.
 * Receives the frame hover wrapper; use unwrapDatum once for authored data.
 * Return null directly to suppress the entire tooltip for a datum.
 */
export type TooltipContentFn = (d: Datum) => React.ReactNode

/** True when the tooltip prop requests multi-series / hover-anywhere mode. */
export function isMultiTooltip(tooltip: TooltipProp | undefined): boolean {
  if (tooltip === "multi") return true
  return isMultiTooltipConfig(tooltip)
}

export function isMultiTooltipConfig(
  tooltip: TooltipProp | undefined,
): tooltip is MultiTooltipConfig {
  return (
    typeof tooltip === "object" &&
    tooltip !== null &&
    !Array.isArray(tooltip) &&
    "mode" in tooltip &&
    (tooltip as MultiTooltipConfig).mode === "multi"
  )
}

/**
 * Resolve tooltip content + optional `tooltipMode: "multi"` for charts that
 * support multi-series hover (LineChart, AreaChart, StackedAreaChart, …).
 *
 * Handles `tooltip="multi"`, `tooltip={{ mode: "multi", content? }}`, custom
 * functions, config objects, and `false`/`true`/undefined the same way as
 * the previous per-chart branches.
 *
 * Content functions are typed loosely (`Datum`) so chart-specific defaults
 * that accept `HoverData` (a Datum subtype at runtime) still type-check when
 * spread onto Stream frame props.
 */
export function resolveMultiCapableTooltip(input: {
  tooltip: TooltipPropWithHoverCallback | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultTooltipContent: (d: any) => React.ReactNode
  /** Used when multi mode is on and no custom content was provided. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  multiDefaultContent?: (d: any) => React.ReactNode
  /**
   * Preserve a legacy HOC contract whose plain function receives the full
   * HoverData wrapper. Multi config `content` always receives the normalized
   * raw datum plus `allSeries` / `xValue` as documented.
   * @default "datum"
   */
  customFunctionContext?: "datum" | "hover"
}): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tooltipContent: (d: any) => React.ReactNode
  tooltipMode?: "multi"
} {
  const {
    tooltip,
    defaultTooltipContent,
    multiDefaultContent = MultiPointTooltip(),
    customFunctionContext = "datum",
  } = input
  const sharedTooltip = tooltip as TooltipProp | undefined

  if (tooltip === false) {
    return { tooltipContent: () => null }
  }

  if (isMultiTooltip(sharedTooltip)) {
    const custom =
      isMultiTooltipConfig(sharedTooltip) && typeof sharedTooltip.content === "function"
        ? normalizeTooltip(sharedTooltip.chrome === undefined ? sharedTooltip.content : { content: sharedTooltip.content, chrome: sharedTooltip.chrome })
        : undefined
    const chrome = isMultiTooltipConfig(sharedTooltip) ? sharedTooltip.chrome : undefined
    const defaultContent = chrome === undefined ? multiDefaultContent : (datum: Datum) => {
      const content = multiDefaultContent(datum)
      return hasTooltipContent(content)
        ? <TooltipChromeScope chrome={chrome}>{content}</TooltipChromeScope>
        : null
    }
    return {
      tooltipContent: (custom as false | undefined) || defaultContent,
      tooltipMode: "multi",
    }
  }

  if (customFunctionContext === "hover" && typeof tooltip === "function") {
    return { tooltipContent: tooltip }
  }

  const normalized = normalizeTooltip(sharedTooltip)
  return {
    tooltipContent: (normalized as false | undefined) || defaultTooltipContent,
  }
}

/**
 * Resolve the default/custom/disabled contract for chart families whose frame
 * only supports single-datum hover. This is the single-mode counterpart to
 * `resolveMultiCapableTooltip` and is useful for legacy wrappers that expose a
 * raw HoverData callback while also accepting the shared config/boolean API.
 */
export function resolveTooltipContent(input: {
  tooltip: TooltipPropWithHoverCallback | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultTooltipContent: (d: any) => React.ReactNode
  /** @default "datum" */
  customFunctionContext?: "datum" | "hover"
}): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tooltipContent: (d: any) => React.ReactNode
} {
  const {
    tooltip,
    defaultTooltipContent,
    customFunctionContext = "datum",
  } = input
  const sharedTooltip = tooltip as TooltipProp | undefined

  if (tooltip === false) return { tooltipContent: () => null }
  if (customFunctionContext === "hover" && typeof tooltip === "function") {
    return { tooltipContent: tooltip }
  }
  const normalized = normalizeTooltip(sharedTooltip)
  return {
    tooltipContent: (normalized as false | undefined) || defaultTooltipContent,
  }
}

/**
 * Multi-point tooltip: shows all series values at the hovered X position
 * with color swatches (legend-style). Used when tooltipMode="multi".
 */
export function MultiPointTooltip({
  xFormat,
  yFormat
}: {
  xFormat?: (value: number | Date | string) => React.ReactNode
  yFormat?: (value: number, group?: string) => React.ReactNode
} = {}): TooltipContentFn {
  function formatted<T>(value: T, format?: (value: T) => React.ReactNode): React.ReactNode {
    if (format) {
      try {
        const content = format(value)
        if (content != null) return content
      } catch {
        // Match field tooltips: a failed formatter uses the rounded default.
      }
    }
    return formatValue(value)
  }
  return (d: Datum) => {
    const allSeries = d.allSeries as Array<{ group: string; value: number; color: string; datum?: Datum }> | undefined
    if (!allSeries || allSeries.length === 0) {
      // Fallback to single-datum display. Read data-space values
      // off `d.data` only — the v2-era pixel-coordinate aliases on
      // the hover root are gone.
      const val = d.data?.value ?? d.data?.y
      return (
        <TooltipRoot>
          <div>{formatted(val, yFormat)}</div>
        </TooltipRoot>
      )
    }

    // Header: prefer `xValue` (data-space, set by StreamXYFrame for
    // multi-tooltip mode), then fall back to canonical datum fields.
    const headerValue = d.xValue ?? d.data?.time ?? d.data?.x

    return (
      <TooltipRoot>
        {headerValue != null && (
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: "0.9em", borderBottom: "1px solid var(--semiotic-border, #eee)", paddingBottom: 4 }}>
            {formatted(headerValue, xFormat)}
          </div>
        )}
        {allSeries.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "1px 0" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: s.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: "0.85em" }}>{s.group}</span>
            <span style={{ fontWeight: 500, fontSize: "0.85em" }}>{formatted(s.value, yFormat && ((value) => yFormat(value, s.group)))}</span>
          </div>
        ))}
      </TooltipRoot>
    )
  }
}

let warnedMultiContent = false

/**
 * Convert a tooltip prop to the format Semiotic expects.
 * Returns `false` to disable, or a `TooltipContentFn` compatible with
 * all Stream Frame `tooltipContent` signatures.
 */
export function normalizeTooltip(tooltip: TooltipProp | undefined): false | TooltipContentFn | undefined {
  if (tooltip === true) {
    // Return undefined so the caller's `|| defaultTooltipContent`
    // fallback chain (in `buildTooltipProps`) lands on the chart's
    // chart-specific default tooltip — the one with proper field
    // labels ("Open"/"High"/"Low"/"Close" for candlestick,
    // "Category"/"Value" for ordinal, etc.). Returning the generic
    // `Tooltip()` here would render raw datum field names ("o", "h",
    // "l", "c") which is what `tooltip={true}` historically did but
    // is rarely what the user wants. Consumers without a chart-
    // specific default still fall through to the Stream Frame's
    // `DefaultTooltip`, so `tooltip={true}` on a raw frame keeps
    // working — just with the chart-aware shape.
    return undefined
  }

  if (typeof tooltip === "function" || (typeof tooltip === "object" && tooltip !== null && "content" in tooltip && typeof tooltip.content === "function" && !isMultiTooltipConfig(tooltip))) {
    // Wrap user function to fix two common issues:
    // 1. The Stream Frame calls tooltipContent with HoverData ({ data, x, y, ... }),
    //    but HOC users expect their raw datum. We unwrap automatically.
    // 2. Returning a plain string/number renders as an unstyled text node.
    //    We wrap all results in the standard tooltip chrome.
    const userFn = typeof tooltip === "function" ? tooltip : tooltip.content!
    const chrome = typeof tooltip === "function" ? undefined : tooltip.chrome
    const normalized = (hoverData: Datum) => {
      const datum = normalizeTooltipDatum(hoverData)
      if (!datum) return null
      const result = userFn(datum)
      if (!hasTooltipContent(result)) return null
      // A custom renderer can own its chrome either with TooltipRoot, the
      // explicit data marker, an inline background, or a renderer/component
      // ownsChrome flag. Preserve that element directly; wrapping it here
      // would create the same double-box artifact FlippingTooltip avoids.
      if (chrome === undefined && (hasOwnTooltipChrome(userFn) || hasOwnTooltipChrome(result))) return result
      return (
        <TooltipRoot chrome={chrome}>
          {result}
        </TooltipRoot>
      )
    }
    return chrome === undefined && hasOwnTooltipChrome(userFn) ? markTooltipChrome(normalized) : normalized
  }

  if (tooltip === false || tooltip === undefined) {
    // No tooltip
    return false
  }

  // First-class multi config. Charts that support multi mode should
  // intercept via `isMultiTooltip` / `resolveMultiCapableTooltip` and set
  // `tooltipMode: "multi"` on the frame. If we still land here, use the
  // same useful single-datum fallback as the string form below. A
  // MultiPointTooltip cannot render meaningful rows without `allSeries`,
  // which single-mode ordinal/network/geo/physics frames do not provide.
  if (isMultiTooltipConfig(tooltip)) {
    if (typeof tooltip.content === "function") {
      if (!warnedMultiContent && process.env.NODE_ENV !== "production") {
        warnedMultiContent = true
        console.warn(
          '[semiotic] tooltip={{ mode: "multi", content }} reached a chart without multi-series hover. content receives one datum and no allSeries.',
        )
      }
      return normalizeTooltip(tooltip.chrome === undefined ? tooltip.content : { content: tooltip.content, chrome: tooltip.chrome })
    }
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        '[semiotic] tooltip={{ mode: "multi" }} reached normalizeTooltip without a chart that wires tooltipMode. Use a line/area-family chart with multi support, or pass frameProps.tooltipMode: "multi" to StreamXYFrame.',
      )
    }
    const singleFallback = MultiLineTooltip({ chrome: tooltip.chrome })
    return normalizeTooltip((datum: Datum) => singleFallback(datum))
  }

  // Config object with fields/title — convert to a tooltip function
  if (typeof tooltip === "object" && tooltip !== null && ("fields" in tooltip || "title" in tooltip || "chrome" in tooltip)) {
    const config = tooltip as TooltipConfig
    const configuredTooltip = Tooltip(config)
    // Declarative configs follow the same raw-datum contract as callback
    // tooltips. Reuse the function normalizer so Stream Frame HoverData is
    // unwrapped consistently across XY, ordinal, network, geo, physics, and
    // realtime wrappers.
    return normalizeTooltip((datum: Datum) => configuredTooltip(datum))
  }

  // `tooltip="multi"` is only wired when the HOC sets tooltipMode:"multi"
  // (Line/Area/StackedArea/Difference). If normalizeTooltip still sees the
  // string, the chart does not support multi mode — return a multi-series
  // content function so callers still get a useful multi tooltip, and warn
  // in development when a chart does not declare multi-tooltip mode.
  if (tooltip === "multi") {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        '[semiotic] tooltip="multi" reached normalizeTooltip on a single-tooltip chart. Rendering multi-field content as a backward-compatible fallback.',
      )
    }
    const singleFallback = MultiLineTooltip()
    return normalizeTooltip((datum: Datum) => singleFallback(datum))
  }

  // Should not reach here but return a generic tooltip
  return Tooltip()
}
