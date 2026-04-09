/**
 * SVG hatch pattern for server-side rendering.
 *
 * Creates a <pattern> element that can be referenced via url(#id) fill.
 * The SVG equivalent of createHatchPattern() which produces CanvasPatterns.
 */

import * as React from "react"

export interface SVGHatchOptions {
  /** Pattern ID — must be unique within the SVG */
  id: string
  /** Background color */
  background?: string
  /** Line color */
  stroke?: string
  /** Line width @default 1.5 */
  lineWidth?: number
  /** Spacing between lines @default 6 */
  spacing?: number
  /** Angle in degrees @default 45 */
  angle?: number
}

/**
 * Create an SVG <pattern> element for diagonal hatch fills.
 * Place inside <defs> and reference with fill="url(#id)".
 */
export function createSVGHatchPattern(options: SVGHatchOptions): React.ReactElement {
  const {
    id,
    background = "transparent",
    stroke = "#000",
    lineWidth = 1.5,
    spacing = 6,
    angle = 45,
  } = options

  const size = Math.max(8, Math.ceil(spacing * 2))

  return (
    <pattern
      key={id}
      id={id}
      width={size}
      height={size}
      patternUnits="userSpaceOnUse"
      patternTransform={angle !== 0 ? `rotate(${angle})` : undefined}
    >
      {background && background !== "transparent" && (
        <rect width={size} height={size} fill={background} />
      )}
      {/* Draw parallel lines — when rotated by patternTransform, they become diagonal */}
      <line
        x1={0} y1={0} x2={0} y2={size}
        stroke={stroke}
        strokeWidth={lineWidth}
      />
      <line
        x1={spacing} y1={0} x2={spacing} y2={size}
        stroke={stroke}
        strokeWidth={lineWidth}
      />
    </pattern>
  )
}
