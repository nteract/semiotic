// @vitest-environment node

/**
 * Component-level SSR tests — XY charts, ordinal charts, structure, and
 * canvas/SSR equivalence.
 *
 * Network, geo, and mark-count-contract tests live in the sibling
 * componentSSR.networkGeo.test.tsx (split out to keep both files under the
 * test hard limit — see scripts/file-size-policy.json). Runs in Node
 * environment (no window/document) so isServerEnvironment is true and
 * Stream Frames render SVG instead of canvas.
 */

import { describe, it, expect } from "vitest"
import * as React from "react"
import * as ReactDOMServer from "react-dom/server"

// HOC components
import { LineChart } from "../charts/xy/LineChart"
import { AreaChart } from "../charts/xy/AreaChart"
import { DifferenceChart } from "../charts/xy/DifferenceChart"
import { StackedAreaChart } from "../charts/xy/StackedAreaChart"
import { Scatterplot } from "../charts/xy/Scatterplot"
import { Heatmap } from "../charts/xy/Heatmap"
import { BarChart } from "../charts/ordinal/BarChart"
import { StackedBarChart } from "../charts/ordinal/StackedBarChart"
import { PieChart } from "../charts/ordinal/PieChart"
import { DonutChart } from "../charts/ordinal/DonutChart"
import { BoxPlot } from "../charts/ordinal/BoxPlot"
import { DotPlot } from "../charts/ordinal/DotPlot"
import { TemporalHistogram } from "../charts/realtime/RealtimeHistogram"

// Standalone SSR for equivalence tests
import { renderXYToStaticSVG, renderOrdinalToStaticSVG, renderChart } from "./renderToStaticSVG"

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

