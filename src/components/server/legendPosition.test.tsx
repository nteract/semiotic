import { TextEncoder, TextDecoder } from "util"
Object.assign(global, { TextEncoder, TextDecoder })

import { renderChart } from "./renderToStaticSVG"

function getLegendTranslate(svg: string): { tx: number; ty: number } | null {
  const match = svg.match(/class="semiotic-legend"[^>]*transform="translate\(([\d.]+),([\d.]+)\)"/)
    || svg.match(/semiotic-legend[^"]*"[^>]*transform="translate\(([\d.]+),([\d.]+)\)"/)
  if (!match) {
    // Try alternate pattern — g with translate containing semiotic-legend
    const gMatch = svg.match(/<g[^>]*transform="translate\(([\d.]+),([\d.]+)\)"[^>]*class="semiotic-legend"/)
    if (!gMatch) return null
    return { tx: parseFloat(gMatch[1]), ty: parseFloat(gMatch[2]) }
  }
  return { tx: parseFloat(match[1]), ty: parseFloat(match[2]) }
}

function getSvgDimensions(svg: string): { width: number; height: number } {
  const w = svg.match(/width="(\d+)"/)
  const h = svg.match(/height="(\d+)"/)
  return { width: parseInt(w?.[1] || "0"), height: parseInt(h?.[1] || "0") }
}

const barData = [
  { category: "A", value: 10, group: "X" },
  { category: "B", value: 20, group: "Y" },
  { category: "C", value: 15, group: "X" },
]

const lineData = [
  { x: 1, y: 10, series: "Alpha" },
  { x: 2, y: 20, series: "Alpha" },
  { x: 1, y: 5, series: "Beta" },
  { x: 2, y: 15, series: "Beta" },
]

// ═══════════════════════════════════════════════════════════════════════
// Legend visibility — must be within SVG bounds
// ═══════════════════════════════════════════════════════════════════════

describe("Server legend positioning", () => {
  describe("right position (default)", () => {
    it("ordinal legend is visible within SVG bounds", () => {
      const svg = renderChart("BarChart", {
        data: barData, categoryAccessor: "category", valueAccessor: "value",
        colorBy: "group", showLegend: true,
        width: 500, height: 300,
      })

      expect(svg).toContain("semiotic-legend")
      const pos = getLegendTranslate(svg)
      expect(pos).not.toBeNull()
      const dims = getSvgDimensions(svg)
      // Legend must start within the SVG width — not clipped off the right edge
      expect(pos!.tx).toBeLessThan(dims.width)
      expect(pos!.tx).toBeGreaterThan(0)
      // Should not overlap the chart area — should be in the right margin
      // Chart inner area ends at width - margin.right, legend starts after that
      expect(pos!.tx).toBeGreaterThan(dims.width * 0.5)
    })

    it("XY legend is visible within SVG bounds", () => {
      const svg = renderChart("LineChart", {
        data: lineData, xAccessor: "x", yAccessor: "y",
        lineBy: "series", colorBy: "series", showLegend: true,
        width: 500, height: 300,
      })

      expect(svg).toContain("semiotic-legend")
      const pos = getLegendTranslate(svg)
      expect(pos).not.toBeNull()
      const dims = getSvgDimensions(svg)
      expect(pos!.tx).toBeLessThan(dims.width)
      expect(pos!.tx).toBeGreaterThan(dims.width * 0.5)
    })
  })

  describe("top position", () => {
    it("ordinal legend at top", () => {
      const svg = renderChart("BarChart", {
        data: barData, categoryAccessor: "category", valueAccessor: "value",
        colorBy: "group", showLegend: true, legendPosition: "top",
        width: 500, height: 300,
      })

      const pos = getLegendTranslate(svg)
      expect(pos).not.toBeNull()
      // Top legend: ty should be near the top (< 50)
      expect(pos!.ty).toBeLessThan(50)
    })

    it("XY legend at top", () => {
      const svg = renderChart("LineChart", {
        data: lineData, xAccessor: "x", yAccessor: "y",
        lineBy: "series", colorBy: "series",
        showLegend: true, legendPosition: "top",
        width: 500, height: 300,
      })

      const pos = getLegendTranslate(svg)
      expect(pos).not.toBeNull()
      expect(pos!.ty).toBeLessThan(50)
    })
  })

  describe("bottom position", () => {
    it("ordinal legend at bottom within bounds", () => {
      const svg = renderChart("BarChart", {
        data: barData, categoryAccessor: "category", valueAccessor: "value",
        colorBy: "group", showLegend: true, legendPosition: "bottom",
        width: 500, height: 300,
      })

      const pos = getLegendTranslate(svg)
      expect(pos).not.toBeNull()
      const dims = getSvgDimensions(svg)
      // Bottom legend: ty should be near the bottom but within SVG bounds
      expect(pos!.ty).toBeGreaterThan(dims.height * 0.5)
      expect(pos!.ty).toBeLessThan(dims.height)
    })
  })

  describe("left position", () => {
    it("legend at left", () => {
      const svg = renderChart("BarChart", {
        data: barData, categoryAccessor: "category", valueAccessor: "value",
        colorBy: "group", showLegend: true, legendPosition: "left",
        width: 500, height: 300,
      })

      const pos = getLegendTranslate(svg)
      expect(pos).not.toBeNull()
      // Left legend: tx should be near 0
      expect(pos!.tx).toBeLessThan(20)
    })
  })

  describe("network chart legends", () => {
    it("network legend renders within bounds", () => {
      const svg = renderChart("ForceDirectedGraph", {
        nodes: [{ id: "A", g: "x" }, { id: "B", g: "y" }],
        edges: [{ source: "A", target: "B" }],
        colorBy: "g", showLegend: true,
        width: 500, height: 300,
      })

      // Network charts may not have static legends in server rendering
      // but if they do, they should be within bounds
      if (svg.includes("semiotic-legend")) {
        const pos = getLegendTranslate(svg)
        expect(pos).not.toBeNull()
        expect(pos!.tx).toBeLessThan(500)
      }
    })
  })
})
