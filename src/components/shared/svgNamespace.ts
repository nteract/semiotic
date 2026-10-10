export const XHTML_NAMESPACE = "http://www.w3.org/1999/xhtml"

let svgInstance = 0

/** Allocate a document-safe prefix; callers can supply their own stable IDs. */
export function createSvgIdPrefix(kind = "semiotic"): string {
  return `${kind}-${++svgInstance}`
}
