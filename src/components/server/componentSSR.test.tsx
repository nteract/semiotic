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

// Standalone SSR for equivalence tests
import { renderXYToStaticSVG, renderOrdinalToStaticSVG } from "./renderToStaticSVG"

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
