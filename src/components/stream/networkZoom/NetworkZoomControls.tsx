"use client"
import * as React from "react"
import { useNetworkProjectedSize } from "./NetworkZoomContext"
import { zoomLimits } from "./geometry"
import type { NetworkZoomOptions } from "./types"
import type { bindNetworkZoom } from "./gestures"

const controlStyle: React.CSSProperties = {
  minWidth: 44,
  minHeight: 44,
  padding: "4px 12px",
  font: "inherit",
  borderRadius: 6,
  border: "1px solid var(--semiotic-border, #b6c4ce)",
  background: "var(--semiotic-bg, #fff)",
  color: "inherit"
}

export function NetworkZoomControls({
  zoomOptions,
  driver,
  fitToContent,
  resetZoom
}: {
  zoomOptions: NetworkZoomOptions
  driver: React.RefObject<ReturnType<typeof bindNetworkZoom> | null>
  fitToContent: () => void
  resetZoom: () => void
}) {
  const { width: k } = useNetworkProjectedSize(1, 1)
  const zoom = { k }
  const [min, max] = zoomLimits(zoomOptions)
  const zoomLocked = zoomOptions.locked || zoomOptions.zoomEnabled === false
  return (
    <div
      role="group"
      className="semiotic-network-zoom-controls"
      aria-label="Network viewport controls"
      data-network-zoom-ignore=""
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 0",
        touchAction: "auto"
      }}
    >
      <button
        type="button"
        aria-label="Zoom out"
        style={controlStyle}
        disabled={zoomLocked || zoom.k <= min}
        onClick={() => driver.current?.zoomBy(0.5)}
      >
        −
      </button>
      <output
        aria-label="Zoom level"
        style={{
          minWidth: 54,
          textAlign: "center",
          fontVariantNumeric: "tabular-nums"
        }}
      >
        {Math.round(zoom.k * 100)}%
      </output>
      <button
        type="button"
        aria-label="Zoom in"
        style={controlStyle}
        disabled={zoomLocked || zoom.k >= max}
        onClick={() => driver.current?.zoomBy(2)}
      >
        +
      </button>
      <button
        type="button"
        disabled={zoomOptions.locked}
        onClick={() => fitToContent()}
        style={controlStyle}
      >
        Fit
      </button>
      <button
        type="button"
        disabled={zoomOptions.locked}
        onClick={resetZoom}
        style={controlStyle}
      >
        Reset
      </button>
    </div>
  )
}
