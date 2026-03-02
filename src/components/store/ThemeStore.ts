"use client"
import { createStore } from "./createStore"

// ── Types ──────────────────────────────────────────────────────────────────

export interface SemioticTheme {
  mode: "light" | "dark" | "auto"
  colors: {
    primary: string
    categorical: string[]
    sequential: string
    background: string
    text: string
    textSecondary: string
    grid: string
    border: string
  }
  typography: {
    fontFamily: string
    titleSize: number
    labelSize: number
    tickSize: number
  }
}

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

// ── Store ───────────────────────────────────────────────────────────────────

export interface ThemeStoreState {
  theme: SemioticTheme
  setTheme: (theme: Partial<SemioticTheme> | "light" | "dark") => void
}

export const [ThemeProvider, useThemeSelector] = createStore(
  (set: Function) => ({
    theme: LIGHT_THEME,

    setTheme(theme: Partial<SemioticTheme> | "light" | "dark") {
      set((current: ThemeStoreState) => {
        if (theme === "light") {
          return { theme: LIGHT_THEME }
        }
        if (theme === "dark") {
          return { theme: DARK_THEME }
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
