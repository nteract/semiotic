import { resolveTheme, themeStyles } from "./themeResolver"
import { LIGHT_THEME, DARK_THEME, HIGH_CONTRAST_THEME } from "../store/ThemeStore"

describe("resolveTheme", () => {
  it("returns LIGHT_THEME for undefined", () => {
    expect(resolveTheme(undefined)).toBe(LIGHT_THEME)
  })

  it("resolves 'light' string preset", () => {
    expect(resolveTheme("light")).toBe(LIGHT_THEME)
  })

  it("resolves 'dark' string preset", () => {
    expect(resolveTheme("dark")).toBe(DARK_THEME)
  })

  it("resolves 'high-contrast' string preset", () => {
    expect(resolveTheme("high-contrast")).toBe(HIGH_CONTRAST_THEME)
  })

  it("resolves named theme presets", () => {
    const tufte = resolveTheme("tufte")
    expect(tufte.colors.background).toBe("#fffff8")
    expect(tufte.typography.fontFamily).toContain("Georgia")
  })

  it("resolves named dark variant", () => {
    const carbon = resolveTheme("carbon-dark")
    expect(carbon.colors.background).toBe("#161616")
  })

  it("falls back to LIGHT_THEME for unknown preset", () => {
    expect(resolveTheme("nonexistent")).toBe(LIGHT_THEME)
  })

  it("merges object theme onto LIGHT_THEME by default", () => {
    const theme = resolveTheme({ colors: { primary: "#ff0000" } })
    expect(theme.colors.primary).toBe("#ff0000")
    expect(theme.colors.background).toBe(LIGHT_THEME.colors.background)
    expect(theme.typography.fontFamily).toBe(LIGHT_THEME.typography.fontFamily)
  })

  it("merges object with mode='dark' onto DARK_THEME", () => {
    const theme = resolveTheme({ mode: "dark", colors: { primary: "#00ff00" } })
    expect(theme.colors.primary).toBe("#00ff00")
    expect(theme.colors.background).toBe(DARK_THEME.colors.background)
  })

  it("merges object with mode='light' onto LIGHT_THEME", () => {
    const theme = resolveTheme({ mode: "light", colors: { primary: "#0000ff" } })
    expect(theme.colors.primary).toBe("#0000ff")
    expect(theme.colors.background).toBe(LIGHT_THEME.colors.background)
  })

  it("preserves typography overrides", () => {
    const theme = resolveTheme({ typography: { fontFamily: "Courier" } } as any)
    expect(theme.typography.fontFamily).toBe("Courier")
    expect(theme.typography.titleSize).toBe(LIGHT_THEME.typography.titleSize)
  })

  it("preserves tooltip overrides", () => {
    const theme = resolveTheme({ tooltip: { background: "#000" } })
    expect(theme.tooltip?.background).toBe("#000")
  })
})

describe("themeStyles", () => {
  it("extracts flat style values from theme", () => {
    const s = themeStyles(LIGHT_THEME)
    expect(s.background).toBe("transparent")
    expect(s.text).toBe("#333")
    expect(s.textSecondary).toBe("#666")
    expect(s.grid).toBe("#e0e0e0")
    expect(s.border).toBe("#ccc")
    expect(s.primary).toBe("#00a2ce")
    expect(s.fontFamily).toBe("sans-serif")
    expect(s.titleSize).toBe(16)
    expect(s.labelSize).toBe(12)
    expect(s.tickSize).toBe(10)
    expect(s.categorical).toEqual(LIGHT_THEME.colors.categorical)
  })

  it("works with dark theme", () => {
    const s = themeStyles(DARK_THEME)
    expect(s.background).toBe("#1a1a2e")
    expect(s.text).toBe("#e0e0e0")
  })
})
