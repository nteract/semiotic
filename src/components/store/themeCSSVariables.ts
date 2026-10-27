import type { SemioticTheme } from "./themeCore"
import { assertSafeThemeCSS } from "./safeThemeCSS"

/**
 * Canonical CSS custom-property projection for a Semiotic theme.
 *
 * Both the React ThemeProvider and the string serializer consume this map so
 * a token cannot exist in one delivery path but silently disappear from the
 * other. Object insertion order is intentional: themeToCSS preserves it for
 * stable snapshots and generated stylesheets.
 */
export function themeToCSSVariables(
  theme: SemioticTheme
): Record<`--semiotic-${string}`, string> {
  const variables: Record<`--semiotic-${string}`, string> = {
    "--semiotic-bg": theme.colors.background,
    "--semiotic-text": theme.colors.text,
    "--semiotic-text-secondary": theme.colors.textSecondary,
    "--semiotic-grid": theme.colors.grid,
    "--semiotic-border": theme.colors.border,
    "--semiotic-cell-border": theme.colors.cellBorder || theme.colors.border,
    "--semiotic-primary": theme.colors.primary,
    "--semiotic-font-family": theme.typography.fontFamily,
    "--semiotic-secondary": theme.colors.secondary || theme.colors.primary,
    "--semiotic-surface": theme.colors.surface || theme.colors.background
  }

  theme.colors.categorical.forEach((color, index) => {
    variables[`--semiotic-category-${index + 1}`] = color
  })

  for (const [token, value] of [
    ["focus", theme.colors.focus],
    ["selection-color", theme.colors.selection],
    [
      "selection-opacity",
      theme.colors.selectionOpacity == null
        ? undefined
        : String(theme.colors.selectionOpacity)
    ],
    ["diverging", theme.colors.diverging],
    ["annotation-color", theme.colors.annotation],
    ["success", theme.colors.success],
    ["danger", theme.colors.danger],
    ["warning", theme.colors.warning],
    ["error", theme.colors.error],
    ["info", theme.colors.info],
    ["tooltip-bg", theme.tooltip?.background],
    ["tooltip-text", theme.tooltip?.text],
    ["tooltip-radius", theme.tooltip?.borderRadius],
    ["tooltip-font-size", theme.tooltip?.fontSize],
    ["tooltip-shadow", theme.tooltip?.shadow],
    ["border-radius", theme.borderRadius]
  ] as const) {
    if (value) variables[`--semiotic-${token}`] = value
  }
  for (const [token, value, unit = ""] of [
    [
      "legend-font-size",
      theme.typography.legendSize ?? theme.typography.labelSize,
      "px"
    ],
    ["legend-font-family", theme.typography.legendFontFamily],
    ["legend-font-weight", theme.typography.legendFontWeight],
    [
      "title-font-size",
      theme.typography.titleFontSize ?? theme.typography.titleSize,
      "px"
    ],
    ["title-font-family", theme.typography.titleFontFamily],
    ["title-font-weight", theme.typography.titleFontWeight],
    ["tick-font-family", theme.typography.tickFontFamily],
    ["tick-font-size", theme.typography.tickSize, "px"],
    ["axis-label-font-size", theme.typography.labelSize, "px"]
  ] as const) {
    if (value != null) variables[`--semiotic-${token}`] = `${value}${unit}`
  }

  for (const [name, value] of Object.entries(variables)) {
    assertSafeThemeCSS(value, name)
  }
  return variables
}
