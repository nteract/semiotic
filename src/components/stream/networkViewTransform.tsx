import * as React from "react"
import type {
  NetworkViewTransform,
  NetworkViewportRect
} from "./networkViewportTypes"

/** Shared identity avoids invalidating a retained scene when no camera is used. */
export const IDENTITY_NETWORK_VIEW: NetworkViewTransform = { x: 0, y: 0, k: 1 }

/** Reject invalid camera coordinates before they reach canvas, CSS or hit testing. */
export function normalizeNetworkView(
  view?: NetworkViewTransform
): NetworkViewTransform {
  return view &&
    Number.isFinite(view.k) &&
    view.k > 0 &&
    Number.isFinite(view.x) &&
    Number.isFinite(view.y)
    ? view
    : IDENTITY_NETWORK_VIEW
}

export function projectNetworkPoint<T extends { x: number; y: number }>(
  point: T,
  view: NetworkViewTransform
): T {
  return {
    ...point,
    x: point.x * view.k + view.x,
    y: point.y * view.k + view.y
  }
}

export function invertNetworkRect(
  rect: NetworkViewportRect,
  view: NetworkViewTransform
): NetworkViewportRect {
  return {
    x: (rect.x - view.x) / view.k,
    y: (rect.y - view.y) / view.k,
    width: rect.width / view.k,
    height: rect.height / view.k
  }
}

/** Nested SVG supplies a plot clip without IDs that can collide across charts. */
export function NetworkViewGroup({
  view,
  width,
  height,
  children
}: {
  view?: NetworkViewTransform
  width: number
  height: number
  children: React.ReactNode
}) {
  if (!view) return <>{children}</>
  const { x, y, k } = normalizeNetworkView(view)
  return (
    <svg width={width} height={height} overflow="hidden" data-network-view="">
      <g transform={`translate(${x},${y}) scale(${k})`}>{children}</g>
    </svg>
  )
}
