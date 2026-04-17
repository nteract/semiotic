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

function ensureGlobalObserver(): void {
  if (observerInstalled) return
  observerInstalled = true
  if (typeof window === "undefined" || typeof document === "undefined") return

  const bumpVersion = () => { currentVersion++ }

  if (typeof MutationObserver !== "undefined" && document.documentElement) {
    const observer = new MutationObserver(bumpVersion)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme", "data-semiotic-theme"]
    })
  }

  if (typeof window.matchMedia === "function") {
    try {
      const mql = window.matchMedia("(prefers-color-scheme: dark)")
      if (typeof mql.addEventListener === "function") {
        mql.addEventListener("change", bumpVersion)
      } else if (typeof (mql as any).addListener === "function") {
        // Safari 14 fallback
        (mql as any).addListener(bumpVersion)
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

/** Test-only: reset all cache state. */
export function _resetCSSColorCacheForTest(): void {
  currentVersion = 0
  observerInstalled = false
}
