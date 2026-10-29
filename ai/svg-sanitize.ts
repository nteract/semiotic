import { assertSafeThemeCSS } from "../src/components/store/safeThemeCSS"

const SVG_NAMESPACE = "http://www.w3.org/2000/svg"
const XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace"
const XLINK_NAMESPACE = "http://www.w3.org/1999/xlink"
const WIDGET_ROOT_ATTRIBUTE = "data-semiotic-widget-svg"
const WIDGET_ROOT = `svg[${WIDGET_ROOT_ATTRIBUTE}]`

// Names are case sensitive in XML. No scripting, animation, foreignObject,
// navigation or resource-loading filter primitives are part of this surface.
const ELEMENTS = new Set([
  "svg",
  "g",
  "path",
  "line",
  "polyline",
  "polygon",
  "rect",
  "circle",
  "ellipse",
  "text",
  "tspan",
  "textPath",
  "title",
  "desc",
  "defs",
  "style",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "mask",
  "pattern",
  "filter",
  "marker",
  "use",
  "symbol",
  "image",
  "feGaussianBlur",
  "feOffset",
  "feFlood",
  "feComposite",
  "feMerge",
  "feMergeNode",
  "feColorMatrix",
  "feBlend"
])

const ATTRIBUTES = new Set([
  "class",
  "id",
  "role",
  "tabindex",
  "cx",
  "cy",
  "d",
  "dx",
  "dy",
  "fx",
  "fy",
  "fr",
  "height",
  "width",
  "x",
  "y",
  "x1",
  "x2",
  "y1",
  "y2",
  "r",
  "rx",
  "ry",
  "points",
  "pathLength",
  "viewBox",
  "preserveAspectRatio",
  "gradientUnits",
  "gradientTransform",
  "spreadMethod",
  "offset",
  "clipPathUnits",
  "maskUnits",
  "maskContentUnits",
  "patternContentUnits",
  "patternTransform",
  "patternUnits",
  "markerHeight",
  "markerWidth",
  "markerUnits",
  "orient",
  "refX",
  "refY",
  "startOffset",
  "textLength",
  "lengthAdjust",
  "rotate",
  "filterUnits",
  "primitiveUnits",
  "in",
  "in2",
  "result",
  "stdDeviation",
  "mode",
  "type",
  "values",
  "operator",
  "k1",
  "k2",
  "k3",
  "k4"
])

// SVG presentation properties only: styles cannot position HTML over the
// widget controls or introduce backgrounds, cursors, fonts or other resources.
const PROPERTIES = new Set([
  "alignment-baseline",
  "baseline-shift",
  "clip-path",
  "clip-rule",
  "color",
  "color-interpolation",
  "color-interpolation-filters",
  "display",
  "dominant-baseline",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "flood-color",
  "flood-opacity",
  "font-family",
  "font-size",
  "font-style",
  "font-variant",
  "font-weight",
  "letter-spacing",
  "marker-end",
  "marker-mid",
  "marker-start",
  "mask",
  "opacity",
  "paint-order",
  "pointer-events",
  "shape-rendering",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "text-anchor",
  "text-decoration",
  "text-rendering",
  "transform",
  "transform-origin",
  "transition",
  "vector-effect",
  "visibility",
  "white-space",
  "word-spacing"
])
const REFERENCE_PROPERTIES = new Set([
  "fill",
  "stroke",
  "clip-path",
  "mask",
  "filter",
  "marker-start",
  "marker-mid",
  "marker-end"
])
const COLOR_TOKENS = new Set([
  "bg",
  "text",
  "text-secondary",
  "grid",
  "border",
  "cell-border",
  "primary",
  "secondary",
  "surface",
  "focus",
  "selection-color",
  "diverging",
  "annotation-color",
  "success",
  "danger",
  "warning",
  "error",
  "info",
  "tooltip-bg",
  "tooltip-text"
])

function themeProperty(name: string): string | null {
  if (!name.startsWith("--semiotic-")) return null
  const token = name.slice("--semiotic-".length)
  if (COLOR_TOKENS.has(token) || /^category-[1-9]\d*$/.test(token))
    return "color"
  if (/^(?:(?:legend|title|tick)-)?font-family$/.test(token))
    return "font-family"
  if (/^(?:tooltip|legend|title|tick|axis-label)-font-size$/.test(token))
    return "font-size"
  if (/^(?:legend|title)-font-weight$/.test(token)) return "font-weight"
  if (token === "selection-opacity") return "opacity"
  if (token === "tooltip-radius" || token === "border-radius")
    return "border-radius"
  if (token === "tooltip-shadow") return "box-shadow"
  return null
}

function isFragment(value: string): boolean {
  return /^#[\w:.-]+$/.test(value)
}

