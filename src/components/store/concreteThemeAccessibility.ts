import { COLOR_BLIND_SAFE_CATEGORICAL } from "./themeCore"
import type { SemioticTheme } from "./themeCore"

/** Palette resolution supplies the concrete mode before automatic CSS is emitted. */
export function applyConcreteThemeAccessibility(
  theme: SemioticTheme,
  isDark = theme.mode === "dark"
): SemioticTheme {
  const { colorBlindSafe, highContrast } = theme.accessibility ?? {}
  if (!colorBlindSafe && !highContrast) return theme
  return {
    ...theme,
    colors: {
      ...theme.colors,
      ...(colorBlindSafe && { categorical: COLOR_BLIND_SAFE_CATEGORICAL }),
      ...(highContrast && {
        text: isDark ? "#ffffff" : "#000000",
        textSecondary: isDark ? "#cccccc" : "#333333",
        grid: isDark ? "#666666" : "#999999",
        border: isDark ? "#888888" : "#000000"
      })
    }
  }
}
