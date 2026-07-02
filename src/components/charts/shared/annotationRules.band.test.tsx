import { describe, expect, it } from "vitest"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { scaleLinear } from "d3-scale"
import { createDefaultAnnotationRules } from "./annotationRules"
import type { AnnotationContext } from "../../realtime/types"

const rules = createDefaultAnnotationRules("xy")
const context: AnnotationContext = {
  frameType: "xy",
  width: 400,
  height: 200,
  scales: {
    x: scaleLinear().domain([0, 100]).range([0, 400]),
    y: scaleLinear().domain([0, 100]).range([200, 0]),
  },
}

describe("band annotations", () => {
  it("renders x-band across the full plot height", () => {
    const node = rules(
      { type: "x-band", x0: 20, x1: 60, color: "#7C5CFF" },
      0,
      context,
    )
    const svg = renderToStaticMarkup(node as React.ReactElement)
    expect(svg).toContain('<rect x="80" y="0" width="160" height="200"')
    expect(svg).toContain('fill="#7C5CFF"')
  })

  it("normalizes reversed x-band bounds", () => {
    const node = rules(
      { type: "x-band", x0: 70, x1: 30, label: "Phase" },
      0,
      context,
    )
    const svg = renderToStaticMarkup(node as React.ReactElement)
    expect(svg).toContain('<rect x="120" y="0" width="160" height="200"')
    expect(svg).toContain("Phase")
  })

  it("skips x-band with missing bounds (matches SSR)", () => {
    expect(rules({ type: "x-band", x0: 20 }, 0, context)).toBeNull()
    expect(rules({ type: "x-band", x1: 60 }, 0, context)).toBeNull()
  })

  it("skips x-band when no x scale is available", () => {
    const node = rules(
      { type: "x-band", x0: 20, x1: 60 },
      0,
      { ...context, scales: {} },
    )
    expect(node).toBeNull()
  })
})
