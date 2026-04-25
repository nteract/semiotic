import { LIGHT_THEME, DARK_THEME, HIGH_CONTRAST_THEME, resolveThemeUpdate } from "./ThemeStore"

describe("ThemeStore — setTheme merge rules", () => {
  it("string 'dark' returns DARK_THEME", () => {
    const result = resolveThemeUpdate(LIGHT_THEME, "dark")
    expect(result).toBe(DARK_THEME)
  })

  it("string 'light' returns LIGHT_THEME", () => {
    const result = resolveThemeUpdate(DARK_THEME, "light")
    expect(result).toBe(LIGHT_THEME)
  })

  it("string 'high-contrast' returns HIGH_CONTRAST_THEME", () => {
    const result = resolveThemeUpdate(DARK_THEME, "high-contrast")
    expect(result).toBe(HIGH_CONTRAST_THEME)
  })

  it("object with mode:'dark' merges onto DARK_THEME base", () => {
    const custom = ["#e63946", "#457b9d", "#a8dadc"]
    const result = resolveThemeUpdate(LIGHT_THEME, {
      mode: "dark",
      colors: { categorical: custom },
    })
    // Should get dark base colors for background/text/grid
    expect(result.colors.background).toBe(DARK_THEME.colors.background)
    expect(result.colors.text).toBe(DARK_THEME.colors.text)
    expect(result.colors.grid).toBe(DARK_THEME.colors.grid)
    // But categorical should be our custom palette
    expect(result.colors.categorical).toBe(custom)
    expect(result.mode).toBe("dark")
  })

  it("object with mode:'light' merges onto LIGHT_THEME base", () => {
    const custom = ["#e63946", "#457b9d"]
    const result = resolveThemeUpdate(DARK_THEME, {
      mode: "light",
      colors: { categorical: custom },
    })
    expect(result.colors.background).toBe(LIGHT_THEME.colors.background)
    expect(result.colors.text).toBe(LIGHT_THEME.colors.text)
    expect(result.colors.categorical).toBe(custom)
    expect(result.mode).toBe("light")
  })

  it("object with mode:'auto' merges onto current theme (not a base theme)", () => {
    const custom = ["#111", "#222"]
    const result = resolveThemeUpdate(DARK_THEME, {
      mode: "auto",
      colors: { categorical: custom },
    })
    // 'auto' should merge onto current (dark), not force light base
    expect(result.colors.background).toBe(DARK_THEME.colors.background)
    expect(result.colors.text).toBe(DARK_THEME.colors.text)
    expect(result.colors.categorical).toBe(custom)
    expect(result.mode).toBe("auto")
  })

  it("object without mode merges onto current theme", () => {
    const custom = ["#aaa", "#bbb"]
    const result = resolveThemeUpdate(DARK_THEME, {
      colors: { categorical: custom },
    })
    // Should keep dark base (current theme)
    expect(result.colors.background).toBe(DARK_THEME.colors.background)
    expect(result.colors.text).toBe(DARK_THEME.colors.text)
    expect(result.colors.categorical).toBe(custom)
    // Mode stays from current theme
    expect(result.mode).toBe("dark")
  })
})
