/** Parse standalone exports as XML so HTML error recovery cannot hide bad SVG. */
export function parseSvg(svg: string): SVGSVGElement {
  const document = new DOMParser().parseFromString(svg, "image/svg+xml")
  if (
    document.querySelector("parsererror") ||
    document.documentElement.localName !== "svg" ||
    document.documentElement.namespaceURI !== "http://www.w3.org/2000/svg"
  )
    throw new Error(
      `Invalid SVG document: ${document.querySelector("parsererror")?.textContent ?? "missing SVG root"}`
    )
  return document.documentElement as unknown as SVGSVGElement
}

/** Test helper, also executed in Playwright via evaluateAll. Keep self-contained.
 * Roots are individual charts, including nested dashboard viewports. References
 * must resolve inside their own chart; document-wide existence is insufficient.
 */
export function svgReferenceFailures(roots: Element[]): string[] {
  if (!roots.length) return ["No SVG roots to inspect"]
  const failures: string[] = []
  const ids = new Map<string, Element>()
  for (const node of roots[0].ownerDocument.querySelectorAll("[id]")) {
    if (ids.has(node.id)) failures.push(`Duplicate ID: ${node.id}`)
    ids.set(node.id, node)
  }
  roots.forEach((root, index) => {
    const reference = (id: string, source: string) => {
      const target = ids.get(id)
      if (!target) failures.push(`Chart ${index}: unresolved ${source} #${id}`)
      else if (!root.contains(target))
        failures.push(`Chart ${index}: cross-chart ${source} #${id}`)
    }
    const cssReferences = (css: string, source: string) => {
      // Skip comments and strings, but consume CSS escapes inside URL tokens.
      // External resources and color hashes are not document ID references.
      const tokens =
        /\/\*[\s\S]*?\*\/|(?<![\w-])url\(\s*(?:"((?:\\[\s\S]|[^"\\])*)"|'((?:\\[\s\S]|[^'\\])*)'|((?:\\(?:[\da-fA-F]{1,6}(?:\r\n|[\t\n\f\r ])?|[^\n\r\f])|[^\s()'"\\])+))\s*\)|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|\\[\s\S]/gi
      for (const match of css.matchAll(tokens)) {
        const url = match[1] ?? match[2] ?? match[3]
        const fragment = url?.replace(
          /\\(?:([\da-fA-F]{1,6})(?:\r\n|[\t\n\f\r ])?|(\r\n|[\n\r\f])|([\s\S]))/g,
          (
            _escape,
            hex: string | undefined,
            continuation: string | undefined,
            literal: string
          ) => {
            if (!hex) return continuation ? "" : literal
            const code = parseInt(hex, 16)
            return code > 0 &&
              code <= 0x10ffff &&
              !(code >= 0xd800 && code <= 0xdfff)
              ? String.fromCodePoint(code)
              : "\ufffd"
          }
        )
        if (fragment?.startsWith("#")) reference(fragment.slice(1), source)
      }
    }
    // Include the root itself: accessible name IDREFs live on <svg>.
    for (const node of [root, ...root.querySelectorAll("*")]) {
      for (const { name, value } of node.attributes) {
        if (/^(?:xlink:)?href$/.test(name) && value.startsWith("#"))
          reference(value.slice(1), name)
        else if (
          /^aria-(?:labelledby|describedby|controls|owns|activedescendant|details|errormessage)$/.test(
            name
          )
        )
          value
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .forEach((id) => reference(id, name))
        else if (
          /^(?:fill|stroke|clip-path|mask|filter|marker-start|marker-mid|marker-end|style|cursor)$/.test(
            name
          )
        )
          cssReferences(value, name)
      }
      if (node.localName === "style")
        cssReferences(node.textContent ?? "", "stylesheet")
    }
  })
  return failures
}

export interface SvgStructureExpectation {
  family: "xy" | "ordinal" | "network" | "geo"
  marks: { selector: string; count: number }
  legend: string[]
  annotations: string[]
  axes: string[]
}

/** Deliberately limited anatomy contract for representative server fixtures. */
export function svgStructureFailures(
  root: Element,
  expected: SvgStructureExpectation,
  chrome = true
): string[] {
  const failures: string[] = []
  const check = (ok: boolean, message: string) => {
    if (!ok) failures.push(message)
  }
  check(
    root.classList.contains(`stream-${expected.family}-frame`),
    "frame family"
  )
  const plot = root.querySelector('[id$="-data-area"]')
  const marks = [...(plot?.querySelectorAll(expected.marks.selector) ?? [])]
  check(
    !!plot && plot.parentElement === root,
    "plot must belong to the SVG root"
  )
  check(marks.length === expected.marks.count, "data marks")
  const axes = root.querySelector(".stream-axes, .ordinal-axes")
  const grid = root.querySelector(".semiotic-grid")
  const hasAxes = chrome && expected.axes.length > 0
  check(!!axes === hasAxes, "axes visibility")
  check(!!grid === hasAxes, "grid visibility")
  if (hasAxes) {
    check(
      axes?.parentElement === plot && grid?.parentElement === plot,
      "axes/grid must share plot coordinates"
    )
    for (const label of expected.axes)
      check(
        [...(axes?.querySelectorAll("text") ?? [])].some(
          (node) => node.textContent === label
        ),
        `axis text: ${label}`
      )
    check((grid?.querySelectorAll("line").length ?? 0) > 0, "grid lines")
    // Grid is behind marks/axes, never a foreground overlay.
    check(
      !!grid &&
        !!axes &&
        !!(grid.compareDocumentPosition(axes) & 4) &&
        marks.every((mark) => !!(grid.compareDocumentPosition(mark) & 4)),
      "grid paint order"
    )
  }
  const legend = root.querySelector(".semiotic-legend")
  check(!!legend === chrome, "legend visibility")
  if (chrome) {
    check(
      !!legend && legend.parentElement?.parentElement === root,
      "legend must sit outside the plot"
    )
    for (const label of expected.legend)
      check(
        [...(legend?.querySelectorAll("text") ?? [])].some(
          (node) => node.textContent === label
        ),
        `legend text: ${label}`
      )
  }
  const annotations = root.querySelector(".semiotic-annotations")
  check(!!annotations === chrome, "annotation visibility")
  if (chrome) {
    check(
      annotations?.parentElement === plot,
      "annotations must share plot coordinates"
    )
    check(
      !!annotations &&
        marks.every(
          (mark) => !!(mark.compareDocumentPosition(annotations) & 4)
        ),
      "annotation paint order"
    )
    for (const label of expected.annotations)
      check(
        [...(annotations?.querySelectorAll("text") ?? [])].some(
          (node) => node.textContent === label
        ),
        `annotation text: ${label}`
      )
  }
  return failures
}
