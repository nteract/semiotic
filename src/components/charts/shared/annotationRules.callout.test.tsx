import { describe, expect, it } from "vitest"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { scaleLinear } from "d3-scale"
import { createDefaultAnnotationRules } from "./annotationRules"
import type { AnnotationContext } from "../../realtime/types"
import type { Datum } from "./datumTypes"

const rules = createDefaultAnnotationRules("xy")
const ctx: AnnotationContext = {
  scales: {
    x: scaleLinear().domain([0, 10]).range([0, 200]),
    y: scaleLinear().domain([0, 10]).range([200, 0]),
  } as AnnotationContext["scales"],
  width: 200,
  height: 200,
  frameType: "xy",
}

const render = (annotation: Datum) =>
  renderToStaticMarkup(<>{rules(annotation, 0, ctx)}</>)

describe("default callout annotation rules", () => {
  it("renders the public callout-circle type with its subject radius", () => {
    const html = render({ type: "callout-circle", x: 5, y: 5, label: "Peak", radius: 18 })
    expect(html).toContain("annotation-subject")
    expect(html).toContain('<circle r="18"')
    expect(html).toContain("Peak")
  })

  it("renders the public callout-rect type with its subject dimensions", () => {
    const html = render({ type: "callout-rect", x: 5, y: 5, label: "Window", width: 40, height: 24 })
    expect(html).toContain("annotation-subject")
    expect(html).toContain('width="40"')
    expect(html).toContain('height="24"')
  })

  it("passes connector disable and lifecycle presentation through to notes", () => {
    const html = render({
      type: "callout",
      x: 5,
      y: 5,
      label: "Withdrawn",
      disable: ["connector"],
      opacity: 0.35,
      strokeDasharray: "4 4",
    })
    expect(html).not.toContain("annotation-connector")
    expect(html).toContain('opacity="0.35"')
    expect(html).toContain('stroke-dasharray="4 4"')
  })
})
