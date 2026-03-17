// @vitest-environment node

/**
 * Component-level SSR tests.
 *
 * Runs in Node environment (no window/document) so isServerEnvironment is true
 * and Stream Frames render SVG instead of canvas.
 */

import { describe, it, expect } from "vitest"
import * as React from "react"
import * as ReactDOMServer from "react-dom/server"

// HOC components
import { LineChart } from "../charts/xy/LineChart"
import { AreaChart } from "../charts/xy/AreaChart"
import { StackedAreaChart } from "../charts/xy/StackedAreaChart"
import { Scatterplot } from "../charts/xy/Scatterplot"
import { Heatmap } from "../charts/xy/Heatmap"
import { BarChart } from "../charts/ordinal/BarChart"
import { StackedBarChart } from "../charts/ordinal/StackedBarChart"
import { PieChart } from "../charts/ordinal/PieChart"
import { DonutChart } from "../charts/ordinal/DonutChart"
import { BoxPlot } from "../charts/ordinal/BoxPlot"
import { DotPlot } from "../charts/ordinal/DotPlot"
import { ForceDirectedGraph } from "../charts/network/ForceDirectedGraph"
import { SankeyDiagram } from "../charts/network/SankeyDiagram"
import { TreeDiagram } from "../charts/network/TreeDiagram"
import { Treemap } from "../charts/network/Treemap"
import { CirclePack } from "../charts/network/CirclePack"

// Standalone SSR for equivalence tests
import { renderXYToStaticSVG, renderOrdinalToStaticSVG, renderNetworkToStaticSVG, renderGeoToStaticSVG } from "./renderToStaticSVG"

// ── Test data ───────────────────────────────────────────────────────────

const xyData = [
  { x: 1, y: 10 },
  { x: 2, y: 25 },
  { x: 3, y: 15 },
  { x: 4, y: 30 },
  { x: 5, y: 20 },
]

const categoryData = [
  { category: "A", value: 30 },
  { category: "B", value: 50 },
  { category: "C", value: 20 },
]

const stackData = [
  { category: "A", group: "X", value: 10 },
  { category: "A", group: "Y", value: 20 },
  { category: "B", group: "X", value: 15 },
  { category: "B", group: "Y", value: 25 },
]

const boxData = [
  { category: "A", value: 5 },
  { category: "A", value: 10 },
  { category: "A", value: 15 },
  { category: "A", value: 20 },
  { category: "A", value: 25 },
  { category: "B", value: 8 },
  { category: "B", value: 12 },
  { category: "B", value: 18 },
  { category: "B", value: 22 },
  { category: "B", value: 28 },
]

const heatmapData = [
  { x: 0, y: 0, value: 5 },
  { x: 0, y: 1, value: 8 },
  { x: 1, y: 0, value: 3 },
  { x: 1, y: 1, value: 12 },
]

// ── Helpers ──────────────────────────────────────────────────────────────

function renderComponent(element: React.ReactElement): string {
  return ReactDOMServer.renderToStaticMarkup(element)
}

function countOccurrences(html: string, tag: string): number {
  const regex = new RegExp(`<${tag}[\\s/>]`, "g")
  return (html.match(regex) || []).length
}

// ── XY Chart SSR ────────────────────────────────────────────────────────

