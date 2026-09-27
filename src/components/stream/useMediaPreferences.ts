"use client"
import { useState, useEffect } from "react"

import { addMqlListener } from "./mediaQuery"
export { addMqlListener } from "./mediaQuery"

/** SSR-safe matchMedia check */
function queryMatches(query: string): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false
  return window.matchMedia(query).matches
}

/**
 * SSR-safe hook that returns true when the user prefers reduced motion.
 * Initializes from matchMedia synchronously to avoid a flash of animation.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => queryMatches("(prefers-reduced-motion: reduce)"))

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mql.matches)

    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    return addMqlListener(mql, handler)
  }, [])

  return reduced
}

/**
 * SSR-safe hook that returns true when forced-colors or high-contrast mode is active.
 */
export function useHighContrast(): boolean {
  const [highContrast, setHighContrast] = useState(() =>
    queryMatches("(forced-colors: active)")
  )

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return

    const mql = window.matchMedia("(forced-colors: active)")
    setHighContrast(mql.matches)

    const handler = (e: MediaQueryListEvent) => setHighContrast(e.matches)
    return addMqlListener(mql, handler)
  }, [])

  return highContrast
}
