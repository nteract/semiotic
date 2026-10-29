import * as React from "react"
import type { SemioticTheme } from "../store/themeCore"
import {
  legendDisplayLabel,
  legendMoreLabel,
  truncateLegendLabel,
} from "../legendGeometry"

// Theme typography and bounded-legend text shared by the static SVG legends.

export function legendFontSize(theme: SemioticTheme): number {
  return Number(theme.typography.legendSize ?? theme.typography.labelSize ?? theme.typography.tickSize) || 11
}

export function legendFontFamily(theme: SemioticTheme): string {
  return theme.typography.legendFontFamily ?? theme.typography.fontFamily
}

export function legendFontWeight(theme: SemioticTheme): string | number | undefined {
  return theme.typography.legendFontWeight
}

/** Average glyph width static SVG assumes for the theme's legend font. */
export function legendCharWidth(theme: SemioticTheme): number {
  return legendFontSize(theme) * 0.58
}

/** Label text plus a hover title carrying the full label when truncated. */
export function staticLegendLabelText(label: string, maxWidth: number, charWidth?: number): React.ReactNode {
  const display = legendDisplayLabel(label)
  const text = truncateLegendLabel(display, maxWidth, charWidth)
  return text === display ? text : <><title>{display}</title>{text}</>
}

export function renderStaticMoreRow(
  key: string,
  offset: { x: number; y: number },
  swatchSize: number,
  hiddenCount: number,
  title: string,
  theme: SemioticTheme,
): React.ReactElement {
  return (
    <text
      key={key}
      className="semiotic-legend-more"
      transform={`translate(${offset.x},${offset.y})`}
      y={swatchSize / 2}
      dominantBaseline="central"
      fontSize={legendFontSize(theme)}
      fill={theme.colors.textSecondary}
      fontFamily={legendFontFamily(theme)}
    >
      <title>{title}</title>
      {legendMoreLabel(hiddenCount)}
    </text>
  )
}
