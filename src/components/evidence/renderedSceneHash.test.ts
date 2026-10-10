import { describe, expect, it } from "vitest"
import { renderedSceneHash } from "./renderedSceneHash"
import { scopeSvgIdentifiers } from "../shared/svgIdentifiers"

const context = { frameType: "xy", width: 100, height: 100 }

describe("document-independent scene identity", () => {
  it("normalizes document IDs and CSS, paint, ARIA and HTML relationships together", () => {
    const svg =
      '<svg aria-labelledby="title"><title id="title">Chart</title><style>#shape { fill: url(#paint); content: "#shape" }</style><defs><linearGradient id="paint"/></defs><rect id="shape" fill="url(#paint)"/><foreignObject><label for="field"/><input id="field"/></foreignObject></svg>'
    const first = scopeSvgIdentifiers(svg, "first")
    const second = scopeSvgIdentifiers(svg, "second")
    expect(first).not.toBe(second)
    expect(renderedSceneHash(first, context)).toBe(
      renderedSceneHash(second, context)
    )
  })

  it("preserves reference bindings and cannot turn unknown targets into canonical IDs", () => {
    const svg = '<svg><rect id="paint"/><use href="#scene-0"/></svg>'
    expect(renderedSceneHash(svg, context)).not.toBe(
      renderedSceneHash(svg.replace("#scene-0", "#paint"), context)
    )
    const twoPaints =
      '<svg><defs><linearGradient id="red"/><linearGradient id="blue"/></defs><rect fill="url(#red)"/></svg>'
    expect(renderedSceneHash(twoPaints, context)).not.toBe(
      renderedSceneHash(twoPaints.replace("url(#red)", "url(#blue)"), context)
    )
  })

  it("continues to bind visible text, CSS paint and resolved coordinates", () => {
    const svg =
      '<svg><style>#shape { fill: #ff0000 }</style><rect id="shape"/><text>Revenue</text></svg>'
    const hash = renderedSceneHash(svg, context)
    expect(
      renderedSceneHash(svg.replace("#ff0000", "#0000ff"), context)
    ).not.toBe(hash)
    expect(
      renderedSceneHash(svg.replace("Revenue", "Profit"), context)
    ).not.toBe(hash)
    expect(renderedSceneHash(svg, { ...context, width: 200 })).not.toBe(hash)
  })
})
