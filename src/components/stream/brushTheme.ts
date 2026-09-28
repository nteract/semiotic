import type { SemioticTheme } from "../store/themeCore"

// Brush selection colors, shared by the frame and chart brushes and the static
// minimap. React- and d3-free so server entries can import it.

/**
 * The theme's selection color, else its primary, through the CSS variables
 * ThemeProvider sets. The fallback is the light theme's selection color.
 */
export const BRUSH_ACCENT = "var(--semiotic-selection-color, var(--semiotic-primary, #00a2ce))"

export interface BrushSelectionStyle {
  fill: string
  fillOpacity: number
  stroke: string
  strokeWidth: number
}

/** Browser brushes: themed through CSS variables, so theme changes restyle them in place. */
export function brushSelectionStyle(fillOpacity: number): BrushSelectionStyle {
  return { fill: BRUSH_ACCENT, fillOpacity, stroke: BRUSH_ACCENT, strokeWidth: 1 }
}

/** Static SVG: the same accent, resolved from a theme object. */
export function resolveBrushSelectionStyle(theme: SemioticTheme, fillOpacity: number): BrushSelectionStyle {
  const accent = theme.colors.selection ?? theme.colors.primary
  return { fill: accent, fillOpacity, stroke: accent, strokeWidth: 1 }
}

interface AttributeTarget {
  attr(name: string, value: string | number): unknown
}

/** Style a d3-brush `.selection` rect. */
export function applyBrushSelectionStyle(selection: AttributeTarget, fillOpacity: number): void {
  const style = brushSelectionStyle(fillOpacity)
  selection.attr("fill", style.fill)
  selection.attr("fill-opacity", style.fillOpacity)
  selection.attr("stroke", style.stroke)
  selection.attr("stroke-width", style.strokeWidth)
}
