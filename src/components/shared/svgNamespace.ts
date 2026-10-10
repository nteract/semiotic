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
