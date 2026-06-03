import { describe, expect, it } from "vitest"
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import Annotation from "./Annotation"

// A label with a note offset gives a non-zero connector and (because the note
// has a label + offset) also a `note-line`, so connector assertions target the
// `connector-curve` class / path shape rather than the presence of any <line>.
const base = {
  type: "label",
  x: 0,
  y: 0,
  dx: 40,
  dy: -40,
  note: { label: "hi" },
}

describe("Annotation connector", () => {
  it("renders a quadratic-bezier path when connector.type is 'curve'", () => {
    const html = renderToStaticMarkup(
      <Annotation noteData={{ ...base, connector: { type: "curve", end: "arrow" } }} />
    )
    expect(html).toContain("connector-curve")
    // Quadratic bezier: M start Q control end.
    expect(html).toMatch(/d="M0,0Q[^"]+"/)
  })

  it("renders a straight line connector by default (byte-compatible)", () => {
    const html = renderToStaticMarkup(
      <Annotation noteData={{ ...base, connector: { end: "arrow" } }} />
    )
    expect(html).not.toContain("connector-curve")
    expect(html).toContain('class="annotation-connector"')
    // The connector itself is a straight <line> from the subject to the note.
    expect(html).toMatch(/<line[^>]*x2="40"[^>]*y2="-40"/)
  })

  it("still draws the arrowhead (closed triangle) on a curved connector", () => {
    const html = renderToStaticMarkup(
      <Annotation noteData={{ ...base, connector: { type: "curve", end: "arrow" } }} />
    )
    // Arrowhead is a closed triangle path `M0,0 L.. L.. Z`, distinct from the
    // curve's open quadratic (`M0,0Q.. ..`) path.
    expect(html).toMatch(/d="M0,0L[^"]*Z"/)
  })
})
