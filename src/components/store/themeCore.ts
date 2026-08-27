import type { ThemeSemanticColors } from "../stream/streamThemeTypes"
import type { AestheticProfile } from "../ai/aestheticProfileTypes"

// React-free theme contracts, presets, and resolution helpers. Keep this
// module free of store/provider imports so server, RSC, and edge entry points
// can consume the theme system without pulling a React runtime.

export interface SemioticTheme {
  mode: "light" | "dark" | "auto"
  colors: {
    primary: string
    /** Secondary accent color. Falls back to `primary` when unset. */
    secondary?: string
    categorical: string[]
    sequential: string
    /** d3-scale-chromatic diverging scheme name, e.g. "RdBu", "PiYG" */
    diverging?: string
    background: string
    /** Elevated surface fill (e.g. card/tooltip bg). Falls back to `background`. */
    surface?: string
    text: string
    textSecondary: string
    grid: string
    border: string
    /** Separator/border color for cell-like marks such as treemap tiles and heatmap cells. Falls back to `border`. */
    cellBorder?: string
    focus?: string
    /** Linked hover/selection highlight color */
    selection?: string
    /** Opacity for non-selected (dimmed) elements, 0–1 */
    selectionOpacity?: number
    /** Default annotation text/marker color. Falls back to `text` if unset. */
    annotation?: string
    /** Positive outcomes, gains, "ok" states. */
    success?: string
    /** Negative outcomes, losses, destructive actions. */
    danger?: string
    /** Cautionary states, degraded but not failed. */
    warning?: string
    /** Failed states, blocking errors. Typically more intense than `danger`. */
    error?: string
    /** Neutral informational callouts, tips, help content. */
    info?: string
  }
  typography: {
    fontFamily: string
    titleSize: number
    labelSize: number
    tickSize: number
    /** Font size for legend text. Falls back to `labelSize` if unset. */
    legendSize?: number
    /** Font family for legends. Falls back to `fontFamily` if unset. */
    legendFontFamily?: string
    /** Font weight for legends. Inherits the browser normal weight if unset. */
    legendFontWeight?: string | number
    /** Font family for axis tick labels. Falls back to `fontFamily`. */
    tickFontFamily?: string
    /** Font size for chart title. Falls back to `titleSize` if unset. */
    titleFontSize?: number
    /** Font family for chart titles. Falls back to `fontFamily` if unset. */
    titleFontFamily?: string
    /** Font weight for chart titles. Falls back to the established bold title treatment. */
    titleFontWeight?: string | number
  }
  tooltip?: {
    background?: string
    text?: string
    borderRadius?: string
    fontSize?: string
    shadow?: string
  }
  borderRadius?: string
  accessibility?: {
    /** Auto-swap to color-blind safe palette when true */
    colorBlindSafe?: boolean
    /** Enforce minimum 3:1 contrast ratios */
    highContrast?: boolean
  }
  /** Organizational weights for machine-visible presentation features. */
  aesthetics?: AestheticProfile
}

export type SemioticThemeUpdate = Omit<
  Partial<SemioticTheme>,
  "colors" | "typography" | "tooltip" | "accessibility" | "aesthetics"
> & {
  colors?: Partial<SemioticTheme["colors"]>
  typography?: Partial<SemioticTheme["typography"]>
  tooltip?: Partial<NonNullable<SemioticTheme["tooltip"]>>
  accessibility?: Partial<NonNullable<SemioticTheme["accessibility"]>>
  aesthetics?: AestheticProfile
}

export type ThemeStoreUpdate =
  | SemioticThemeUpdate
  | "light"
  | "dark"
  | "high-contrast"

/** Color-blind safe categorical palette (8 colors).
 * Derived from Wong (2011) "Points of view: Color blindness". */
export const COLOR_BLIND_SAFE_CATEGORICAL = [
  "#0072B2",
  "#E69F00",
  "#009E73",
  "#CC79A7",
  "#56B4E9",
  "#D55E00",
  "#F0E442",
  "#000000"
]

export const LIGHT_THEME: SemioticTheme = {
  mode: "light",
  colors: {
    primary: "#00a2ce",
    secondary: "#6c757d",
    categorical: [
      "#1f77b4",
      "#ff7f0e",
      "#2ca02c",
      "#d62728",
      "#9467bd",
      "#8c564b",
      "#e377c2",
      "#7f7f7f",
      "#bcbd22",
      "#17becf"
    ],
    sequential: "blues",
    diverging: "RdBu",
    background: "transparent",
    surface: "#ffffff",
    text: "#333",
    textSecondary: "#666",
    grid: "#e0e0e0",
    border: "#ccc",
    selection: "#00a2ce",
    selectionOpacity: 0.15,
    success: "#2ca02c",
    danger: "#d62728",
    warning: "#f0ad4e",
    error: "#b4181b",
    info: "#00a2ce"
  },
  typography: {
    fontFamily: "sans-serif",
    titleSize: 16,
    labelSize: 12,
    tickSize: 12
  }
}

