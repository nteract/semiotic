"use client"

import { createStore } from "./createStore"
import { LIGHT_THEME, resolveThemeUpdate } from "./themeCore"
import type { SemioticTheme, ThemeStoreUpdate } from "./themeCore"

// Preserve the established ThemeStore module surface while keeping all pure
// theme contracts available to React-free entries from themeCore directly.
export * from "./themeCore"

export interface ThemeStoreState {
  theme: SemioticTheme
  setTheme: (theme: ThemeStoreUpdate) => void
}

export const [ThemeProvider, useThemeSelector] = createStore<ThemeStoreState>(
  (set) => ({
    theme: LIGHT_THEME,

    setTheme(theme: ThemeStoreUpdate) {
      set((current: ThemeStoreState) => ({
        theme: resolveThemeUpdate(current.theme, theme)
      }))
    }
  })
)
