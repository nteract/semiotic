import type { CSSProperties } from "react"

/** Visually hidden content remains available to assistive technology. */
export const SR_ONLY_STYLE: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0
}

/**
 * A visually hidden control revealed while it has focus, so sighted keyboard
 * users can see where focus went (WCAG 2.4.7). Used by the skip link and the
 * collapsed accessible-table trigger.
 */
export const FOCUS_REVEAL_STYLE: CSSProperties = {
  position: "absolute",
  top: 4,
  left: 4,
  zIndex: "var(--semiotic-data-table-z-index, var(--semiotic-overlay-z-index, 20))",
  width: "auto",
  height: "auto",
  maxWidth: "calc(100% - 8px)",
  overflow: "visible",
  whiteSpace: "normal",
  padding: "4px 8px",
  fontSize: 12,
  background: "var(--semiotic-bg, #fff)",
  color: "var(--semiotic-text, #000)",
  border: "2px solid var(--semiotic-focus, #005fcc)",
  borderRadius: 4
}
