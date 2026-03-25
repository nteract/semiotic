"use client"
import { createStore } from "./createStore"

// ── Types ──────────────────────────────────────────────────────────────────

export interface SemioticTheme {
  mode: "light" | "dark" | "auto"
  colors: {
    primary: string
    categorical: string[]
    sequential: string
    /** d3-scale-chromatic diverging scheme name, e.g. "RdBu", "PiYG" */
    diverging?: string
    background: string
    text: string
    textSecondary: string
    grid: string
    border: string
    focus?: string
    /** Linked hover/selection highlight color */
    selection?: string
    /** Opacity for non-selected (dimmed) elements, 0–1 */
    selectionOpacity?: number
  }
  typography: {
    fontFamily: string
    titleSize: number
    labelSize: number
    tickSize: number
  }
  tooltip?: {
    background?: string
    text?: string
    borderRadius?: string
    fontSize?: string
    shadow?: string
  }
  borderRadius?: string
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
    categorical: [
      "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
      "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"
    ],
    sequential: "blues",
    background: "transparent",
    text: "#333",
    textSecondary: "#666",
    grid: "#e0e0e0",
    border: "#ccc"
  },
  typography: {
    fontFamily: "sans-serif",
    titleSize: 16,
    labelSize: 12,
    tickSize: 10
  }
}

export const DARK_THEME: SemioticTheme = {
  mode: "dark",
  colors: {
    primary: "#4fc3f7",
    categorical: [
      "#4fc3f7", "#ffb74d", "#81c784", "#ef5350", "#ba68c8",
      "#a1887f", "#f06292", "#90a4ae", "#dce775", "#4dd0e1"
    ],
    sequential: "blues",
    background: "#1a1a2e",
    text: "#e0e0e0",
    textSecondary: "#aaa",
    grid: "#333",
    border: "#555"
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
    categorical: COLOR_BLIND_SAFE_CATEGORICAL,
    sequential: "blues",
    diverging: "RdBu",
    background: "#ffffff",
    text: "#000000",
    textSecondary: "#333333",
    grid: "#999999",
    border: "#000000",
    focus: "#0000cc",
    selection: "#0000cc",
    selectionOpacity: 0.1,
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
  setTheme: (theme: Partial<SemioticTheme> | "light" | "dark" | "high-contrast") => void
}

export const [ThemeProvider, useThemeSelector] = createStore(
  (set: Function) => ({
    theme: LIGHT_THEME,

    setTheme(theme: Partial<SemioticTheme> | "light" | "dark" | "high-contrast") {
      set((current: ThemeStoreState) => {
        if (theme === "light") {
          return { theme: LIGHT_THEME }
        }
        if (theme === "dark") {
          return { theme: DARK_THEME }
        }
        if (theme === "high-contrast") {
          return { theme: HIGH_CONTRAST_THEME }
        }
        // If the object has `mode`, merge onto the matching base theme so
        // unspecified fields (background, text, grid, etc.) inherit correctly.
        // Without `mode`, shallow-merge into the current theme (partial override).
        if (theme.mode) {
          const base = theme.mode === "dark" ? DARK_THEME : LIGHT_THEME
          return {
            theme: {
              ...base,
              ...theme,
              colors: { ...base.colors, ...(theme.colors || {}) },
              typography: { ...base.typography, ...(theme.typography || {}) },
            }
          }
        }
        return {
          theme: {
            ...current.theme,
            ...theme,
            colors: {
              ...current.theme.colors,
              ...(theme.colors || {})
            },
            typography: {
              ...current.theme.typography,
              ...(theme.typography || {})
            }
          }
        }
      })
    }
  })
)
