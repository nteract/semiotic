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
import type { SemioticTheme, SemioticThemeUpdate } from "./store/themeCore"
import type { ThemeStoreState } from "./store/ThemeStore"
import { useTheme } from "./store/useTheme"
import { resolveThemePreset } from "./store/themePresets"
import type { ThemePresetName } from "./store/themePresets"
import { themeToCSSVariables } from "./store/themeCSSVariables"
import { addMqlListener, getMediaQuery } from "./stream/mediaQuery"
import { equalConfig } from "./stream/shallowEqual"
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
    theme:
      theme?.mode === "auto"
        ? resolveAutoPalette(theme, "light")
        : theme !== undefined
          ? resolveThemeUpdate(parent ?? LIGHT_THEME, theme)
          : cloneTheme(
              parent ??
                (getMediaQuery("(forced-colors: active)")?.matches
                  ? HIGH_CONTRAST_THEME
                  : LIGHT_THEME)
            )
  }
}

// Theme records can nest through aesthetics; palette arrays contain primitives.
function themeValuesEqual(a: unknown, b: unknown): boolean {
  return equalConfig(a, b, Infinity)
}

function useStableThemeValue<T>(value: T): T {
  const stable = React.useRef(value)
  if (!themeValuesEqual(stable.current, value)) stable.current = value
  return stable.current
}

// Synchronize the scoped store and publish its CSS from one subscriber.

function ThemeCSSWrapper({
  children,
  themeName,
  resolved,
  query
}: {
  children: React.ReactNode
  themeName?: string
  resolved: SemioticTheme
  query?: string
}) {
  const { theme, setTheme } = useThemeSelector(
    (state: ThemeStoreState) => state
  )
  const autoId = React.useId()
  const auto = React.useContext(ThemeScopeContext)
  const [hydrated, setHydrated] = React.useState(false)
  // Keep a ref to the latest theme so the forced-colors handler can read it
  // without re-registering the listener on every theme change.
  const currentThemeRef = React.useRef(theme)
  currentThemeRef.current = theme

  useIsomorphicLayoutEffect(() => {
    setHydrated(true)
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

  // Media rules own unhydrated auto themes. After the first client commit,
  // publish the live store values, including inherited imperative overrides.
  const style: React.CSSProperties & Record<string, string> = {
    position: "relative",
    colorScheme: theme.mode === "auto" ? "light dark" : theme.mode,
    ...(auto && !hydrated ? {} : themeToCSSVariables(theme))
  }

  return (
    <TooltipChromeScope chrome={theme.tooltip?.chrome}>
      <div
        style={style}
        data-semiotic-theme={themeName}
        data-semiotic-theme-mode={theme.mode}
        data-semiotic-auto={auto ? autoId : undefined}
      >
        {auto && (
          <style>
            {autoPaletteCSS(auto, `[data-semiotic-auto="${autoId}"]`)}
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
  const ownAuto = typeof input === "object" && input.mode === "auto"
  const inherits = typeof input !== "string" && !input?.mode
  const auto = useStableThemeValue(
    ownAuto
      ? input
      : parentScope && inherits
        ? mergeThemeOverrides(parentScope, input ?? {})
        : undefined
  )
  const inherited = inherits && parentScope !== undefined ? parent : undefined
  const initial = React.useMemo(
    () => resolveInitialTheme(input, inherited),
    [input, inherited]
  )
  const resolved = initial.theme
  return (
    <StoreProvider initialState={{ theme: resolved, equals: themeValuesEqual }}>
      <ThemeScopeContext.Provider value={auto ?? null}>
        <ThemeCSSWrapper
          themeName={initial.name}
          resolved={resolved}
          query={
            ownAuto
              ? "(prefers-color-scheme: dark)"
              : input === undefined && parentScope === undefined
                ? "(forced-colors: active)"
                : undefined
          }
        >
          {children}
        </ThemeCSSWrapper>
      </ThemeScopeContext.Provider>
    </StoreProvider>
  )
}

// ── Exports ─────────────────────────────────────────────────────────────────

export { ThemeProviderWrapper as ThemeProvider, useTheme }
export { LIGHT_THEME, DARK_THEME, HIGH_CONTRAST_THEME }
export type { SemioticTheme }