describe("Component SSR — XY Charts", () => {
  it("LineChart renders SVG path elements, not canvas", () => {
    const html = renderComponent(
      <LineChart data={xyData} xAccessor="x" yAccessor="y" width={400} height={300} />
    )

    // Should NOT contain canvas elements
    expect(html).not.toContain("<canvas")

    // Should contain SVG with path elements (the line)
    expect(html).toContain("<svg")
    expect(html).toContain("<path")

    // Should contain axis ticks (text elements)
    expect(countOccurrences(html, "text")).toBeGreaterThan(0)
  })

  it("AreaChart renders area path with fill", () => {
    const html = renderComponent(
      <AreaChart data={xyData} xAccessor="x" yAccessor="y" width={400} height={300} />
    )

    expect(html).not.toContain("<canvas")
    expect(html).toContain("<path")
    // Area paths have fill (not just stroke)
    expect(html).toMatch(/fill="[^n]/) // fill is not "none"
  })

  it("StackedAreaChart renders multiple area paths", () => {
    const multiLineData = [
      { x: 1, y: 10, group: "A" },
      { x: 2, y: 20, group: "A" },
      { x: 1, y: 15, group: "B" },
      { x: 2, y: 25, group: "B" },
    ]
    const html = renderComponent(
      <StackedAreaChart
        data={multiLineData}
        xAccessor="x"
        yAccessor="y"
        width={400}
        height={300}
      />
    )

    expect(html).not.toContain("<canvas")
    expect(html).toContain("<path")
  })

  it("Scatterplot renders circle elements", () => {
    const html = renderComponent(
      <Scatterplot data={xyData} xAccessor="x" yAccessor="y" width={400} height={300} />
    )

    expect(html).not.toContain("<canvas")
    // Should have circles for each data point
    expect(countOccurrences(html, "circle")).toBeGreaterThanOrEqual(5)
  })

  it("Heatmap renders rect elements for cells", () => {
    const html = renderComponent(
      <Heatmap
        data={heatmapData}
        xAccessor="x"
        yAccessor="y"
        valueAccessor="value"
        width={400}
        height={300}
      />
    )

    expect(html).not.toContain("<canvas")
    expect(countOccurrences(html, "rect")).toBeGreaterThanOrEqual(4)
  })
})

// ── Ordinal Chart SSR ───────────────────────────────────────────────────

describe("Component SSR — Ordinal Charts", () => {
  it("BarChart renders rect elements", () => {
    const html = renderComponent(
      <BarChart
        data={categoryData}
        categoryAccessor="category"
        valueAccessor="value"
        width={400}
        height={300}
      />
    )

    expect(html).not.toContain("<canvas")
    // 3 bars = 3 rects (plus potential axis/bg rects)
    expect(countOccurrences(html, "rect")).toBeGreaterThanOrEqual(3)
  })

  it("StackedBarChart renders stacked rect elements", () => {
    const html = renderComponent(
      <StackedBarChart
        data={stackData}
        categoryAccessor="category"
        valueAccessor="value"
        stackBy="group"
        width={400}
        height={300}
      />
    )

    expect(html).not.toContain("<canvas")
    // 4 segments (2 categories × 2 groups)
    expect(countOccurrences(html, "rect")).toBeGreaterThanOrEqual(4)
  })

  it("PieChart renders wedge paths", () => {
    const html = renderComponent(
      <PieChart
        data={categoryData}
        categoryAccessor="category"
        valueAccessor="value"
        width={400}
        height={400}
      />
    )

    expect(html).not.toContain("<canvas")
    // Wedges are arc paths
    expect(countOccurrences(html, "path")).toBeGreaterThanOrEqual(3)
  })

  it("DonutChart renders wedge paths with inner radius", () => {
    const html = renderComponent(
      <DonutChart
        data={categoryData}
        categoryAccessor="category"
        valueAccessor="value"
        width={400}
        height={400}
      />
    )

    expect(html).not.toContain("<canvas")
    expect(countOccurrences(html, "path")).toBeGreaterThanOrEqual(3)
  })

  it("BoxPlot renders boxplot elements (lines + rects)", () => {
    const html = renderComponent(
      <BoxPlot
        data={boxData}
        categoryAccessor="category"
        valueAccessor="value"
        width={400}
        height={300}
      />
    )

    expect(html).not.toContain("<canvas")
    // Boxplots have whisker lines and box rects
    expect(countOccurrences(html, "line")).toBeGreaterThan(0)
    expect(countOccurrences(html, "rect")).toBeGreaterThan(0)
  })

  it("DotPlot renders circle elements", () => {
    const html = renderComponent(
      <DotPlot
        data={categoryData}
        categoryAccessor="category"
        valueAccessor="value"
        width={400}
        height={300}
      />
    )

    expect(html).not.toContain("<canvas")
    expect(countOccurrences(html, "circle")).toBeGreaterThanOrEqual(3)
  })
})

// ── Structural tests ────────────────────────────────────────────────────

describe("Component SSR — Structure", () => {
  it("renders wrapper div with correct class", () => {
    const html = renderComponent(
      <LineChart data={xyData} xAccessor="x" yAccessor="y" />
    )

    expect(html).toContain("stream-xy-frame")
  })

  it("renders title when provided", () => {
    const html = renderComponent(
      <BarChart
        data={categoryData}
        categoryAccessor="category"
        valueAccessor="value"
        title="Sales by Region"
      />
    )

    expect(html).toContain("Sales by Region")
  })

  it("renders with custom className", () => {
    const html = renderComponent(
      <LineChart
        data={xyData}
        xAccessor="x"
        yAccessor="y"
        className="my-chart"
      />
    )

    expect(html).toContain("my-chart")
  })

  it("respects width and height", () => {
    const html = renderComponent(
      <LineChart
        data={xyData}
        xAccessor="x"
        yAccessor="y"
        width={800}
        height={500}
      />
    )

    expect(html).toContain('width="800"')
    expect(html).toContain('height="500"')
  })

  it("renders aria-label for accessibility", () => {
    const html = renderComponent(
      <LineChart
        data={xyData}
        xAccessor="x"
        yAccessor="y"
        title="Revenue Trend"
      />
    )

    expect(html).toContain('aria-label="Revenue Trend"')
  })
})

// ── Equivalence tests ───────────────────────────────────────────────────

describe("Component SSR — Equivalence with renderToStaticSVG", () => {
  it("LineChart SSR contains the same path geometry as standalone SSR", () => {
    // Use identical margins to ensure same coordinate space
    const margin = { top: 20, right: 20, bottom: 30, left: 40 }

    // Component SSR
    const componentHTML = renderComponent(
      <LineChart data={xyData} xAccessor="x" yAccessor="y" width={500} height={300}
        frameProps={{ margin, size: [500, 300] }} />
    )

    // Standalone SSR
    const standaloneSVG = renderXYToStaticSVG({
      chartType: "line",
      data: xyData,
      xAccessor: "x",
      yAccessor: "y",
      size: [500, 300],
      margin,
    })

    // Extract path d attributes from both
    const componentPaths = componentHTML.match(/d="M[^"]+"/g) || []
    const standalonePaths = standaloneSVG.match(/d="M[^"]+"/g) || []

    // Both should have line paths
    expect(componentPaths.length).toBeGreaterThan(0)
    expect(standalonePaths.length).toBeGreaterThan(0)

    // Both use same PipelineStore + SceneToSVG — same number of path segments
    expect(componentPaths.length).toBe(standalonePaths.length)

    // First path (the data line) should have the same number of points
    const componentPoints = (componentPaths[0].match(/L/g) || []).length
    const standalonePoints = (standalonePaths[0].match(/L/g) || []).length
    expect(componentPoints).toBe(standalonePoints)
  })

  it("BarChart SSR produces same number of rects as standalone SSR", () => {
    const componentHTML = renderComponent(
      <BarChart
        data={categoryData}
        categoryAccessor="category"
        valueAccessor="value"
        width={500}
        height={400}
      />
    )

    const standaloneSVG = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: categoryData,
      oAccessor: "category",
      rAccessor: "value",
      size: [500, 400],
    })

    // Count data rects (exclude axis/background rects by checking for fill color)
    const componentDataRects = (componentHTML.match(/<rect[^>]*fill="#[0-9a-f]{6}"/gi) || []).length
    const standaloneDataRects = (standaloneSVG.match(/<rect[^>]*fill="#[0-9a-f]{6}"/gi) || []).length

    expect(componentDataRects).toBe(standaloneDataRects)
    expect(componentDataRects).toBe(3) // 3 categories
  })

  it("Scatterplot SSR produces same number of circles as standalone SSR", () => {
    const componentHTML = renderComponent(
      <Scatterplot
        data={xyData}
        xAccessor="x"
        yAccessor="y"
        width={500}
        height={300}
      />
    )

    const standaloneSVG = renderXYToStaticSVG({
      chartType: "scatter",
      data: xyData,
      xAccessor: "x",
      yAccessor: "y",
      size: [500, 300],
    })

    const componentCircles = countOccurrences(componentHTML, "circle")
    const standaloneCircles = countOccurrences(standaloneSVG, "circle")

    expect(componentCircles).toBe(standaloneCircles)
    expect(componentCircles).toBe(5) // 5 data points
  })
})

