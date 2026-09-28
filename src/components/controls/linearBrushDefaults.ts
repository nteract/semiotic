import type { CSSProperties } from "react"
import { BRUSH_ACCENT } from "../stream/brushTheme"

// LinearBrush default styles. They read the CSS variables ThemeProvider sets,
// so the control needs no store and follows theme changes in place. Values
// are plain literals and longhands: a module-level template literal is a side
// effect to bundlers, which would keep these styles in every controls import.

export const LINEAR_BRUSH_FOCUS = "var(--semiotic-focus, var(--semiotic-selection-color, var(--semiotic-primary, #00a2ce)))"
const SURFACE = "var(--semiotic-surface, var(--semiotic-bg, #ffffff))"

export const DEFAULT_SELECTION_STYLE: CSSProperties = {
  backgroundColor: "color-mix(in srgb, var(--semiotic-selection-color, var(--semiotic-primary, #00a2ce)) 15%, transparent)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: BRUSH_ACCENT,
  boxSizing: "border-box",
}

export const DEFAULT_ACTIVE_SELECTION_STYLE: CSSProperties = {
  borderColor: LINEAR_BRUSH_FOCUS,
}

export const DEFAULT_MASK_STYLE: CSSProperties = {
  backgroundColor: SURFACE,
  opacity: 0.6,
}

export const DEFAULT_HANDLE_STYLE: CSSProperties = {
  backgroundColor: SURFACE,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: BRUSH_ACCENT,
  borderRadius: 3,
  boxSizing: "border-box",
}

export const DEFAULT_ACTIVE_HANDLE_STYLE: CSSProperties = {
  backgroundColor: BRUSH_ACCENT,
}

export const DEFAULT_GRIP_COLOR = BRUSH_ACCENT
export const DEFAULT_ACTIVE_GRIP_COLOR = SURFACE

export const DEFAULT_LABEL_FONT_SIZE = 11

export const DEFAULT_LABEL_STYLE: CSSProperties = {
  color: "var(--semiotic-text-secondary, #666)",
  fontFamily: "var(--semiotic-font-family, sans-serif)",
  fontSize: DEFAULT_LABEL_FONT_SIZE,
  lineHeight: 1.2,
}

/** Sliders toggle `outlineStyle` and its companions, never the `outline` shorthand. */
export const NO_OUTLINE: CSSProperties = { outlineStyle: "none" }

export const FOCUS_OUTLINE: CSSProperties = {
  outlineStyle: "solid",
  outlineWidth: 2,
  outlineColor: LINEAR_BRUSH_FOCUS,
  outlineOffset: 1,
}

export const DEFAULT_DESCRIPTION =
  "Arrow keys move the range or the focused end. Shift or Page Up and Page Down take larger steps, Home and End go to the limits, and Escape clears the range."
