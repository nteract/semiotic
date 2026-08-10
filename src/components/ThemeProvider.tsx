"use client"
import * as React from "react"
import {
  ThemeProvider as StoreProvider,
  useThemeSelector,
  LIGHT_THEME,
  DARK_THEME,
  HIGH_CONTRAST_THEME,
  resolveThemeUpdate
} from "./store/ThemeStore"
import type { SemioticTheme, SemioticThemeUpdate, ThemeStoreState, ThemeStoreUpdate } from "./store/ThemeStore"
import { resolveThemePreset } from "./semiotic-themes-core"
import type { ThemePresetName } from "./semiotic-themes-core"
import { themeToCSSVariables } from "./store/themeSerialization"
import { addMqlListener } from "./stream/useMediaPreferences"

// ── Props ───────────────────────────────────────────────────────────────────

interface ThemeProviderProps {
  /** Theme preset name (e.g. "tufte", "pastels-dark", "bi-tool") or a partial SemioticTheme object. */
  theme?: ThemePresetName | SemioticThemeUpdate
  children: React.ReactNode
}

// Track the active preset name for the data-semiotic-theme attribute.
const ThemeNameContext = React.createContext<string | undefined>(undefined)

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect

function isForcedColorsActive(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false
  return window.matchMedia("(forced-colors: active)").matches
}

function themeToStoreUpdate(
  theme: ThemePresetName | SemioticThemeUpdate
): ThemeStoreUpdate {
  if (typeof theme !== "string") return theme
  if (theme === "light" || theme === "dark" || theme === "high-contrast") return theme

  // Try named presets next (covers "tufte", "pastels-dark", etc.).
  const preset = resolveThemePreset(theme)
  if (preset) return preset

  // Plain JS consumers can still pass an unknown preset string despite the TS
  // typing. Warn and fall back to "light" instead of forwarding the invalid
  // preset so the provider always initializes with a known theme.
  if (typeof console !== "undefined") {
    console.warn(`[ThemeProvider] Unknown theme preset "${theme}". Falling back to light theme.`)
  }
  return "light"
}

function resolveInitialTheme(
  theme: ThemePresetName | SemioticThemeUpdate | undefined
): SemioticTheme {
  if (theme !== undefined) {
    return resolveThemeUpdate(LIGHT_THEME, themeToStoreUpdate(theme))
  }
  return isForcedColorsActive() ? HIGH_CONTRAST_THEME : LIGHT_THEME
}

function setResolvedTheme(
  setTheme: ThemeStoreState["setTheme"],
  theme: SemioticThemeUpdate
) {
  if (theme === LIGHT_THEME) {
    setTheme("light")
  } else if (theme === DARK_THEME) {
    setTheme("dark")
  } else if (theme === HIGH_CONTRAST_THEME) {
    setTheme("high-contrast")
  } else {
    setTheme(theme)
  }
}

// ── ThemeInitializer ────────────────────────────────────────────────────────
// Syncs prop changes after the provider-scoped store is initialized.
// When no explicit theme is provided and forced-colors (high contrast)
// mode is active, automatically applies HIGH_CONTRAST_THEME.

function ThemeInitializer({
  theme
}: {
  theme?: ThemePresetName | SemioticThemeUpdate
}) {
  const setTheme = useThemeSelector(
    (state: ThemeStoreState) => state.setTheme
  )
  const currentTheme = useThemeSelector(
    (state: ThemeStoreState) => state.theme
  )
  // Keep a ref to the latest theme so the forced-colors handler can read it
  // without re-registering the listener on every theme change.
  const currentThemeRef = React.useRef(currentTheme)
  currentThemeRef.current = currentTheme

  // Remember the theme before forced-colors override so we can restore it
  const themeBeforeForcedColorsRef = React.useRef<SemioticThemeUpdate | null>(null)

  // Auto-detect forced-colors / high-contrast mode
  React.useEffect(() => {
    if (theme !== undefined) return // explicit theme takes priority
    if (typeof window === "undefined" || !window.matchMedia) return

    const mql = window.matchMedia("(forced-colors: active)")
    if (mql.matches) {
      themeBeforeForcedColorsRef.current =
        currentThemeRef.current === HIGH_CONTRAST_THEME ? LIGHT_THEME : currentThemeRef.current
      setTheme("high-contrast")
    }

    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        // Store current theme before overriding
        themeBeforeForcedColorsRef.current =
          currentThemeRef.current === HIGH_CONTRAST_THEME
            ? themeBeforeForcedColorsRef.current ?? LIGHT_THEME
            : currentThemeRef.current
        setTheme("high-contrast")
      } else {
        // Restore previous theme, falling back to LIGHT_THEME
        setResolvedTheme(setTheme, themeBeforeForcedColorsRef.current ?? LIGHT_THEME)
        themeBeforeForcedColorsRef.current = null
      }
    }
    return addMqlListener(mql, handler)
  }, [theme, setTheme])

  const didMountRef = React.useRef(false)
  useIsomorphicLayoutEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }
    if (theme === undefined) return

    setTheme(themeToStoreUpdate(theme))
  }, [theme, setTheme])

  return null
}

// ── CSS Custom Properties wrapper ───────────────────────────────────────────

function ThemeCSSWrapper({ children }: { children: React.ReactNode }) {
  const theme = useThemeSelector(
    (state: ThemeStoreState) => state.theme
  )

  const style: React.CSSProperties & Record<string, string> = {
    position: "relative",
    colorScheme:
      theme.mode === "auto" ? "light dark" : theme.mode,
    ...themeToCSSVariables(theme),
  }

  const themeName = React.useContext(ThemeNameContext)
  const dataAttrs: Record<string, string> = {}
  if (themeName) {
    dataAttrs["data-semiotic-theme"] = themeName
  }
  dataAttrs["data-semiotic-theme-mode"] = theme.mode

  return <div style={style} {...dataAttrs}>{children}</div>
}

// ── ThemeProvider (public) ──────────────────────────────────────────────────

function ThemeProviderWrapper({ theme, children }: ThemeProviderProps) {
  // Resolve the preset name for the data-semiotic-theme attribute.
  // If `theme` is a string that maps to a known preset, use it directly.
  // Otherwise leave undefined (custom object themes or unknown strings don't get a data attribute).
  const themeName =
    typeof theme === "string" && resolveThemePreset(theme) ? theme : undefined
  const initialTheme = React.useMemo(() => resolveInitialTheme(theme), [theme])

  return (
    <StoreProvider initialState={{ theme: initialTheme }}>
      <ThemeNameContext.Provider value={themeName}>
        <ThemeInitializer theme={theme} />
        <ThemeCSSWrapper>{children}</ThemeCSSWrapper>
      </ThemeNameContext.Provider>
    </StoreProvider>
  )
}

// ── useTheme hook ───────────────────────────────────────────────────────────

function useTheme(): SemioticTheme {
  return useThemeSelector((state: ThemeStoreState) => state.theme)
}

// ── Exports ─────────────────────────────────────────────────────────────────

export { ThemeProviderWrapper as ThemeProvider, useTheme }
export { LIGHT_THEME, DARK_THEME, HIGH_CONTRAST_THEME }
export type { SemioticTheme }
