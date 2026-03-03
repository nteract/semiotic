import * as React from "react"
import { defaultTooltipStyle } from "../../Tooltip/Tooltip"
import type { HoverData } from "../../realtime/types"

export interface TooltipFieldConfig {
  label: string
  accessor: string | ((d: Record<string, any>) => any)
  role?: "x" | "y" | "color" | "size" | "group" | "value"
}

/**
 * Extract a display name from an accessor.
 * Strings return themselves; functions return "value".
 */
export function accessorName(acc: string | Function): string {
  return typeof acc === "string" ? acc : "value"
}

function formatVal(v: unknown): string {
  if (v == null) return "–"
  if (typeof v === "number") return v.toLocaleString()
  if (v instanceof Date) return v.toLocaleDateString()
  return String(v)
}

function resolveValue(d: Record<string, any>, acc: string | ((d: Record<string, any>) => any)): unknown {
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
  return (hover: HoverData) => {
    const d = hover.data
    if (!d) return null

    return (
      <div className="semiotic-tooltip" style={defaultTooltipStyle}>
        {fields.map((field, i) => {
          const raw = resolveValue(d, field.accessor)
          const display = formatVal(raw)
          return (
            <div key={i} style={i > 0 ? { marginTop: 2 } : undefined}>
              <span style={{ opacity: 0.8 }}>{field.label}: </span>
              <span style={{ fontWeight: field.role === "color" || field.role === "group" ? "bold" : "normal" }}>
                {display}
              </span>
            </div>
          )
        })}
      </div>
    )
  }
}
