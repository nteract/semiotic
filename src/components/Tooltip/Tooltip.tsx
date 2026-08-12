import * as React from "react"
import type { Accessor } from "../charts/shared/types"
import type { Datum } from "../charts/shared/datumTypes"
import type { HoverData } from "../realtime/types"
import { normalizeHoverDatum } from "../stream/hoverUtils"
import { smartTooltipEntries } from "../charts/shared/smartTooltip"
import {
  TooltipRoot,
  hasOwnTooltipChrome,
} from "./tooltipChrome"

export {
  TooltipRoot,
  defaultTooltipStyle,
  hasOwnTooltipChrome,
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

  // Format numbers: round to reasonable precision, add commas for large values
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return String(value)
    // Round to avoid floating point noise (e.g. 12.300000000001 → 12.3)
    const rounded = Number.isInteger(value) ? value : parseFloat(value.toPrecision(6))
    return Math.abs(rounded) > 9999 ? rounded.toLocaleString() : String(rounded)
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

    return (
      <TooltipRoot className={className} style={style}>
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
      <TooltipRoot className={`semiotic-tooltip-multiline ${className}`.trim()} style={style}>
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
  /**
   * Custom renderer. Receives the raw hover datum with multi-series
   * context (`allSeries`, `xValue`) re-attached after unwrap. When
   * omitted, the built-in multi-series renderer is used.
   */
  content?: (data: Record<string, unknown>) => React.ReactNode
}

/**
 * Type for tooltip prop that chart components accept
 */
export type TooltipProp =
  | boolean
  | "multi"
  | MultiTooltipConfig
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
        ? normalizeTooltip(sharedTooltip.content)
        : undefined
    return {
      tooltipContent: (custom as false | undefined) || multiDefaultContent,
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
export function MultiPointTooltip(): TooltipContentFn {
  return (d: Datum) => {
    const allSeries = d.allSeries as Array<{ group: string; value: number; color: string; datum?: Datum }> | undefined
    if (!allSeries || allSeries.length === 0) {
      // Fallback to single-datum display. Read data-space values
      // off `d.data` only — the v2-era pixel-coordinate aliases on
      // the hover root are gone.
      const val = d.data?.value ?? d.data?.y
      return (
        <TooltipRoot>
          <div>{formatValue(val)}</div>
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
            {formatValue(headerValue)}
          </div>
        )}
        {allSeries.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "1px 0" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: s.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: "0.85em" }}>{s.group}</span>
            <span style={{ fontWeight: 500, fontSize: "0.85em" }}>{formatValue(s.value)}</span>
          </div>
        ))}
      </TooltipRoot>
    )
  }
}

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

  if (typeof tooltip === "function") {
    // Wrap user function to fix two common issues:
    // 1. The Stream Frame calls tooltipContent with HoverData ({ data, x, y, ... }),
    //    but HOC users expect their raw datum. We unwrap automatically.
    // 2. Returning a plain string/number renders as an unstyled text node.
    //    We wrap all results in the standard tooltip chrome.
    const userFn = tooltip as (data: Record<string, unknown>) => React.ReactNode
    return (hoverData: Datum) => {
      // Unwrap Semiotic HoverData → raw datum so user functions receive
      // the data they pushed/passed. Prefer the explicit internal marker
      // emitted by Stream Frames. Accept frame-only metadata as a narrow
      // fallback, but avoid guessing
      // from common raw fields like `{ x, y, data }` — those are valid user
      // datum shapes and must not be over-unwrapped.
      const explicitlyMarked = hoverData?.__semioticHoverData === true
      const hasLegacyFrameMarker = hoverData && (
        hoverData.type === "node" ||
        hoverData.type === "edge" ||
        hoverData.nodeOrEdge !== undefined ||
        hoverData.allSeries !== undefined ||
        hoverData.stats !== undefined ||
        hoverData.__chartType !== undefined
      )
      const looksLikeHoverWrapper = explicitlyMarked || (hoverData
        && hoverData.data !== undefined
        && typeof hoverData.x === "number"
        && typeof hoverData.y === "number"
        && hasLegacyFrameMarker)
      let datum = normalizeHoverDatum(looksLikeHoverWrapper ? (hoverData.data ?? {}) : hoverData)
      // Network frames wrap the user's datum twice. HoverData.data is the
      // RealtimeNode/RealtimeEdge that layout produced (carrying x0/y0/
      // sourceLinks — and, for edges, `source`/`target` resolved to node
      // OBJECTS), while the raw datum the user passed in `nodes`/`edges`
      // sits one level deeper at `.data`. Unwrap that extra level so network
      // HOC tooltips receive raw data, matching the XY/ordinal contract.
      // Without it a custom tooltip rendering `edge.source` gets a node
      // object and React throws "Objects are not valid as a React child".
      //
      // Match only genuine RealtimeNode/RealtimeEdge wrappers, not just the
      // presence of `nodeOrEdge` + a nested `.data`: every node built by the
      // network pipeline has numeric x0/x1 (createNode), and every edge a
      // numeric sankeyWidth (0 for non-sankey layouts). A customNetworkLayout
      // hit whose datum is the user's own object — even one that happens to
      // carry an incidental `.data` field — lacks those layout fields and is
      // passed through untouched.
      const isNodeWrapper =
        hoverData?.nodeOrEdge === "node" &&
        typeof datum?.x0 === "number" &&
        typeof datum?.x1 === "number"
      const isEdgeWrapper =
        hoverData?.nodeOrEdge === "edge" && typeof datum?.sankeyWidth === "number"
      if (!datum) return null
      if (
        (isNodeWrapper || isEdgeWrapper) &&
        datum.data &&
        typeof datum.data === "object"
      ) {
        datum = datum.data
      }
      if (!datum) return null
      // Multi-tooltip mode (`tooltip="multi"`) puts the per-series values on
      // the hover ROOT as `allSeries`, alongside the data-space `xValue` of
      // the cursor — not inside `.data`. Unwrapping to `.data` above would
      // therefore discard exactly the fields a multi-series tooltip needs
      // (and `allSeries !== undefined` is itself one of the markers that
      // *enables* the unwrap, so its presence triggered the step that
      // dropped it). Re-attach them onto a shallow copy so a user function
      // can read `datum.allSeries` the way `MultiPointTooltip` — which is
      // wired as `tooltipContent` directly and never passes through here —
      // always could. Copy rather than mutate: `datum` is the caller's own
      // data row. Real datum fields win, so a data row that legitimately
      // carries an `xValue` column is not overwritten by the cursor's.
      if (looksLikeHoverWrapper && (hoverData.allSeries !== undefined || hoverData.xValue !== undefined)) {
        const withHoverContext: Datum = { ...datum }
        if (hoverData.allSeries !== undefined && withHoverContext.allSeries === undefined) {
          withHoverContext.allSeries = hoverData.allSeries
        }
        if (hoverData.xValue !== undefined && withHoverContext.xValue === undefined) {
          withHoverContext.xValue = hoverData.xValue
        }
        datum = withHoverContext
      }
      const result = userFn(datum)
      if (result === null || result === undefined) return null
      // A custom renderer can own its chrome either with TooltipRoot, the
      // explicit data marker, an inline background, or a component-level
      // ownsChrome flag. Preserve that element directly; wrapping it here
      // would create the same double-box artifact FlippingTooltip avoids.
      if (hasOwnTooltipChrome(result)) return result
      return (
        <TooltipRoot>
          {result}
        </TooltipRoot>
      )
    }
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
      return normalizeTooltip(tooltip.content)
    }
    if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
      console.warn(
        '[semiotic] tooltip={{ mode: "multi" }} reached normalizeTooltip without a chart that wires tooltipMode. Use a line/area-family chart with multi support, or pass frameProps.tooltipMode: "multi" to StreamXYFrame.',
      )
    }
    const singleFallback = MultiLineTooltip()
    return normalizeTooltip((datum: Datum) => singleFallback(datum))
  }

  // Config object with fields/title — convert to a tooltip function
  if (typeof tooltip === "object" && tooltip !== null && ("fields" in tooltip || "title" in tooltip)) {
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
    if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
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
