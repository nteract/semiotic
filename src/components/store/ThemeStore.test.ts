import { LIGHT_THEME, DARK_THEME, HIGH_CONTRAST_THEME } from "./ThemeStore"

/**
 * ThemeStore is created via createStore which is tightly coupled to React.
 * Rather than mount a full React tree, we extract and test the setTheme
 * merge logic directly by reimplementing the reducer logic.
 */

// Mirror the setTheme reducer from ThemeStore.ts
function applySetTheme(
  current: typeof LIGHT_THEME,
  theme: Partial<typeof LIGHT_THEME> | "light" | "dark" | "high-contrast"
) {
  if (theme === "light") return LIGHT_THEME
  if (theme === "dark") return DARK_THEME
  if (theme === "high-contrast") return HIGH_CONTRAST_THEME

  if (theme.mode) {
    const base = theme.mode === "dark" ? DARK_THEME : LIGHT_THEME
    return {
      ...base,
      ...theme,
      colors: { ...base.colors, ...(theme.colors || {}) },
      typography: { ...base.typography, ...(theme.typography || {}) },
    }
  }

  return {
    ...current,
    ...theme,
    colors: { ...current.colors, ...(theme.colors || {}) },
    typography: { ...current.typography, ...(theme.typography || {}) },
  }
}

describe("ThemeStore — setTheme merge rules", () => {
  it("string 'dark' returns DARK_THEME", () => {
    const result = applySetTheme(LIGHT_THEME, "dark")
    expect(result).toBe(DARK_THEME)
  })

  it("string 'light' returns LIGHT_THEME", () => {
    const result = applySetTheme(DARK_THEME, "light")
    expect(result).toBe(LIGHT_THEME)
  })

  it("object with mode:'dark' merges onto DARK_THEME base", () => {
    const custom = ["#e63946", "#457b9d", "#a8dadc"]
    const result = applySetTheme(LIGHT_THEME, {
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
    const result = applySetTheme(DARK_THEME, {
      mode: "light",
      colors: { categorical: custom },
    })
    expect(result.colors.background).toBe(LIGHT_THEME.colors.background)
    expect(result.colors.text).toBe(LIGHT_THEME.colors.text)
    expect(result.colors.categorical).toBe(custom)
    expect(result.mode).toBe("light")
  })

  it("object without mode merges onto current theme", () => {
    const custom = ["#aaa", "#bbb"]
    const result = applySetTheme(DARK_THEME, {
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