export const DARK_THEME: SemioticTheme = {
  mode: "dark",
  colors: {
    primary: "#4fc3f7",
    secondary: "#90a4ae",
    categorical: [
      "#4fc3f7",
      "#ffb74d",
      "#81c784",
      "#ef5350",
      "#ba68c8",
      "#a1887f",
      "#f06292",
      "#90a4ae",
      "#dce775",
      "#4dd0e1"
    ],
    sequential: "blues",
    diverging: "RdBu",
    background: "#1a1a2e",
    surface: "#252540",
    text: "#e0e0e0",
    textSecondary: "#aaa",
    grid: "#333",
    border: "#555",
    selection: "#4fc3f7",
    selectionOpacity: 0.15,
    success: "#81c784",
    danger: "#ef5350",
    warning: "#ffb74d",
    error: "#d84848",
    info: "#4fc3f7"
  },
  typography: {
    fontFamily: "sans-serif",
    titleSize: 16,
    labelSize: 12,
    tickSize: 12
  }
}

export const HIGH_CONTRAST_THEME: SemioticTheme = {
  mode: "light",
  colors: {
    primary: "#0000cc",
    secondary: "#333333",
    categorical: COLOR_BLIND_SAFE_CATEGORICAL,
    sequential: "blues",
    diverging: "RdBu",
    background: "#ffffff",
    surface: "#ffffff",
    text: "#000000",
    textSecondary: "#333333",
    grid: "#999999",
    border: "#000000",
    focus: "#0000cc",
    selection: "#0000cc",
    selectionOpacity: 0.1,
    success: "#006400",
    danger: "#cc0000",
    warning: "#b15a00",
    error: "#8b0000",
    info: "#0000cc"
  },
  typography: {
    fontFamily: "system-ui, sans-serif",
    titleSize: 18,
    labelSize: 14,
    tickSize: 12
  },
  tooltip: {
    background: "#000000",
    text: "#ffffff",
    borderRadius: "4px",
    fontSize: "14px",
    shadow: "0 2px 8px rgba(0, 0, 0, 0.3)"
  },
  borderRadius: "4px"
}

/** Extract the semantic-role subset consumed by Stream Frame scene builders. */
export function resolveThemeSemanticColors(
  theme: SemioticTheme | null | undefined
): ThemeSemanticColors | undefined {
  if (!theme?.colors) return undefined
  const colors = theme.colors
  return {
    primary: colors.primary,
    secondary: colors.secondary || colors.primary,
    surface: colors.surface || colors.background,
    success: colors.success,
    danger: colors.danger,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
    text: colors.text,
    textSecondary: colors.textSecondary,
    border: colors.border,
    grid: colors.grid
  }
}

/** Apply accessibility flags to a resolved theme. */
export function applyThemeAccessibility(theme: SemioticTheme): SemioticTheme {
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
    const isDark = result.mode === "dark"
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

export function resolveThemeUpdate(
  current: SemioticTheme,
  theme: ThemeStoreUpdate
): SemioticTheme {
  if (theme === "light") return LIGHT_THEME
  if (theme === "dark") return DARK_THEME
  if (theme === "high-contrast") return HIGH_CONTRAST_THEME

  if (typeof theme === "string") {
    if (typeof console !== "undefined") {
      console.warn(
        `[ThemeStore] Unknown theme preset "${theme}". Keeping current theme.`
      )
    }
    return current
  }

  const mergeAesthetics = (
    base: SemioticTheme["aesthetics"]
  ): SemioticTheme["aesthetics"] =>
    theme.aesthetics
      ? {
          ...base,
          ...theme.aesthetics,
          weights: { ...base?.weights, ...theme.aesthetics.weights },
          thresholds: { ...base?.thresholds, ...theme.aesthetics.thresholds },
          rationales: { ...base?.rationales, ...theme.aesthetics.rationales }
        }
      : base

  if (theme.mode && theme.mode !== "auto") {
    const base = theme.mode === "dark" ? DARK_THEME : LIGHT_THEME
    return applyThemeAccessibility({
      ...base,
      ...theme,
      colors: { ...base.colors, ...(theme.colors || {}) },
      typography: { ...base.typography, ...(theme.typography || {}) },
      aesthetics: mergeAesthetics(base.aesthetics)
    } as SemioticTheme)
  }

  return applyThemeAccessibility({
    ...current,
    ...theme,
    colors: { ...current.colors, ...(theme.colors || {}) },
    typography: { ...current.typography, ...(theme.typography || {}) },
    aesthetics: mergeAesthetics(current.aesthetics)
  } as SemioticTheme)
}
