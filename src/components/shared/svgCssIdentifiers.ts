const CSS_ESCAPE = /\\(?:([\da-fA-F]{1,6})(?:\r\n|[\t\n\f\r ])?|([^\n\r\f]))/g
const CSS_TOKEN =
  /\/\*[\s\S]*?(?:\*\/|$)|(?<![\w-])url\(\s*(?:"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|(?:\\[\s\S]|[^()"'\\])*)\s*\)|"(?:\\[\s\S]|[^"\\])*(?:"|$)|'(?:\\[\s\S]|[^'\\])*(?:'|$)|#((?:[\w\u0080-\uffff-]|\\(?:[\da-fA-F]{1,6}[\t\n\f\r ]?|[^\n\r\f]))+)|\\[\s\S]|[()[\]{};]/gi

function decodeCss(value: string): string {
  return value.replace(
    CSS_ESCAPE,
    (_escape, hex: string | undefined, literal: string) => {
      if (!hex) return literal
      const code = parseInt(hex, 16)
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code)
        : "\ufffd"
    }
  )
}

function escapeCssIdentifier(value: string): string {
  return value.replace(/(^\d)|[^\w\u0080-\uffff-]/g, (character, digit) => {
    const code = character.charCodeAt(0)
    if (code < 32 || code === 127 || digit) return `\\${code.toString(16)} `
    return `\\${character}`
  })
}

/** Rewrite actual CSS tokens, leaving comments, strings and color hashes intact. */
export function rewriteSvgCssTokens(
  css: string,
  ids: ReadonlyMap<string, string>,
  selectors = false
): string {
  return css.replace(CSS_TOKEN, (token, hash: string | undefined) => {
    if (hash !== undefined) {
      const target = selectors && ids.get(decodeCss(hash))
      return target ? `#${escapeCssIdentifier(target)}` : token
    }
    if (!/^url\(/i.test(token)) return token
    const body = token.slice(4, -1).trim()
    const quote = /^["']/.test(body) ? body[0] : ""
    const fragment = decodeCss(quote ? body.slice(1, -1) : body)
    const target = fragment.startsWith("#") && ids.get(fragment.slice(1))
    return target
      ? `url(${quote}#${escapeCssIdentifier(target)}${quote})`
      : token
  })
}

/** Scope selector preludes and local URLs in stylesheet blocks, including nested rules. */
export function rewriteSvgStylesheetIds(
  css: string,
  ids: ReadonlyMap<string, string>
): string {
  let start = 0
  let depth = 0
  let output = ""
  for (const match of css.matchAll(CSS_TOKEN)) {
    const token = match[0]
    if (token === "(" || token === "[") depth++
    else if (token === ")" || token === "]") depth--
    else if (depth === 0 && /[{};]/.test(token) && token.length === 1) {
      const text = css.slice(start, match.index)
      // At-rule parameters can contain colors; only qualified-rule preludes
      // and @scope's selector prelude contain ID selectors here.
      const atRule = /^(?:\s|\/\*[\s\S]*?\*\/)*@([\w-]+)/.exec(text)
      const selectors =
        token === "{" && (!atRule || atRule[1].toLowerCase() === "scope")
      output += rewriteSvgCssTokens(text, ids, selectors) + token
      start = match.index + 1
    }
  }
  return output + rewriteSvgCssTokens(css.slice(start), ids)
}
