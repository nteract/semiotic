// Polyfill TextEncoder/TextDecoder for react-dom/server in jsdom
import { TextEncoder, TextDecoder } from "util"
Object.assign(global, { TextEncoder, TextDecoder })

import * as React from "react"
import * as ReactDOMServer from "react-dom/server"
import { renderStaticAnnotations, type StaticAnnotationConfig } from "./staticAnnotations"
import { LIGHT_THEME, DARK_THEME } from "../store/ThemeStore"
import { scaleLinear } from "d3-scale"

function renderAnnotationsString(config: Parameters<typeof renderStaticAnnotations>[0]): string {
  const node = renderStaticAnnotations(config)
  if (!node) return ""
  return ReactDOMServer.renderToStaticMarkup(<svg>{node}</svg>)
}

const xScale = scaleLinear().domain([0, 100]).range([0, 400])
const yScale = scaleLinear().domain([0, 100]).range([300, 0])
const baseConfig: Omit<StaticAnnotationConfig, "annotations"> = {
  scales: { x: xScale, y: yScale },
  layout: { width: 400, height: 300 },
  theme: LIGHT_THEME,
}

describe("renderStaticAnnotations", () => {
  it("returns null for empty annotations", () => {
    expect(renderStaticAnnotations({ ...baseConfig, annotations: [] })).toBeNull()
  })

  it("returns null for undefined annotations", () => {
    expect(renderStaticAnnotations({ ...baseConfig, annotations: undefined })).toBeNull()
  })

  it("honors svgAnnotationRules for custom annotation types and falls through on null", () => {
    const svg = renderAnnotationsString({
      ...baseConfig,
      annotations: [
        { type: "range-middle", x: 50, y: 50, color: "#DB2777" },
        { type: "y-threshold", value: 25, label: "Floor" },
      ],
      svgAnnotationRules: (ann, i, context) => {
        if (ann.type !== "range-middle") return null
        const cx = context.scales?.x?.(ann.x as number)
        const cy = context.scales?.y?.(ann.y as number)
        if (cx == null || cy == null) return null
        return (
          <g key={`range-middle-${i}`} className="range-middle-overlay">
            <circle cx={cx} cy={cy} r={4} fill={String(ann.color)} />
          </g>
        )
      },
    })
    expect(svg).toContain("range-middle-overlay")
    expect(svg).toContain("#DB2777")
    // Built-in threshold still renders when the custom rule returns null.
    expect(svg).toContain("Floor")
  })

  it("projects geo coordinates before svgAnnotationRules (CSR/SSR parity)", () => {
    const svg = renderAnnotationsString({
      scales: {
        // Only a geo projection — no Cartesian data scales (geo frame shape).
        geoProjection: ([lon, lat]) => [lon * 3, lat * 2],
      },
      layout: { width: 400, height: 300 },
      theme: LIGHT_THEME,
      annotations: [
        { type: "geo-pin", coordinates: [10, 20], color: "#0E9AA7" },
      ],
      svgAnnotationRules: (ann, i, context) => {
        if (ann.type !== "geo-pin") return null
        // After pre-project: x=30, y=40; scales are identity pixel maps.
        const cx = context.scales?.x?.(ann.x as number)
        const cy = context.scales?.y?.(ann.y as number)
        if (cx == null || cy == null) return null
        return (
          <g key={`geo-pin-${i}`} className="geo-custom-pin">
            <circle cx={cx} cy={cy} r={6} fill={String(ann.color)} />
          </g>
        )
      },
    })
    expect(svg).toContain("geo-custom-pin")
    expect(svg).toContain("#0E9AA7")
    expect(svg).toContain('cx="30"')
    expect(svg).toContain('cy="40"')
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

    it("places a top-edge threshold label below its rule", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        annotations: [{ type: "y-threshold", value: 100, label: "Ceiling" }],
      })
      expect(svg).toContain('y="16"')
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
        scales: { y: yScale },
        annotations: [{ type: "x-threshold", value: 50 }],
      })
      expect(svg).toBe("")
    })

    it("keeps the default top label clear of the plot edge", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        annotations: [{ type: "x-threshold", value: 50, label: "Midpoint" }],
      })
      expect(svg).toContain('y="16"')
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

    it("extends to the domain max when y1 is missing", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        annotations: [{ type: "band", y0: 30 }],
      })
      expect(svg).toContain('<rect x="0" y="0" width="400" height="210"')
    })

    it("extends to the domain min when y0 is missing", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        annotations: [{ type: "band", y1: 70 }],
      })
      expect(svg).toMatch(/<rect x="0" y="90(\.\d+)?" width="400" height="210"/)
    })

    it("treats an explicit null bound the same as an omitted one", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        annotations: [{ type: "band", y0: 30, y1: null }],
      })
      expect(svg).toContain('<rect x="0" y="0" width="400" height="210"')
    })
  })

  describe("x-band", () => {
    it("renders a shaded vertical band using the x scale", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        annotations: [{ type: "x-band", x0: 20, x1: 60, color: "#7C5CFF" }],
      })
      expect(svg).toContain('<rect x="80" y="0" width="160" height="300"')
      expect(svg).toContain('fill="#7C5CFF"')
    })

    it("normalizes reversed bounds and renders a label", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        annotations: [{ type: "x-band", x0: 70, x1: 30, label: "Phase" }],
      })
      expect(svg).toContain('<rect x="120" y="0" width="160" height="300"')
      expect(svg).toContain("Phase")
    })

    it("keeps a top band label clear of the plot edge", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        annotations: [{ type: "x-band", x0: 20, x1: 60, label: "Phase" }],
      })
      expect(svg).toContain('y="16"')
    })

    it("extends to the domain max when x1 is missing", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        annotations: [{ type: "x-band", x0: 30 }],
      })
      expect(svg).toContain('<rect x="120" y="0" width="280" height="300"')
    })

    it("extends to the domain min when x0 is missing", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        annotations: [{ type: "x-band", x1: 70 }],
      })
      expect(svg).toContain('<rect x="0" y="0" width="280" height="300"')
    })

    it("treats an explicit null bound the same as an omitted one", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        annotations: [{ type: "x-band", x0: 30, x1: null }],
      })
      expect(svg).toContain('<rect x="120" y="0" width="280" height="300"')
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

    it("renders circle and rect callout subjects", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        annotations: [
          { type: "callout-circle", x: 25, y: 25, label: "Circle", radius: 16 },
          { type: "callout-rect", x: 75, y: 75, label: "Rect", width: 30, height: 20 },
        ],
      })
      expect(svg).toContain('<circle r="16"')
      expect(svg).toContain('width="30"')
      expect(svg).toContain('height="20"')
      expect(svg).toContain("Circle")
      expect(svg).toContain("Rect")
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

    it("auto-places geo coordinate labels with the static projection", () => {
      const svg = renderAnnotationsString({
        ...baseConfig,
        autoPlaceAnnotations: true,
        scales: { geoProjection: () => [384, 150] },
        annotations: [{ type: "label", coordinates: [5, 5], label: "Geo" }],
      })
      const x1Match = svg.match(/x1="([^"]+)"/)
      const x2Match = svg.match(/x2="([^"]+)"/)

      expect(svg).toContain("Geo")
      expect(svg).toContain('transform="translate(384,150)"')
      expect(x1Match).not.toBeNull()
      expect(x2Match).not.toBeNull()
      expect(Number(x1Match![1])).toBe(0)
      expect(Number(x2Match![1])).toBeLessThan(Number(x1Match![1]))
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
        scales: { o: bandScale },
        annotations: [{ type: "category-highlight", category: "A", color: "#ff6600" }],
      })
      expect(svg).toContain("<rect")
      expect(svg).toContain("#ff6600")
    })

    it("renders a vertical highlight label below the plot edge", () => {
      const bandScale = Object.assign(
        (v: string) => v === "A" ? 50 : undefined,
        { bandwidth: () => 80 },
      )
      const svg = renderAnnotationsString({
        ...baseConfig,
        scales: { o: bandScale },
        annotations: [{ type: "category-highlight", category: "A", label: "Focus" }],
      })
      expect(svg).toContain("Focus")
      expect(svg).toContain('y="16"')
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
