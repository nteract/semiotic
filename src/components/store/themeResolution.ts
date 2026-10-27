import { applyConcreteThemeAccessibility } from "./concreteThemeAccessibility"
import { LIGHT_THEME, DARK_THEME, mergeThemeOverrides } from "./themeCore"
import type { SemioticTheme, SemioticThemeUpdate } from "./themeCore"
import { themeToCSSVariables } from "./themeCSSVariables"

export { cloneTheme } from "./cloneTheme"
import { cloneTheme } from "./cloneTheme"

export function resolveAutoPalette(
  update: SemioticThemeUpdate,
  mode: "light" | "dark"
): SemioticTheme {
  const base = mode === "dark" ? DARK_THEME : LIGHT_THEME
  const merged = mergeThemeOverrides(base, update)
  merged.colors.categorical ??= base.colors.categorical
  const theme = cloneTheme(
    applyConcreteThemeAccessibility({
      ...merged,
      mode
    })
  )
  theme.mode = "auto"
  return theme
}

/** Scoped variables work before hydration and respond to OS preference changes. */
export function autoPaletteCSS(
  update: SemioticThemeUpdate,
  selector: string
): string {
  const declarations = (mode: "light" | "dark") =>
    Object.entries(themeToCSSVariables(resolveAutoPalette(update, mode)))
      .map(([key, value]) => `${key}:${value}`)
      .join(";")
  return `${selector}{${declarations("light")}}@media (prefers-color-scheme:dark){${selector}{${declarations("dark")}}}`
}

const colorTokens: Record<string, string> = {
  background: "bg",
  primary: "primary",
  secondary: "secondary",
  surface: "surface",
  text: "text",
  textSecondary: "text-secondary",
  grid: "grid",
  border: "border",
  cellBorder: "cell-border",
  focus: "focus",
  selection: "selection-color",
  annotation: "annotation-color",
  success: "success",
  danger: "danger",
  warning: "warning",
  error: "error",
  info: "info"
}

/** SVG attributes retain a light fallback while media rules select the palette. */
export function autoSVGTheme(update: SemioticThemeUpdate): SemioticTheme {
  const theme = resolveAutoPalette(update, "light")
  const colors = { ...theme.colors }
  for (const [key, token] of Object.entries(colorTokens)) {
    const value = colors[key as keyof typeof colors]
    if (typeof value === "string")
      (colors as Record<string, unknown>)[key] =
        `var(--semiotic-${token}, ${value})`
  }
  // Validate all tokens before embedding values as SVG fallbacks.
  themeToCSSVariables(theme)
  colors.categorical = theme.colors.categorical.map(
    (value, i) => `var(--semiotic-category-${i + 1}, ${value})`
  )
  return { ...theme, colors }
}

const warnedNames = /* @__PURE__ */ new Set<string>()
export function warnUnknownTheme(name: string): void {
  if (warnedNames.has(name)) return
  warnedNames.add(name)
  console.warn(
    `[Semiotic] Unknown theme preset "${name}". Falling back to light theme.`
  )
}
