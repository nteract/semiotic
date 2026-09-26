"use client"

import * as React from "react"
import { ClipboardStatus, useClipboard } from "./useClipboard"

/** Keep transient clipboard state local to the toolbar action, not the chart. */
export function ChartCopyAction({
  copy,
  style
}: {
  copy: () => Promise<void>
  style: React.CSSProperties
}) {
  const clipboard = useClipboard()
  const feedback =
    clipboard.status === "failed"
      ? "Copy failed"
      : clipboard.status === "copied"
        ? "Copied"
        : null
  return (
    <>
      <button
        className="semiotic-chart-action"
        onClick={() => void clipboard.copy(copy)}
        title={feedback ?? "Copy config"}
        aria-label={feedback ?? "Copy chart configuration"}
        style={style}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="5" y="5" width="8" height="8" rx="1" />
          <path d="M9 5V2a1 1 0 00-1-1H2a1 1 0 00-1 1v6a1 1 0 001 1h3" />
        </svg>
      </button>
      <ClipboardStatus status={clipboard.status} />
    </>
  )
}
