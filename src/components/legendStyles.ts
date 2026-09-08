import type { CSSProperties } from "react"

/** Stable style objects avoid allocating identical CSS declarations for every legend label. */
export const LEGEND_FONT_STYLE: CSSProperties = {
  fontFamily: "var(--semiotic-legend-font-family, var(--semiotic-font-family, sans-serif))",
  fontWeight: "var(--semiotic-legend-font-weight, normal)"
}

export const LEGEND_LABEL_STYLE: CSSProperties = {
  fontSize: "var(--semiotic-legend-font-size, 12px)"
}