// ── Network Chart SSR ──────────────────────────────────────────────────

const networkNodes = [
  { id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }
]
const networkEdges = [
  { source: "A", target: "B" },
  { source: "B", target: "C" },
  { source: "C", target: "D" },
  { source: "A", target: "D" },
]

const sankeyEdges = [
  { source: "Revenue", target: "Product", value: 80 },
  { source: "Revenue", target: "Services", value: 50 },
  { source: "Product", target: "Profit", value: 60 },
  { source: "Services", target: "Profit", value: 40 },
]

const treeData = {
  id: "root",
  children: [
    { id: "A", children: [{ id: "A1" }, { id: "A2" }] },
    { id: "B", children: [{ id: "B1" }] },
  ]
}

describe("Component SSR — Network Charts", () => {
  it("ForceDirectedGraph renders node circles and edge lines", () => {
    const html = renderComponent(
      <ForceDirectedGraph
        nodes={networkNodes}
        edges={networkEdges}
        width={400}
        height={400}
      />
    )

    expect(html).not.toContain("<canvas")
    expect(html).toContain("<svg")
    expect(countOccurrences(html, "circle")).toBeGreaterThanOrEqual(4)
  })

  it("SankeyDiagram renders node rects and edge paths", () => {
    const html = renderComponent(
      <SankeyDiagram
        edges={sankeyEdges}
        width={500}
        height={300}
      />
    )

    expect(html).not.toContain("<canvas")
    expect(html).toContain("<svg")
    // 5 unique nodes inferred from edges
    expect(countOccurrences(html, "rect")).toBeGreaterThanOrEqual(4)
    // 4 edges = 4 paths
    expect(countOccurrences(html, "path")).toBeGreaterThanOrEqual(4)
  })

  it("TreeDiagram renders nodes and edges", () => {
    const html = renderComponent(
      <TreeDiagram
        data={treeData}
        width={400}
        height={400}
      />
    )

    expect(html).not.toContain("<canvas")
    expect(html).toContain("<svg")
    // 6 nodes total (root + A + A1 + A2 + B + B1)
    expect(countOccurrences(html, "circle")).toBeGreaterThanOrEqual(5)
  })

  it("Treemap renders rect elements for each leaf", () => {
    const html = renderComponent(
      <Treemap
        data={{
          id: "root",
          children: [
            { id: "A", value: 30 },
            { id: "B", value: 50 },
            { id: "C", value: 20 },
          ]
        }}
        width={400}
        height={400}
      />
    )

    expect(html).not.toContain("<canvas")
    expect(html).toContain("<svg")
    expect(countOccurrences(html, "rect")).toBeGreaterThanOrEqual(3)
  })

  it("CirclePack renders circle elements", () => {
    const html = renderComponent(
      <CirclePack
        data={{
          id: "root",
          children: [
            { id: "A", value: 30 },
            { id: "B", value: 50 },
            { id: "C", value: 20 },
          ]
        }}
        width={400}
        height={400}
      />
    )

    expect(html).not.toContain("<canvas")
    expect(html).toContain("<svg")
    // root + 3 children = at least 3 circles
    expect(countOccurrences(html, "circle")).toBeGreaterThanOrEqual(3)
  })
})

