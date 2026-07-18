// @vitest-environment node
/**
 * SSR fidelity for two marks that used to degrade on the server-only
 * `renderChart` path:
 *
 *  1. **Hatch fill** — `createHatchPattern` returns a `CanvasPattern` in the
 *     browser but couldn't in Node, so a `pieceStyle` doing
 *     `createHatchPattern(...) ?? color` fell back to the solid color and the
 *     SSR SVG lost the hatch. It now returns a serializable `HatchFill`
 *     descriptor when no canvas exists, which the SVG path renders as a
 *     `<pattern>`.
 *  2. **Range/dumbbell candlestick** — the SVG converter always drew the body
 *     rect, so a high/low-only ("range mode") CandlestickChart rendered as a
 *     filled bar server-side while the canvas drew a line + endpoint bulbs.
 *
 * This file runs in the **node** environment on purpose: jsdom supplies a
 * `document`, so `createHatchPattern` would take the canvas branch and never
 * exercise the descriptor fallback that real SSR (Node, no DOM) hits.
 */
import { describe, it, expect } from "vitest"
import { renderChart } from "./renderToStaticSVG"
import { createHatchPattern } from "../charts/shared/hatchPattern"
import { isHatchFill } from "../charts/shared/hatchFill"

describe("createHatchPattern SSR fallback", () => {
  it("returns a HatchFill descriptor when no canvas is available", () => {
    const h = createHatchPattern({ background: "transparent", stroke: "#6C4EE8", spacing: 6, angle: 45 })
    expect(isHatchFill(h)).toBe(true)
    expect(h).toMatchObject({ type: "hatch", stroke: "#6C4EE8", spacing: 6, angle: 45 })
  })

  it("a swimlane pieceStyle using createHatchPattern renders an SSR <pattern>", () => {
    // Mirror how a downstream thin-bar computes the hatch once and reuses it in
    // pieceStyle — the exact path that used to collapse to a solid fill in SSR.
    const fill = "#6C4EE8"
    const hatch = createHatchPattern({ background: "transparent", stroke: fill, spacing: 6, angle: 45 })
    const svg = renderChart("SwimlaneChart", {
      data: [
        { category: "progress", segment: "Used", value: 60 },
        { category: "progress", segment: "Available", value: 40 },
      ],
      categoryAccessor: "category",
      subcategoryAccessor: "segment",
      valueAccessor: "value",
      orientation: "horizontal",
      valueExtent: [0, 100],
      barPadding: 0,
      showAxes: false,
      showLegend: false,
      width: 400,
      height: 40,
      frameProps: {
        pieceStyle: (d: Record<string, unknown>) =>
          d.segment === "Available" ? { fill: hatch ?? fill } : { fill },
      },
    })
    expect(svg).toContain("<pattern")
    expect(svg).toMatch(/fill="url\(#/)
  })
})

describe("CandlestickChart range mode SSR", () => {
  it("renders a dumbbell (endpoint bulbs), not a filled body rect", () => {
    const svg = renderChart("CandlestickChart", {
      data: [
        { t: 1, high: 80, low: 40 },
        { t: 2, high: 90, low: 50 },
        { t: 3, high: 70, low: 30 },
      ],
      xAccessor: "t",
      highAccessor: "high",
      lowAccessor: "low",
      width: 400,
      height: 240,
    })
    // Two bulbs per point (high + low), zero candlestick body rects.
    expect((svg.match(/<circle/g) ?? []).length).toBe(6)
  })

  it("still renders bodies for a true OHLC candlestick", () => {
    const svg = renderChart("CandlestickChart", {
      data: [
        { t: 1, open: 50, close: 70, high: 80, low: 40 },
        { t: 2, open: 70, close: 60, high: 90, low: 50 },
      ],
      xAccessor: "t",
      openAccessor: "open",
      closeAccessor: "close",
      highAccessor: "high",
      lowAccessor: "low",
      width: 400,
      height: 240,
    })
    // OHLC mode: body rects, no dumbbell bulbs.
    expect((svg.match(/<circle/g) ?? []).length).toBe(0)
    expect((svg.match(/<rect/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })
})
