/**
 * Resolve a CSS custom property value to a concrete color string.
 *
 * If the input is a `var(--name)` or `var(--name, fallback)` string,
 * reads the computed value from the canvas element. Otherwise returns
 * the input unchanged.
 *
 * Per-canvas cache avoids repeated `getComputedStyle` calls. Cached entries
 * are tagged with a global version counter that's bumped whenever a theme
 * change is detected — either through `clearCSSColorCache()` (called by
 * Stream Frames on `currentTheme` change) or via the global observer below
 * (catches external class toggles on `<html>` and `prefers-color-scheme`
 * media-query changes that bypass React).
 */

const varPattern = /^var\(\s*(--[^,)]+)(?:\s*,\s*([^)]+))?\s*\)$/

interface CacheEntry {
  version: number
  map: Map<string, string>
}

const cache = new WeakMap<HTMLCanvasElement, CacheEntry>()
let currentVersion = 0
let observerInstalled = false

// Track installed listeners so the test reset can detach them, preventing
// observer accumulation across test files.
let installedObserver: MutationObserver | null = null
let installedMql: MediaQueryList | null = null
let installedMqlHandler: ((e: MediaQueryListEvent) => void) | null = null

function ensureGlobalObserver(): void {
  if (observerInstalled) return
  // Don't latch the flag in non-DOM environments (SSR/pre-render) — the next
  // call from a real browser context should still get a chance to install.
  if (typeof window === "undefined" || typeof document === "undefined") return
  observerInstalled = true

  const bumpVersion = () => { currentVersion++ }

  if (typeof MutationObserver !== "undefined" && document.documentElement) {
    installedObserver = new MutationObserver(bumpVersion)
    installedObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme", "data-semiotic-theme"]
    })
  }

  if (typeof window.matchMedia === "function") {
    try {
      installedMql = window.matchMedia("(prefers-color-scheme: dark)")
      installedMqlHandler = bumpVersion
      if (typeof installedMql.addEventListener === "function") {
        installedMql.addEventListener("change", installedMqlHandler)
      } else if (typeof (installedMql as any).addListener === "function") {
        // Safari 14 fallback
        (installedMql as any).addListener(installedMqlHandler)
      }
    } catch {
      // matchMedia can throw in older browsers / jsdom — safe to ignore
    }
  }
}

export function resolveCSSColor(
  ctx: CanvasRenderingContext2D,
  value: string | undefined
): string | undefined {
  if (!value) return value
  const match = varPattern.exec(value)
  if (!match) return value

  const canvas = ctx.canvas
  if (!canvas) return match[2]?.trim() || value

  ensureGlobalObserver()

  let entry = cache.get(canvas)
  if (!entry || entry.version !== currentVersion) {
    entry = { version: currentVersion, map: new Map() }
    cache.set(canvas, entry)
  }
  const cached = entry.map.get(value)
  if (cached !== undefined) return cached

  const computed = getComputedStyle(canvas).getPropertyValue(match[1]).trim()
  const resolved = computed || match[2]?.trim() || value
  entry.map.set(value, resolved)
  return resolved
}

/**
 * Invalidate the CSS variable cache. Stream Frames call this from their
 * `currentTheme` `useEffect` so the next paint reads fresh computed values.
 *
 * The `canvas` argument is accepted for backward compatibility but ignored —
 * invalidation is global because theme changes are global.
 */
export function clearCSSColorCache(_canvas?: HTMLCanvasElement): void {
  currentVersion++
}

/**
 * Test-only: reset all cache state, including disconnecting any installed
 * observer/matchMedia listeners. Required for test isolation — without it,
 * observers accumulate across files and bump `currentVersion` more than once
 * per real DOM mutation.
 *
 * `currentVersion` is *incremented* (not reset to zero) so any WeakMap entries
 * that survive from a previous test can't accidentally be re-validated by a
 * version collision.
 */
export function _resetCSSColorCacheForTest(): void {
  currentVersion++
  if (installedObserver) {
    installedObserver.disconnect()
    installedObserver = null
  }
  if (installedMql && installedMqlHandler) {
    if (typeof installedMql.removeEventListener === "function") {
      installedMql.removeEventListener("change", installedMqlHandler)
    } else if (typeof (installedMql as any).removeListener === "function") {
      (installedMql as any).removeListener(installedMqlHandler)
    }
    installedMql = null
    installedMqlHandler = null
  }
  observerInstalled = false
}
