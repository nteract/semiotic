"use client"
import * as React from "react"

/**
 * Shape-appropriate keyboard focus indicator for canvas-based charts.
 *
 * Renders an SVG overlay with a dashed focus ring whose shape adapts
 * to the focused element type (circle for points, rect for bars/nodes,
 * arc highlight for wedges).
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

export function FocusRing({ active, hoverPoint, margin, size, shape = "circle", width, height }: FocusRingProps) {
  if (!active || !hoverPoint) return null

  const cx = hoverPoint.x + margin.left
  const cy = hoverPoint.y + margin.top

  let indicator: React.ReactNode

  if (shape === "rect" && width && height) {
    indicator = (
      <rect
        x={cx - width / 2 - 3}
        y={cy - height / 2 - 3}
        width={width + 6}
        height={height + 6}
        rx={3}
        fill="none"
        stroke="var(--semiotic-focus, #005fcc)"
        strokeWidth={2}
        strokeDasharray="4,2"
      />
    )
  } else {
    indicator = (
      <circle
        cx={cx}
        cy={cy}
        r={8}
        fill="none"
        stroke="var(--semiotic-focus, #005fcc)"
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
