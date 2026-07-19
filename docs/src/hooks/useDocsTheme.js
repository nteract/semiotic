import { useEffect, useState, useCallback } from "react"

// localStorage key + custom event channel used by the docs app and the
// blog header to stay in sync. Without the event, toggling theme in the
// blog (which renders a separate React subtree from the docs decoration)
// would write localStorage but not nudge the docs's `theme` state, so
// navigating blog → docs without a refresh would render the docs in
// the pre-toggle theme.
const STORAGE_KEY = "semiotic-theme"
const EVENT = "semiotic-theme-change"

function readInitial() {
  if (typeof window === "undefined") return "dark"
  return localStorage.getItem(STORAGE_KEY) || "dark"
}

/**
 * Shared theme state for the docs app and the blog layout.
 *
 * - Reads/writes `localStorage["semiotic-theme"]`.
 * - Mirrors the value onto `<html data-theme="…">` so theme-aware CSS
 *   (and any consumer watching the attribute) updates.
 * - Broadcasts a custom event so other useDocsTheme instances (the
 *   docs and blog can each call this hook) stay in lockstep without
 *   a parent React context.
 *
 * Returns `[theme, toggle, setTheme]`.
 */
export function useDocsTheme() {
  const [theme, setThemeState] = useState(readInitial)

  useEffect(() => {
    if (typeof document === "undefined") return
    document.documentElement.setAttribute("data-theme", theme)
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, theme)
    }
  }, [theme])

  useEffect(() => {
    if (typeof window === "undefined") return
    const onChange = (e) => {
      const next = e.detail
      if (next === "dark" || next === "light") setThemeState(next)
    }
    window.addEventListener(EVENT, onChange)
    return () => window.removeEventListener(EVENT, onChange)
  }, [])

  const setTheme = useCallback((next) => {
    setThemeState(next)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT, { detail: next }))
    }
  }, [])

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark")
  }, [theme, setTheme])

  return [theme, toggle, setTheme]
}
