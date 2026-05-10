/**
 * Tests for the `trend` annotation handler — specifically the
 * ordinal-frame branch that projects category-index regression
 * output back through the band scale. The XY branch is exercised
 * implicitly by the docs LiveExample on Scatterplot/BubbleChart.
 */
import { describe, it, expect } from "vitest"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { createDefaultAnnotationRules } from "./annotationRules"
import type { AnnotationContext } from "../../realtime/types"

// Simple linear scales for tests — d3 scales would work but we don't
// need their interpolation: a function that maps domain → range is
// the entire shape the trend handler reads.
function makeLinearScale(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain
  const [r0, r1] = range
  // Cast to `any` so we can stash a function into the slot the
  // shared type narrows to ScaleLinear<number, number>.
  return ((v: number) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0)) as any
}

// Band-style category-name → pixel-center scale, mirroring
// OrdinalSVGOverlay's `oCentered`. Stable category order is implied
// by the input map.
function makeBandScale(centers: Record<string, number>) {
  return ((name: string) => centers[name]) as any
}

const rules = createDefaultAnnotationRules("ordinal")

describe("trend annotation — ordinal frame", () => {
  // Vertical projection: categories on x (band scale), values on y
  // (linear). Trend regresses (categoryIndex, value) and projects
  // back through scale.x for x-pixel and scale.y for y-pixel.
  describe("vertical projection", () => {
    const ctx: AnnotationContext = {
      data: [
        { cat: "Q1", value: 10 },
        { cat: "Q2", value: 20 },
        { cat: "Q3", value: 30 },
        { cat: "Q4", value: 40 },
      ],
      xAccessor: "cat",
      yAccessor: "value",
      frameType: "ordinal",
      projection: "vertical",
      width: 400,
      height: 200,
      scales: {
        x: makeBandScale({ Q1: 50, Q2: 150, Q3: 250, Q4: 350 }),
        y: makeLinearScale([0, 50], [200, 0]), // inverted Y (typical SVG)
        o: undefined as any,
      },
    }

    it("renders a trend polyline through ordinal categories", () => {
      const result = rules({ type: "trend", method: "linear" }, 0, ctx)
      expect(result).not.toBeNull()
      const html = renderToStaticMarkup(result as React.ReactElement)
      expect(html).toContain("<polyline")
      // Linear regression on (0,10),(1,20),(2,30),(3,40) is y = 10x + 10.
      // First trend point: index 0 → x = scaleX("Q1") = 50, y = scaleY(10) = 160.
      // Last: index 3 → x = scaleX("Q4") = 350, y = scaleY(40) = 40.
      expect(html).toContain("50,160")
      expect(html).toContain("350,40")
    })

    it("renders a label at the line's right end when label is set", () => {
      const result = rules({ type: "trend", method: "linear", label: "Trend" }, 0, ctx)
      const html = renderToStaticMarkup(result as React.ReactElement)
      expect(html).toContain("Trend")
    })
  })

  // Horizontal projection: values on x (linear), categories on y
  // (band scale). The handler swaps the categorical/value axes.
  describe("horizontal projection", () => {
    const ctx: AnnotationContext = {
      data: [
        { cat: "Low", value: 10 },
        { cat: "Mid", value: 20 },
        { cat: "High", value: 30 },
      ],
      // For horizontal: xAccessor reads value, yAccessor reads category.
      xAccessor: "value",
      yAccessor: "cat",
      frameType: "ordinal",
      projection: "horizontal",
      width: 400,
      height: 300,
      scales: {
        x: makeLinearScale([0, 30], [0, 400]),
        y: makeBandScale({ Low: 100, Mid: 150, High: 200 }),
        o: undefined as any,
      },
    }

    it("regresses against the value axis and projects categories through scale.y", () => {
      const result = rules({ type: "trend", method: "linear" }, 0, ctx)
      expect(result).not.toBeNull()
      const html = renderToStaticMarkup(result as React.ReactElement)
      expect(html).toContain("<polyline")
      // Regression input: (value=10, idx=0), (20, 1), (30, 2). y = 0.1x - 1
      // (perfectly linear). First trend point: x=10 → scaleX(10)=133.33,
      // y=0 → scaleY("Low")=100. Last: x=30 → scaleX(30)=400, y=2 →
      // scaleY("High")=200.
      expect(html).toMatch(/133\.\d+,100/)
      expect(html).toContain("400,200")
    })
  })

  describe("LOESS on ordinal frames", () => {
    const ctx: AnnotationContext = {
      data: [
        { cat: "A", value: 5 },
        { cat: "B", value: 8 },
        { cat: "C", value: 6 },
        { cat: "D", value: 12 },
        { cat: "E", value: 10 },
      ],
      xAccessor: "cat",
      yAccessor: "value",
      frameType: "ordinal",
      projection: "vertical",
      width: 500,
      height: 300,
      scales: {
        x: makeBandScale({ A: 50, B: 150, C: 250, D: 350, E: 450 }),
        y: makeLinearScale([0, 15], [300, 0]),
        o: undefined as any,
      },
    }

    it("produces a smoothed polyline through every category", () => {
      const result = rules({ type: "trend", method: "loess", bandwidth: 0.5 }, 0, ctx)
      expect(result).not.toBeNull()
      const html = renderToStaticMarkup(result as React.ReactElement)
      expect(html).toContain("<polyline")
      // 5 input points → 5 trend points → polyline spans 5 x,y pairs.
      const pointsAttr = html.match(/points="([^"]*)"/)?.[1] ?? ""
      const segments = pointsAttr.trim().split(/\s+/)
      expect(segments.length).toBe(5)
    })
  })

  describe("guards", () => {
    const baseCtx: AnnotationContext = {
      xAccessor: "cat",
      yAccessor: "value",
      frameType: "ordinal",
      projection: "vertical",
      width: 200,
      height: 200,
      scales: {
        x: makeBandScale({ A: 50, B: 150 }),
        y: makeLinearScale([0, 100], [200, 0]),
        o: undefined as any,
      },
    }

    it("returns null when fewer than 2 data points", () => {
      const ctx = { ...baseCtx, data: [{ cat: "A", value: 1 }] }
      expect(rules({ type: "trend" }, 0, ctx)).toBeNull()
    })

    it("returns null when scales aren't available", () => {
      const ctx = { ...baseCtx, data: [{ cat: "A", value: 1 }, { cat: "B", value: 2 }], scales: null }
      expect(rules({ type: "trend" }, 0, ctx)).toBeNull()
    })
  })
})
