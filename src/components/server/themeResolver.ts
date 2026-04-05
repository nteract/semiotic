/**
 * Theme resolution for server-side rendering.
 *
 * Resolves theme presets and partial theme objects to concrete
 * SemioticTheme instances with all color/font values resolved.
 * No CSS custom properties — everything is concrete for inline SVG.
 */

import type { SemioticTheme } from "../store/ThemeStore"
import { LIGHT_THEME, DARK_THEME, HIGH_CONTRAST_THEME } from "../store/ThemeStore"
import { THEME_PRESETS } from "../semiotic-themes"

export type ThemeInput = string | Partial<SemioticTheme> | undefined

/**
 * Resolve a theme input to a full SemioticTheme object.
 *
 * - undefined → LIGHT_THEME
 * - string → named preset ("dark", "tufte", "carbon-dark", etc.)
 * - object with mode → merge onto matching base theme
 * - object without mode → merge onto LIGHT_THEME
 */
export function resolveTheme(theme: ThemeInput): SemioticTheme {
  if (!theme) return LIGHT_THEME

  if (typeof theme === "string") {
    if (theme === "light") return LIGHT_THEME
    if (theme === "dark") return DARK_THEME
    if (theme === "high-contrast") return HIGH_CONTRAST_THEME
    const preset = THEME_PRESETS[theme]
    if (preset) return preset
    // Unknown preset name — fall back to light
    return LIGHT_THEME
  }

  // Object theme — merge onto base
  const base = theme.mode === "dark" ? DARK_THEME : LIGHT_THEME

  return {
    ...base,
    ...theme,
    colors: { ...base.colors, ...(theme.colors || {}) },
    typography: { ...base.typography, ...(theme.typography || {}) },
    tooltip: { ...base.tooltip, ...(theme.tooltip || {}) },
  } as SemioticTheme
}

/**
 * Extract concrete style values from a resolved theme for use in SVG attributes.
 * Returns a flat object of commonly-needed values.
 */
export function themeStyles(theme: SemioticTheme) {
  return {
    background: theme.colors.background,
    text: theme.colors.text,
    textSecondary: theme.colors.textSecondary,
    grid: theme.colors.grid,
    border: theme.colors.border,
    primary: theme.colors.primary,
    fontFamily: theme.typography.fontFamily,
    titleSize: theme.typography.titleSize,
    labelSize: theme.typography.labelSize,
    tickSize: theme.typography.tickSize,
    categorical: theme.colors.categorical,
  }
}
