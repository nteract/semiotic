import * as React from "react"
import { defaultTooltipStyle } from "../../Tooltip/Tooltip"
import type { HoverData } from "../../realtime/types"

export interface TooltipFieldConfig {
  label: string
  accessor: string | ((d: any) => any)
  role?: "title" | "x" | "y" | "color" | "size" | "group" | "value"
  /** Per-field formatter. HOCs pass `xFormat`/`yFormat`/`valueFormat` here so
   *  the default tooltip renders values consistently with the axis. Typed
   *  permissively (`any` → `ReactNode`) to match the mixed formatter
   *  signatures across ordinal (`(d: string | number) => string`) and XY
   *  (`(d, index?, allTicks?) => ReactNode`). A ReactNode return renders
   *  as-is in the tooltip span. If the formatter throws, the tooltip
   *  falls back to the built-in `formatVal`. */
  format?: (v: any, ...rest: any[]) => React.ReactNode
}

/**
 * Extract a display name from an accessor.
 * Strings return themselves; functions return "value".
 */
export function accessorName(acc: string | Function): string {
  return typeof acc === "string" ? acc : "value"
}

export function formatVal(v: unknown): string {
  if (v == null) return "–"
  if (typeof v === "number") {
    // Only add commas for numbers > 9999 to avoid formatting years (2005 → "2,005")
    return Math.abs(v) > 9999 ? v.toLocaleString() : String(v)
  }
  if (v instanceof Date) return v.toLocaleDateString()
  return String(v)
}

/** Safely apply a user-provided formatter; fall back to the built-in
 *  `formatVal` if the formatter is absent or throws. Keeps a misbehaving
 *  `valueFormat` from breaking the entire tooltip render. Returns
 *  `ReactNode` so HOCs that supply ReactNode-returning axis formatters
 *  (see the `xFormat`/`yFormat` pitfall in CLAUDE.md) render naturally. */
function applyFormat(value: unknown, fmt?: (v: any, ...rest: any[]) => React.ReactNode): React.ReactNode {
  if (!fmt) return formatVal(value)
  try {
    const out = fmt(value)
    return out == null ? formatVal(value) : out
  } catch {
    return formatVal(value)
  }
}

export function resolveValue(d: Record<string, any>, acc: string | ((d: Record<string, any>) => any)): unknown {
  return typeof acc === "function" ? acc(d) : d[acc]
}

/**
 * Build a default tooltipContent function for StreamXYFrame HOCs.
 * Receives HoverData ({ data, time, value, x, y }) and renders
 * labeled fields derived from the HOC's props.
 */
export function buildDefaultTooltip(
  fields: TooltipFieldConfig[]
): (hover: HoverData) => React.ReactNode {
  const titleField = fields.find(f => f.role === "title")
  const bodyFields = fields.filter(f => f.role !== "title")

  return (hover: HoverData) => {
    const d = hover.data
    if (!d) return null

    const titleValue = titleField
      ? applyFormat(resolveValue(d, titleField.accessor), titleField.format)
      : null

    return (
      <div className="semiotic-tooltip" style={defaultTooltipStyle}>
        {titleValue != null && (
          <div style={{ fontWeight: "bold", marginBottom: bodyFields.length > 0 ? 4 : 0 }}>
            {titleValue}
          </div>
        )}
        {bodyFields.map((field, i) => {
          const raw = resolveValue(d, field.accessor)
          const display = applyFormat(raw, field.format)
          return (
            <div key={i} style={i > 0 ? { marginTop: 2 } : undefined}>
              <span style={{ opacity: 0.7 }}>{field.label}: </span>
              <span>{display}</span>
            </div>
          )
        })}
      </div>
    )
  }
}

/**
 * Build a default tooltip for ordinal charts (BarChart, DotPlot, SwarmPlot, etc.).
 * Shows a bold category header, formatted value, and optional group field.
 *
 * @param pieData - If true, extracts datum via `d.data?.[0] || d.data || d`
 *   (PieChart/DonutChart wrap data in arrays). Default: `d.data || d`.
 */
export function buildOrdinalTooltip({
  categoryAccessor,
  valueAccessor,
  groupAccessor,
  groupLabel,
  pieData = false,
  valueFormat,
}: {
  categoryAccessor: string | ((d: any) => any)
  valueAccessor: string | ((d: any) => any)
  groupAccessor?: string | ((d: any) => any)
  groupLabel?: string
  pieData?: boolean
  /** Same formatter the HOC passes to the value axis. Threaded here so the
   *  default tooltip shows values consistently with the axis ("$450k", not
   *  "450000"). Override by passing a custom `tooltip` prop. */
  valueFormat?: (v: any, ...rest: any[]) => React.ReactNode
}): (d: Record<string, any>) => React.ReactNode {
  return (d: Record<string, any>) => {
    const datum = pieData
      ? (d.data?.[0] || d.data || d)
      : (d.data || d)

    const cat = resolveValue(datum, categoryAccessor)
    const val = resolveValue(datum, valueAccessor)
    const group = groupAccessor ? resolveValue(datum, groupAccessor) : undefined

    return (
      <div className="semiotic-tooltip" style={defaultTooltipStyle}>
        <div style={{ fontWeight: "bold" }}>{formatVal(cat)}</div>
        <div style={{ marginTop: 4 }}>{applyFormat(val, valueFormat)}</div>
        {group != null && (
          <div style={{ marginTop: 2, opacity: 0.8 }}>
            {groupLabel || accessorName(groupAccessor!)}: {formatVal(group)}
          </div>
        )}
      </div>
    )
  }
}
