"use client"
import { createStore } from "./createStore"
import type { ThemeSemanticColors } from "../stream/types"

/**
 * Extract the semantic-role subset of a `SemioticTheme` into the flat
 * `ThemeSemanticColors` shape that Stream Frames thread through to
 * scene builders via `pipelineConfig.themeSemantic`.
 *
 * Centralizes two fallback rules documented on `SemioticTheme.colors`:
 *   - `secondary` falls back to `primary` when unset
 *   - `surface`   falls back to `background` when unset
 *
 * Called from every Stream Frame (XY / Ordinal / Network / Geo) so role
 * additions and fallback tweaks land in exactly one place.
 *
 * Returns `undefined` when no theme is available so scene builders can
 * skip the theme-default path and use their hardcoded fallbacks.
 */
export function resolveThemeSemanticColors(
  theme: SemioticTheme | null | undefined
): ThemeSemanticColors | undefined {
  if (!theme?.colors) return undefined
  const c = theme.colors
  return {
    primary: c.primary,
    secondary: c.secondary || c.primary,
    surface: c.surface || c.background,
    success: c.success,
    danger: c.danger,
    warning: c.warning,
    error: c.error,
    info: c.info,
    text: c.text,
    textSecondary: c.textSecondary,
    border: c.border,
    grid: c.grid,
  }
}

/** Apply accessibility flags to a resolved theme. Shared by ThemeStore and server themeResolver. */
export function applyThemeAccessibility(theme: SemioticTheme): SemioticTheme {
  if (!theme.accessibility) return theme
  let result = theme
  if (theme.accessibility.colorBlindSafe) {
    result = { ...result, colors: { ...result.colors, categorical: COLOR_BLIND_SAFE_CATEGORICAL } }
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
        border: isDark ? "#888888" : "#000000",
      },
    }
  }
  return result
}

// ── Types ──────────────────────────────────────────────────────────────────

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
    focus?: string
    /** Linked hover/selection highlight color */
    selection?: string
    /** Opacity for non-selected (dimmed) elements, 0–1 */
    selectionOpacity?: number
    /** Default annotation text/marker color. Falls back to `text` if unset. */
    annotation?: string
    // ── Semantic status roles ────────────────────────────────────────────
    // Used for status-driven charts (swimlane, waterfall ±, alerts) and
    // annotations. All optional — scene builders fall back to `primary` or
    // hardcoded hex when unset. Override per-theme for brand consistency,
    // or per-scope via `--semiotic-{role}` CSS custom properties.
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
    /** Font family for axis tick labels. Use monospace for aligned numerics. Falls back to `fontFamily`. */
    tickFontFamily?: string
    /** Font size for chart title. Falls back to `titleSize` if unset. */
    titleFontSize?: number
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
}

// ── Curated palettes ────────────────────────────────────────────────────────

/** Color-blind safe categorical palette (8 colors).
 *  Derived from Wong (2011) "Points of view: Color blindness" — safe for
 *  deuteranopia, protanopia, and tritanopia. */
export const COLOR_BLIND_SAFE_CATEGORICAL = [
  "#0072B2", // blue
  "#E69F00", // orange
  "#009E73", // bluish green
  "#CC79A7", // reddish purple
  "#56B4E9", // sky blue
  "#D55E00", // vermillion
  "#F0E442", // yellow
  "#000000", // black
]

// ── Presets ─────────────────────────────────────────────────────────────────

export const LIGHT_THEME: SemioticTheme = {
  mode: "light",
  colors: {
    primary: "#00a2ce",
    secondary: "#6c757d",
    categorical: [
      "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
      "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"
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
    info: "#00a2ce",
  },
  typography: {
    fontFamily: "sans-serif",
    titleSize: 16,
    labelSize: 12,
    tickSize: 10,
  }
}

export const DARK_THEME: SemioticTheme = {
  mode: "dark",
  colors: {
    primary: "#4fc3f7",
    secondary: "#90a4ae",
    categorical: [
      "#4fc3f7", "#ffb74d", "#81c784", "#ef5350", "#ba68c8",
      "#a1887f", "#f06292", "#90a4ae", "#dce775", "#4dd0e1"
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
    info: "#4fc3f7",
  },
  typography: {
    fontFamily: "sans-serif",
    titleSize: 16,
    labelSize: 12,
    tickSize: 10
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
    info: "#0000cc",
  },
  typography: {
    fontFamily: "system-ui, sans-serif",
    titleSize: 18,
    labelSize: 14,
    tickSize: 12,
  },
  tooltip: {
    background: "#000000",
    text: "#ffffff",
    borderRadius: "4px",
    fontSize: "14px",
    shadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
  },
  borderRadius: "4px",
}

// ── Store ───────────────────────────────────────────────────────────────────

export interface ThemeStoreState {
  theme: SemioticTheme
  setTheme: (theme: ThemeStoreUpdate) => void
}

export type ThemeStoreUpdate = Partial<SemioticTheme> | "light" | "dark" | "high-contrast"

export function resolveThemeUpdate(
  current: SemioticTheme,
  theme: ThemeStoreUpdate
): SemioticTheme {
  if (theme === "light") {
    return LIGHT_THEME
  }
  if (theme === "dark") {
    return DARK_THEME
  }
  if (theme === "high-contrast") {
    return HIGH_CONTRAST_THEME
  }
  // If the object has `mode`, merge onto the matching base theme so
  // unspecified fields (background, text, grid, etc.) inherit correctly.
  // Without `mode`, shallow-merge into the current theme (partial override).
  if (theme.mode && theme.mode !== "auto") {
    const base = theme.mode === "dark" ? DARK_THEME : LIGHT_THEME
    return applyThemeAccessibility({
      ...base,
      ...theme,
      colors: { ...base.colors, ...(theme.colors || {}) },
      typography: { ...base.typography, ...(theme.typography || {}) },
    } as SemioticTheme)
  }
  return applyThemeAccessibility({
    ...current,
    ...theme,
    colors: {
      ...current.colors,
      ...(theme.colors || {})
    },
    typography: {
      ...current.typography,
      ...(theme.typography || {})
    }
  } as SemioticTheme)
}

export const [ThemeProvider, useThemeSelector] = createStore<ThemeStoreState>(
  (set) => ({
    theme: LIGHT_THEME,

    setTheme(theme: ThemeStoreUpdate) {
      set((current: ThemeStoreState) => {
        return {
          theme: resolveThemeUpdate(current.theme, theme)
        }
      })
    }
  })
)
