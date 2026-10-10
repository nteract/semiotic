import { mapSvgAttributes } from "./svgRoot"
import { rewriteSvgIdReference } from "./svgIdReference"

/** Scope declared IDs and local references without changing text or external URLs. */
export function scopeSvgIdentifiers(svg: string, prefix: string): string {
  const ids = new Map<string, string>()
  mapSvgAttributes(svg, (name, value) => {
    if (name === "id")
      ids.set(
        value,
        value.startsWith(`${prefix}-`) ? value : `${prefix}-${value}`
      )
    return undefined
  })
  return mapSvgAttributes(svg, (name, value) => {
    const scoped = rewriteSvgIdReference(name, value, ids)
    return scoped === value ? undefined : scoped
  })
}