// ── Network SSR — Node inference from edges ────────────────────────────

describe("Component SSR — Network node inference", () => {
  it("SankeyDiagram with edges-only infers nodes (no explicit nodes prop)", () => {
    const html = renderComponent(
      <SankeyDiagram
        edges={sankeyEdges}
        width={500}
        height={300}
      />
    )

    // Should have rects for each unique node (Revenue, Product, Services, Profit)
    expect(countOccurrences(html, "rect")).toBeGreaterThanOrEqual(4)
    // Should have edge paths
    expect(countOccurrences(html, "path")).toBeGreaterThanOrEqual(4)
  })

  it("ForceDirectedGraph with edges-only shows validation message (nodes required)", () => {
    // The HOC requires explicit nodes — node inference only happens in standalone SSR.
    // The error boundary catches the validation and renders a helpful message.
    const html = renderComponent(
      <ForceDirectedGraph
        edges={networkEdges}
        width={400}
        height={400}
      />
    )

    expect(html).toContain("ForceDirectedGraph")
    expect(html).toContain("No nodes provided")
    expect(html).not.toContain("<canvas")
  })
})

// ── Standalone Network SSR — Node inference regression ─────────────────

describe("Standalone SSR — Network node inference from edges", () => {
  it("sankey renders nodes and edges when only edges are provided", () => {
    const svg = renderNetworkToStaticSVG({
      chartType: "sankey",
      edges: sankeyEdges,
      size: [500, 300],
    } as any)

    expect(svg).toContain("<svg")
    // 4 unique nodes
    expect((svg.match(/<rect /g) || []).length).toBeGreaterThanOrEqual(4)
    // 4 edge paths
    expect((svg.match(/<path /g) || []).length).toBeGreaterThanOrEqual(4)
  })

  it("sankey with explicit nodes still works", () => {
    const svg = renderNetworkToStaticSVG({
      chartType: "sankey",
      nodes: [{ id: "Revenue" }, { id: "Product" }, { id: "Services" }, { id: "Profit" }],
      edges: sankeyEdges,
      size: [500, 300],
    } as any)

    expect(svg).toContain("<svg")
    expect((svg.match(/<rect /g) || []).length).toBeGreaterThanOrEqual(4)
    expect((svg.match(/<path /g) || []).length).toBeGreaterThanOrEqual(4)
  })

  it("force renders circles when only edges are provided", () => {
    const svg = renderNetworkToStaticSVG({
      chartType: "force",
      edges: networkEdges,
      size: [400, 400],
    } as any)

    expect(svg).toContain("<svg")
    expect((svg.match(/<circle /g) || []).length).toBeGreaterThanOrEqual(4)
  })

  it("edges-only with no edges returns empty SVG", () => {
    const svg = renderNetworkToStaticSVG({
      chartType: "sankey",
      edges: [],
      size: [500, 300],
    } as any)

    expect(svg).toContain("<svg")
    expect((svg.match(/<rect /g) || []).length).toBe(0)
    expect((svg.match(/<path /g) || []).length).toBe(0)
  })
})