// Two-series fixture with a clean A>B → B>A crossover in the middle of
// the X range. Shared between the React-component SSR test and the
// `renderChart` server-path test so both check the same visual contract.
function differenceFixture() {
  return [
    { x: 0, a: 5, b: 10 },
    { x: 1, a: 7, b: 9 },
    { x: 2, a: 9, b: 8 },
    { x: 3, a: 12, b: 7 },
    { x: 4, a: 14, b: 6 },
    { x: 5, a: 13, b: 8 },
    { x: 6, a: 10, b: 11 },
    { x: 7, a: 7, b: 13 },
    { x: 8, a: 5, b: 15 },
  ]
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

  it("renderChart('LineChart', …) uses LineChart's HOC default margin", () => {
    const svg = renderChart("LineChart", {
      data: xyData,
      xAccessor: "x",
      yAccessor: "y",
      width: 400,
      height: 200,
    })

    // Primary-mode LineChart starts its plot at x=70/y=50. The former
    // static-frame fallback (40/20) made the standalone SSR mark larger and
    // shifted up/left relative to the equivalent CSR HOC.
    expect(svg).toContain('transform="translate(70,50)"')
  })

  it("TemporalHistogram renders static data as SVG during React SSR", () => {
    const html = renderComponent(
      <TemporalHistogram
        binSize={1000}
        data={[
          { time: 100, value: 5 },
          { time: 900, value: 7 },
          { time: 2100, value: 4 },
        ]}
        width={420}
        height={240}
      />
    )

    expect(html).toContain("<svg")
    expect(html).not.toContain("<canvas")
    expect(html).toMatch(/<rect[^>]*(?:fill|style)=/)
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

  it("AreaChart SSR preserves gradientFill", () => {
    const html = renderComponent(
      <AreaChart
        data={xyData}
        xAccessor="x"
        yAccessor="y"
        gradientFill={{ topOpacity: 0.8, bottomOpacity: 0.05 }}
        width={400}
        height={300}
      />
    )

    expect(html).toContain("<linearGradient")
    expect(html).toContain('fill="url(#')
    expect(html).toContain('stop-opacity="0.8"')
    expect(html).toContain('stop-opacity="0.05"')
  })

  it("renderChart('AreaChart', …) preserves gradientFill", () => {
    const svg = renderChart("AreaChart", {
      data: xyData,
      xAccessor: "x",
      yAccessor: "y",
      gradientFill: {
        colorStops: [
          { offset: 0, color: "#22c55e" },
          { offset: 1, color: "#14532d" },
        ],
      },
      width: 400,
      height: 300,
    })

    expect(svg).toContain("<linearGradient")
    expect(svg).toContain('stop-color="#22c55e"')
    expect(svg).toContain('stop-color="#14532d"')
    expect(svg).toContain('fill="url(#')
  })

  it.each(["LineChart", "AreaChart"] as const)("renderChart('%s', …) preserves lineGradient", (component) => {
    const svg = renderChart(component, {
      data: xyData,
      xAccessor: "x",
      yAccessor: "y",
      lineGradient: {
        colorStops: [
          { offset: 0, color: "#ff0000" },
          { offset: 1, color: "#0000ff" },
        ],
      },
      width: 400,
      height: 300,
    })
    expect(svg).toContain("stroke-gradient")
    expect(svg).toContain('stop-color="#ff0000"')
    expect(svg).toContain('stop-color="#0000ff"')
    expect(svg).toMatch(/stroke="url\(#.*stroke-gradient\)"/)
  })

  it("uses the shared sparkline mode contract in renderChart", () => {
    const svg = renderChart("LineChart", {
      data: xyData,
      xAccessor: "x",
      yAccessor: "y",
      mode: "sparkline",
    })
    expect(svg).toContain('width="120"')
    expect(svg).toContain('height="24"')
    expect(svg).toContain('transform="translate(0,2)"')
    expect((svg.match(/<line /g) || []).length).toBe(0)
  })

  it("uses LineChart's shared default and explicit style precedence", () => {
    const defaultSvg = renderChart("LineChart", {
      data: xyData,
      xAccessor: "x",
      yAccessor: "y",
      width: 400,
      height: 300,
    })
    const explicitSvg = renderChart("LineChart", {
      data: xyData,
      xAccessor: "x",
      yAccessor: "y",
      color: "#123456",
      lineWidth: 7,
      width: 400,
      height: 300,
    })

    expect(defaultSvg).toContain('stroke="#007bff"')
    expect(defaultSvg).not.toContain('stroke="#1f77b4"')
    expect(explicitSvg).toContain('stroke="#123456"')
    expect(explicitSvg).toContain('stroke-width="7"')
  })

  it("renderChart('AreaChart', …) matches the HOC's base blue and top-only stroke", () => {
    const svg = renderChart("AreaChart", {
      data: xyData,
      xAccessor: "x",
      yAccessor: "y",
      gradientFill: true,
      width: 400,
      height: 300,
    })
    const closedArea = svg.match(/<path[^>]*d="[^"]*Z"[^>]*>/)?.[0]

    // AreaChart's HOC defaults to DEFAULT_COLOR (#007bff), not the
    // frame palette. The closed fill has no outline; its top edge is a
    // separate path, exactly like the canvas renderer.
    expect(svg).toContain('stop-color="#007bff"')
    expect(closedArea).toContain('stroke="none"')
    expect((svg.match(/stroke="#007bff"/g) || []).length).toBe(1)
  })

  it("DifferenceChart React SSR renders filled crossover segments, not just two lines", () => {
    // Two-series fixture with a clean A>B → B>A crossover. The signature
    // DifferenceChart visual is the two-color filled region between the
    // curves; this guards the React-component SSR path (HOC → frame's
    // internal isServerEnvironment branch → PipelineStore with full
    // config).
    const data = differenceFixture()
    const html = renderComponent(
      <DifferenceChart
        data={data}
        xAccessor="x"
        seriesAAccessor="a"
        seriesBAccessor="b"
        width={400}
        height={300}
      />,
    )

    expect(html).not.toContain("<canvas")
    expect(html).toContain("<path")
    // At least one filled segment per side (A-winning + B-winning).
    const filledPaths = html.match(/<path[^>]*fill="(?!none)[^"]+"/g) || []
    expect(filledPaths.length).toBeGreaterThanOrEqual(2)
  })

  it("renderChart('QuadrantChart', …) emits four filled quadrant rects + centerlines", () => {
    // The OG-card generator wants a QuadrantChart preview but the
    // chart wasn't in `CHART_CONFIGS`, so it fell through to the
    // decorative-placeholder branch. Now wired with an svgPreRenderer
    // that paints quadrants + centerlines + corner labels.
    const svg = renderChart("QuadrantChart", {
      data: [
        { x: 2, y: 9 }, { x: 9, y: 8 }, { x: 3, y: 5 }, { x: 7, y: 4 },
      ],
      xAccessor: "x",
      yAccessor: "y",
      xCenter: 5,
      yCenter: 5,
      quadrants: {
        topLeft:     { label: "QW", color: "#22c55e" },
        topRight:    { label: "SB", color: "#3b82f6" },
        bottomLeft:  { label: "FI", color: "#94a3b8" },
        bottomRight: { label: "MP", color: "#ef4444" },
      },
      width: 400,
      height: 400,
    })

    // Four filled <rect> quadrant backgrounds.
    const filledRects = svg.match(/<rect[^>]*fill="(#22c55e|#3b82f6|#94a3b8|#ef4444)"/g) || []
    expect(filledRects.length).toBe(4)
    // Two centerlines + their labels (text elements).
    expect(svg).toMatch(/<line[^>]*x1="\d/)
    expect(svg).toContain(">QW<")
    expect(svg).toContain(">SB<")
  })

  it("renderChart('DifferenceChart', …) emits filled crossover segments — regression for OG-card path", () => {
    // The standalone `renderChart` server path (used by
    // `scripts/generate-blog-og-cards.mjs` and any MCP/AI snapshot
    // workflow) goes through `serverChartConfigs.differenceChart` →
    // `renderStreamXYFrame`. That was dropping `areaGroups`,
    // `y0Accessor`, and `curve` on the way into the PipelineConfig,
    // so the mixed-scene builder defaulted to "everything is a line"
    // and the difference fill never painted. Visible regression:
    // `docs/public/blog/og/difference-chart.png` showed two bare lines.
    const data = differenceFixture()
    const svg = renderChart("DifferenceChart", {
      data,
      xAccessor: "x",
      seriesAAccessor: "a",
      seriesBAccessor: "b",
      width: 380,
      height: 380,
      theme: "carbon-dark",
      showLegend: false,
    })

    expect(svg).toContain("<path")
    const filledPaths = svg.match(/<path[^>]*fill="(?!none)[^"]+"/g) || []
    expect(filledPaths.length).toBeGreaterThanOrEqual(2)
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

  it.each([
    ["LineChart", { data: xyData, xAccessor: "x", yAccessor: "y" }],
    ["AreaChart", { data: xyData, xAccessor: "x", yAccessor: "y" }],
    ["StackedAreaChart", {
      data: xyData.flatMap(d => [
        { ...d, group: "A" },
        { x: d.x, y: d.y * 0.6, group: "B" },
      ]),
      xAccessor: "x",
      yAccessor: "y",
      areaBy: "group",
    }],
  ] as const)("renderChart('%s', …) preserves curve interpolation in SSR", (component, chartProps) => {
    const linear = renderChart(component, { ...chartProps, curve: "linear", width: 400, height: 300 })
    const smooth = renderChart(component, { ...chartProps, curve: "monotoneX", width: 400, height: 300 })

    // The curve must reach the scene serializer: d3's monotone output emits
    // cubic Bézier commands whereas the linear path contains only segments.
    expect(smooth).not.toBe(linear)
    expect(smooth).toMatch(/<path[^>]*d="M[^"]*C/)
  })

  it("uses StackedAreaChart's monotoneX default when curve is omitted", () => {
    const svg = renderChart("StackedAreaChart", {
      data: [
        { x: 0, y: 2, group: "A" }, { x: 1, y: 6, group: "A" }, { x: 2, y: 3, group: "A" },
        { x: 0, y: 1, group: "B" }, { x: 1, y: 2, group: "B" }, { x: 2, y: 4, group: "B" },
      ],
      xAccessor: "x",
      yAccessor: "y",
      areaBy: "group",
      width: 400,
      height: 300,
    })
    expect(svg).toMatch(/<path[^>]*d="M[^"]*C/)
    expect(svg).toContain(">A<")
    expect(svg).toContain(">B<")
  })

  it("renderChart('StackedAreaChart', …) honors areaOpacity", () => {
    const svg = renderChart("StackedAreaChart", {
      data: [
        { x: 1, y: 10, group: "A" },
        { x: 2, y: 20, group: "A" },
        { x: 1, y: 15, group: "B" },
        { x: 2, y: 25, group: "B" },
      ],
      xAccessor: "x",
      yAccessor: "y",
      areaBy: "group",
      colorBy: "group",
      areaOpacity: 1,
      lineWidth: 5,
      width: 400,
      height: 300,
    })

    expect(svg).toContain('fill-opacity="1"')
    expect(svg).toContain('stroke-width="5"')
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

  it("renderChart('BarChart', …) keeps uncoloured bars monocolor", () => {
    const svg = renderChart("BarChart", {
      data: categoryData,
      categoryAccessor: "category",
      valueAccessor: "value",
      color: "#9E8FFF",
      width: 400,
      height: 300,
    })

    // Without colorBy, BarChart's HOC resolves one shared fill. The
    // frame-level palette fallback used to color these by category on SSR.
    expect((svg.match(/fill="#9E8FFF"/g) || [])).toHaveLength(3)
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

  it("renderChart('DonutChart', …) matches HOC margins and renders centerContent", () => {
    const svg = renderChart("DonutChart", {
      data: categoryData,
      categoryAccessor: "category",
      valueAccessor: "value",
      innerRadius: 80,
      centerContent: <span>Total: 100</span>,
      width: 600,
      height: 400,
    })

    // HOC primary margins are 70/50/40/60, placing the radial center at
    // (70 + 490 / 2, 50 + 290 / 2) rather than staticOrdinal's generic center.
    expect(svg).toContain('transform="translate(315,195)"')
    expect(svg).toContain("<foreignObject")
    expect(svg).toContain("Total: 100")
    // The explicit hole size is still reflected in the d3 arc command.
    expect(svg).toContain("A80,80")
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

  it("renderChart('BoxPlot', …) uses the HOC's default categorical blue", () => {
    const svg = renderChart("BoxPlot", {
      data: boxData,
      categoryAccessor: "category",
      valueAccessor: "value",
      width: 400,
      height: 300,
    })

    // LIGHT_THEME.categorical[0], which is what BoxPlot resolves through
    // useOrdinalPieceStyle on the client.
    expect(svg).toContain('fill="#1f77b4"')
    expect(svg).toContain('stroke="#1f77b4"')
    expect(svg).toContain('fill-opacity="0.8"')
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
        frameProps={{ margin }} />
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
    const componentPoints = (componentPaths[0]?.match(/L/g) || []).length
    const standalonePoints = (standalonePaths[0]?.match(/L/g) || []).length
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
