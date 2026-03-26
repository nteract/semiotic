"use client"
import * as React from "react"

/**
 * Shape-appropriate keyboard focus indicator for canvas-based charts.
 *
 * Renders an SVG overlay with a dashed focus ring whose shape adapts
 * to the focused element type (circle for points, rect for bars/nodes,
 * emphasized arc for wedges).
 */

export interface FocusRingProps {
  /** Whether keyboard focus is active */
  active: boolean
  /** Hover point with position info */
  hoverPoint: { x: number; y: number } | null
  /** Chart margin */
  margin: { top: number; right: number; bottom: number; left: number }
  /** Total chart size */
  size: [number, number]
  /** Shape hint from the focused nav point */
  shape?: "circle" | "rect" | "wedge"
  /** Width of rect-shaped focus target */
  width?: number
  /** Height of rect-shaped focus target */
  height?: number
}

const FOCUS_STROKE = "var(--semiotic-focus, #005fcc)"

export function FocusRing({ active, hoverPoint, margin, size, shape = "circle", width, height }: FocusRingProps) {
  if (!active || !hoverPoint) return null

  const cx = hoverPoint.x + margin.left
  const cy = hoverPoint.y + margin.top

  let indicator: React.ReactNode

  if (shape === "rect" && width != null && height != null) {
    // Clamp to minimum 4px so the ring is always visible
    const w = Math.max(width, 4)
    const h = Math.max(height, 4)
    indicator = (
      <rect
        x={cx - w / 2 - 3}
        y={cy - h / 2 - 3}
        width={w + 6}
        height={h + 6}
        rx={3}
        fill="none"
        stroke={FOCUS_STROKE}
        strokeWidth={2}
        strokeDasharray="4,2"
      />
    )
  } else if (shape === "wedge") {
    // Wedge focus: larger dashed circle centered on the wedge midpoint
    indicator = (
      <circle
        cx={cx}
        cy={cy}
        r={12}
        fill="none"
        stroke={FOCUS_STROKE}
        strokeWidth={2.5}
        strokeDasharray="6,3"
      />
    )
  } else {
    indicator = (
      <circle
        cx={cx}
        cy={cy}
        r={8}
        fill="none"
        stroke={FOCUS_STROKE}
        strokeWidth={2}
        strokeDasharray="4,2"
      />
    )
  }

  return (
    <svg
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: size[0],
        height: size[1],
        pointerEvents: "none",
        zIndex: 2,
      }}
      aria-hidden="true"
    >
      {indicator}
    </svg>
  )
}
