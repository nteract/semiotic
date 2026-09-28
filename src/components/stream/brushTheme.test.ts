import { describe, expect, it } from "vitest"
import { applyBrushSelectionStyle, BRUSH_ACCENT, brushSelectionStyle, resolveBrushSelectionStyle } from "./brushTheme"
import { DARK_THEME, HIGH_CONTRAST_THEME, LIGHT_THEME } from "../store/themeCore"

describe("brush selection theme", () => {
  it("resolves the theme's selection color, else its primary", () => {
    expect(resolveBrushSelectionStyle(LIGHT_THEME, 0.2)).toEqual({
      fill: "#00a2ce", fillOpacity: 0.2, stroke: "#00a2ce", strokeWidth: 1,
    })
    expect(resolveBrushSelectionStyle(DARK_THEME, 0.15).fill).toBe("#4fc3f7")
    expect(resolveBrushSelectionStyle(HIGH_CONTRAST_THEME, 0.15).stroke).toBe("#0000cc")
    const custom = { ...LIGHT_THEME, colors: { ...LIGHT_THEME.colors, selection: undefined, primary: "#123456" } }
    expect(resolveBrushSelectionStyle(custom, 0.15).fill).toBe("#123456")
  })

  it("themes browser brushes through the CSS variables, falling back to the light theme", () => {
    expect(BRUSH_ACCENT).toBe(`var(--semiotic-selection-color, var(--semiotic-primary, ${LIGHT_THEME.colors.selection}))`)
    expect(brushSelectionStyle(0.15)).toEqual({ fill: BRUSH_ACCENT, fillOpacity: 0.15, stroke: BRUSH_ACCENT, strokeWidth: 1 })
    const attrs: Record<string, string | number> = {}
    applyBrushSelectionStyle({ attr: (name, value) => { attrs[name] = value } }, 0.2)
    expect(attrs).toEqual({ fill: BRUSH_ACCENT, "fill-opacity": 0.2, stroke: BRUSH_ACCENT, "stroke-width": 1 })
  })
})
