import { applyConcreteThemeAccessibility } from "../store/concreteThemeAccessibility"
import {
  cloneTheme,
  autoSVGTheme,
  autoPaletteCSS,
  warnUnknownTheme
} from "../store/themeResolution"
/**
 * Theme resolution for server-side rendering.
 *
 * Resolves theme presets and partial theme objects to concrete
 * SemioticTheme instances with all color/font values resolved.
 * Automatic palettes retain scoped CSS variables and media rules in SVG.
 */

import type { SemioticTheme } from "../store/themeCore"
import {
  LIGHT_THEME,
  DARK_THEME,
  mergeThemeOverrides
} from "../store/themeCore"
import { resolveThemePreset } from "../store/themePresets"

type PartialThemeObject = Omit<
  Partial<SemioticTheme>,
  "colors" | "typography" | "tooltip"
> & {
  colors?: Partial<SemioticTheme["colors"]>
  typography?: Partial<SemioticTheme["typography"]>
  tooltip?: Partial<NonNullable<SemioticTheme["tooltip"]>>
}

export type ThemeInput = string | PartialThemeObject | undefined

/**
 * Resolve a theme input to a full SemioticTheme object.
 *
 * - undefined → LIGHT_THEME
 * - string → named preset ("dark", "tufte", "carbon-dark", etc.)
 * - object with mode → merge onto matching base theme
 * - object without mode → merge onto LIGHT_THEME
 */
const autoInputs = new WeakMap<SemioticTheme, PartialThemeObject>()

export function themeMediaCSS(
  theme: SemioticTheme,
  selector: string
): string | undefined {
  const input = autoInputs.get(theme)
  return input ? autoPaletteCSS(input, selector) : undefined
}

export function resolveTheme(theme: ThemeInput): SemioticTheme {
  if (!theme) return cloneTheme(LIGHT_THEME)

  if (typeof theme === "string") {
    const preset = resolveThemePreset(theme)
    if (preset) return preset
    warnUnknownTheme(theme)
    // Unknown preset name — fall back to light
    return cloneTheme(LIGHT_THEME)
  }

  if (theme.mode === "auto") {
    const resolved = autoSVGTheme(theme)
    autoInputs.set(resolved, theme)
    return resolved
  }

  const base = theme.mode === "dark" ? DARK_THEME : LIGHT_THEME
  return cloneTheme(
    applyConcreteThemeAccessibility(mergeThemeOverrides(base, theme))
  )
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
    annotation: theme.colors.annotation ?? theme.colors.text,
    legendSize: theme.typography.legendSize ?? theme.typography.labelSize,
    legendFontFamily:
      theme.typography.legendFontFamily ?? theme.typography.fontFamily,
    legendFontWeight: theme.typography.legendFontWeight,
    titleFontSize: theme.typography.titleFontSize ?? theme.typography.titleSize,
    titleFontFamily:
      theme.typography.titleFontFamily ?? theme.typography.fontFamily,
    titleFontWeight: theme.typography.titleFontWeight ?? "bold",
    tickFontFamily:
      theme.typography.tickFontFamily ?? theme.typography.fontFamily
  }
}
