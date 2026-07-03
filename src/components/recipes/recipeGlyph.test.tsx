import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Glyph } from "./recipeGlyph"
import type { GlyphDef } from "../stream/glyphDef"

const SIGN: GlyphDef = {
  viewBox: [40, 40],
  anchor: [0.5, 1],
  parts: [
    { d: "M8 3h24v34H8z", fill: "color" },
    { d: "M12 9h16v5H12z", fill: "accent" },
    { d: "M4 12h22", fill: "none", stroke: "color", strokeWidth: 3 },
  ],
}

function markup(el: React.ReactElement): string {
  return renderToStaticMarkup(<svg>{el}</svg>)
}

describe("Glyph (React face of GlyphDef)", () => {
  it("renders parts with role paints at top-left position and height-based scale", () => {
    const html = markup(<Glyph def={SIGN} size={20} x={5} y={7} color="#d72f3f" accent="#fffdf4" />)
    expect(html).toContain("translate(5 7) scale(0.5)")
    expect(html).toContain('fill="#d72f3f"')
    expect(html).toContain('fill="#fffdf4"')
    expect(html).toContain('stroke="#d72f3f"')
    expect(html).toContain('stroke-width="3"')
    expect(html).toContain('aria-hidden="true"')
  })

  it("ignores the definition anchor — chrome owns placement", () => {
    const html = markup(<Glyph def={SIGN} size={40} />)
    expect(html).toContain("translate(0 0) scale(1)")
  })

  it("clips a partial fill and paints the ghost silhouette underneath", () => {
    const html = markup(
      <Glyph def={SIGN} size={40} color="#4f8999" ghostColor="#e6dfca" fraction={0.56} />,
    )
    expect(html).toContain("<clipPath")
    expect(html).toContain('fill="#e6dfca"')
    expect(html).toContain("clip-path=")
    expect(html).toContain('width="22.400000000000002"')
  })

  it("returns null for empty definitions", () => {
    expect(renderToStaticMarkup(<svg><Glyph def={{ parts: [] }} /></svg>)).not.toContain("<g")
  })
})
