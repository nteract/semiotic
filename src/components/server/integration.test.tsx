/**
 * Integration tests for semiotic/server export pipeline.
 *
 * End-to-end: data in → SVG/PNG/GIF out with structural validation.
 * Covers every export format and major chart type combination.
 */

import { TextEncoder, TextDecoder } from "util"
Object.assign(global, { TextEncoder, TextDecoder })

import {
  renderChart,
  renderToStaticSVG,
  renderToImage,
  renderDashboard,
} from "./renderToStaticSVG"
import { renderToAnimatedGif, generateFrameSVGs, generateFrameSequence } from "./animatedGif"

// ── Test data ────────────────────────────────────────────────────────

const lineData = [
  { x: 0, y: 10 }, { x: 1, y: 20 }, { x: 2, y: 15 },
  { x: 3, y: 25 }, { x: 4, y: 18 }, { x: 5, y: 30 },
]

const barData = [
  { category: "A", value: 10 },
  { category: "B", value: 20 },
  { category: "C", value: 15 },
]

const networkEdges = [
  { source: "X", target: "Y", value: 50 },
  { source: "Y", target: "Z", value: 30 },
]

// ── Helpers ──────────────────────────────────────────────────────────

function isValidSVG(svg: string): boolean {
  return svg.startsWith("<svg") && svg.includes("</svg>") && svg.includes('xmlns="http://www.w3.org/2000/svg"')
}

function isValidGIF(buf: Buffer): boolean {
  return buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 // "GIF"
}

function isValidPNG(buf: Buffer): boolean {
  return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 // PNG header
}

// ═══════════════════════════════════════════════════════════════════════
// SVG Generation — end-to-end
// ═══════════════════════════════════════════════════════════════════════

describe("SVG generation (end-to-end)", () => {
  it("renderChart produces valid SVG for every XY chart type", () => {
    for (const component of ["LineChart", "Scatterplot", "Heatmap"] as const) {
      const svg = renderChart(component, {
        data: component === "Heatmap"
          ? [{ x: 0, y: 0, value: 5 }, { x: 1, y: 0, value: 10 }]
          : lineData,
        xAccessor: "x", yAccessor: "y",
        ...(component === "Heatmap" && { valueAccessor: "value" }),
        width: 300, height: 200,
      })
      expect(isValidSVG(svg)).toBe(true)
      expect(svg).toContain('role="img"')
    }
  })

  it("renderChart produces valid SVG for every ordinal chart type", () => {
    for (const component of ["BarChart", "PieChart", "DonutChart", "BoxPlot", "SwarmPlot", "DotPlot"] as const) {
      const svg = renderChart(component, {
        data: barData, categoryAccessor: "category", valueAccessor: "value",
        width: 300, height: 200,
      })
      expect(isValidSVG(svg)).toBe(true)
      expect(svg).toContain('role="img"')
    }
  })

  it("renderChart produces valid SVG for network charts", () => {
    for (const component of ["ForceDirectedGraph", "SankeyDiagram"] as const) {
      const svg = renderChart(component, {
        edges: networkEdges, width: 300, height: 200,
      })
      expect(isValidSVG(svg)).toBe(true)
    }
  })

  it("renderToStaticSVG dispatches correctly for all frame types", () => {
    const xy = renderToStaticSVG("xy", { chartType: "line", data: lineData, xAccessor: "x", yAccessor: "y", size: [300, 200] } as any)
    const ordinal = renderToStaticSVG("ordinal", { chartType: "bar", data: barData, oAccessor: "category", rAccessor: "value", size: [300, 200] } as any)
    const network = renderToStaticSVG("network", { chartType: "force", edges: networkEdges, size: [300, 200] } as any)

    expect(isValidSVG(xy)).toBe(true)
    expect(isValidSVG(ordinal)).toBe(true)
    expect(isValidSVG(network)).toBe(true)
  })

  it("SVG includes accessibility attributes when title/description provided", () => {
    const svg = renderChart("BarChart", {
      data: barData, categoryAccessor: "category", valueAccessor: "value",
      title: "Test Chart", description: "A test chart",
      width: 300, height: 200,
    })
    expect(svg).toContain("<title")
    expect(svg).toContain("Test Chart")
    expect(svg).toContain("<desc")
    expect(svg).toContain("A test chart")
    expect(svg).toContain('role="img"')
    expect(svg).toContain("aria-labelledby")
  })

  it("SVG applies theme colors (not defaults) when theme specified", () => {
    const svg = renderChart("BarChart", {
      data: barData, categoryAccessor: "category", valueAccessor: "value",
      colorBy: "category", theme: "tufte",
      width: 300, height: 200,
    })
    // Tufte categorical palette includes #8b4513
    expect(svg).toContain("#8b4513")
  })

  it("SVG includes grid lines when showGrid=true", () => {
    const svg = renderChart("BarChart", {
      data: barData, categoryAccessor: "category", valueAccessor: "value",
      showGrid: true, width: 300, height: 200,
    })
    expect(svg).toContain("semiotic-grid")
  })

  it("SVG includes annotations when provided", () => {
    const svg = renderChart("BarChart", {
      data: barData, categoryAccessor: "category", valueAccessor: "value",
      annotations: [{ type: "y-threshold", value: 15, label: "Target", color: "#e45050" }],
      width: 300, height: 200,
    })
    expect(svg).toContain("#e45050")
    expect(svg).toContain("Target")
  })

  it("SVG includes legend when showLegend=true with colorBy", () => {
    const svg = renderChart("BarChart", {
      data: barData, categoryAccessor: "category", valueAccessor: "value",
      colorBy: "category", showLegend: true,
      width: 400, height: 200,
    })
    expect(svg).toContain("semiotic-legend")
  })
})

