import { COLOR_BLIND_SAFE_CATEGORICAL } from "./themeCore"
import type { SemioticTheme } from "./themeCore"

/** Palette resolution supplies the concrete mode before automatic CSS is emitted. */
export function applyConcreteThemeAccessibility(
  theme: SemioticTheme,
  isDark = theme.mode === "dark"
): SemioticTheme {
  if (!theme.accessibility) return theme
  let result = theme
  if (theme.accessibility.colorBlindSafe) {
    result = {
      ...result,
      colors: {
        ...result.colors,
        categorical: COLOR_BLIND_SAFE_CATEGORICAL
      }
    }
  }
  if (theme.accessibility.highContrast) {
    result = {
      ...result,
      colors: {
        ...result.colors,
        text: isDark ? "#ffffff" : "#000000",
        textSecondary: isDark ? "#cccccc" : "#333333",
        grid: isDark ? "#666666" : "#999999",
        border: isDark ? "#888888" : "#000000"
      }
    }
  }
  return result
}
