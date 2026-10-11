"use client"
import {
  cloneTheme,
  resolveAutoPalette,
  autoPaletteCSS,
  warnUnknownTheme
} from "./store/themeResolution"
import * as React from "react"
import {
  ThemeProvider as StoreProvider,
  useThemeSelector
} from "./store/ThemeStore"
import {
  LIGHT_THEME,
  DARK_THEME,
  HIGH_CONTRAST_THEME,
  resolveThemeUpdate
} from "./store/themeCore"
import type {
  SemioticTheme,
  SemioticThemeUpdate,
  ThemeStoreUpdate
} from "./store/themeCore"
import type { ThemeStoreState } from "./store/ThemeStore"
import { useTheme } from "./store/useTheme"
import { resolveThemePreset } from "./store/themePresets"
import type { ThemePresetName } from "./store/themePresets"
import { themeToCSSVariables } from "./store/themeCSSVariables"
import { addMqlListener } from "./stream/useMediaPreferences"
import { TooltipChromeScope } from "./Tooltip/tooltipChrome"

// ── Props ───────────────────────────────────────────────────────────────────

interface ThemeProviderProps {
  /** Built-in preset name or partial theme. Unknown strings warn and fall back to light at runtime. */
  theme?: ThemePresetName | SemioticThemeUpdate
  children: React.ReactNode
}

// Track the active preset name for the data-semiotic-theme attribute.
const ThemeNameContext = /* @__PURE__ */ React.createContext<
  string | undefined
>(undefined)

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
  if (theme === "light") return "light"
  if (theme === "dark") return "dark"
  if (theme === "high-contrast") return "high-contrast"

  // Try named presets next (covers "tufte", "pastels-dark", etc.).
  const preset = resolveThemePreset(theme)
  if (preset) return preset

  // Plain JS consumers can still pass an unknown preset string despite the TS
  // typing. Warn and fall back to "light" instead of forwarding the invalid
  // preset so the provider always initializes with a known theme.
  if (typeof console !== "undefined") {
    warnUnknownTheme(theme)
  }
  return "light"
}

function resolveInitialTheme(
  theme: ThemePresetName | SemioticThemeUpdate | undefined
): SemioticTheme {
  if (theme !== undefined) {
    return resolveThemeUpdate(LIGHT_THEME, themeToStoreUpdate(theme))
  }
  return cloneTheme(isForcedColorsActive() ? HIGH_CONTRAST_THEME : LIGHT_THEME)
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
  const setTheme = useThemeSelector((state: ThemeStoreState) => state.setTheme)
  const currentTheme = useThemeSelector((state: ThemeStoreState) => state.theme)
  // Keep a ref to the latest theme so the forced-colors handler can read it
  // without re-registering the listener on every theme change.
  const currentThemeRef = React.useRef(currentTheme)
  currentThemeRef.current = currentTheme

  // Remember the theme before forced-colors override so we can restore it
  const themeBeforeForcedColorsRef = React.useRef<SemioticThemeUpdate | null>(
    null
  )

  // Auto-detect forced-colors / high-contrast mode
  React.useEffect(() => {
    if (theme !== undefined) return // explicit theme takes priority
    if (typeof window === "undefined" || !window.matchMedia) return

    const mql = window.matchMedia("(forced-colors: active)")
    if (mql.matches) {
      themeBeforeForcedColorsRef.current = LIGHT_THEME
      setTheme("high-contrast")
    }

    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        // Store current theme before overriding
        themeBeforeForcedColorsRef.current ??= currentThemeRef.current
        setTheme("high-contrast")
      } else {
        // Restore previous theme, falling back to LIGHT_THEME
        setTheme(themeBeforeForcedColorsRef.current ?? "light")
        themeBeforeForcedColorsRef.current = null
      }
    }
    return addMqlListener(mql, handler)
  }, [theme, setTheme])

  React.useEffect(() => {
    if (
      typeof theme !== "object" ||
      theme.mode !== "auto" ||
      !window.matchMedia
    )
      return
    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const sync = () =>
      setTheme(resolveAutoPalette(theme, mql.matches ? "dark" : "light"))
    sync()
    return addMqlListener(mql, sync)
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

function ThemeCSSWrapper({
  children,
  input
}: {
  children: React.ReactNode
  input?: ThemePresetName | SemioticThemeUpdate
}) {
  const theme = useThemeSelector((state: ThemeStoreState) => state.theme)

  const autoId = React.useId()
  const autoInput =
    typeof input === "object" && input.mode === "auto" ? input : undefined
  const style: React.CSSProperties & Record<string, string> = {
    position: "relative",
    colorScheme: theme.mode === "auto" ? "light dark" : theme.mode,
    ...(autoInput ? {} : themeToCSSVariables(theme))
  }

  const themeName = React.useContext(ThemeNameContext)
  return (
    <TooltipChromeScope chrome={theme.tooltip?.chrome}>
      <div
        style={style}
        data-semiotic-theme={themeName}
        data-semiotic-theme-mode={theme.mode}
        data-semiotic-auto={autoInput ? autoId : undefined}
      >
        {autoInput && (
          <style>
            {autoPaletteCSS(autoInput, `[data-semiotic-auto="${autoId}"]`)}
          </style>
        )}
        {children}
      </div>
    </TooltipChromeScope>
  )
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
        <ThemeCSSWrapper input={theme}>{children}</ThemeCSSWrapper>
      </ThemeNameContext.Provider>
    </StoreProvider>
  )
}

// ── Exports ─────────────────────────────────────────────────────────────────

export { ThemeProviderWrapper as ThemeProvider, useTheme }
export { LIGHT_THEME, DARK_THEME, HIGH_CONTRAST_THEME }
export type { SemioticTheme }