// ── Mark count contracts ───────────────────────────────────────────────

describe("SSR mark count contracts", () => {
  it("N scatter points → N circles", () => {
    for (const n of [3, 7, 12]) {
      const data = Array.from({ length: n }, (_, i) => ({ x: i, y: i * 2 }))
      const svg = renderXYToStaticSVG({
        chartType: "scatter",
        data,
        xAccessor: "x",
        yAccessor: "y",
        size: [400, 300],
      })
      expect((svg.match(/<circle /g) || []).length).toBe(n)
    }
  })

  it("N bar categories → N rects", () => {
    for (const n of [2, 5, 8]) {
      const data = Array.from({ length: n }, (_, i) => ({
        category: `Cat${i}`,
        value: (i + 1) * 10,
      }))
      const svg = renderOrdinalToStaticSVG({
        chartType: "bar",
        data,
        oAccessor: "category",
        rAccessor: "value",
        size: [400, 300],
      })
      const rects = (svg.match(/<rect [^>]*fill="#[0-9a-f]{6}"/gi) || []).length
      expect(rects).toBe(n)
    }
  })

  it("N pie categories → N wedge paths", () => {
    for (const n of [3, 5]) {
      const data = Array.from({ length: n }, (_, i) => ({
        category: `Slice${i}`,
        value: (i + 1) * 10,
      }))
      const svg = renderOrdinalToStaticSVG({
        chartType: "pie",
        data,
        oAccessor: "category",
        rAccessor: "value",
        projection: "radial",
        size: [400, 400],
      })
      expect((svg.match(/<path /g) || []).length).toBeGreaterThanOrEqual(n)
    }
  })

  it("sankey: E edges → E path elements", () => {
    const edges = [
      { source: "A", target: "B", value: 10 },
      { source: "A", target: "C", value: 20 },
      { source: "B", target: "D", value: 15 },
    ]
    const svg = renderNetworkToStaticSVG({
      chartType: "sankey",
      edges,
      size: [500, 300],
    } as any)

    expect((svg.match(/<path /g) || []).length).toBeGreaterThanOrEqual(3)
    // 4 unique nodes → 4 rects
    expect((svg.match(/<rect /g) || []).length).toBeGreaterThanOrEqual(4)
  })
})

// ── Geo SSR — renderGeoToStaticSVG ──────────────────────────────────────

const geoAreas = [
  {
    type: "Feature",
    properties: { name: "CountryA", gdp: 100 },
    geometry: { type: "Polygon", coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] }
  },
  {
    type: "Feature",
    properties: { name: "CountryB", gdp: 200 },
    geometry: { type: "Polygon", coordinates: [[[20, 0], [30, 0], [30, 10], [20, 10], [20, 0]]] }
  },
  {
    type: "Feature",
    properties: { name: "CountryC", gdp: 50 },
    geometry: { type: "Polygon", coordinates: [[[40, 0], [50, 0], [50, 10], [40, 10], [40, 0]]] }
  },
]

const geoPoints = [
  { lon: 5, lat: 5, population: 1000000 },
  { lon: 25, lat: 5, population: 5000000 },
  { lon: 45, lat: 5, population: 2000000 },
]

const geoLines = [
  {
    coordinates: [
      { lon: 5, lat: 5 },
      { lon: 25, lat: 5 },
      { lon: 45, lat: 5 },
    ]
  }
]

