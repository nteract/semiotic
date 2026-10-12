function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code < 32 || code === 127) return true
  }
  return false
}

function tokensOutsideStrings(value: string, fail: () => never): string {
  // HTML raw-text endings remain unsafe inside CSS strings too.
  if (
    typeof value !== "string" ||
    hasControlCharacter(value) ||
    value.includes("<")
  )
    fail()
  let quote = ""
  let tokens = ""
  for (let i = 0; i < value.length; i++) {
    const character = value[i]
    if (quote) {
      if (character === "\\") {
        if (++i === value.length) fail()
      } else if (character === quote) quote = ""
    } else if (character === '"' || character === "'") {
      quote = character
      tokens += " "
    } else tokens += character
  }
  if (quote) fail()
  return tokens
}

/** Reject declaration breakouts, HTML raw-text endings and resource loading. */
export function assertSafeThemeCSS(value: string, field: string): void {
  const tokens = tokensOutsideStrings(value, () => {
    throw new TypeError(`Unsafe theme CSS in ${field}`)
  })
  if (/[>{};\\]|\/\*|\*\/|(?:url|expression)\s*\(/i.test(tokens)) {
    throw new TypeError(`Unsafe theme CSS in ${field}`)
  }
}

/** Selectors may contain the child combinator, but cannot end a style block. */
export function assertSafeThemeSelector(selector: string): void {
  const tokens = tokensOutsideStrings(selector, () => {
    throw new TypeError("Unsafe theme CSS selector")
  })
  if (!selector.trim() || /[{};\\]|\/\*|\*\//.test(tokens)) {
    throw new TypeError("Unsafe theme CSS selector")
  }
}
