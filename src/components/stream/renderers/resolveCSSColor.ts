/**
 * Resolve a CSS custom property value to a concrete color string.
 *
 * If the input is a `var(--name)` or `var(--name, fallback)` string,
 * reads the computed value from the canvas element. Otherwise returns
 * the input unchanged. Caches resolved values per canvas instance.
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

  // Check cache
  let canvasCache = cache.get(canvas)
  if (!canvasCache) {
    canvasCache = new Map()
    cache.set(canvas, canvasCache)
  }
  const cached = canvasCache.get(value)
  if (cached) return cached

  // Resolve
  const computed = getComputedStyle(canvas).getPropertyValue(match[1]).trim()
  const resolved = computed || match[2]?.trim() || value
  canvasCache.set(value, resolved)
  return resolved
}

/**
 * Invalidate the cache for a canvas — call when theme changes.
 */
export function clearCSSColorCache(canvas: HTMLCanvasElement): void {
  cache.delete(canvas)
}
