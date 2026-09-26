"use client"

import * as React from "react"
import { SR_ONLY_STYLE } from "../screenReaderStyles"
export { SR_ONLY_STYLE } from "../screenReaderStyles"
import type { HoverData } from "../realtime/types"
import { accessibleDatumFor, datumToValues, type AccessibleSceneNode } from "./accessibleDataRows"

/** Visually-hidden aria-live region that mirrors tooltip text for screen readers. */
export function AriaLiveTooltip({ hoverPoint, scene, active = true }: {
  hoverPoint: Pick<HoverData, "data" | "stats" | "category"> | { data: object } | null
  scene?: AccessibleSceneNode[]
  /** Frames enable announcements for keyboard focus, not pointer hover. */
  active?: boolean
}) {
  let text = ""
  if (active && hoverPoint) {
    const raw = hoverPoint.data ?? hoverPoint
    const stats = "stats" in hoverPoint ? hoverPoint.stats : undefined
    // A distribution summary and its outlier marks may share a source row.
    // The pointer/keyboard stats metadata distinguishes summary focus from an
    // observation, whose exact scene mark must retain its authored value.
    const node = (stats && scene?.find(candidate => candidate.stats === stats)) ||
      scene?.find(candidate => candidate.datum === raw) ||
      scene?.find(candidate => Array.isArray(candidate.datum) && candidate.datum.includes(raw))
    const accessible = node ? accessibleDatumFor(node) : raw
    const data = stats && node && (node.type === "boxplot" || node.type === "violin") && Array.isArray(accessible)
      ? { category: node.category, ...datumToValues(node.stats) }
      : accessible
    if (data != null && typeof data === "object") {
      const records = Array.isArray(data) ? data : [data]
      const descriptions = records.map((record) => Object.entries(datumToValues(record))
        .map(([key, value]) => `${key}: ${value}`).join(", ")).filter(Boolean)
      text = descriptions.length > 0 ? `Data point: ${descriptions.join("; ")}` : ""
    } else {
      text = `Data point: ${String(data)}`
    }
  }

  return <div aria-live="polite" aria-atomic="true" style={SR_ONLY_STYLE}>{text}</div>
}
