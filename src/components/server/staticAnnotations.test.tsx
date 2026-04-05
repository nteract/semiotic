// Polyfill TextEncoder/TextDecoder for react-dom/server in jsdom
import { TextEncoder, TextDecoder } from "util"
Object.assign(global, { TextEncoder, TextDecoder })

import * as React from "react"
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ReactDOMServer = require("react-dom/server") as { renderToStaticMarkup: (el: React.ReactElement) => string }
import { renderStaticAnnotations } from "./staticAnnotations"
import { LIGHT_THEME, DARK_THEME } from "../store/ThemeStore"
import { scaleLinear } from "d3-scale"

function renderAnnotationsString(config: Parameters<typeof renderStaticAnnotations>[0]): string {
  const node = renderStaticAnnotations(config)
  if (!node) return ""
  return ReactDOMServer.renderToStaticMarkup(<svg>{node}</svg>)
}

const xScale = scaleLinear().domain([0, 100]).range([0, 400])
const yScale = scaleLinear().domain([0, 100]).range([300, 0])
const baseConfig = {
  scales: { x: xScale as any, y: yScale as any },
  layout: { width: 400, height: 300 },
  theme: LIGHT_THEME,
  frameType: "xy" as const,
}

describe("renderStaticAnnotations", () => {
  it("returns null for empty annotations", () => {
    expect(renderStaticAnnotations({ ...baseConfig, annotations: [] })).toBeNull()
  })

  it("returns null for undefined annotations", () => {
    expect(renderStaticAnnotations({ ...baseConfig, annotations: undefined as any })).toBeNull()
  })

  describe("y-threshold", () => {
    it("renders horizontal dashed line at data value", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        annotations: [{ type: "y-threshold", value: 50, label: "Target" }],
      })
      expect(svg).toContain("semiotic-annotations")
      expect(svg).toContain("<line")
      expect(svg).toContain("6,4") // default dash array
      expect(svg).toContain("Target")
    })

    it("uses custom color", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        annotations: [{ type: "y-threshold", value: 50, color: "#ff0000" }],
      })
      expect(svg).toContain("#ff0000")
    })

    it("positions label on the left when specified", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        annotations: [{ type: "y-threshold", value: 50, label: "Left", labelPosition: "left" }],
      })
      expect(svg).toContain('text-anchor="start"')
    })

    it("positions label in center when specified", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        annotations: [{ type: "y-threshold", value: 50, label: "Center", labelPosition: "center" }],
      })
      expect(svg).toContain('text-anchor="middle"')
    })

    it("skips when value is null", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        annotations: [{ type: "y-threshold", value: null }],
      })
      expect(svg).toBe("")
    })
  })

  describe("x-threshold", () => {
    it("renders vertical dashed line at data value", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        annotations: [{ type: "x-threshold", value: 50, label: "Midpoint" }],
      })
      expect(svg).toContain("<line")
      expect(svg).toContain("Midpoint")
    })

    it("skips without x scale", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        scales: { y: yScale as any },
        annotations: [{ type: "x-threshold", value: 50 }],
      })
      expect(svg).toBe("")
    })
  })

  describe("band", () => {
    it("renders shaded horizontal band", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        annotations: [{ type: "band", y0: 30, y1: 70, label: "Range", fill: "#aabbcc" }],
      })
      expect(svg).toContain("<rect")
      expect(svg).toContain("#aabbcc")
      expect(svg).toContain("Range")
    })

    it("uses default opacity", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        annotations: [{ type: "band", y0: 30, y1: 70 }],
      })
      expect(svg).toContain('opacity="0.1"')
    })

    it("skips when y0 or y1 missing", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        annotations: [{ type: "band", y0: 30 }],
      })
      expect(svg).toBe("")
    })
  })

  describe("label / text", () => {
    it("renders text at data coordinates", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        annotations: [{ type: "text", x: 50, y: 50, label: "Hello" }],
      })
      expect(svg).toContain("Hello")
    })

    it("renders label with connector line", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        annotations: [{ type: "label", x: 50, y: 50, label: "Note", dx: 30, dy: -20 }],
      })
      expect(svg).toContain("Note")
      expect(svg).toContain("<line") // connector
    })

    it("resolves coordinates from accessors", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        xAccessor: "time",
        yAccessor: "val",
        annotations: [{ type: "text", time: 25, val: 75, label: "Point" }],
      })
      expect(svg).toContain("Point")
    })

    it("skips when coordinates cannot be resolved", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        annotations: [{ type: "text", label: "Missing coords" }],
      })
      expect(svg).toBe("")
    })
  })

  describe("category-highlight", () => {
    it("renders highlight rect for ordinal category", () => {
      const bandScale = Object.assign(
        (v: string) => v === "A" ? 50 : v === "B" ? 150 : 250,
        { bandwidth: () => 80 }
      )
      const svg = renderAnnotationsString({
        ...baseConfig,
        scales: { o: bandScale as any },
        annotations: [{ type: "category-highlight", category: "A", color: "#ff6600" }],
      })
      expect(svg).toContain("<rect")
      expect(svg).toContain("#ff6600")
    })

    it("skips when scale is missing", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        annotations: [{ type: "category-highlight", category: "A" }],
      })
      expect(svg).toBe("")
    })
  })

  describe("multiple annotations", () => {
    it("renders all annotations", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        annotations: [
          { type: "y-threshold", value: 50, label: "Target" },
          { type: "x-threshold", value: 25, label: "Start" },
          { type: "text", x: 75, y: 75, label: "Point" },
        ],
      })
      expect(svg).toContain("Target")
      expect(svg).toContain("Start")
      expect(svg).toContain("Point")
    })
  })

  describe("theme integration", () => {
    it("uses dark theme colors", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        theme: DARK_THEME,
        annotations: [{ type: "text", x: 50, y: 50, label: "Dark" }],
      })
      expect(svg).toContain(DARK_THEME.colors.text)
    })
  })
})
