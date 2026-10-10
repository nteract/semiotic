function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code < 32 || code === 127) return true
  }
  return false
}

/** Reject declaration breakouts, HTML raw-text endings and resource loading. */
export function assertSafeThemeCSS(value: string, field: string): void {
  if (
    typeof value !== "string" ||
    hasControlCharacter(value) ||
    /[<>{};\\]|\/\*|\*\/|(?:url|expression)\s*\(/i.test(value)
  ) {
    throw new TypeError(`Unsafe theme CSS in ${field}`)
  }
}

/** Selectors may contain the child combinator, but cannot end a style block. */
export function assertSafeThemeSelector(selector: string): void {
  if (
    typeof selector !== "string" ||
    !selector.trim() ||
    hasControlCharacter(selector) ||
    /[<{};\\]|\/\*|\*\//.test(selector)
  ) {
    throw new TypeError("Unsafe theme CSS selector")
  }
}
