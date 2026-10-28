import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { scaleLinear } from "d3-scale"
import { describe, expect, it } from "vitest"
import type { AnnotationContext } from "../../realtime/types"
import type { Datum } from "./datumTypes"
import { createDefaultAnnotationRules } from "./annotationRules"
import { renderStaticAnnotationFallback } from "../../server/staticAnnotationFallbacks"

const context: AnnotationContext = {
  frameType: "xy",
  width: 100,
  height: 100,
  xAccessor: "x",
  yAccessor: "y",
  data: [{ x: 10, y: 10, id: "a" }],
  scales: {
    x: scaleLinear().domain([0, 100]).range([0, 100]),
    y: scaleLinear().domain([0, 100]).range([0, 100]),
  } as AnnotationContext["scales"],
}

const points = [
  { x: 10, y: 10 },
  { x: 20, y: 30 },
]

for (const [name, renderRule] of [
  ["browser", createDefaultAnnotationRules("xy")],
  ["server", renderStaticAnnotationFallback],
] as const) {
  describe(`${name} zero-valued annotation inputs`, () => {
    const markup = (annotation: Datum, ctx: AnnotationContext = context) =>
      renderToStaticMarkup(<svg>{renderRule(annotation, 0, ctx)}</svg>)

    it("keeps rect-enclose padding of 0", () => {
      const html = markup({ type: "rect-enclose", padding: 0, coordinates: points })
      expect(html).toContain('x="10"')
      expect(html).toContain('y="10"')
      expect(html).toContain('width="10"')
      expect(html).toContain('height="20"')
    })

    it("adds enclose padding of 0 instead of the default 10", () => {
      const radius = (padding: number) => {
        const html = markup({ type: "enclose", padding, coordinates: points })
        return Number(html.match(/<circle[^>]*\sr="([^"]+)"/)?.[1])
      }
      expect(radius(10) - radius(0)).toBeCloseTo(10)
    })

    it("draws a highlight with radius 0", () => {
      const html = markup({ type: "highlight", field: "id", value: "a", r: 0 })
      expect(html).toContain('r="0"')
    })

    it("skips a bracket whose anchor does not resolve", () => {
      const html = markup(
        { type: "bracket", width: 40, label: "missing" },
        { frameType: "xy", width: 100, height: 100 },
      )
      expect(html).not.toContain("annotation")
      expect(html).not.toContain("<path")
    })

    it("honors bracket depth 0", () => {
      const html = markup({
        type: "bracket",
        x: 10,
        y: 20,
        width: 40,
        depth: 0,
        bracketType: "square",
        label: "flat",
      })
      expect(html).toContain("M0,0 L0,0 L40,0 L40,0")
    })
  })
}
