"use client"

import { useThemeSelector } from "./ThemeStore"
import type { SemioticTheme } from "./themeCore"

export function useTheme(): SemioticTheme {
  return useThemeSelector((state) => state.theme)
}
