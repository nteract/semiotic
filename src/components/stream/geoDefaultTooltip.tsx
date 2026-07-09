/**
 * Default geo hover tooltip for StreamGeoFrame.
 * Uses shared `defaultTooltipStyle` for theme CSS-var consistency.
 */

import type { Datum } from "../charts/shared/datumTypes"
import { smartTooltipEntries, formatVal } from "../charts/shared/tooltipUtils"
import * as React from "react"
import type { HoverData } from "../realtime/types"
import { defaultTooltipStyle } from "../Tooltip/Tooltip"

type GeoTooltipData = HoverData | null

function DefaultGeoTooltip({ data }: { data: GeoTooltipData }) {
  if (!data) return null
  // GeoJSON features: show properties (lifted to top-level on the hover wrapper)
  if (data.properties) {
    const name = data.properties.name || data.properties.NAME || data.properties.id || "Feature"
    return (
      <div className="semiotic-tooltip" style={defaultTooltipStyle}>
        <div style={{ fontWeight: 600 }}>{name}</div>
      </div>
    )
  }
  // Point data: hover wrapper now has the canonical { data, x, y } shape
  // (no flattened fields), so read user-facing fields off `data.data`.
  // Skip wrapper-internal keys when iterating so the default tooltip
  // shows the user's actual datum fields, not "data: [object]".
  const source = data.data != null ? data.data : data
  if (!source || typeof source !== "object") return null
  // Pick a human-meaningful title + de-noised rows rather than dumping fields.
  const smart = smartTooltipEntries(source as Datum)
  const title = smart.title != null ? String(smart.title) : null
  if (title == null && smart.entries.length === 0) return null
  return (
    <div className="semiotic-tooltip" style={defaultTooltipStyle}>
      {title != null && (
        <div style={{ fontWeight: 600, marginBottom: smart.entries.length ? 2 : 0 }}>{title}</div>
      )}
      {smart.entries.map((e) => (
        <div key={e.key}>
          <span style={{ opacity: 0.7 }}>{e.key}: </span>
          <span style={{ fontWeight: 600 }}>{formatVal(e.value)}</span>
        </div>
      ))}
    </div>
  )
}
// Tell FlippingTooltip this component paints its own chrome.
;(DefaultGeoTooltip as unknown as { ownsChrome: boolean }).ownsChrome = true

export { DefaultGeoTooltip }
