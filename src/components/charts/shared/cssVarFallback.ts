/** True when a paint value references a CSS custom property. */
export function isCssVarPaint(value: unknown): value is string {
  return typeof value === "string" && value.includes("var(")
}

const VAR_REFERENCE = /^\s*var\(\s*--[^,)\s]+\s*(?:,\s*([\s\S]*))?\)\s*$/

/**
 * The literal fallback of a `var(--name, fallback)` paint, following nested
 * `var()` fallbacks. Returns `undefined` when there is no literal to use, and
 * the value itself when it is not a `var()` reference. For renderers that
 * can't evaluate CSS (standalone SVG importers, rasterizers).
 */
export function cssVarFallback(value: string): string | undefined {
  const match = VAR_REFERENCE.exec(value)
  if (!match) return isCssVarPaint(value) ? undefined : value
  const fallback = match[1]?.trim()
  return fallback ? cssVarFallback(fallback) : undefined
}
