/**
 * Default ordinal hover tooltip for StreamOrdinalFrame.
 * Uses shared `defaultTooltipStyle` for theme CSS-var consistency.
 */

import type { Datum } from "../charts/shared/datumTypes"
import { smartTooltipEntries } from "../charts/shared/smartTooltip"
import * as React from "react"
import type { HoverData } from "./ordinalTypes"
import { defaultTooltipStyle } from "../Tooltip/Tooltip"

/** Render an ordinal datum smartly: a name/label title, a type, a value, then
 *  the rest — for swarm/point and custom-layout fallbacks. `skipPositional`
 *  stays off because in user data x/y are values, not coordinates. */
function smartOrdinalTooltip(d: Datum) {
  const smart = smartTooltipEntries(d, { skipPositional: false })
  if (smart.title == null && smart.entries.length === 0) return null
  return (
    <div className="semiotic-tooltip" style={defaultTooltipStyle}>
      {smart.title != null && <div style={{ fontWeight: "bold" }}>{String(smart.title)}</div>}
      {smart.entries.map((e) => (
        <div key={e.key}>
          <span style={{ opacity: 0.7 }}>{e.key}:</span>{" "}
          {typeof e.value === "number" ? e.value.toLocaleString() : String(e.value)}
        </div>
      ))}
    </div>
  )
}

function DefaultOrdinalTooltip({ hover }: { hover: HoverData }) {
  const d = hover.data || {}
  const stats = hover.stats
  const hoverCategory = hover.category

  // For summary types (boxplot, violin, ridgeline), datum is an array of pieces
  if (Array.isArray(d)) {
    const category = hoverCategory || d[0]?.category || ""
    if (stats) {
      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          {category && <div style={{ fontWeight: "bold" }}>{String(category)}</div>}
          <div>n = {stats.n}</div>
          <div>Min: {stats.min.toLocaleString()}</div>
          <div>Q1: {stats.q1.toLocaleString()}</div>
          <div>Median: {stats.median.toLocaleString()}</div>
          <div>Q3: {stats.q3.toLocaleString()}</div>
          <div>Max: {stats.max.toLocaleString()}</div>
          <div style={{ opacity: 0.8 }}>Mean: {stats.mean.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
        </div>
      )
    }
    const n = d.length
    return (
      <div className="semiotic-tooltip" style={defaultTooltipStyle}>
        {category && <div style={{ fontWeight: "bold" }}>{String(category)}</div>}
        <div>{n} items</div>
      </div>
    )
  }

  // For histogram bins
  if (d.bin != null && d.count != null) {
    const range = d.range || []
    return (
      <div className="semiotic-tooltip" style={defaultTooltipStyle}>
        {d.category && <div style={{ fontWeight: "bold" }}>{String(d.category)}</div>}
        <div>Count: {d.count}</div>
        {range.length === 2 && (
          <div style={{ opacity: 0.8 }}>
            {Number(range[0]).toFixed(1)} – {Number(range[1]).toFixed(1)}
          </div>
        )}
      </div>
    )
  }

  // Accessor hints passed from the hover handler
  const oAccessor = hover.__oAccessor
  const rAccessor = hover.__rAccessor
  const hoverChartType = hover.__chartType

  // For swarm/point charts, show the datum fields (point-level data, not
  // aggregated) — smartly: a name/label title, then a type, a value, the rest.
  if (hoverChartType === "swarm" || hoverChartType === "point") {
    return smartOrdinalTooltip(d)
  }

  // For regular pieces (bar, pie, etc.) — use accessor names to find category and value
  const category = (oAccessor && d[oAccessor] != null ? d[oAccessor] : null)
    || d.category || d.name || d.group || d.__rName || ""
  const value = d.__aggregateValue
    ?? (rAccessor && d[rAccessor] != null ? d[rAccessor] : null)
    ?? d.value ?? d.__rValue ?? d.pct ?? ""

  // If standard fields didn't match, fall back to the smart field selection
  // (custom ordinal layouts, unusual datums) instead of dumping every field.
  if (!category && value === "") {
    return smartOrdinalTooltip(d)
  }

  return (
    <div className="semiotic-tooltip" style={defaultTooltipStyle}>
      {category && <div style={{ fontWeight: "bold" }}>{String(category)}</div>}
      {value !== "" && <div>{typeof value === "number" ? value.toLocaleString() : String(value)}</div>}
    </div>
  )
}
// Tell FlippingTooltip this component paints its own chrome.
;(DefaultOrdinalTooltip as unknown as { ownsChrome: boolean }).ownsChrome = true

export { DefaultOrdinalTooltip }
