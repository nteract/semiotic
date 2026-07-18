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

/**
 * Split a `var(--name, fallback)` string into its property name and fallback.
 * Unlike a regex, this balances parentheses so a *nested* fallback var
 * (`var(--a, var(--b, #fff))`) keeps its inner `var(...)` intact instead of
 * being truncated at the first `)` — the mis-parse that made a canvas stroke
 * fall through to black while the SVG path resolved the fallback to `#fff`.
 */
function extractVar(value: string): { name: string; fallback?: string } | null {
  const s = value.trim()
  if (!s.startsWith("var(") || !s.endsWith(")")) return null
  const inner = s.slice(4, -1) // strip leading "var(" and the matching ")"
  const commaIdx = inner.indexOf(",")
  if (commaIdx === -1) {
    const name = inner.trim()
    return name.startsWith("--") ? { name } : null
  }
  const name = inner.slice(0, commaIdx).trim()
  const fallback = inner.slice(commaIdx + 1).trim()
  return name.startsWith("--") ? { name, fallback: fallback || undefined } : null
}

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
type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void
}

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
      } else if (typeof (installedMql as LegacyMediaQueryList).addListener === "function") {
        // Safari 14 fallback
        ;(installedMql as LegacyMediaQueryList).addListener(installedMqlHandler)
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
  const parsed = extractVar(value)
  if (!parsed) return value

  // A fallback may itself be a `var(...)` (or a nested chain) — resolve it
  // recursively so `var(--a, var(--b, #fff))` degrades to `#fff` on both the
  // canvas and SVG backends rather than handing the canvas an unparseable
  // string (which silently paints black).
  const resolveFallback = (): string | undefined =>
    parsed.fallback ? resolveCSSColor(ctx, parsed.fallback) : value

  const canvas = ctx.canvas
  if (!canvas) return resolveFallback()

  ensureGlobalObserver()

  let entry = cache.get(canvas)
  if (!entry || entry.version !== currentVersion) {
    entry = { version: currentVersion, map: new Map() }
    cache.set(canvas, entry)
  }
  const cached = entry.map.get(value)
  if (cached !== undefined) return cached

  const computed = getComputedStyle(canvas).getPropertyValue(parsed.name).trim()
  const resolved = computed || resolveFallback() || value
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
 * Monotonic version bumped by theme changes and `clearCSSColorCache`.
 * Frames can cache derived theme color objects keyed by this value so
 * paint loops avoid `getComputedStyle` on every rAF.
 */
export function getCSSColorCacheVersion(): number {
  return currentVersion
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
    } else if (typeof (installedMql as LegacyMediaQueryList).removeListener === "function") {
      ;(installedMql as LegacyMediaQueryList).removeListener(installedMqlHandler)
    }
    installedMql = null
    installedMqlHandler = null
  }
  observerInstalled = false
}
