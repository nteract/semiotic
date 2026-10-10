import { describe, expect, it } from "vitest"
import { LIGHT_THEME } from "./themeCore"
import { themeToCSS, themeToCSSVariables } from "./themeSerialization"
import { designTokensToTheme } from "./designTokens"

describe("theme CSS input boundaries", () => {
  it.each([
    "red; } </style><script>alert(1)</script><style> x {",
    "red;}body{background:red",
    "url(https://example.com/tracker)",
    "u\\72l(https://example.com/tracker)",
    "red/* comment */",
    "red\u0000"
  ])("rejects CSS breakout or resource values: %s", (primary) => {
    const theme = { ...LIGHT_THEME, colors: { ...LIGHT_THEME.colors, primary } }
    expect(() => themeToCSS(theme)).toThrow(TypeError)
    expect(() => themeToCSSVariables(theme)).toThrow(TypeError)
    expect(() => designTokensToTheme({ semiotic: { primary: { $value: primary, $type: "color" } } })).toThrow(TypeError)
  })

  it("validates selectors and font families as well as colors", () => {
    expect(() => themeToCSS(LIGHT_THEME, "</style><script>1</script>")).toThrow(TypeError)
    expect(() => themeToCSS(LIGHT_THEME, ":root {} body")).toThrow(TypeError)
    expect(() => designTokensToTheme({ semiotic: { "font-family": { $value: 'Inter; background:url(https://example.com)', $type: "fontFamily" } } })).toThrow(TypeError)
  })

  it("keeps CSS variables, modern color functions and quoted fonts", () => {
    const theme = {
      ...LIGHT_THEME,
      colors: { ...LIGHT_THEME.colors, primary: "var(--brand, oklch(60% 0.2 250))" },
      typography: { ...LIGHT_THEME.typography, fontFamily: '"Fira Code", sans-serif' }
    }
    const css = themeToCSS(theme, 'main > .charts[data-theme="dark"]')
    expect(css).toContain("--semiotic-primary: var(--brand, oklch(60% 0.2 250))")
    expect(css).toContain('--semiotic-font-family: "Fira Code", sans-serif')
  })
})
