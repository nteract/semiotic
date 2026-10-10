import { mapSvgAttributes, mapSvgStyleText } from "./svgRoot"
import { rewriteSvgIdReference } from "./svgIdReference"
import {
  rewriteSvgStylesheetIds,
  rewriteSvgCssTokens
} from "./svgCssIdentifiers"

export function rewriteSvgIdentifiers(
  svg: string,
  ids: ReadonlyMap<string, string>
): string {
  const attributes = mapSvgAttributes(svg, (name, value) => {
    const scoped = rewriteSvgIdReference(name, value, ids, rewriteSvgCssTokens)
    return scoped === value ? undefined : scoped
  })
  return mapSvgStyleText(attributes, (css) => rewriteSvgStylesheetIds(css, ids))
}

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
  return rewriteSvgIdentifiers(svg, ids)
}
