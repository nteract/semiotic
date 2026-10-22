import { fnv1a32 } from "../utils/hash"

export const XHTML_NAMESPACE = "http://www.w3.org/1999/xhtml"

/** Allocate a document-safe prefix; callers can supply their own stable IDs. */
export function createSvgIdPrefix(kind = "semiotic"): string {
  // Separate ESM/CJS and server/edge bundles can render into one document.
  // Allocate on first render so importing the module remains inert.
  const key = Symbol.for("semiotic.svg-instance")
  const registry = globalThis as unknown as Record<symbol, number | undefined>
  const instance = (registry[key] ?? 0) + 1
  registry[key] = instance
  return `${kind}-${instance}`
}

const SECOND_HASH_SEED = 0x9e3779b9

/**
 * Render with an ID prefix derived from the rendered markup. Identical input
 * renders byte-identical SVG, while charts that differ in any rendered detail
 * receive different prefixes and can share one document. The placeholder
 * prefix used during the render never reaches the returned markup.
 */
export function renderWithContentSvgIdPrefix(
  kind: string,
  render: (prefix: string) => string
): string {
  const placeholder = `${createSvgIdPrefix(`${kind}-pending`)}_`
  const parts = render(placeholder).split(placeholder)
  if (parts.length === 1) return parts[0]
  let first: number | undefined
  let second = SECOND_HASH_SEED
  for (const part of parts) {
    first = fnv1a32("\u0000", fnv1a32(part, first))
    second = fnv1a32("\u0000", fnv1a32(part, second))
  }
  return parts.join(`${kind}-${(first as number).toString(36)}${second.toString(36)}`)
}
