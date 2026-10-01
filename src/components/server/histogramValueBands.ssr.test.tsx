import { describe, expect, it } from "vitest"
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { renderChart, renderChartWithEvidence } from "./renderToStaticSVG"
import { TemporalHistogram } from "../charts/realtime/RealtimeHistogram"

const data = [
  { time: 0, value: 12 },
  { time: 1000, value: 4 },
  { time: 2000, value: 8 },
]
const props = {
  data,
  binSize: 1000,
  width: 420,
  height: 240,
  valueExtent: [0, 12] as [number, number],
  fill: "#64748b",
  valueBands: [
    { upTo: 5, fill: "#2563eb" },
    { upTo: 10, fill: { type: "hatch" as const, background: "#fde68a", stroke: "#b45309", spacing: 5 } },
    { fill: { type: "hatch" as const, background: "#fecaca", stroke: "#b91c1c", spacing: 5 } },
  ],
}

describe("TemporalHistogram valueBands in static SVG", () => {
  it("paints each bar in its value bands on both server paths", () => {
    const svg = renderChart("TemporalHistogram", props)
    const html = renderToStaticMarkup(<TemporalHistogram {...props} />)
    for (const markup of [svg, html]) {
      expect(markup).toContain('fill="#2563eb"')
      expect(markup).toMatch(/<pattern[^>]*id="[^"]*-band-1"/)
      expect(markup).toMatch(/<pattern[^>]*id="[^"]*-band-2"/)
      // The bar's own fill only shows where no band applies — nowhere here.
      expect(markup).not.toContain('fill="#64748b"')
    }
  })

  it("keeps one mark per bin", () => {
    const banded = renderChartWithEvidence("TemporalHistogram", props).evidence
    const plain = renderChartWithEvidence("TemporalHistogram", { ...props, valueBands: undefined }).evidence
    expect(banded.markCount).toBeGreaterThan(0)
    expect(banded.markCount).toBe(plain.markCount)
  })
})
