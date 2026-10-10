/** Shared SVG markup handling; not a complete XML validator or sanitizer. */
export interface SvgRoot {
  start: number
  end: number
  name: string
  attributes: string
  selfClosing: boolean
}

const ATTRIBUTE = /\s+([^\s=<>/'"]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g

export function findSvgRoot(svg: string): SvgRoot | undefined {
  let start = 0
  while (start < svg.length) {
    const whitespace = /^\s+/.exec(svg.slice(start))
    if (whitespace) start += whitespace[0].length
    const terminator = svg.startsWith("<!--", start)
      ? "-->"
      : svg.startsWith("<?", start)
        ? "?>"
        : undefined
    if (terminator) {
      const end = svg.indexOf(terminator, start + 2)
      if (end < 0) return undefined
      start = end + terminator.length
      continue
    }
    if (/^<!DOCTYPE\s/i.test(svg.slice(start))) {
      let quote = ""
      let depth = 0
      let end = start + 9
      for (; end < svg.length; end += 1) {
        const character = svg[end]
        if (quote) {
          if (character === quote) quote = ""
        } else if (svg.startsWith("<!--", end)) {
          const commentEnd = svg.indexOf("-->", end + 4)
          if (commentEnd < 0) return undefined
          end = commentEnd + 2
        } else if (character === '"' || character === "'") quote = character
        else if (character === "[") depth += 1
        else if (character === "]") depth -= 1
        else if (character === ">" && depth === 0) break
      }
      if (end === svg.length) return undefined
      start = end + 1
      continue
    }
    break
  }
  const match =
    /^<((?:[A-Za-z_][\w.-]*:)?svg)(?=[\s/>])((?:[^<>"']|"[^"]*"|'[^']*')*)>/i.exec(
      svg.slice(start)
    )
  if (!match) return undefined
  const selfClosing = match[2].endsWith("/")
  const attributes = selfClosing ? match[2].slice(0, -1) : match[2]
  // Do not mistake attribute-like text inside quoted values for attributes.
  if (attributes.replace(ATTRIBUTE, "").trim()) return undefined
  return {
    start,
    end: start + match[0].length,
    name: match[1],
    attributes,
    selfClosing
  }
}

export function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\t/g, "&#9;")
    .replace(/\n/g, "&#10;")
    .replace(/\r/g, "&#13;")
}

export function decodeXmlText(value: string): string {
  return value.replace(
    /&(amp|quot|apos|lt|gt|#\d+|#x[\da-fA-F]+);/g,
    (entity, key: string) => {
      if (!key.startsWith("#")) {
        return { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" }[key]!
      }
      const code = key.startsWith("#x")
        ? parseInt(key.slice(2), 16)
        : Number(key.slice(1))
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity
    }
  )
}

function decodeXmlAttribute(value: string): string {
  return decodeXmlText(value.replace(/\r\n|[\t\r\n]/g, " "))
}

export function svgRootAttribute(
  root: SvgRoot,
  name: string
): string | undefined {
  for (const match of root.attributes.matchAll(ATTRIBUTE)) {
    if (match[1] === name) return decodeXmlAttribute(match[2] ?? match[3])
  }
  return undefined
}

/** Transform real element attributes, preserving comments, CDATA and preambles. */
export function mapSvgAttributes(
  svg: string,
  transform: (name: string, value: string) => string | undefined
): string {
  const start = findSvgRoot(svg)?.start ?? 0
  const elements =
    /<!--[\s\S]*?(?:-->|$)|<!\[CDATA\[[\s\S]*?(?:\]\]>|$)|<\?[\s\S]*?(?:\?>|$)|<([A-Za-z_][\w.:-]*)(?=[\s/>])(?:[^<>"']|"[^"]*"|'[^']*')*>/g
  return (
    svg.slice(0, start) +
    svg.slice(start).replace(elements, (tag, name: string | undefined) => {
      if (!name) return tag
      return tag.replace(
        ATTRIBUTE,
        (
          attribute: string,
          key: string,
          double: string | undefined,
          single: string
        ) => {
          const value = transform(key, decodeXmlAttribute(double ?? single))
          return value === undefined
            ? attribute
            : ` ${key}="${escapeXmlAttribute(value)}"`
        }
      )
    })
  )
}

/** Transform real style elements without interpreting markup inside comments or attributes. */
export function mapSvgStyleText(
  svg: string,
  transform: (css: string) => string
): string {
  const elements =
    /<!--[\s\S]*?(?:-->|$)|<!\[CDATA\[[\s\S]*?(?:\]\]>|$)|<\?[\s\S]*?(?:\?>|$)|<([A-Za-z_][\w.:-]*)(?=[\s/>])(?:[^<>"']|"[^"]*"|'[^']*')*>/g
  let output = ""
  let start = 0
  let match: RegExpExecArray | null
  elements.lastIndex = findSvgRoot(svg)?.start ?? 0
  while ((match = elements.exec(svg))) {
    const name = match[1]
    if (
      !name ||
      !/^(?:[\w.-]+:)?style$/i.test(name) ||
      /\/\s*>$/.test(match[0])
    )
      continue
    const bodyStart = elements.lastIndex
    const close = new RegExp(`</${name.replace(/\./g, "\\.")}\\s*>`, "ig")
    close.lastIndex = bodyStart
    const ending = close.exec(svg)
    if (!ending) continue
    const body = svg.slice(bodyStart, ending.index)
    const cdata = /^(\s*<!\[CDATA\[)([\s\S]*)(\]\]>\s*)$/.exec(body)
    const css = cdata ? cdata[2] : decodeXmlText(body)
    const rewritten = transform(css)
    output +=
      svg.slice(start, bodyStart) +
      (rewritten === css
        ? body
        : cdata
          ? `${cdata[1]}${rewritten}${cdata[3]}`
          : rewritten
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/\]\]>/g, "]]&gt;"))
    start = ending.index
    elements.lastIndex = close.lastIndex
  }
  return output + svg.slice(start)
}

/** Insert a child inside the actual root, expanding an empty element if needed. */
export function insertSvgRootContent(svg: string, content: string): string {
  const root = findSvgRoot(svg)
  if (!root) throw new TypeError("SVG host must contain an svg root element.")
  if (root.selfClosing) {
    return `${svg.slice(0, root.start)}<${root.name}${root.attributes}>${content}</${root.name}>${svg.slice(root.end)}`
  }
  return `${svg.slice(0, root.end)}${content}${svg.slice(root.end)}`
}

/** Rewrite exact attributes, preserving other attributes and their quoting. */
export function setSvgRootAttributes(
  svg: string,
  updates: Record<string, string>
): string {
  const root = findSvgRoot(svg)
  if (!root) return svg
  const remaining = new Map(Object.entries(updates))
  let attributes = root.attributes.replace(ATTRIBUTE, (match, name: string) => {
    const value = remaining.get(name)
    if (value === undefined) return match
    remaining.delete(name)
    return ` ${name}="${escapeXmlAttribute(value)}"`
  })
  for (const [name, value] of remaining) {
    attributes += ` ${name}="${escapeXmlAttribute(value)}"`
  }
  return `${svg.slice(0, root.start)}<${root.name}${attributes}${root.selfClosing ? "/" : ""}>${svg.slice(root.end)}`
}
