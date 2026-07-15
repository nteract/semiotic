"use client"

import * as React from "react"
import type { HoverData } from "../realtime/types"

export const SR_ONLY_STYLE: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0
}

/** Visually-hidden aria-live region that mirrors tooltip text for screen readers. */
export function AriaLiveTooltip({ hoverPoint }: { hoverPoint: Pick<HoverData, "data"> | { data: object } | null }) {
  let text = ""
  if (hoverPoint) {
    const data = hoverPoint.data || hoverPoint
    if (typeof data === "object") {
      const entries = Object.entries(data).filter(
        ([, value]) => typeof value !== "object" && typeof value !== "function"
      )
      text = `Data point: ${entries.map(([key, value]) => `${key}: ${value}`).join(", ")}`
    } else {
      text = `Data point: ${String(data)}`
    }
  }

  return <div aria-live="polite" aria-atomic="true" style={SR_ONLY_STYLE}>{text}</div>
}