function safePresentationValue(name: string, value: string): boolean {
  // Only a complete local reference may bypass the CSS resource prohibition.
  // Escapes, fallback URLs and token concatenation cannot extend this grammar.
  if (
    REFERENCE_PROPERTIES.has(name) &&
    /^url\(\s*(["']?)(#[\w:.-]+)\1\s*\)$/i.test(value.trim())
  )
    return true
  // Masks accept CSS <image> values, including image-set("remote" 1x),
  // which can fetch resources without a url() token. Keep their grammar
  // closed on attributes as well as parsed declarations.
  if (name === "mask") {
    return /^(?:none|inherit|initial|unset|revert|revert-layer)$/i.test(
      value.trim()
    )
  }
  try {
    assertSafeThemeCSS(value, name)
    return true
  } catch {
    return false
  }
}

function sanitizeDeclarations(
  source: CSSStyleDeclaration,
  validator: CSSStyleDeclaration,
  customValues: ReadonlyMap<string, string> = new Map()
): string {
  const declarations: string[] = []
  for (const name of Array.from(source)) {
    const property = PROPERTIES.has(name) ? name : themeProperty(name)
    if (!property) continue
    const parsed = source.getPropertyValue(name).trim()
    const value = name.startsWith("--")
      ? (customValues.get(parsed) ?? parsed)
      : parsed
    if (!safePresentationValue(property, value)) continue
    // Use the CSS parser's property grammar, including colors, lengths and
    // quoted font families, rather than accepting arbitrary custom tokens.
    validator.cssText = ""
    validator.setProperty(property, value)
    if (!validator.getPropertyValue(property)) continue
    declarations.push(`${name}: ${value}`)
  }
  return declarations.join("; ")
}

function scopeSelector(selector: string): string | null {
  const trimmed = selector.trim()
  if (trimmed === ":root") return WIDGET_ROOT
  // Chart selectors need types, classes, IDs, data attributes, combinators,
  // hover and focus. No escapes, selector functions or namespace syntax.
  if (
    !/^[\w\s.*#\-[\]="':>+~]+$/.test(trimmed) ||
    /:(?!hover\b|focus\b|focus-within\b)/.test(trimmed)
  )
    return null
  // Constrain the matched element, not just the start of the selector, so a
  // selector beginning at the root SVG still reveals its deferred annotations.
  return `:is(${WIDGET_ROOT}, ${WIDGET_ROOT} *):is(${trimmed})`
}

function sanitizeRules(
  rules: CSSRuleList,
  validator: CSSStyleDeclaration,
  customValues: ReadonlyMap<string, string>
): string {
  const result: string[] = []
  for (const rule of Array.from(rules)) {
    if (rule.type === 1) {
      const styleRule = rule as CSSStyleRule
      const selectors = styleRule.selectorText.split(",").map(scopeSelector)
      if (selectors.some((selector) => !selector)) continue
      const declarations = sanitizeDeclarations(
        styleRule.style,
        validator,
        customValues
      )
      if (declarations) result.push(`${selectors.join(",")}{${declarations}}`)
    } else if (rule.type === 4) {
      const media = rule as CSSMediaRule
      if (
        !/^\(\s*(?:prefers-color-scheme\s*:\s*(?:dark|light)|prefers-reduced-motion\s*:\s*(?:reduce|no-preference))\s*\)$/.test(
          media.conditionText
        )
      )
        continue
      const nested = sanitizeRules(media.cssRules, validator, customValues)
      if (nested) result.push(`@media ${media.conditionText}{${nested}}`)
    }
    // @import, @font-face, keyframes and all other at-rules are omitted.
  }
  return result.join("\n")
}

/** Skip a quoted CSS string or comment without interpreting its contents. */
function skipCssLiteral(css: string, start: number): number {
  if (css.startsWith("/*", start)) {
    const end = css.indexOf("*/", start + 2)
    return end < 0 ? css.length : end + 2
  }
  const quote = css[start]
  if (quote !== '"' && quote !== "'") return start
  for (let i = start + 1; i < css.length; i++) {
    if (css[i] === "\\") i++
    else if (css[i] === quote) return i + 1
  }
  return css.length
}

// jsdom's stylesheet serializer joins tokens in custom properties (for example
// `oklch(50% 0.1 30)` becomes `oklch(50%0.1 30)`). Protect their original token
// streams while parsing rule structure, then validate restored values against
// real property grammars. This also preserves quoted font delimiters literally.
function preserveCustomValues(css: string): {
  css: string
  values: Map<string, string>
} {
  const values = new Map<string, string>()
  let output = ""
  let start = 0
  let previous = ""
  for (let i = 0; i < css.length;) {
    const literalEnd = skipCssLiteral(css, i)
    if (literalEnd > i) {
      if (!css.startsWith("/*", i)) previous = "literal"
      i = literalEnd
      continue
    }
    const property =
      previous === "{" || previous === ";"
        ? /^--semiotic-[\w-]+\s*:\s*/.exec(css.slice(i))
        : null
    if (property) {
      const valueStart = i + property[0].length
      let end = valueStart
      let depth = 0
      for (; end < css.length; end++) {
        const skip = skipCssLiteral(css, end)
        if (skip > end) {
          end = skip - 1
          continue
        }
        if (css[end] === "\\") {
          end++
          continue
        }
        if (css[end] === "(") depth++
        else if (css[end] === ")") depth--
        else if (!depth && /[;{}]/.test(css[end])) break
      }
      const key = `semiotic-sanitizer-value-${values.size}`
      values.set(key, css.slice(valueStart, end).trim())
      output += css.slice(start, valueStart) + key
      start = end
      i = end
      previous = "value"
      continue
    }
    if (!/\s/.test(css[i])) previous = css[i]
    if (css[i] === "\\") i++
    i++
  }
  return { css: output + css.slice(start), values }
}

function sanitizeSvgNode(
  node: ChildNode,
  doc: Document,
  sheet: CSSStyleSheet,
  validator: CSSStyleDeclaration
): Node | null {
  if (node.nodeType === 3 || node.nodeType === 4) {
    return doc.createTextNode(node.textContent ?? "")
  }
  if (node.nodeType !== 1) return null
  const source = node as Element
  const tag = source.localName
  if (source.namespaceURI !== SVG_NAMESPACE || !ELEMENTS.has(tag)) return null
  const safe = doc.createElementNS(SVG_NAMESPACE, tag)
  if (tag === "style") {
    const preserved = preserveCustomValues(source.textContent ?? "")
    sheet.replaceSync(preserved.css)
    const css = sanitizeRules(sheet.cssRules, validator, preserved.values)
    if (!css) return null
    safe.textContent = css
    return safe
  }

  for (const attribute of Array.from(source.attributes)) {
    const { name, value, namespaceURI, localName } = attribute
    if (namespaceURI === XML_NAMESPACE && localName === "space") {
      if (value === "preserve" || value === "default") {
        safe.setAttributeNS(XML_NAMESPACE, "xml:space", value)
      }
      continue
    }
    if (
      (!namespaceURI && name === "href") ||
      (namespaceURI === XLINK_NAMESPACE && localName === "href")
    ) {
      const url = value.trim()
      if (
        ([
          "use",
          "textPath",
          "linearGradient",
          "radialGradient",
          "pattern"
        ].includes(tag) &&
          isFragment(url)) ||
        (tag === "image" &&
          /^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$/i.test(
            url
          ))
      ) {
        safe.setAttribute("href", url)
      }
      continue
    }
    // XMLSerializer supplies namespace declarations for constructed nodes.
    // Copying them as ordinary attributes creates duplicate xmlns attributes.
    if (namespaceURI) continue
    if (name === "style") {
      const inline = doc.createElementNS(SVG_NAMESPACE, "g").style
      inline.cssText = value
      const css = sanitizeDeclarations(inline, validator)
      if (css) safe.setAttribute("style", css)
    } else if (PROPERTIES.has(name)) {
      if (safePresentationValue(name, value)) safe.setAttribute(name, value)
    } else if (
      ATTRIBUTES.has(name) ||
      (/^(?:data|aria)-[a-z][a-z0-9-]*$/.test(name) &&
        name !== WIDGET_ROOT_ATTRIBUTE)
    ) {
      safe.setAttribute(name, value)
    }
  }
  for (const child of Array.from(source.childNodes)) {
    const sanitized = sanitizeSvgNode(child, doc, sheet, validator)
    if (sanitized) safe.appendChild(sanitized)
  }
  return safe
}

// Static rendering and schema operations must not pay the DOM startup cost.
// Widget operations initialize it inside their whole-operation deadline, then
// process the untrusted SVG inside the separate sanitization-stage budget.
let jsdomModulePromise: Promise<typeof import("jsdom")> | null = null

export async function initializeSvgSanitizer(): Promise<void> {
  await (jsdomModulePromise ??= import("jsdom"))
}

/** Build a fresh, inert SVG tree for the widget's innerHTML boundary. */
export async function sanitizeSvgForWidget(svg: string): Promise<string> {
  const trimmed = svg.trim()
  if (!trimmed || /<!DOCTYPE/i.test(trimmed))
    throw new Error("Invalid widget SVG")
  const { JSDOM } = await (jsdomModulePromise ??= import("jsdom"))
  const parsed = new JSDOM(trimmed, { contentType: "image/svg+xml" })
  try {
    const source = parsed.window.document
    if (source.documentElement.localName !== "svg")
      throw new Error("Invalid widget SVG")
    const clean = source.implementation.createDocument(
      SVG_NAMESPACE,
      null,
      null
    )
    const root = sanitizeSvgNode(
      source.documentElement,
      clean,
      new parsed.window.CSSStyleSheet(),
      clean.createElementNS(SVG_NAMESPACE, "g").style
    ) as Element | null
    if (!root) throw new Error("Invalid widget SVG")
    root.setAttribute(WIDGET_ROOT_ATTRIBUTE, "")
    clean.appendChild(root)
    return new parsed.window.XMLSerializer().serializeToString(root)
  } finally {
    parsed.window.close()
  }
}
