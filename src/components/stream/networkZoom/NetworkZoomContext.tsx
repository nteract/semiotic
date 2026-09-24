"use client"
import { createContext, useContext, useEffect, useState } from "react"
import type { NetworkZoomState } from "./types"
import { DEFAULT_ZOOM } from "./geometry"

export const NetworkZoomContext = createContext<NetworkZoomState>({
  zoom: DEFAULT_ZOOM,
  settledZoom: DEFAULT_ZOOM,
  isInteracting: false,
  visibleRect: null
})

/** Read camera facts inside a zoomable chart's HTML marks or SVG overlays.
 * Outside a zoomable chart the identity camera keeps reusable content usable. */
export function useNetworkZoom(): NetworkZoomState {
  return useContext(NetworkZoomContext)
}

/** Displayed CSS-pixel size, with the last settled size for deferred work. */
export function useNetworkProjectedSize(width: number, height: number) {
  const { zoom, settledZoom, isInteracting } = useNetworkZoom()
  return {
    width: width * zoom.k,
    height: height * zoom.k,
    settledWidth: width * settledZoom.k,
    settledHeight: height * settledZoom.k,
    isInteracting
  }
}

/** Consumer-authored width thresholds; levels are 0 through breakpoints.length. */
export interface NetworkLODOptions {
  /** Ascending CSS-pixel widths at which the next detail level becomes useful. */
  breakpoints: readonly number[]
  /** CSS-pixel dead band around each threshold. @default 8 */
  hysteresis?: number
  /** Preserve full detail while an editor has focus; prevents input unmounting. */
  keepDetail?: boolean
}

/** Projected size plus a stable LOD. Demotion is immediate; promotion waits
 * until interaction settles. This does not fetch data or choose card markup.
 * Use the returned level/isInteracting to gate cancellable consumer requests. */
export function useNetworkLOD(
  width: number,
  height: number,
  options: NetworkLODOptions
) {
  const size = useNetworkProjectedSize(width, height)
  const thresholds = options.breakpoints
    .filter(Number.isFinite)
    .slice()
    .sort((a, b) => a - b)
  const desired = thresholds.filter((value) => size.width >= value).length
  // A deferred first render is not a real previous detail level. Newly
  // virtualized cards establish their level at the first settle; applying the
  // promotion dead band to the placeholder can leave them behind neighbors.
  const [previous, setPrevious] = useState<number | null>(() =>
    size.isInteracting ? null : desired
  )
  const band = Number.isFinite(options.hysteresis)
    ? Math.max(0, options.hysteresis!)
    : 8
  let level = Math.min(
    previous ?? (size.isInteracting ? 0 : desired),
    thresholds.length
  )
  while (level > 0 && size.width < thresholds[level - 1] - band) level--
  if (!size.isInteracting)
    while (level < thresholds.length && size.width >= thresholds[level] + band)
      level++
  if (options.keepDetail) level = thresholds.length
  useEffect(() => {
    if (previous !== null || !size.isInteracting) setPrevious(level)
  }, [level, previous, size.isInteracting])
  return { ...size, level }
}
