/**
 * Resolve a CSS custom property value to a concrete color string.
 *
 * If the input is a `var(--name)` or `var(--name, fallback)` string,
 * reads the computed value from the canvas element. Otherwise returns
 * the input unchanged.
 *
 * Per-canvas cache avoids repeated getComputedStyle calls within a single
 * paint cycle. The cache is cleared on theme changes via clearCSSColorCache(),
 * which each Stream Frame calls in its theme-change useEffect.
 */

const varPattern = /^var\(\s*(--[^,)]+)(?:\s*,\s*([^)]+))?\s*\)$/

const cache = new WeakMap<HTMLCanvasElement, Map<string, string>>()

export function resolveCSSColor(
  ctx: CanvasRenderingContext2D,
  value: string | undefined
): string | undefined {
  if (!value) return value
  const match = varPattern.exec(value)
  if (!match) return value

  const canvas = ctx.canvas
  if (!canvas) return match[2]?.trim() || value

  let canvasCache = cache.get(canvas)
  if (!canvasCache) {
    canvasCache = new Map()
    cache.set(canvas, canvasCache)
  }
  if (canvasCache.has(value)) return canvasCache.get(value)!

  const computed = getComputedStyle(canvas).getPropertyValue(match[1]).trim()
  const resolved = computed || match[2]?.trim() || value
  canvasCache.set(value, resolved)
  return resolved
}

/**
 * Clear the per-canvas CSS variable cache. Called by Stream Frames
 * when the theme changes so the next paint reads fresh computed values.
 */
export function clearCSSColorCache(canvas: HTMLCanvasElement): void {
  cache.delete(canvas)
}