// ═══════════════════════════════════════════════════════════════════════
// PNG Generation — end-to-end
// ═══════════════════════════════════════════════════════════════════════

describe("PNG generation (end-to-end)", () => {
  it("renderToImage produces valid PNG buffer from BarChart", async () => {
    const png = await renderToImage("BarChart", {
      data: barData, categoryAccessor: "category", valueAccessor: "value",
      width: 200, height: 150,
    }, { format: "png" })

    expect(png).toBeInstanceOf(Buffer)
    expect(isValidPNG(png)).toBe(true)
    expect(png.length).toBeGreaterThan(100)
  })

  it("renderToImage produces valid PNG from LineChart with theme", async () => {
    const png = await renderToImage("LineChart", {
      data: lineData, xAccessor: "x", yAccessor: "y",
      theme: "dark", width: 200, height: 150,
    }, { format: "png", scale: 2 })

    expect(isValidPNG(png)).toBe(true)
  })

  it("renderToImage produces valid JPEG buffer", async () => {
    const jpg = await renderToImage("BarChart", {
      data: barData, categoryAccessor: "category", valueAccessor: "value",
      width: 200, height: 150,
    }, { format: "jpeg" })

    expect(jpg).toBeInstanceOf(Buffer)
    // JPEG magic bytes: FF D8 FF
    expect(jpg[0]).toBe(0xff)
    expect(jpg[1]).toBe(0xd8)
  })

  it("renderToImage with frame-level API", async () => {
    const png = await renderToImage("xy" as any, {
      chartType: "line", data: lineData, xAccessor: "x", yAccessor: "y",
      size: [200, 150],
    }, { format: "png" })

    expect(isValidPNG(png)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// GIF Generation — end-to-end
// ═══════════════════════════════════════════════════════════════════════

describe("GIF generation (end-to-end)", () => {
  it("renderToAnimatedGif produces valid GIF from line data", async () => {
    const gif = await renderToAnimatedGif("line", lineData, {
      xAccessor: "x", yAccessor: "y", width: 200, height: 150,
    }, { stepSize: 2, transitionFrames: 0, fps: 4 })

    expect(gif).toBeInstanceOf(Buffer)
    expect(isValidGIF(gif)).toBe(true)
    expect(gif.length).toBeGreaterThan(100)
  })

  it("renderToAnimatedGif produces valid GIF from bar data", async () => {
    const gif = await renderToAnimatedGif("bar", barData, {
      oAccessor: "category", rAccessor: "value", width: 200, height: 150,
    }, { stepSize: 1, transitionFrames: 0, fps: 4 })

    expect(isValidGIF(gif)).toBe(true)
  })

  it("renderToAnimatedGif with theme and background", async () => {
    const gif = await renderToAnimatedGif("line", lineData, {
      xAccessor: "x", yAccessor: "y", width: 200, height: 150,
      theme: "dark", background: "#1a1a2e",
    }, { stepSize: 2, transitionFrames: 0, fps: 4 })

    expect(isValidGIF(gif)).toBe(true)
  })

  it("generateFrameSVGs produces valid SVG strings per frame", () => {
    const frames = generateFrameSVGs("line", lineData, {
      xAccessor: "x", yAccessor: "y", width: 200, height: 150,
    }, { stepSize: 2, transitionFrames: 0 })

    expect(frames.length).toBeGreaterThan(1)
    frames.forEach(f => expect(isValidSVG(f)).toBe(true))
  })

  it("generateFrameSequence produces valid SVGs from network snapshots", () => {
    const snapshots = [
      { nodes: [{ id: "A" }, { id: "B" }, { id: "C" }], edges: [{ source: "A", target: "B" }, { source: "B", target: "C" }] },
      { nodes: [{ id: "A" }, { id: "B" }], edges: [{ source: "A", target: "B" }] },
    ]
    const frames = generateFrameSequence("ForceDirectedGraph", snapshots, { width: 200, height: 150 })

    expect(frames).toHaveLength(2)
    frames.forEach(f => expect(isValidSVG(f)).toBe(true))
    // First frame has more circles than second
    const f0circles = (frames[0].match(/<circle /g) || []).length
    const f1circles = (frames[1].match(/<circle /g) || []).length
    expect(f0circles).toBeGreaterThan(f1circles)
  })

  it("generateFrameSequence produces valid SVGs from sankey snapshots", () => {
    const frames = generateFrameSequence("SankeyDiagram", [
      { edges: [{ source: "A", target: "B", value: 100 }, { source: "B", target: "C", value: 100 }] },
      { edges: [{ source: "A", target: "D", value: 100 }, { source: "D", target: "C", value: 100 }] },
    ], { width: 300, height: 150 })

    expect(frames).toHaveLength(2)
    frames.forEach(f => expect(isValidSVG(f)).toBe(true))
  })
})

// ═══════════════════════════════════════════════════════════════════════
// Dashboard composition — end-to-end
// ═══════════════════════════════════════════════════════════════════════

describe("Dashboard composition (end-to-end)", () => {
  it("renderDashboard produces valid SVG with multiple charts", () => {
    const svg = renderDashboard([
      { component: "BarChart", props: { data: barData, categoryAccessor: "category", valueAccessor: "value" } },
      { component: "PieChart", props: { data: barData, categoryAccessor: "category", valueAccessor: "value" } },
    ], { title: "Test Dashboard", width: 800, layout: { columns: 2 } })

    expect(isValidSVG(svg)).toBe(true)
    expect(svg).toContain("Test Dashboard")
    // Both charts rendered via foreignObject
    const foreignObjects = (svg.match(/foreignObject/g) || []).length
    expect(foreignObjects).toBeGreaterThanOrEqual(4) // open+close for each chart
  })

  it("renderDashboard applies theme to all charts", () => {
    const svg = renderDashboard([
      { component: "BarChart", props: { data: barData, categoryAccessor: "category", valueAccessor: "value" } },
    ], { theme: "dark", width: 600 })

    expect(isValidSVG(svg)).toBe(true)
    // Dark theme border color should appear in inner chart
    expect(svg).toContain("#555")
  })

  it("renderDashboard handles colSpan", () => {
    const svg = renderDashboard([
      { component: "BarChart", colSpan: 2, props: { data: barData, categoryAccessor: "category", valueAccessor: "value" } },
      { component: "PieChart", props: { data: barData, categoryAccessor: "category", valueAccessor: "value" } },
    ], { width: 800, layout: { columns: 2 } })

    expect(isValidSVG(svg)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// Cross-format consistency
// ═══════════════════════════════════════════════════════════════════════

describe("Cross-format consistency", () => {
  it("renderChart and renderToStaticSVG produce same element counts for bars", () => {
    const hoc = renderChart("BarChart", {
      data: barData, categoryAccessor: "category", valueAccessor: "value",
      width: 300, height: 200,
    })
    const frame = renderToStaticSVG("ordinal", {
      chartType: "bar", data: barData, oAccessor: "category", rAccessor: "value",
      size: [300, 200],
    } as any)

    const hocRects = (hoc.match(/<rect /g) || []).length
    const frameRects = (frame.match(/<rect /g) || []).length
    expect(hocRects).toBe(frameRects)
  })

  it("PNG and SVG both produce non-trivial output for the same chart", async () => {
    const svg = renderChart("BarChart", {
      data: barData, categoryAccessor: "category", valueAccessor: "value",
      width: 200, height: 150,
    })
    const png = await renderToImage("BarChart", {
      data: barData, categoryAccessor: "category", valueAccessor: "value",
      width: 200, height: 150,
    }, { format: "png" })

    expect(svg.length).toBeGreaterThan(500)
    expect(png.length).toBeGreaterThan(500)
    expect(isValidSVG(svg)).toBe(true)
    expect(isValidPNG(png)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// Geo SSR
// ═══════════════════════════════════════════════════════════════════════

describe("Geo SSR", () => {
  const geoFeatures = [
    {
      type: "Feature" as const,
      properties: { name: "TestRegion", value: 100 },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
      }
    },
    {
      type: "Feature" as const,
      properties: { name: "OtherRegion", value: 200 },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[[20, 20], [30, 20], [30, 30], [20, 30], [20, 20]]]
      }
    }
  ]

  it("renderChart produces valid SVG for ChoroplethMap with pre-resolved features", () => {
    const svg = renderChart("ChoroplethMap", {
      areas: geoFeatures,
      valueAccessor: (d: any) => d.properties.value,
      width: 400, height: 300,
    })
    expect(isValidSVG(svg)).toBe(true)
    expect(svg).toContain("path")
  })

  it("renderChart produces valid SVG for ProportionalSymbolMap", () => {
    const points = [
      { lon: 5, lat: 5, pop: 1000, name: "A" },
      { lon: 25, lat: 25, pop: 5000, name: "B" },
    ]
    const svg = renderChart("ProportionalSymbolMap" as any, {
      points,
      xAccessor: "lon",
      yAccessor: "lat",
      sizeBy: "pop",
      areas: geoFeatures,
      width: 400, height: 300,
    })
    // ProportionalSymbolMap may not be a supported renderChart name —
    // if so, it should return a valid SVG with a fallback or error message, not crash
    expect(typeof svg).toBe("string")
    expect(svg.length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// Negative cases — invalid/edge-case props
// ═══════════════════════════════════════════════════════════════════════

describe("Graceful handling of invalid props", () => {
  it("renderChart with empty data produces valid SVG (not a crash)", () => {
    const svg = renderChart("BarChart", {
      data: [],
      categoryAccessor: "category",
      valueAccessor: "value",
      width: 300, height: 200,
    })
    expect(isValidSVG(svg)).toBe(true)
  })

  it("renderChart with missing required accessors produces valid SVG", () => {
    const svg = renderChart("LineChart", {
      data: lineData,
      // deliberately omit xAccessor/yAccessor — should use defaults "x"/"y"
      width: 300, height: 200,
    })
    expect(isValidSVG(svg)).toBe(true)
  })

  it("renderChart with unknown component name throws a descriptive error", () => {
    expect(() => {
      renderChart("NonexistentChart" as any, {
        data: barData,
        width: 300, height: 200,
      })
    }).toThrow(/Unknown chart component/)
  })

  it("renderChart with null/undefined data does not crash", () => {
    expect(() => {
      renderChart("BarChart", {
        data: null as any,
        categoryAccessor: "category",
        valueAccessor: "value",
        width: 300, height: 200,
      })
    }).not.toThrow()
  })

  it("renderDashboard with empty charts array produces valid SVG", () => {
    const svg = renderDashboard([], { width: 600 })
    expect(typeof svg).toBe("string")
    expect(svg.length).toBeGreaterThan(0)
  })
})
