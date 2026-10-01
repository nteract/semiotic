/**
 * SVG hatch pattern for server-side rendering.
 *
 * Creates a <pattern> element that can be referenced via url(#id) fill.
 * The SVG equivalent of createHatchPattern() which produces CanvasPatterns.
 */

import type * as React from "react"
import { hatchPatternDef } from "../charts/shared/hatchFill"

export interface SVGHatchOptions {
  /** Pattern ID — must be unique within the SVG */
  id: string
  /** Background color */
  background?: string
  /** Line color */
  stroke?: string
  /** Line width @default 1.5 */
  lineWidth?: number
  /** Perpendicular distance between line centers @default 6 */
  spacing?: number
  /** Angle in degrees; 0 is horizontal, positive turns clockwise @default 45 */
  angle?: number
  /** Line opacity @default 1 */
  lineOpacity?: number
}

/**
 * Create an SVG <pattern> element for diagonal hatch fills.
 * Place inside <defs> and reference with fill="url(#id)". Draws the same tile
 * as the canvas `createHatchPattern` with the same options.
 */
export function createSVGHatchPattern(options: SVGHatchOptions): React.ReactElement {
  const { id, ...hatch } = options
  return hatchPatternDef({ type: "hatch", ...hatch }, id)
}
