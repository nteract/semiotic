"use client"
import * as React from "react"

export interface ContextLayoutProps {
  /** The main chart (renders at full size in the primary slot) */
  children: React.ReactNode
  /** Context chart(s) displayed alongside the primary chart */
  context: React.ReactNode
  /** Position of the context panel. Default: "right" */
  position?: "right" | "left" | "bottom" | "top"
  /** Size of the context panel in pixels. Default: 250 */
  contextSize?: number
  /** Gap between primary and context panels in pixels. Default: 12 */
  gap?: number
  /** CSS class for the layout container */
  className?: string
  /** Inline style overrides */
  style?: React.CSSProperties
}

/**
 * ContextLayout — places a primary chart alongside one or more context charts.
 *
 * The primary chart fills available space while the context panel has a fixed
 * width (or height for top/bottom). Context charts should use `mode="context"`
 * for compact rendering without axes or labels.
 *
 * ```tsx
 * <ContextLayout
 *   context={<Treemap data={hierarchy} mode="context" responsiveWidth colorByDepth />}
 *   position="right"
 *   contextSize={250}
 * >
 *   <LineChart data={timeSeries} xAccessor="time" yAccessor="value" responsiveWidth />
 * </ContextLayout>
 * ```
 */
export function ContextLayout({
  children,
  context,
  position = "right",
  contextSize = 250,
  gap = 12,
  className,
  style,
}: ContextLayoutProps) {
  const isHorizontal = position === "left" || position === "right"
  const isReversed = position === "left" || position === "top"

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: isHorizontal ? (isReversed ? "row-reverse" : "row") : (isReversed ? "column-reverse" : "column"),
    gap,
    width: "100%",
    ...style,
  }

  const primaryStyle: React.CSSProperties = {
    flex: "1 1 0%",
    minWidth: 0,
    minHeight: 0,
  }

  const contextStyle: React.CSSProperties = isHorizontal
    ? { flex: `0 0 ${contextSize}px`, width: contextSize, minHeight: 0 }
    : { flex: `0 0 ${contextSize}px`, height: contextSize, minWidth: 0 }

  return (
    <div
      className={`semiotic-context-layout${className ? ` ${className}` : ""}`}
      style={containerStyle}
    >
      <div style={primaryStyle}>{children}</div>
      <div style={contextStyle}>{context}</div>
    </div>
  )
}

ContextLayout.displayName = "ContextLayout"
