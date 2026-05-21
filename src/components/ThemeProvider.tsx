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
import { resolveThemePreset } from "./semiotic-themes"
import type { ThemePresetName } from "./semiotic-themes"
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
    "--semiotic-bg": theme.colors.background,
    "--semiotic-text": theme.colors.text,
    "--semiotic-text-secondary": theme.colors.textSecondary,
    "--semiotic-grid": theme.colors.grid,
    "--semiotic-border": theme.colors.border,
    "--semiotic-cell-border": theme.colors.cellBorder || theme.colors.border,
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
    ...(theme.colors.annotation ? { "--semiotic-annotation-color": theme.colors.annotation } : {}),
    ...(theme.typography.legendSize != null ? { "--semiotic-legend-font-size": `${theme.typography.legendSize}px` } : {}),
    ...(theme.typography.titleFontSize != null ? { "--semiotic-title-font-size": `${theme.typography.titleFontSize}px` } : {}),
    ...(theme.typography.tickFontFamily != null ? { "--semiotic-tick-font-family": theme.typography.tickFontFamily } : {}),
    // Axis tick + label font sizes — emitted from the canonical
    // typography fields (`tickSize`, `labelSize`) so consumers can
    // override either via theme OR via a CSS-var override on any DOM
    // ancestor (`<div style={{ "--semiotic-tick-font-size": "14px" }}>`).
    // SVGOverlay reads these vars via inline `style={{ fontSize: var(...) }}`
    // with the literal default as the fallback — overriding the var
    // wins without needing `!important`.
    ...(theme.typography.tickSize != null ? { "--semiotic-tick-font-size": `${theme.typography.tickSize}px` } : {}),
    ...(theme.typography.labelSize != null ? { "--semiotic-axis-label-font-size": `${theme.typography.labelSize}px` } : {}),
    // ── Semantic role CSS variables ────────────────────────────────────
    // `secondary` and `surface` are documented on SemioticTheme as falling
    // back to `primary` / `background` when unset — always emitted so
    // `var(--semiotic-secondary)` and `var(--semiotic-surface)` reliably
    // resolve, even on custom themes that omit them.
    "--semiotic-secondary": theme.colors.secondary || theme.colors.primary,
    "--semiotic-surface": theme.colors.surface || theme.colors.background,
    // Status roles (success/danger/warning/error/info) have no documented
    // fallback — emitted only when declared. All built-in presets declare
    // them; custom themes that don't will leave `var(--semiotic-danger)`
    // etc. unresolved. Document this on the theme type if that changes.
    ...(theme.colors.success ? { "--semiotic-success": theme.colors.success } : {}),
    ...(theme.colors.danger ? { "--semiotic-danger": theme.colors.danger } : {}),
    ...(theme.colors.warning ? { "--semiotic-warning": theme.colors.warning } : {}),
    ...(theme.colors.error ? { "--semiotic-error": theme.colors.error } : {}),
    ...(theme.colors.info ? { "--semiotic-info": theme.colors.info } : {}),
  }

  const themeName = React.useContext(ThemeNameContext)
  const dataAttrs: Record<string, string> = {}
  if (themeName) {
    dataAttrs["data-semiotic-theme"] = themeName
  }

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
