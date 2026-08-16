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

  it("extends to the domain min/max when a bound is missing (matches SSR)", () => {
    // x1 omitted → extends to the domain max (100 → px 400)
    const openEnd = renderToStaticMarkup(
      rules({ type: "x-band", x0: 20 }, 0, context) as React.ReactElement,
    )
    expect(openEnd).toContain('<rect x="80" y="0" width="320" height="200"')

    // x0 omitted → extends to the domain min (0 → px 0)
    const openStart = renderToStaticMarkup(
      rules({ type: "x-band", x1: 60 }, 0, context) as React.ReactElement,
    )
    expect(openStart).toContain('<rect x="0" y="0" width="240" height="200"')
  })

  it("treats an explicit null bound the same as an omitted one", () => {
    const svg = renderToStaticMarkup(
      rules({ type: "x-band", x0: 20, x1: null }, 0, context) as React.ReactElement,
    )
    expect(svg).toContain('<rect x="80" y="0" width="320" height="200"')
  })

  it("skips x-band when no x scale is available", () => {
    const node = rules(
      { type: "x-band", x0: 20, x1: 60 },
      0,
      { ...context, scales: {} },
    )
    expect(node).toBeNull()
  })

  it("extends band to the domain min/max when y0/y1 is missing", () => {
    // y1 omitted → domain max (100 → px 0, the top of the plot)
    const openTop = renderToStaticMarkup(
      rules({ type: "band", y0: 30 }, 0, context) as React.ReactElement,
    )
    expect(openTop).toContain('y="0" width="400" height="140"')

    // y0 omitted → domain min (0 → px 200, the bottom of the plot)
    const openBottom = renderToStaticMarkup(
      rules({ type: "band", y1: 70 }, 0, context) as React.ReactElement,
    )
    expect(openBottom).toMatch(/y="60(\.\d+)?" width="400" height="140"/)
  })

  // Regression: an explicit `fillOpacity` must reach the DOM proportionally —
  // no fixed ceiling, no group `opacity` silently multiplying it back down —
  // matching the server static renderer (`staticAnnotations.tsx`) exactly.
  it("defaults band fillOpacity to 0.1 when unset", () => {
    const svg = renderToStaticMarkup(
      rules({ type: "band", y0: 30, y1: 70 }, 0, context) as React.ReactElement,
    )
    expect(svg).toContain('fill-opacity="0.1"')
  })

  it("honors an explicit band fillOpacity override above the default", () => {
    const svg = renderToStaticMarkup(
      rules({ type: "band", y0: 30, y1: 70, fillOpacity: 0.9 }, 0, context) as React.ReactElement,
    )
    expect(svg).toContain('fill-opacity="0.9"')
  })

  it("honors an explicit x-band fillOpacity override above the default", () => {
    const svg = renderToStaticMarkup(
      rules({ type: "x-band", x0: 20, x1: 60, fillOpacity: 0.75 }, 0, context) as React.ReactElement,
    )
    expect(svg).toContain('fill-opacity="0.75"')
  })

  it("accepts color as the fill alias for y-bands, matching x-bands", () => {
    const svg = renderToStaticMarkup(
      rules({ type: "band", y0: 30, y1: 70, color: "#7C5CFF" }, 0, context) as React.ReactElement,
    )
    expect(svg).toContain('fill="#7C5CFF"')
  })

  it("renders serializable gradients for y- and x-bands with matching default directions", () => {
    const yBand = renderToStaticMarkup(
      rules({
        type: "band",
        y0: 30,
        y1: 70,
        gradient: { stops: [{ offset: 0, color: "#f00" }, { offset: 1, color: "#00f", opacity: 0.2 }] },
      }, 0, context) as React.ReactElement,
    )
    const xBand = renderToStaticMarkup(
      rules({
        type: "x-band",
        x0: 20,
        x1: 60,
        gradient: { stops: [{ offset: 0, color: "#f00" }, { offset: 1, color: "#00f" }] },
      }, 1, context) as React.ReactElement,
    )

    expect(yBand).toContain('<linearGradient id="ann-0-gradient"')
    expect(yBand).toContain('y2="100%"')
    expect(yBand).toContain('fill="url(#ann-0-gradient)"')
    expect(yBand).toContain('stop-opacity="0.2"')
    expect(xBand).toContain('<linearGradient id="ann-1-gradient"')
    expect(xBand).toContain('x2="100%"')
    expect(xBand).toContain('fill="url(#ann-1-gradient)"')
  })

  it("uses a string fill as the fallback color for gradient stops", () => {
    const svg = renderToStaticMarkup(
      rules({
        type: "band",
        y0: 30,
        y1: 70,
        fill: "#00ff00",
        gradient: { stops: [{ offset: 0 }, { offset: 1 }] },
      }, 0, context) as React.ReactElement,
    )

    expect(svg).toContain('stop-color="#00ff00"')
  })
})

describe("top annotation label clearance", () => {
  it("keeps threshold and band labels clear of the plot edge", () => {
    const xThreshold = renderToStaticMarkup(
      rules({ type: "x-threshold", value: 20, label: "Start" }, 0, context) as React.ReactElement,
    )
    const xBand = renderToStaticMarkup(
      rules({ type: "x-band", x0: 20, x1: 60, label: "Phase" }, 0, context) as React.ReactElement,
    )
    const topYThreshold = renderToStaticMarkup(
      rules({ type: "y-threshold", value: 100, label: "Ceiling" }, 0, context) as React.ReactElement,
    )

    expect(xThreshold).toContain('y="16"')
    expect(xBand).toContain('y="16"')
    // A threshold on the top plot edge labels below its rule rather than
    // escaping upward into title chrome.
    expect(topYThreshold).toContain('y="16"')
  })
})
