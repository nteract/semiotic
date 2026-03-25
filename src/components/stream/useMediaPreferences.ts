"use client"
import { useState, useEffect } from "react"

/**
 * SSR-safe hook that returns true when the user prefers reduced motion.
 * Listens for changes to the `prefers-reduced-motion` media query.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mql.matches)

    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [])

  return reduced
}

/**
 * SSR-safe hook that returns true when forced-colors or high-contrast mode is active.
 */
export function useHighContrast(): boolean {
  const [highContrast, setHighContrast] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return

    const mql = window.matchMedia("(forced-colors: active)")
    setHighContrast(mql.matches)

    const handler = (e: MediaQueryListEvent) => setHighContrast(e.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [])

  return highContrast
}
