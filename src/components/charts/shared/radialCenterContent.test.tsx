import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { renderSvgCenterContent } from "./radialCenterContent"

const render = (content: React.ReactNode) => {
  const svg = renderSvgCenterContent(content, 40, 30)
  return svg == null ? null : renderToStaticMarkup(<svg>{svg}</svg>)
}

describe("renderSvgCenterContent", () => {
  it("centers a bare text element with default anchoring", () => {
    expect(render(<text>42</text>)).toContain(
      '<text x="0" y="0" text-anchor="middle" dominant-baseline="middle">42</text>'
    )
  })

  it("keeps fragments and arrays of allow-listed SVG elements native", () => {
    const fragment = render(
      <>
        <circle r={4} />
        <text y={10}>ok</text>
      </>
    )
    expect(fragment).toContain('transform="translate(40,30)"')
    expect(fragment).toContain("<circle")
    expect(fragment).toContain(">ok</text>")
    expect(
      render([<circle key="a" r={2} />, <rect key="b" width={2} height={2} />])
    ).toContain("<rect")
  })

  it("renders primitive centers as native text, including zero", () => {
    expect(render("64%")).toContain(">64%</text>")
    expect(render(0)).toContain(">0</text>")
  })

  it("leaves HTML and mixed or empty content to the HTML fallback", () => {
    expect(render(<div>html</div>)).toBeNull()
    expect(
      render(
        <>
          <text>svg</text>
          <span>html</span>
        </>
      )
    ).toBeNull()
    expect(
      render(
        <>
          <text>svg</text>loose
        </>
      )
    ).toBeNull()
    expect(render(<></>)).toBeNull()
    expect(render([])).toBeNull()
  })
})
