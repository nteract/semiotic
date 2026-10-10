export function rewriteSvgIdReference(
  name: string,
  value: string,
  ids: ReadonlyMap<string, string>
): string {
  const lookup = (id: string) => ids.get(id) ?? id
  if (name === "id") return lookup(value)
  if (/^(?:xlink:?)?href$/i.test(name)) {
    return value.replace(
      /^#(.*)$/,
      (_reference, id: string) => `#${lookup(id)}`
    )
  }
  if (
    /^aria-(?:labelledby|describedby|controls|owns|activedescendant|details|errormessage)$/.test(
      name
    )
  ) {
    return value.replace(/\S+/g, lookup)
  }
  if (
    !/^(?:fill|stroke|clip-?path|mask|filter|marker-?(?:start|mid|end)|style|cursor)$/i.test(
      name
    )
  )
    return value
  return value.replace(
    /url\(\s*(["']?)#([^\s"')]+)\1\s*\)/g,
    (reference, _quote: string, id: string) =>
      ids.has(id) ? `url(#${ids.get(id)})` : reference
  )
}
