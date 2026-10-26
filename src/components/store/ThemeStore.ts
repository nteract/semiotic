"use client"

import { cloneTheme } from "./cloneTheme"
import { createStore } from "./createStore"
import { LIGHT_THEME, resolveThemeUpdate } from "./themeCore"
import type { SemioticTheme, ThemeStoreUpdate } from "./themeCore"

// Preserve the established ThemeStore module surface while keeping all pure
// theme contracts available to React-free entries from themeCore directly.
export * from "./themeCore"

export interface ThemeStoreState {
  theme: SemioticTheme
  /** The public provider installs value equality for its prop/imperative updates. */
  equals?: (a: SemioticTheme, b: SemioticTheme) => boolean
  /** Provider prop synchronization replaces a resolved theme; imperative updates merge. */
  setTheme: (theme: ThemeStoreUpdate, replace?: boolean) => void
}

export const [ThemeProvider, useThemeSelector] =
  /* @__PURE__ */ createStore<ThemeStoreState>((set) => ({
    theme: cloneTheme(LIGHT_THEME),

    setTheme(theme: ThemeStoreUpdate, replace = false) {
      set((current: ThemeStoreState) => {
        const next = replace
          ? cloneTheme(theme as SemioticTheme)
          : resolveThemeUpdate(current.theme, theme)
        return current.equals?.(current.theme, next) ? {} : { theme: next }
      })
    }
  }))
