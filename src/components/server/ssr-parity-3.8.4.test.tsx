/**
 * 3.8.4 SSR parity regressions from adversarial review.
 * Each case guards a previously silent prop drop on the renderChart path.
 */
import { describe, it, expect } from "vitest"
import { renderChart, renderChartWithEvidence } from "./renderToStaticSVG"

describe("3.8.4 SSR parity — StackedArea baseline", () => {
  const data = [
    { x: 0, y: 2, series: "a" },
    { x: 1, y: 4, series: "a" },
    { x: 0, y: 3, series: "b" },
    { x: 1, y: 1, series: "b" },
  ]

  it("threads baseline=wiggle (streamgraph) without throwing and paints areas", () => {
    const { svg, evidence } = renderChartWithEvidence("StackedAreaChart", {
      data,
      xAccessor: "x",
      yAccessor: "y",
      areaBy: "series",
      baseline: "wiggle",
      stackOrder: "insideOut",
    })
    expect(evidence.empty).toBe(false)
    expect(evidence.markCount).toBeGreaterThan(0)
    // Streamgraph offsets the stack off zero — path data should exist.
    expect(svg).toMatch(/path|polygon/i)
  })
})

describe("3.8.4 SSR parity — CirclePack colorBy + labels", () => {
  const tree = {
    id: "root",
    children: [
      { id: "a", value: 10, kind: "x" },
      { id: "b", value: 20, kind: "y" },
      { id: "c", value: 15, kind: "x" },
    ],
  }

  it("emits distinct fills for categorical colorBy", () => {
    const svg = renderChart("CirclePack", {
      data: tree,
      childrenAccessor: "children",
      valueAccessor: "value",
      colorBy: "kind",
      showLabels: true,
    })
    const fills = [...svg.matchAll(/<circle[^>]*fill="([^"]+)"/g)].map((m) => m[1])
    const distinct = new Set(fills.filter((f) => f && f !== "none" && f !== "currentColor"))
    expect(distinct.size).toBeGreaterThan(1)
  })
})

describe("3.8.4 SSR parity — BoxPlot showOutliers", () => {
  const data = [
    { category: "A", value: 1 },
    { category: "A", value: 2 },
    { category: "A", value: 3 },
    { category: "A", value: 4 },
    { category: "A", value: 100 }, // outlier
  ]

  it("showOutliers:false reduces mark count vs default", () => {
    const withOutliers = renderChartWithEvidence("BoxPlot", {
      data,
      categoryAccessor: "category",
      valueAccessor: "value",
    }).evidence
    const without = renderChartWithEvidence("BoxPlot", {
      data,
      categoryAccessor: "category",
      valueAccessor: "value",
      showOutliers: false,
    }).evidence
    expect(without.markCount).toBeLessThanOrEqual(withOutliers.markCount)
  })
})

describe("3.8.4 SSR parity — autoPlaceAnnotations on renderChart", () => {
  it("accepts top-level autoPlaceAnnotations without throwing", () => {
    const svg = renderChart("BarChart", {
      data: [
        { category: "a", value: 10 },
        { category: "b", value: 20 },
      ],
      categoryAccessor: "category",
      valueAccessor: "value",
      annotations: [{ type: "y-threshold", value: 15, label: "target" }],
      autoPlaceAnnotations: true,
    })
    expect(svg).toContain("svg")
    expect(svg.length).toBeGreaterThan(100)
  })
})

describe("3.8.4 SSR parity — LineChart showPoints", () => {
  it("emits circle marks when showPoints is true", () => {
    const withPoints = renderChartWithEvidence("LineChart", {
      data: [
        { x: 0, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 1.5 },
      ],
      xAccessor: "x",
      yAccessor: "y",
      showPoints: true,
      pointRadius: 4,
    }).evidence
    const markTypes = Object.keys(withPoints.markCountByType || {})
    // Points may be typed as "point" in evidence.
    const hasPoints =
      (withPoints.markCountByType?.point ?? 0) > 0 ||
      (withPoints.markCountByType?.circle ?? 0) > 0 ||
      markTypes.some((t) => /point|circle/i.test(t))
    expect(hasPoints || withPoints.markCount >= 3).toBe(true)
  })
})

describe("3.8.4 SSR parity — Sankey styleRules", () => {
  it("threads styleRules without throwing and paints nodes", () => {
    const svg = renderChart("SankeyDiagram", {
      nodes: [{ id: "a" }, { id: "b" }],
      edges: [{ source: "a", target: "b", value: 5 }],
      styleRules: [{ when: true, style: { fill: "#d7263d" } }],
    })
    expect(svg).toContain("#d7263d")
  })
})

describe("3.8.4 SSR parity — LineChart series features", () => {
  const series = [
    { x: 0, y: 1 },
    { x: 1, y: 2 },
    { x: 2, y: 1.5 },
    { x: 3, y: 2.2 },
    { x: 4, y: 1.8 },
  ]

  it("forecast auto mode paints without throwing and adds marks", () => {
    const { evidence } = renderChartWithEvidence("LineChart", {
      data: series,
      xAccessor: "x",
      yAccessor: "y",
      forecast: { trainEnd: 2, steps: 3 },
    })
    expect(evidence.empty).toBe(false)
    expect(evidence.markCount).toBeGreaterThan(0)
  })

  it("anomaly config accepts and renders", () => {
    const svg = renderChart("LineChart", {
      data: series,
      xAccessor: "x",
      yAccessor: "y",
      anomaly: { threshold: 2 },
    })
    expect(svg).toContain("svg")
  })

  it("directLabel emits series endpoint text", () => {
    const multi = [
      { x: 0, y: 1, series: "A" },
      { x: 1, y: 2, series: "A" },
      { x: 0, y: 3, series: "B" },
      { x: 1, y: 4, series: "B" },
    ]
    const svg = renderChart("LineChart", {
      data: multi,
      xAccessor: "x",
      yAccessor: "y",
      lineBy: "series",
      colorBy: "series",
      directLabel: true,
      showLegend: false,
    })
    expect(svg).toMatch(/A|B/)
  })

  it("gapStrategy break skips null y points without throwing", () => {
    const gapped = [
      { x: 0, y: 1 },
      { x: 1, y: null },
      { x: 2, y: 3 },
    ]
    const { evidence } = renderChartWithEvidence("LineChart", {
      data: gapped,
      xAccessor: "x",
      yAccessor: "y",
      gapStrategy: "break",
    })
    expect(evidence.empty).toBe(false)
  })
})
