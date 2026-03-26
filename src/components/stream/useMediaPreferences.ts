"use client"
import { useState, useEffect } from "react"

/** Safari 14 fallback for MediaQueryList listener registration */
function addMqlListener(mql: MediaQueryList, handler: (e: MediaQueryListEvent) => void): () => void {
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }
  // Safari 14 and older: legacy API
  mql.addListener(handler as any)
  return () => mql.removeListener(handler as any)
}

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
  const [highContrast, setHighContrast] = useState(() => queryMatches("(forced-colors: active)"))

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return

    const mql = window.matchMedia("(forced-colors: active)")
    setHighContrast(mql.matches)

    const handler = (e: MediaQueryListEvent) => setHighContrast(e.matches)
    return addMqlListener(mql, handler)
  }, [])

  return highContrast
}
