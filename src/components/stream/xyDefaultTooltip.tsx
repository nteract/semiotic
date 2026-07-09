/**
 * Default XY hover tooltip for StreamXYFrame.
 * Uses shared `defaultTooltipStyle` so theme CSS vars apply consistently.
 */

import type { Datum } from "../charts/shared/datumTypes"
import { smartTooltipEntries } from "../charts/shared/tooltipUtils"
import * as React from "react"
import type { HoverData } from "./types"
import { defaultTooltipStyle } from "../Tooltip/Tooltip"

function formatTooltipValue(v: unknown): string {
  if (v == null) return ""
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(2)
  if (v instanceof Date) return v.toLocaleString()
  return String(v)
}

function DefaultTooltip({ hover }: { hover: HoverData }) {
  // Read data-space values off the raw datum. The Stream Frame's
  // hover-build pipeline doesn't know the consumer's accessor names,
  // so the default tooltip displays the canonical-shape fields. HOCs
  // that want to honor `xAccessor`/`yAccessor` build their own
  // tooltip — see `buildDefaultRealtimeTooltip` for the realtime
  // family's accessor-aware fallback.
  const datum = (hover.data ?? {}) as Record<string, unknown>
  const yField = datum.y ?? datum.value
  const xField = datum.x ?? datum.time
  // XYCustomChart and other bespoke data may carry neither x/y nor value/time.
  // Rather than render blank, fall back to a smart title + de-noised rows.
  if (yField === undefined && xField === undefined) {
    const smart = smartTooltipEntries(datum as Datum)
    if (smart.title != null || smart.entries.length > 0) {
      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          {smart.title != null && (
            <div
              style={{
                fontWeight: 600,
                marginBottom: smart.entries.length ? 2 : 0
              }}
            >
              {String(smart.title)}
            </div>
          )}
          {smart.entries.map((e) => (
            <div key={e.key} style={{ opacity: 0.7, fontSize: 11 }}>
              {e.key}:{" "}
              <span style={{ fontWeight: 600 }}>{formatTooltipValue(e.value)}</span>
            </div>
          ))}
        </div>
      )
    }
  }
  return (
    <div className="semiotic-tooltip" style={defaultTooltipStyle}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>
        {formatTooltipValue(yField)}
      </div>
      <div style={{ opacity: 0.7, fontSize: 11 }}>
        {formatTooltipValue(xField)}
      </div>
    </div>
  )
}
// Tell FlippingTooltip this component paints its own chrome.
;(DefaultTooltip as unknown as { ownsChrome: boolean }).ownsChrome = true

export { DefaultTooltip }
