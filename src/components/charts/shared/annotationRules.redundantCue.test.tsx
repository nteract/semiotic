/**
 * M4 redundant-cue default — a colored `text` note flagged
 * `_redundantConnector` (by annotationLayout's `redundantCues`) renders a
 * leader line from its anchor to the offset text, a spatial cue a color-blind
 * reader can follow. Without the flag, the text rule emits a bare <text>.
 */
import { describe, it, expect } from "vitest"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { scaleLinear } from "d3-scale"
import { createDefaultAnnotationRules } from "./annotationRules"
import type { AnnotationContext } from "../../realtime/types"
import type { Datum } from "./datumTypes"

const rules = createDefaultAnnotationRules("xy")

const ctx: AnnotationContext = {
  scales: {
    x: scaleLinear().domain([0, 100]).range([0, 200]),
    y: scaleLinear().domain([0, 100]).range([200, 0]),
  } as AnnotationContext["scales"],
  width: 200,
  height: 200,
  frameType: "xy",
}

const render = (ann: Datum) => renderToStaticMarkup(<>{rules(ann, 0, ctx)}</>)

describe("text annotation redundant-cue leader line", () => {
  it("draws a leader line when _redundantConnector is set", () => {
    const html = render({ type: "text", x: 50, y: 50, label: "Echo", color: "#ff0000", dx: 30, dy: 20, _redundantConnector: true })
    expect(html).toContain("<line")
    expect(html).toContain("Echo")
    // Leader inherits the note color so it visually ties to the same target.
    expect(html).toContain("#ff0000")
  })

  it("emits a bare text node without the flag", () => {
    const html = render({ type: "text", x: 50, y: 50, label: "Echo", color: "#ff0000", dx: 30, dy: 20 })
    expect(html).not.toContain("<line")
    expect(html).toContain("Echo")
  })
})
