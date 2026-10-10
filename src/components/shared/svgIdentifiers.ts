import { mapSvgAttributes } from "./svgRoot"

export function rewriteSvgIdReference(
  name: string,
  value: string,
  ids: ReadonlyMap<string, string>
): string {
  if (name === "id") return ids.get(value) ?? value
  if (name === "href" || name === "xlink:href" || name === "xlinkHref") {
    return value.startsWith("#") && ids.has(value.slice(1))
      ? `#${ids.get(value.slice(1))}`
      : value
  }
  if (
    /^aria-(?:labelledby|describedby|controls|owns|activedescendant|details|errormessage)$/.test(
      name
    )
  ) {
    return value
      .split(/\s+/)
      .map((id) => ids.get(id) ?? id)
      .join(" ")
  }
  return value.replace(
    /url\(\s*(["']?)#([^\s"')]+)\1\s*\)/g,
    (reference, _quote: string, id: string) =>
      ids.has(id) ? `url(#${ids.get(id)})` : reference
  )
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
  return mapSvgAttributes(svg, (name, value) => {
    const scoped = rewriteSvgIdReference(name, value, ids)
    return scoped === value ? undefined : scoped
  })
}
