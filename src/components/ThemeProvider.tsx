"use client"
import * as React from "react"
import {
  ThemeProvider as StoreProvider,
  useThemeSelector,
  LIGHT_THEME,
  DARK_THEME,
  HIGH_CONTRAST_THEME
} from "./store/ThemeStore"
import type { SemioticTheme } from "./store/ThemeStore"

// ── Props ───────────────────────────────────────────────────────────────────

interface ThemeProviderProps {
  theme?: "light" | "dark" | "high-contrast" | Partial<SemioticTheme>
  children: React.ReactNode
}

// ── ThemeInitializer ────────────────────────────────────────────────────────
// Calls setTheme on mount to sync the store with the prop value.

function ThemeInitializer({
  theme
}: {
  theme?: "light" | "dark" | "high-contrast" | Partial<SemioticTheme>
}) {
  const setTheme = useThemeSelector(
    (state: { setTheme: (t: Partial<SemioticTheme> | "light" | "dark" | "high-contrast") => void }) => state.setTheme
  )

  React.useEffect(() => {
    if (theme !== undefined) {
      setTheme(theme)
    }
  }, [theme, setTheme])

  return null
}

// ── CSS Custom Properties wrapper ───────────────────────────────────────────

function ThemeCSSWrapper({ children }: { children: React.ReactNode }) {
  const theme = useThemeSelector(
    (state: { theme: SemioticTheme }) => state.theme
  )

  const style: React.CSSProperties & Record<string, string> = {
    position: "relative",
    "--semiotic-bg": theme.colors.background,
    "--semiotic-text": theme.colors.text,
    "--semiotic-text-secondary": theme.colors.textSecondary,
    "--semiotic-grid": theme.colors.grid,
    "--semiotic-border": theme.colors.border,
    "--semiotic-primary": theme.colors.primary,
    "--semiotic-font-family": theme.typography.fontFamily,
    ...(theme.colors.focus ? { "--semiotic-focus": theme.colors.focus } : {}),
    ...(theme.tooltip?.background ? { "--semiotic-tooltip-bg": theme.tooltip.background } : {}),
    ...(theme.tooltip?.text ? { "--semiotic-tooltip-text": theme.tooltip.text } : {}),
    ...(theme.tooltip?.borderRadius ? { "--semiotic-tooltip-radius": theme.tooltip.borderRadius } : {}),
    ...(theme.tooltip?.fontSize ? { "--semiotic-tooltip-font-size": theme.tooltip.fontSize } : {}),
    ...(theme.tooltip?.shadow ? { "--semiotic-tooltip-shadow": theme.tooltip.shadow } : {}),
    ...(theme.borderRadius ? { "--semiotic-border-radius": theme.borderRadius } : {}),
    ...(theme.colors.selection ? { "--semiotic-selection-color": theme.colors.selection } : {}),
    ...(theme.colors.selectionOpacity != null ? { "--semiotic-selection-opacity": String(theme.colors.selectionOpacity) } : {}),
    ...(theme.colors.diverging ? { "--semiotic-diverging": theme.colors.diverging } : {}),
  }

  return <div style={style}>{children}</div>
}

// ── ThemeProvider (public) ──────────────────────────────────────────────────

function ThemeProviderWrapper({ theme, children }: ThemeProviderProps) {
  return (
    <StoreProvider>
      <ThemeInitializer theme={theme} />
      <ThemeCSSWrapper>{children}</ThemeCSSWrapper>
    </StoreProvider>
  )
}

// ── useTheme hook ───────────────────────────────────────────────────────────

function useTheme(): SemioticTheme {
  return useThemeSelector((state: { theme: SemioticTheme }) => state.theme)
}

// ── Exports ─────────────────────────────────────────────────────────────────

export { ThemeProviderWrapper as ThemeProvider, useTheme }
export { LIGHT_THEME, DARK_THEME, HIGH_CONTRAST_THEME }
export type { SemioticTheme }