describe("Standalone SSR — Geo Charts (renderGeoToStaticSVG)", () => {
  it("renders area polygons as SVG path elements", () => {
    const svg = renderGeoToStaticSVG({
      areas: geoAreas as any,
      projection: "equalEarth",
      size: [600, 400],
    } as any)

    expect(svg).toContain("<svg")
    expect(svg).not.toContain("<canvas")
    // 3 areas = 3 paths
    expect((svg.match(/<path /g) || []).length).toBeGreaterThanOrEqual(3)
  })

  it("renders point data as SVG circle elements", () => {
    const svg = renderGeoToStaticSVG({
      points: geoPoints,
      xAccessor: "lon",
      yAccessor: "lat",
      projection: "equalEarth",
      size: [600, 400],
    } as any)

    expect(svg).toContain("<svg")
    expect(svg).not.toContain("<canvas")
    // 3 points = 3 circles
    expect((svg.match(/<circle /g) || []).length).toBeGreaterThanOrEqual(3)
  })

  it("renders line data as SVG path elements", () => {
    const svg = renderGeoToStaticSVG({
      lines: geoLines,
      xAccessor: "lon",
      yAccessor: "lat",
      lineDataAccessor: "coordinates",
      projection: "equalEarth",
      size: [600, 400],
    } as any)

    expect(svg).toContain("<svg")
    expect(svg).not.toContain("<canvas")
    expect((svg.match(/<path /g) || []).length).toBeGreaterThanOrEqual(1)
  })

  it("renders areas + points together", () => {
    const svg = renderGeoToStaticSVG({
      areas: geoAreas as any,
      points: geoPoints,
      xAccessor: "lon",
      yAccessor: "lat",
      projection: "equalEarth",
      size: [600, 400],
    } as any)

    expect(svg).toContain("<svg")
    // At least 3 area paths + 3 point circles
    expect((svg.match(/<path /g) || []).length).toBeGreaterThanOrEqual(3)
    expect((svg.match(/<circle /g) || []).length).toBeGreaterThanOrEqual(3)
  })

  it("returns empty SVG when no geo data is provided", () => {
    const svg = renderGeoToStaticSVG({
      projection: "equalEarth",
      size: [600, 400],
    } as any)

    expect(svg).toContain("<svg")
    expect((svg.match(/<path /g) || []).length).toBe(0)
    expect((svg.match(/<circle /g) || []).length).toBe(0)
  })

  it("renders title text when provided", () => {
    const svg = renderGeoToStaticSVG({
      areas: geoAreas as any,
      projection: "equalEarth",
      size: [600, 400],
      title: "World GDP",
    } as any)

    expect(svg).toContain("World GDP")
  })

  it("applies className to SVG element", () => {
    const svg = renderGeoToStaticSVG({
      areas: geoAreas as any,
      projection: "equalEarth",
      size: [600, 400],
      className: "my-geo-chart",
    } as any)

    expect(svg).toContain("my-geo-chart")
    expect(svg).toContain("stream-geo-frame")
  })

  it("supports mercator projection", () => {
    const svg = renderGeoToStaticSVG({
      areas: geoAreas as any,
      projection: "mercator",
      size: [600, 400],
    } as any)

    expect(svg).toContain("<svg")
    expect((svg.match(/<path /g) || []).length).toBeGreaterThanOrEqual(3)
  })
})

describe("SSR mark count contracts — Geo", () => {
  it("N geo areas → N path elements", () => {
    for (const n of [1, 3, 5]) {
      const areas = Array.from({ length: n }, (_, i) => ({
        type: "Feature",
        properties: { name: `Country${i}` },
        geometry: {
          type: "Polygon",
          coordinates: [[[i * 15, 0], [i * 15 + 10, 0], [i * 15 + 10, 10], [i * 15, 10], [i * 15, 0]]]
        }
      }))
      const svg = renderGeoToStaticSVG({
        areas: areas as any,
        projection: "equalEarth",
        size: [600, 400],
      } as any)
      expect((svg.match(/<path /g) || []).length).toBe(n)
    }
  })

  it("N geo points → N circle elements", () => {
    for (const n of [2, 5, 10]) {
      const points = Array.from({ length: n }, (_, i) => ({
        lon: i * 10,
        lat: i * 5,
      }))
      const svg = renderGeoToStaticSVG({
        points,
        xAccessor: "lon",
        yAccessor: "lat",
        projection: "equalEarth",
        size: [600, 400],
      } as any)
      expect((svg.match(/<circle /g) || []).length).toBe(n)
    }
  })
})
