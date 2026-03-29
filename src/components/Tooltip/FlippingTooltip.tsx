import * as React from "react"

interface FlippingTooltipProps {
  /** X position within the chart area (relative to margin.left) */
  x: number
  /** Y position within the chart area (relative to margin.top) */
  y: number
  /** Chart area width (excluding margins) */
  containerWidth: number
  /** Chart area height (excluding margins) */
  containerHeight: number
  /** Chart margins */
  margin: { left: number; top: number; right: number; bottom: number }
  /** Tooltip content */
  children: React.ReactNode
  /** CSS class name for the wrapper */
  className?: string
  /** z-index (default 1) */
  zIndex?: number
}

/**
 * Viewport-aware tooltip wrapper that flips horizontally and vertically
 * when the tooltip would overflow the chart container.
 *
 * On first render, uses a heuristic (similar to the old 70%/30% thresholds).
 * After measuring the actual tooltip size via ref, repositions precisely to
 * prevent clipping against container edges.
 */
export function FlippingTooltip({
  x,
  y,
  containerWidth,
  containerHeight,
  margin,
  children,
  className = "stream-frame-tooltip",
  zIndex = 1
}: FlippingTooltipProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [measured, setMeasured] = React.useState<{
    width: number
    height: number
  } | null>(null)

  // Measure the tooltip when content or container changes
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setMeasured((prev) => {
      // Only update if size actually changed to avoid infinite loop
      if (prev && prev.width === rect.width && prev.height === rect.height) {
        return prev
      }
      return { width: rect.width, height: rect.height }
    })
  }, [children, className, containerWidth, containerHeight])

  const offset = 12

  // Compute position
  let transform: string
  if (measured) {
    // Precise flip based on actual tooltip dimensions
    const spaceRight = containerWidth - x
    const spaceBelow = containerHeight - y

    const flipX = spaceRight < measured.width + offset
    const flipY = spaceBelow < measured.height + offset

    const tx = flipX ? `calc(-100% - ${offset}px)` : `${offset}px`
    const ty = flipY ? `calc(-100% - 4px)` : "4px"
    transform = `translate(${tx}, ${ty})`
  } else {
    // Heuristic fallback on first render (before measurement)
    const tx = x > containerWidth * 0.7 ? `calc(-100% - ${offset}px)` : `${offset}px`
    const ty = y < containerHeight * 0.3 ? "4px" : "calc(-100% - 4px)"
    transform = `translate(${tx}, ${ty})`
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        position: "absolute",
        left: margin.left + x,
        top: margin.top + y,
        transform,
        pointerEvents: "none",
        zIndex,
        width: "max-content"
      }}
    >
      {children}
    </div>
  )
}
