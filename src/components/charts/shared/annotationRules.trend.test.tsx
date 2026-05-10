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

  // Horizontal projection: values on x-pixel-axis (linear),
  // categories on y-pixel-axis (band scale). At the AnnotationContext
  // level, xAccessor/yAccessor still map to oAccessor (category) /
  // rAccessor (value) respectively — projection only changes pixel
  // projection through scales.x / scales.y, NOT which data field is
  // categorical vs numeric. This mirrors how StreamOrdinalFrame
  // forwards accessors to OrdinalSVGOverlay (both projections pass
  // xAccessor=oAccessor, yAccessor=rAccessor).
  describe("horizontal projection", () => {
    const ctx: AnnotationContext = {
      data: [
        { cat: "Low", value: 10 },
        { cat: "Mid", value: 20 },
        { cat: "High", value: 30 },
      ],
      xAccessor: "cat",
      yAccessor: "value",
      frameType: "ordinal",
      projection: "horizontal",
      width: 400,
      height: 300,
      scales: {
        // In horizontal projection scales.x is the linear value scale
        // and scales.y is the band-centered category scale. The
        // accessors above are still category/value — only the pixel
        // axis flips.
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
      // Regression input: (catIdx=0, value=10), (1, 20), (2, 30). The
      // perfect fit is value = 10*idx + 10. First trend point: idx=0
      // → scaleY("Low")=100, value=10 → scaleX(10)=133.33. Last:
      // idx=2 → scaleY("High")=200, value=30 → scaleX(30)=400.
      expect(html).toMatch(/133\.\d+,100/)
      expect(html).toContain("400,200")
    })
  })

  // The trend handler reads `data[xAccessor]` / `data[yAccessor]`
  // with string keys. When the chart's user accessor is a function,
  // StreamOrdinalFrame bakes the resolved value under a synthetic
  // string key (via `annotationAccessorResolver`) and forwards that
  // synthetic key as the annotation context's xAccessor — so this
  // handler works against the synthetic-keyed shape uniformly.
  // This test pins the integration: a synthetic key correctly
  // surfaces into the trend regression path.
  describe("function accessor → synthetic key path", () => {
    const ctx: AnnotationContext = {
      // What StreamOrdinalFrame produces when categoryAccessor is
      // function-valued: synthetic keys, baked values.
      data: [
        { __semiotic_resolvedO: "Q1", __semiotic_resolvedR: 10 },
        { __semiotic_resolvedO: "Q2", __semiotic_resolvedR: 20 },
        { __semiotic_resolvedO: "Q3", __semiotic_resolvedR: 30 },
      ],
      xAccessor: "__semiotic_resolvedO",
      yAccessor: "__semiotic_resolvedR",
      frameType: "ordinal",
      projection: "vertical",
      width: 400,
      height: 200,
      scales: {
        x: makeBandScale({ Q1: 50, Q2: 200, Q3: 350 }),
        y: makeLinearScale([0, 50], [200, 0]),
        o: undefined as any,
      },
    }

    it("regresses through synthetic-keyed annotation data", () => {
      const result = rules({ type: "trend", method: "linear" }, 0, ctx)
      expect(result).not.toBeNull()
      const html = renderToStaticMarkup(result as React.ReactElement)
      expect(html).toContain("<polyline")
      // First trend point: idx=0 → x=50, y=10 → 160. Last:
      // idx=2 → x=350, y=30 → 80.
      expect(html).toContain("50,160")
      expect(html).toContain("350,80")
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
