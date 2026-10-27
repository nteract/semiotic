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
  resolveThemeUpdate,
  mergeThemeOverrides
} from "./store/themeCore"
import type {
  SemioticTheme,
  SemioticThemeUpdate
} from "./store/themeCore"
import type { ThemeStoreState } from "./store/ThemeStore"
import { useTheme } from "./store/useTheme"
import { resolveThemePreset } from "./store/themePresets"
import type { ThemePresetName } from "./store/themePresets"
import { themeToCSSVariables } from "./store/themeCSSVariables"
import { addMqlListener, getMediaQuery } from "./stream/mediaQuery"
import { TooltipChromeScope } from "./Tooltip/tooltipChrome"

// ── Props ───────────────────────────────────────────────────────────────────

interface ThemeProviderProps {
  /** Built-in preset name or partial theme. Unknown strings warn and fall back to light at runtime. */
  theme?: ThemePresetName | SemioticThemeUpdate
  children: React.ReactNode
}

// Preserve authored auto-mode overrides through nested providers so their CSS
// can follow the OS palette even before hydration.
const ThemeScopeContext = /* @__PURE__ */ React.createContext<
  SemioticThemeUpdate | null | undefined
>(undefined)
// undefined means no provider; null means a provider with a concrete palette.

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect

function resolveInitialTheme(
  theme: ThemePresetName | SemioticThemeUpdate | undefined,
  parent?: SemioticTheme
): { theme: SemioticTheme; name?: string } {
  let name: string | undefined
  if (typeof theme === "string") {
    const preset = resolveThemePreset(theme)
    if (preset) name = theme
    else if (typeof console !== "undefined") warnUnknownTheme(theme)
    theme = preset ?? LIGHT_THEME
  }
  return {
    name,
    theme: theme !== undefined
      ? resolveThemeUpdate(parent ?? LIGHT_THEME, theme)
      : cloneTheme(
          parent ??
            (getMediaQuery("(forced-colors: active)")?.matches
              ? HIGH_CONTRAST_THEME
              : LIGHT_THEME)
        )
  }
}

// Keep prop comparison in the provider graph, rather than chart-only imports.
function themeValuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (
    !a ||
    !b ||
    typeof a !== "object" ||
    typeof b !== "object" ||
    Array.isArray(a) !== Array.isArray(b)
  )
    return false
  // Own names include array length and distinguish removed undefined fields.
  const keys = Object.getOwnPropertyNames(a)
  return (
    keys.length === Object.getOwnPropertyNames(b).length &&
    keys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(b, key) &&
        themeValuesEqual(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key]
        )
    )
  )
}

function useStableThemeValue<T>(value: T): T {
  const stable = React.useRef(value)
  if (!themeValuesEqual(stable.current, value)) stable.current = value
  return stable.current
}

// ── ThemeInitializer ────────────────────────────────────────────────────────
// Syncs prop changes after the provider-scoped store is initialized.
// When no explicit theme is provided and forced-colors (high contrast)
// mode is active, automatically applies HIGH_CONTRAST_THEME.

function ThemeInitializer({
  resolved,
  auto,
  query
}: {
  resolved: SemioticTheme
  auto?: SemioticThemeUpdate
  query?: string
}) {
  const setTheme = useThemeSelector((state: ThemeStoreState) => state.setTheme)
  const currentTheme = useThemeSelector((state: ThemeStoreState) => state.theme)
  // Keep a ref to the latest theme so the forced-colors handler can read it
  // without re-registering the listener on every theme change.
  const currentThemeRef = React.useRef(currentTheme)
  currentThemeRef.current = currentTheme

  useIsomorphicLayoutEffect(() => {
    const mql = query ? getMediaQuery(query) : undefined
    // An initially forced root has no preceding authored theme to restore.
    let beforeForced = !auto && mql?.matches ? LIGHT_THEME : undefined
    const sync = (event?: MediaQueryListEvent) => {
      const matches = event?.matches ?? mql?.matches
      if (auto && mql) {
        setTheme(resolveAutoPalette(auto, matches ? "dark" : "light"), true)
      } else if (matches) {
        beforeForced ??= currentThemeRef.current
        setTheme(HIGH_CONTRAST_THEME, true)
      } else {
        setTheme(beforeForced ?? resolved, true)
        beforeForced = undefined
      }
    }
    sync()
    return mql && addMqlListener(mql, sync)
  }, [resolved, auto, query, setTheme])

  return null
}

// ── CSS Custom Properties wrapper ───────────────────────────────────────────

function ThemeCSSWrapper({
  children,
  themeName
}: {
  children: React.ReactNode
  themeName?: string
}) {
  const theme = useThemeSelector((state: ThemeStoreState) => state.theme)

  const autoId = React.useId()
  const autoInput = React.useContext(ThemeScopeContext)
  const style: React.CSSProperties & Record<string, string> = {
    position: "relative",
    colorScheme: theme.mode === "auto" ? "light dark" : theme.mode,
    ...(autoInput ? {} : themeToCSSVariables(theme))
  }

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
  const parent = useTheme()
  const parentScope = React.useContext(ThemeScopeContext)
  const input = useStableThemeValue(theme)
  const auto = useStableThemeValue(
    typeof input === "object" && input.mode === "auto"
      ? input
      : parentScope && typeof input !== "string" && !input?.mode
        ? mergeThemeOverrides(parentScope, input ?? {})
        : undefined
  )
  const inherited = parentScope === undefined ? undefined : parent
  const initial = React.useMemo(
    () => resolveInitialTheme(input, inherited),
    [input, inherited]
  )
  const resolved = useStableThemeValue(initial.theme)
  return (
    <StoreProvider initialState={{ theme: resolved, equals: themeValuesEqual }}>
      <ThemeScopeContext.Provider value={auto ?? null}>
        <ThemeInitializer
          resolved={resolved}
          auto={auto}
          query={
            auto
              ? "(prefers-color-scheme: dark)"
              : input === undefined && parentScope === undefined
                ? "(forced-colors: active)"
                : undefined
          }
        />
        <ThemeCSSWrapper themeName={initial.name}>{children}</ThemeCSSWrapper>
      </ThemeScopeContext.Provider>
    </StoreProvider>
  )
}

// ── Exports ─────────────────────────────────────────────────────────────────

export { ThemeProviderWrapper as ThemeProvider, useTheme }
export { LIGHT_THEME, DARK_THEME, HIGH_CONTRAST_THEME }
export type { SemioticTheme }
