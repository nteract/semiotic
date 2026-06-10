import { describe, expect, it } from "vitest"

import { renderChart, renderChartWithEvidence } from "./renderToStaticSVG"

/**
 * Render evidence — ground truth emitted from the same scene the SVG
 * converter walks. These tests pin the contract the MCP renderChart tool
 * and agent repair loops depend on: marks are counted from the rendered
 * scene (never inferred from props), emptiness is explicit, and domains
 * are the *resolved* scale domains.
 */

const lineData = Array.from({ length: 12 }, (_, i) => ({
  month: i + 1,
  revenue: 100 + i * 12,
}))

const barData = [
  { product: "Widget", units: 480 },
  { product: "Gadget", units: 620 },
  { product: "Sprocket", units: 290 },
]

describe("renderChartWithEvidence", () => {
  it("returns the same SVG renderChart returns", () => {
    const props = {
      data: lineData,
      xAccessor: "month",
      yAccessor: "revenue",
      title: "Revenue",
    }
    const svgOnly = renderChart("LineChart", props)
    const { svg } = renderChartWithEvidence("LineChart", props)
    expect(svg).toBe(svgOnly)
  })

  it("emits XY evidence with marks, domains, and the component name", () => {
    const { evidence } = renderChartWithEvidence("LineChart", {
      data: lineData,
      xAccessor: "month",
      yAccessor: "revenue",
      title: "Revenue over time",
    })
    expect(evidence.component).toBe("LineChart")
    expect(evidence.frameType).toBe("xy")
    expect(evidence.status).toBe("ok")
    expect(evidence.empty).toBe(false)
    expect(evidence.markCount).toBeGreaterThan(0)
    expect(Object.keys(evidence.markCountByType).length).toBeGreaterThan(0)
    // Resolved domains cover the data (extentPadding may widen them).
    expect(evidence.xDomain).toBeDefined()
    expect(evidence.xDomain![0]).toBeLessThanOrEqual(1)
    expect(evidence.xDomain![1]).toBeGreaterThanOrEqual(12)
    expect(evidence.yDomain).toBeDefined()
    expect(evidence.yDomain![1]).toBeGreaterThanOrEqual(232)
    expect(evidence.ariaLabel).toBe("Revenue over time")
    expect(evidence.warnings).toEqual([])
  })

  it("reports an empty render honestly", () => {
    const { svg, evidence } = renderChartWithEvidence("LineChart", {
      data: [],
      xAccessor: "month",
      yAccessor: "revenue",
    })
    expect(svg).toContain("<svg")
    expect(evidence.status).toBe("empty")
    expect(evidence.empty).toBe(true)
    expect(evidence.markCount).toBe(0)
    expect(evidence.warnings).toContain("EMPTY_SCENE")
  })

  it("emits ordinal evidence with the category domain", () => {
    const { evidence } = renderChartWithEvidence("BarChart", {
      data: barData,
      categoryAccessor: "product",
      valueAccessor: "units",
      title: "Sales",
    })
    expect(evidence.frameType).toBe("ordinal")
    expect(evidence.empty).toBe(false)
    expect(evidence.categories).toEqual(["Widget", "Gadget", "Sprocket"])
    expect(evidence.yDomain).toBeDefined()
    expect(evidence.yDomain![1]).toBeGreaterThanOrEqual(620)
  })

  it("emits network evidence with node and edge counts", () => {
    const { evidence } = renderChartWithEvidence("SankeyDiagram", {
      edges: [
        { source: "A", target: "B", value: 10 },
        { source: "B", target: "C", value: 6 },
      ],
      title: "Flow",
    })
    expect(evidence.frameType).toBe("network")
    expect(evidence.empty).toBe(false)
    expect(evidence.nodeCount).toBeGreaterThanOrEqual(3)
    expect(evidence.edgeCount).toBe(2)
    expect(evidence.markCount).toBe(
      (evidence.nodeCount ?? 0) + (evidence.edgeCount ?? 0)
    )
  })

  it("emits geo evidence from rendered features", () => {
    const { evidence } = renderChartWithEvidence("ChoroplethMap", {
      areas: [
        {
          type: "Feature",
          id: "CA",
          properties: { name: "California", value: 39 },
          geometry: {
            type: "Polygon",
            coordinates: [[[-124, 32], [-114, 32], [-114, 42], [-124, 42], [-124, 32]]],
          },
        },
        {
          type: "Feature",
          id: "TX",
          properties: { name: "Texas", value: 29 },
          geometry: {
            type: "Polygon",
            coordinates: [[[-106, 26], [-93, 26], [-93, 36], [-106, 36], [-106, 26]]],
          },
        },
      ],
      valueAccessor: "value",
      title: "States",
    })
    expect(evidence.frameType).toBe("geo")
    expect(evidence.empty).toBe(false)
    expect(evidence.markCount).toBeGreaterThanOrEqual(2)
  })

  it("counts annotations supplied to the render", () => {
    const { evidence } = renderChartWithEvidence("LineChart", {
      data: lineData,
      xAccessor: "month",
      yAccessor: "revenue",
      annotations: [
        { type: "y-threshold", value: 150, label: "Target" },
        { type: "label", month: 6, revenue: 172, label: "Mid-year" },
      ],
    })
    expect(evidence.annotationCount).toBe(2)
  })

  it("generates an aria label when no title or description is given", () => {
    const { evidence } = renderChartWithEvidence("LineChart", {
      data: lineData,
      xAccessor: "month",
      yAccessor: "revenue",
    })
    expect(evidence.ariaLabel).toMatch(/xy chart, \d+ marks/)
  })
})
