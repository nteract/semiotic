import { createRequire } from "node:module"
import { rewriteSvgIdentifiers } from "../../src/components/shared/svgIdentifiers"
import { escapeXmlAttribute } from "../../src/components/shared/svgRoot"
import { serializeSvgPrecision } from "../../src/components/shared/svgPrecision"
import { svgReferenceFailures } from "../../src/test-utils/svgStructure"

// JSDOM is an existing dev dependency without bundled declarations. This local
// boundary uses only its XML document APIs; no new production dependency.
const { JSDOM } = createRequire(import.meta.url)("jsdom") as {
  JSDOM: new (
    text: string,
    options: { contentType: string }
  ) => {
    window: {
      document: Document
      XMLSerializer: typeof XMLSerializer
      close(): void
    }
  }
}

export const normalizationVersion = 1

/** Exact geometry by default. Only the renderer's generated document scope is
 * renamed; authored IDs and the suffix identifying each target remain visible.
 * Reuse the exporter's geometry-only precision contract when explicitly asked.
 */
export function normalizeSvg(
  svg: string,
  precision?: number,
  generatedScope = true
): string {
  const parse = (text: string) => {
    const dom = new JSDOM(text, { contentType: "image/svg+xml" })
    const root = dom.window.document.documentElement
    if (
      root.localName !== "svg" ||
      root.namespaceURI !== "http://www.w3.org/2000/svg"
    ) {
      dom.window.close()
      throw new Error("Invalid SVG: expected an SVG namespace root")
    }
    return dom
  }
  const original = parse(svg)
  let rewritten: string
  try {
    const root = original.window.document.documentElement
    const failures = svgReferenceFailures([root])
    if (failures.length) throw new Error(`Invalid SVG: ${failures.join("; ")}`)
    const ids = new Map<string, string>()
    const scopes = new Map<string, string>()
    const declared = [...original.window.document.querySelectorAll("[id]")]
    const occupied = new Set(declared.map((node) => node.id))
    // Recognize the frame's generated plot scope, not arbitrary authored IDs
    // that happen to begin with "semiotic-". Caller-supplied chartId prefixes
    // are excluded by the fixture runner even when they use that spelling.
    if (generatedScope)
      for (const node of declared) {
        const match = /^(semiotic-[a-z0-9]+)-data-area$/.exec(node.id)
        if (match && !scopes.has(match[1]))
          scopes.set(match[1], `ssr-scope-${scopes.size}`)
      }
    for (const node of declared) {
      // renderWithContentSvgIdPrefix / createSvgIdPrefix own this format.
      const match = /^(semiotic-[a-z0-9]+)(-.+)$/.exec(node.id)
      if (!match || !scopes.has(match[1])) continue
      const canonical = scopes.get(match[1])! + match[2]
      if (occupied.has(canonical))
        throw new Error(`Canonical ID collision: ${canonical}`)
      ids.set(node.id, canonical)
    }
    rewritten = serializeSvgPrecision(
      rewriteSvgIdentifiers(svg, ids),
      precision
    )
  } finally {
    original.window.close()
  }
  const normalized = parse(rewritten)
  try {
    const failures = svgReferenceFailures([
      normalized.window.document.documentElement
    ])
    if (failures.length)
      throw new Error(`Invalid normalized SVG: ${failures.join("; ")}`)
    const serialize = (node: Node): string => {
      if (node.nodeType === 1) {
        const element = node as Element
        const attrs = [...element.attributes]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(({ name, value }) => ` ${name}="${escapeXmlAttribute(value)}"`)
          .join("")
        return `<${element.tagName}${attrs}>${[...node.childNodes].map(serialize).join("")}</${element.tagName}>`
      }
      if (node.nodeType === 9)
        return [...node.childNodes].map(serialize).join("")
      return new normalized.window.XMLSerializer().serializeToString(node)
    }
    return serialize(normalized.window.document as unknown as Document)
  } finally {
    normalized.window.close()
  }
}

/** Object key order isn't evidence; array order and every value are. */
export function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, item[key]])
        )
      : item
  )
}

export function comparableEvidence(evidence: Record<string, unknown> | null) {
  if (!evidence) return null
  // Derived hashes depend on a release's hashing algorithm and raw serialization.
  // Compare the normalized SVG and actual evidence fields instead. Keep the raw
  // hashes in the result files so algorithm/version changes remain inspectable.
  const { sceneHash: _hash, sceneHashVersion: _version, ...fields } = evidence
  return fields
}
