import type { RefObject } from "react"

/** A rectangle in plot coordinates, excluding frame margins. */
export interface NetworkViewportRect {
  x: number
  y: number
  width: number
  height: number
}

/** DOM viewport source for network custom layouts. Omit to discover the nearest
 * ancestor with overflow auto/scroll/overlay. External elements are supported. */
export interface NetworkViewportOptions {
  /** Explicit viewport element; null means not mounted/measurable yet. Takes
   * precedence over scrollContainerRef. Use a state setter as a callback ref
   * when the scroll element can be replaced, so React commits the new target. */
  scrollContainer?: HTMLElement | null
  /** Explicit scroll-container ref, resolved after each React commit. Changes
   * to .current alone do not schedule a React update; for root replacement use
   * the scrollContainer callback-ref/state pattern. */
  scrollContainerRef?: RefObject<HTMLElement | null>
}

/** Mounting policy for custom layout HTML marks; independent of layout geometry. */
export interface NetworkHtmlMarkCulling {
  /** Whether off-screen marks can unmount. @default true */
  enabled?: boolean
  /** Extra CSS pixels on each visible edge. Zero is valid; invalid or negative
   * values use the default. @default 400 */
  overscan?: number
  /** Keep these existing mark IDs mounted off-screen. Focused mark content is
   * also retained automatically until focus leaves. Deleted marks are removed. */
  pinnedIds?: readonly string[]
}

/** One committed view of the viewport and HTML mounting policy. */
export interface NetworkViewportSnapshot {
  /** Visible plot rectangle without overscan. Null means unmeasured (SSR,
   * no scroll target, or zero-sized target), not an empty visible region. */
  visibleRect: NetworkViewportRect | null
  /** Viewport expanded by HTML overscan and clipped to the plot. */
  renderRect: NetworkViewportRect | null
  /** IDs intersecting visibleRect, excluding off-screen pins; null if unmeasured. */
  visibleMarkIds: readonly string[] | null
  /** IDs actually retained, including overscan, pins and DOM focus. When
   * culling is disabled or unmeasured this contains every mark ID. */
  mountedMarkIds: readonly string[]
}

/** React-only network viewport props, also available on NetworkCustomChart.frameProps. */
export interface NetworkViewportProps {
  /** Select the element that defines the visible window. */
  viewport?: NetworkViewportOptions
  /** Configure HTML mark mounting without rerunning the custom layout. */
  htmlMarkCulling?: NetworkHtmlMarkCulling
  /** Receives committed rectangle/membership changes, including scrolling that
   * leaves membership unchanged. Shares measurement with HTML culling, works
   * without HTML marks, and never runs on the server. Keep viewport state out
   * of layoutConfig; use it in subscribed overlay content or a minimap. */
  onViewportChange?: (viewport: NetworkViewportSnapshot) => void
}
