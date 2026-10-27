"use client"
import { useState, useEffect } from "react"

import { addMqlListener, getMediaQuery } from "./mediaQuery"
export { addMqlListener } from "./mediaQuery"

function useMediaPreference(query: string): boolean {
  const [matches, setMatches] = useState(
    () => getMediaQuery(query)?.matches ?? false
  )
  useEffect(() => {
    const mql = getMediaQuery(query)
    setMatches(mql?.matches ?? false)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    return addMqlListener(mql, handler)
  }, [query])
  return matches
}

/** SSR-safe reduced-motion preference, initialized before the first paint. */
export function useReducedMotion(): boolean {
  return useMediaPreference("(prefers-reduced-motion: reduce)")
}

/**
 * SSR-safe hook that returns true when forced-colors or high-contrast mode is active.
 */
export function useHighContrast(): boolean {
  return useMediaPreference("(forced-colors: active)")
}
