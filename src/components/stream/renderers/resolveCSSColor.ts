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
  return name.startsWith("--")
    ? { name, fallback: fallback || undefined }
    : null
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
let installedFontSet: FontFaceSet | null = null
let installedFontLoadHandler: ((event: Event) => void) | null = null
type CSSColorInvalidationSubscriber = {
  getElement: () => Element | null
  listener: () => void
}
const invalidationSubscribers = new Set<CSSColorInvalidationSubscriber>()
type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void
}

function teardownGlobalObserver(): void {
  installedObserver?.disconnect()
  installedObserver = null

  if (installedMql && installedMqlHandler) {
    if (typeof installedMql.removeEventListener === "function") {
      installedMql.removeEventListener("change", installedMqlHandler)
    } else if (
      typeof (installedMql as LegacyMediaQueryList).removeListener ===
      "function"
    ) {
      ;(installedMql as LegacyMediaQueryList).removeListener(
        installedMqlHandler
      )
    }
  }
  installedMql = null
  installedMqlHandler = null

  if (installedFontSet && installedFontLoadHandler) {
    installedFontSet.removeEventListener("loadingdone", installedFontLoadHandler)
  }
  installedFontSet = null
  installedFontLoadHandler = null
  observerInstalled = false
}

function ensureGlobalObserver(): void {
  if (observerInstalled) return
  // Don't latch the flag in non-DOM environments (SSR/pre-render) — the next
  // call from a real browser context should still get a chance to install.
  if (typeof window === "undefined" || typeof document === "undefined") return
  observerInstalled = true

  const customPropertySignature = (cssText: string | null): string => {
    if (!cssText?.includes("--")) return ""
    const scratch = document.createElement("span").style
    scratch.cssText = cssText
    const properties = Array.from(scratch)
      .filter((name) => name.startsWith("--"))
      .sort()
    return properties
      .map(
        (name) =>
          `${name}:${scratch.getPropertyValue(name)}!${scratch.getPropertyPriority(name)}`
      )
      .join(";")
  }

  const recordAffects = (record: MutationRecord, element: Element): boolean => {
    const target = record.target
    if (!(target instanceof Element)) return false

    // The subscribed frame root or one of its ancestors can change inherited
    // variables directly.
    if (target === element || target.contains(element)) return true
    if (!element.contains(target)) return false

    // A descendant matters only when it is (or wraps) a canvas whose computed
    // variables the frame paints. This keeps tooltip/class/position churn out
    // of the render loop while preserving scoped wrappers inside the frame.
    const isCanvas = target.tagName === "CANVAS"
    if (!isCanvas && !target.querySelector("canvas")) return false

    // Imperative cursor updates mutate the retained canvas's inline style.
    // They do not change color variables, so compare only custom-property
    // declarations for a style mutation on the canvas itself.
    if (isCanvas && record.attributeName === "style") {
      return (
        customPropertySignature(record.oldValue) !==
        customPropertySignature(target.getAttribute("style"))
      )
    }
    return true
  }

  const invalidateAndNotify = (records?: readonly MutationRecord[]) => {
    const affectedSubscribers: CSSColorInvalidationSubscriber[] = []
    for (const subscriber of invalidationSubscribers) {
      const element = subscriber.getElement()
      if (!element) continue
      const affected =
        !records || records.some((record) => recordAffects(record, element))
      if (affected) affectedSubscribers.push(subscriber)
    }

    // Attribute mutations are observed on the whole document, but unrelated
    // branches and descendant presentation churn cannot affect a subscribed
    // canvas's computed custom properties.
    if (records && affectedSubscribers.length === 0) return

    currentVersion++
    for (const subscriber of affectedSubscribers) subscriber.listener()
  }

  if (typeof MutationObserver !== "undefined" && document.documentElement) {
    installedObserver = new MutationObserver((records) => {
      invalidateAndNotify(records)
    })
    // Observe the whole document tree so intermediate-wrapper scoped CSS vars
    // (`<div style={{ "--semiotic-danger": "#4b0082" }}>` around a chart)
    // invalidate the canvas color cache the same way ThemeProvider / dark-mode
    // class toggles on <html> do. Attribute-only + subtree keeps this cheap —
    // we only re-resolve vars on the next paint, not re-layout.
    installedObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        "class",
        "style",
        "data-theme",
        "data-semiotic-theme",
        "data-semiotic-theme-mode"
      ],
      attributeOldValue: true,
      subtree: true
    })
  }

  if (typeof window.matchMedia === "function") {
    try {
      installedMql = window.matchMedia("(prefers-color-scheme: dark)")
      installedMqlHandler = () => invalidateAndNotify()
      if (typeof installedMql.addEventListener === "function") {
        installedMql.addEventListener("change", installedMqlHandler)
      } else if (
        typeof (installedMql as LegacyMediaQueryList).addListener === "function"
      ) {
        // Safari 14 fallback
        ;(installedMql as LegacyMediaQueryList).addListener(installedMqlHandler)
      }
    } catch {
      // matchMedia can throw in older browsers / jsdom — safe to ignore
    }
  }

  // Canvas text does not participate in the browser's font cascade after it
  // has been painted. A web font named by --semiotic-font-family may finish
  // loading after the first frame, so repaint settled canvases when the font
  // set completes a load cycle. SVG/HTML update themselves automatically.
  if (document.fonts && typeof document.fonts.addEventListener === "function") {
    installedFontSet = document.fonts
    installedFontLoadHandler = () => invalidateAndNotify()
    installedFontSet.addEventListener("loadingdone", installedFontLoadHandler)
  }
}

/**
 * Repaint subscription for settled canvases whose CSS cascade or loaded fonts
 * change without a ThemeStore update. CSS mutation notifications are scoped
 * to the subscribed element's DOM branch; font completion is document-wide.
 * requestAnimationFrame coalescing remains owned by the frame.
 */
export function subscribeToCSSColorInvalidation(
  getElement: () => Element | null,
  listener: () => void
): () => void {
  ensureGlobalObserver()
  const subscriber = { getElement, listener }
  invalidationSubscribers.add(subscriber)
  return () => {
    if (
      invalidationSubscribers.delete(subscriber) &&
      invalidationSubscribers.size === 0
    ) {
      teardownGlobalObserver()
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
  invalidationSubscribers.clear()
  teardownGlobalObserver()
}
