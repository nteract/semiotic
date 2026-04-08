/**
 * Resolve a CSS custom property value to a concrete color string.
 *
 * If the input is a `var(--name)` or `var(--name, fallback)` string,
 * reads the computed value from the canvas element. Otherwise returns
 * the input unchanged.
 *
 * No caching — getComputedStyle is called each time so theme toggles
 * are reflected immediately without manual cache invalidation.
 */

const varPattern = /^var\(\s*(--[^,)]+)(?:\s*,\s*([^)]+))?\s*\)$/

export function resolveCSSColor(
  ctx: CanvasRenderingContext2D,
  value: string | undefined
): string | undefined {
  if (!value) return value
  const match = varPattern.exec(value)
  if (!match) return value

  const canvas = ctx.canvas
  if (!canvas) return match[2]?.trim() || value

  const computed = getComputedStyle(canvas).getPropertyValue(match[1]).trim()
  return computed || match[2]?.trim() || value
}

/**
 * No-op retained for API compatibility — cache was removed.
 */
export function clearCSSColorCache(_canvas: HTMLCanvasElement): void {
  // No cache to clear — getComputedStyle is called fresh each time
}
