import { describe, expect, it } from "vitest"
import { designTokensToTheme, resolveThemePreset, themeToTokens } from "../semiotic-themes"

describe("designTokensToTheme", () => {
  it("round-trips a theme through themeToTokens (native semiotic.* path)", () => {
    const theme = resolveThemePreset("tufte")!
    const recovered = designTokensToTheme(themeToTokens(theme))
    expect(recovered.colors.background).toBe(theme.colors.background)
    expect(recovered.colors.text).toBe(theme.colors.text)
    expect(recovered.colors.primary).toBe(theme.colors.primary)
    expect(recovered.colors.danger).toBe(theme.colors.danger)
    expect(recovered.colors.success).toBe(theme.colors.success)
    expect(recovered.colors.categorical).toEqual(theme.colors.categorical)
  })

  it("maps a foreign brand token file to roles by leaf name", () => {
    const brand = {
      color: {
        $type: "color",
        brand: { primary: { $value: "#3366ff" }, secondary: { $value: "#8899aa" } },
        semantic: { error: { $value: "#cc0000" }, success: { $value: "#00aa00" }, warning: { $value: "#e6a700" } },
        bg: { $value: "#0b0f17" },
        fg: { $value: "#f0f0f0" },
        border: { $value: "#2a2f3a" },
      },
    }
    const theme = designTokensToTheme(brand)
    expect(theme.colors.primary).toBe("#3366ff")
    expect(theme.colors.secondary).toBe("#8899aa")
    expect(theme.colors.error).toBe("#cc0000")
    expect(theme.colors.success).toBe("#00aa00")
    expect(theme.colors.warning).toBe("#e6a700")
    expect(theme.colors.background).toBe("#0b0f17")
    expect(theme.colors.text).toBe("#f0f0f0")
    expect(theme.colors.border).toBe("#2a2f3a")
  })

  it("detects dark mode from the resolved background luminance", () => {
    expect(designTokensToTheme({ color: { bg: { $type: "color", $value: "#0b0f17" } } }).mode).toBe("dark")
    expect(designTokensToTheme({ color: { bg: { $type: "color", $value: "#fafafa" } } }).mode).toBe("light")
  })

  it("resolves DTCG alias references", () => {
    const tokens = {
      color: {
        $type: "color",
        base: { blue: { $value: "#0000ff" } },
        brand: { primary: { $value: "{color.base.blue}" } },
      },
    }
    expect(designTokensToTheme(tokens).colors.primary).toBe("#0000ff")
  })

  it("honors an explicit role → path mapping for unconventional names", () => {
    const tokens = { palette: { $type: "color", c1: { $value: "#112233" } } }
    // leaf "c1" matches no heuristic; the mapping pins it.
    expect(designTokensToTheme(tokens, { mapping: { primary: "palette.c1" } }).colors.primary).toBe("#112233")
  })

  it("reads a categorical palette from an array token", () => {
    const tokens = { chart: { categorical: { $type: "color", $value: ["#a11", "#1a1", "#11a"] } } }
    expect(designTokensToTheme(tokens).colors.categorical).toEqual(["#a11", "#1a1", "#11a"])
  })

  it("reads a categorical palette from a group of named color tokens", () => {
    const tokens = {
      palette: {
        chart: {
          $type: "color",
          c1: { $value: "#111" },
          c2: { $value: "#222" },
          c3: { $value: "#333" },
        },
      },
    }
    expect(designTokensToTheme(tokens).colors.categorical).toEqual(["#111", "#222", "#333"])
  })

  it("falls back to a complete base theme for unspecified roles", () => {
    const theme = designTokensToTheme({ color: { brand: { primary: { $type: "color", $value: "#ff0066" } } } })
    expect(theme.colors.primary).toBe("#ff0066")
    // grid/categorical/typography still present from the base.
    expect(typeof theme.colors.grid).toBe("string")
    expect(Array.isArray(theme.colors.categorical)).toBe(true)
    expect(typeof theme.typography.fontFamily).toBe("string")
  })

  it("picks up a fontFamily token", () => {
    const tokens = { font: { family: { base: { $type: "fontFamily", $value: ["Inter", "sans-serif"] } } } }
    expect(designTokensToTheme(tokens).typography.fontFamily).toBe("Inter, sans-serif")
  })
})
