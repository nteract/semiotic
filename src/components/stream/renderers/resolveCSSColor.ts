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

import { subscribeToCanvasFontInvalidation } from "../fontLoading"

interface CacheEntry {
  version: number
  map: Map<string, string>
}

const cache = new WeakMap<HTMLCanvasElement, CacheEntry>()
let currentVersion = 0
// One owner for the document listeners, released by the final subscribing frame.
let cleanupGlobalObserver: (() => void) | undefined
type CSSColorInvalidationSubscriber = {
  getElement: () => Element | null
  listener: () => void
}
const invalidationSubscribers = new Set<CSSColorInvalidationSubscriber>()
function ensureGlobalObserver(): void {
  if (cleanupGlobalObserver) return
  // Don't latch the flag in non-DOM environments (SSR/pre-render) — the next
  // call from a real browser context should still get a chance to install.
  if (typeof window === "undefined" || typeof document === "undefined") return

  const customPropertySignature = (cssText: string | null): string => {
    if (!cssText?.includes("--")) return ""
    const scratch = document.createElement("span").style
    scratch.cssText = cssText
    const declarations: string[] = []
    for (const name of scratch) {
      if (name.startsWith("--")) {
        declarations.push(`${name}:${scratch.getPropertyValue(name)}!${scratch.getPropertyPriority(name)}`)
      }
    }
    return declarations.sort().join(";")
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

  let observer: MutationObserver | undefined
  if (typeof MutationObserver !== "undefined" && document.documentElement) {
    observer = new MutationObserver((records) => {
      invalidateAndNotify(records)
    })
    // Observe the whole document tree so intermediate-wrapper scoped CSS vars
    // (`<div style={{ "--semiotic-danger": "#4b0082" }}>` around a chart)
    // invalidate the canvas color cache the same way ThemeProvider / dark-mode
    // class toggles on <html> do. Attribute-only + subtree keeps this cheap —
    // we only re-resolve vars on the next paint, not re-layout.
    observer.observe(document.documentElement, {
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

  const notify = () => invalidateAndNotify()
  let cleanupMedia: (() => void) | undefined
  if (typeof window.matchMedia === "function") {
    try {
      const query = window.matchMedia("(prefers-color-scheme: dark)")
      if (query.addEventListener) {
        query.addEventListener("change", notify)
        cleanupMedia = () => query.removeEventListener("change", notify)
      } else {
        // Safari 14 fallback
        query.addListener?.(notify)
        cleanupMedia = () => query.removeListener?.(notify)
      }
    } catch {
      // matchMedia can throw in older browsers / jsdom — safe to ignore
    }
  }

  // Canvas text does not participate in the browser's font cascade after it
  // has been painted. A web font named by --semiotic-font-family may finish
  // loading after the first frame, so repaint settled canvases when the font
  // set completes a load cycle. SVG/HTML update themselves automatically.
  const cleanupFonts = subscribeToCanvasFontInvalidation(notify)
  cleanupGlobalObserver = () => {
    observer?.disconnect()
    cleanupMedia?.()
    cleanupFonts()
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
  // A retained canvas may have changed while it had no subscriber. Those
  // mutations are intentionally ignored, even while other frames are active.
  currentVersion++
  const subscriber = { getElement, listener }
  invalidationSubscribers.add(subscriber)
  return () => {
    if (
      invalidationSubscribers.delete(subscriber) &&
      invalidationSubscribers.size === 0
    ) {
      cleanupGlobalObserver?.()
      cleanupGlobalObserver = undefined
    }
  }
}

export function resolveCSSColor(
  ctx: CanvasRenderingContext2D,
  value: string | undefined
): string | undefined {
  if (!value) return value
  const variable = value.trim()
  if (!variable.startsWith("var(") || !variable.endsWith(")")) return value

  const canvas = ctx.canvas
  let entry = canvas ? cache.get(canvas) : undefined
  if (entry?.version === currentVersion) {
    const cached = entry.map.get(value)
    if (cached !== undefined) return cached
  }

  // Parse only cache misses, without a temporary descriptor for each paint.
  // Split at the first comma so nested fallback var() expressions stay intact.
  const inner = variable.slice(4, -1)
  const comma = inner.indexOf(",")
  const name = (comma < 0 ? inner : inner.slice(0, comma)).trim()
  if (!name.startsWith("--")) return value
  const fallback = comma < 0 ? "" : inner.slice(comma + 1).trim()
  if (canvas && entry?.version !== currentVersion) {
    entry = { version: currentVersion, map: new Map() }
    cache.set(canvas, entry)
  }
  const computed = canvas && getComputedStyle(canvas).getPropertyValue(name).trim()
  const resolved = computed || (fallback && resolveCSSColor(ctx, fallback)) || value
  entry?.map.set(value, resolved)
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
