export function rewriteSvgIdReference(
  name: string,
  value: string,
  ids: ReadonlyMap<string, string>,
  rewriteCss?: (css: string, ids: ReadonlyMap<string, string>) => string
): string {
  const lookup = (id: string) => ids.get(id) ?? id
  if (name === "id") return lookup(value)
  if (/^(?:xlink:?)?href$/i.test(name)) {
    return value[0] === "#" ? `#${lookup(value.slice(1))}` : value
  }
  if (
    /^(?:aria-(?:labelledby|describedby|controls|owns|activedescendant|details|errormessage)|for|htmlFor|list|form|headers|itemref|popovertarget)$/.test(
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
  // Controlled recipe overlays only author paint URLs. Exporters supply a
  // full CSS token mapper for arbitrary inline styles and stylesheets.
  return rewriteCss
    ? rewriteCss(value, ids)
    : value.replace(
        /url\(\s*(["']?)#([^\s"')]+)\1\s*\)/g,
        (reference, _quote: string, id: string) => {
          const target = lookup(id)
          return target === id ? reference : `url(#${target})`
        }
      )
}
