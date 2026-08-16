import type { SemioticTheme } from "./themeCore"

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
    "--semiotic-surface": theme.colors.surface || theme.colors.background,
  }

  theme.colors.categorical.forEach((color, index) => {
    variables[`--semiotic-category-${index + 1}`] = color
  })

  if (theme.colors.focus) variables["--semiotic-focus"] = theme.colors.focus
  if (theme.colors.selection) {
    variables["--semiotic-selection-color"] = theme.colors.selection
  }
  if (theme.colors.selectionOpacity != null) {
    variables["--semiotic-selection-opacity"] = String(
      theme.colors.selectionOpacity
    )
  }
  if (theme.colors.diverging) {
    variables["--semiotic-diverging"] = theme.colors.diverging
  }
  if (theme.colors.annotation) {
    variables["--semiotic-annotation-color"] = theme.colors.annotation
  }
  if (theme.colors.success) {
    variables["--semiotic-success"] = theme.colors.success
  }
  if (theme.colors.danger) {
    variables["--semiotic-danger"] = theme.colors.danger
  }
  if (theme.colors.warning) {
    variables["--semiotic-warning"] = theme.colors.warning
  }
  if (theme.colors.error) variables["--semiotic-error"] = theme.colors.error
  if (theme.colors.info) variables["--semiotic-info"] = theme.colors.info

  if (theme.tooltip?.background) {
    variables["--semiotic-tooltip-bg"] = theme.tooltip.background
  }
  if (theme.tooltip?.text) {
    variables["--semiotic-tooltip-text"] = theme.tooltip.text
  }
  if (theme.tooltip?.borderRadius) {
    variables["--semiotic-tooltip-radius"] = theme.tooltip.borderRadius
  }
  if (theme.tooltip?.fontSize) {
    variables["--semiotic-tooltip-font-size"] = theme.tooltip.fontSize
  }
  if (theme.tooltip?.shadow) {
    variables["--semiotic-tooltip-shadow"] = theme.tooltip.shadow
  }
  if (theme.borderRadius) {
    variables["--semiotic-border-radius"] = theme.borderRadius
  }
  if (theme.typography.legendSize != null) {
    variables["--semiotic-legend-font-size"] =
      `${theme.typography.legendSize}px`
  }
  if (theme.typography.legendFontFamily != null) {
    variables["--semiotic-legend-font-family"] = theme.typography.legendFontFamily
  }
  if (theme.typography.legendFontWeight != null) {
    variables["--semiotic-legend-font-weight"] = String(theme.typography.legendFontWeight)
  }
  if (theme.typography.titleFontSize != null) {
    variables["--semiotic-title-font-size"] =
      `${theme.typography.titleFontSize}px`
  }
  if (theme.typography.titleFontFamily != null) {
    variables["--semiotic-title-font-family"] = theme.typography.titleFontFamily
  }
  if (theme.typography.titleFontWeight != null) {
    variables["--semiotic-title-font-weight"] = String(theme.typography.titleFontWeight)
  }
  if (theme.typography.tickFontFamily != null) {
    variables["--semiotic-tick-font-family"] =
      theme.typography.tickFontFamily
  }
  if (theme.typography.tickSize != null) {
    variables["--semiotic-tick-font-size"] = `${theme.typography.tickSize}px`
  }
  if (theme.typography.labelSize != null) {
    variables["--semiotic-axis-label-font-size"] =
      `${theme.typography.labelSize}px`
  }

  return variables
}
