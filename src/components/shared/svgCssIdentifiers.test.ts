import { describe, expect, it } from "vitest"
import {
  rewriteSvgStylesheetIds,
  rewriteSvgCssTokens
} from "./svgCssIdentifiers"
import { scopeSvgIdentifiers } from "./svgIdentifiers"

const ids = new Map([
  ["shape", "local-shape"],
  ["a.b", "local-a.b"],
  ["paint", "local-paint"],
  ["fff", "local-fff"]
])

describe("scoped stylesheet references", () => {
  it("scopes escaped IDs and quoted URLs in nested selectors and scope rules", () => {
    const css = "@scope (#shape) { #a\\.b:hover { fill: url('#paint') } }"
    expect(rewriteSvgStylesheetIds(css, ids)).toBe(
      "@scope (#local-shape) { #local-a\\.b:hover { fill: url('#local-paint') } }"
    )
    expect(
      rewriteSvgStylesheetIds("#\\73 hape { fill: url(#paint) }", ids)
    ).toBe("#local-shape { fill: url(#local-paint) }")
  })

  it("keeps color hashes in at-rule conditions and literal strings unchanged", () => {
    const css =
      '/* Intro */ @supports (color: #fff) { #shape { fill: #fff; content: "url(#paint) #shape;{}" } }'
    expect(rewriteSvgStylesheetIds(css, ids)).toBe(
      '/* Intro */ @supports (color: #fff) { #local-shape { fill: #fff; content: "url(#paint) #shape;{}" } }'
    )
    expect(
      rewriteSvgCssTokens('content:"url(#paint)"; fill:url(#paint)', ids)
    ).toBe('content:"url(#paint)"; fill:url(#local-paint)')
  })

  it("preserves real XML style text and CDATA while skipping markup lookalikes", () => {
    const svg =
      '<!-- <style>#shape{}</style> --><svg><style>#shape > path { fill:url(#paint); font-family:"A&amp;B" }</style><style><![CDATA[#shape { stroke:url(#paint) }]]></style><rect id="shape"/><linearGradient id="paint"/><text title="&lt;style&gt;#shape{}&lt;/style&gt;">#shape</text></svg>'
    const scoped = scopeSvgIdentifiers(svg, "local")
    expect(scoped).toContain("<!-- <style>#shape{}</style> -->")
    expect(scoped).toContain(
      "<![CDATA[#local-shape { stroke:url(#local-paint) }]]>"
    )
    const doc = new DOMParser().parseFromString(scoped, "image/svg+xml")
    expect(doc.querySelector("parsererror")).toBeNull()
    expect(doc.querySelector("style")?.textContent).toBe(
      '#local-shape > path { fill:url(#local-paint); font-family:"A&B" }'
    )
    expect(doc.querySelector("text")?.textContent).toBe("#shape")
  })
})
