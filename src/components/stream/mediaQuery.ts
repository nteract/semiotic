/** Read a media query without requiring a browser or matchMedia polyfill. */
export function getMediaQuery(query: string): MediaQueryList | undefined {
  return typeof window === "undefined" ? undefined : window.matchMedia?.(query)
}

/** Subscribe with the legacy Safari fallback; tolerate unavailable media queries. */
export function addMqlListener(
  mql: MediaQueryList | undefined,
  handler: (event: MediaQueryListEvent) => void
): () => void {
  if (typeof mql?.addEventListener === "function") {
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }
  mql?.addListener?.(handler)
  return () => mql?.removeListener?.(handler)
}
