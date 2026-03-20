import * as React from "react"
import { defaultTooltipStyle } from "../../Tooltip/Tooltip"
import type { HoverData } from "../../realtime/types"

export interface TooltipFieldConfig {
  label: string
  accessor: string | ((d: any) => any)
  role?: "title" | "x" | "y" | "color" | "size" | "group" | "value"
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

    const titleValue = titleField ? formatVal(resolveValue(d, titleField.accessor)) : null

    return (
      <div className="semiotic-tooltip" style={defaultTooltipStyle}>
        {titleValue && (
          <div style={{ fontWeight: "bold", marginBottom: bodyFields.length > 0 ? 4 : 0 }}>
            {titleValue}
          </div>
        )}
        {bodyFields.map((field, i) => {
          const raw = resolveValue(d, field.accessor)
          const display = formatVal(raw)
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
}: {
  categoryAccessor: string | ((d: any) => any)
  valueAccessor: string | ((d: any) => any)
  groupAccessor?: string | ((d: any) => any)
  groupLabel?: string
  pieData?: boolean
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
        <div style={{ marginTop: 4 }}>{formatVal(val)}</div>
        {group != null && (
          <div style={{ marginTop: 2, opacity: 0.8 }}>
            {groupLabel || accessorName(groupAccessor!)}: {formatVal(group)}
          </div>
        )}
      </div>
    )
  }
}
