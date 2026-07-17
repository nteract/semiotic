/**
 * Comprehensive integration tests for semiotic/server features:
 * - Theme inlining
 * - Legend rendering
 * - Accessibility (title, desc, role)
 * - Grid lines
 * - Annotations
 * - renderChart HOC API
 * - renderDashboard composition
 *
 * Tests verify actual SVG output structure, not just "contains string".
 */

// Polyfill TextEncoder/TextDecoder for react-dom/server in jsdom
import { TextEncoder, TextDecoder } from "util"
Object.assign(global, { TextEncoder, TextDecoder })

import {
  renderToStaticSVG,
  renderXYToStaticSVG,
  renderOrdinalToStaticSVG,
  renderNetworkToStaticSVG,
  renderChart,
  renderDashboard,
} from "./renderToStaticSVG"

// ── Helpers ──────────────────────────────────────────────────────────

function countMatches(svg: string, pattern: RegExp): number {
  return (svg.match(pattern) || []).length
}

type StaticFrameProps = Parameters<typeof renderToStaticSVG>[1]
type StaticXYProps = Parameters<typeof renderXYToStaticSVG>[0]
type StaticOrdinalProps = Parameters<typeof renderOrdinalToStaticSVG>[0]
type StaticNetworkProps = Parameters<typeof renderNetworkToStaticSVG>[0]
type RenderChartName = Parameters<typeof renderChart>[0]

// ── Test data ────────────────────────────────────────────────────────

const barData = [
  { category: "A", value: 10, group: "X" },
  { category: "B", value: 20, group: "Y" },
  { category: "C", value: 15, group: "X" },
]

const lineData = [
  { x: 0, y: 10, series: "alpha" },
  { x: 1, y: 20, series: "alpha" },
  { x: 2, y: 15, series: "alpha" },
  { x: 0, y: 5, series: "beta" },
  { x: 1, y: 25, series: "beta" },
  { x: 2, y: 10, series: "beta" },
]

const scatterData = [
  { x: 10, y: 20, size: 5, color: "A" },
  { x: 30, y: 40, size: 10, color: "B" },
  { x: 50, y: 60, size: 15, color: "A" },
]

const pieData = [
  { category: "A", value: 30 },
  { category: "B", value: 50 },
  { category: "C", value: 20 },
]

const networkEdges = [
  { source: "Revenue", target: "Product", value: 80 },
  { source: "Revenue", target: "Services", value: 50 },
  { source: "Product", target: "Profit", value: 60 },
]

describe("DifferenceChart server layout", () => {
  const data = [
    { x: 0, a: 10, b: 12 },
    { x: 1, a: 16, b: 14 },
  ]

  it("reserves the client legend gutter when no margin side was supplied", () => {
    const svg = renderChart("DifferenceChart", {
      data,
      xAccessor: "x",
      seriesAAccessor: "a",
      seriesBAccessor: "b",
      width: 420,
      height: 240,
    })

    expect(svg).toContain('class="semiotic-legend" transform="translate(320,50)"')
  })

  it("does not overwrite an explicit legend-side margin", () => {
    const svg = renderChart("DifferenceChart", {
      data,
      xAccessor: "x",
      seriesAAccessor: "a",
      seriesBAccessor: "b",
      width: 420,
      height: 240,
      margin: { right: 64 },
    })

    expect(svg).toContain('class="semiotic-legend" transform="translate(366,50)"')
  })
})

describe("Shared HOC rendering contracts", () => {
  it("carries legend, funnel-label, and geo-margin defaults through static rendering", () => {
    const dotPlot = renderChart("DotPlot", {
      data: [
        { category: "A", value: 1, group: "X" },
        { category: "B", value: 2, group: "Y" },
      ],
      categoryAccessor: "category",
      valueAccessor: "value",
      colorBy: "group",
      width: 420,
      height: 260,
    })
    const funnel = renderChart("FunnelChart", {
      data: [{ step: "Visited", value: 100 }, { step: "Signed up", value: 60 }],
      stepAccessor: "step",
      valueAccessor: "value",
      width: 420,
      height: 240,
    })
    const flowMap = renderChart("FlowMap", {
      nodes: [{ city: "A", lon: 0, lat: 0 }, { city: "B", lon: 10, lat: 10 }],
      flows: [{ source: "A", target: "B", value: 1 }],
      nodeIdAccessor: "city",
      xAccessor: "lon",
      yAccessor: "lat",
      areas: [{
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [[[-20, -20], [20, -20], [20, 20], [-20, 20], [-20, -20]]],
        },
      }],
      areaStyle: { fill: "#fedcba", stroke: "#123456" },
      width: 460,
      height: 300,
    })

    expect(dotPlot).toContain("semiotic-legend")
    expect(dotPlot).toContain(">X<")
    expect(funnel).toContain(">Visited<")
    expect(funnel).toContain(">Signed up<")
    // FlowMap shares the HOC's compact geo margin, not the primary XY margin.
    expect(flowMap).toContain('transform="translate(10,10)"')
    // Shared geo defaults remain defaults: explicit styling still wins.
    expect(flowMap).toContain("#fedcba")
    expect(flowMap).toContain("#123456")
  })

  it("uses the HOC's right-side Likert legend placement", () => {
    const svg = renderChart("LikertChart", {
      data: [
        { question: "Support", level: "Disagree", value: 2 },
        { question: "Support", level: "Agree", value: 3 },
      ],
      categoryAccessor: "question",
      levelAccessor: "level",
      countAccessor: "value",
      levels: ["Disagree", "Agree"],
      width: 460,
      height: 260,
    })

    expect(svg).toContain('class="semiotic-legend" transform="translate(360,50)"')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// Theme Inlining
// ═══════════════════════════════════════════════════════════════════════

describe("Theme inlining", () => {
  it("applies light theme text colors by default", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
      size: [400, 300],
    })
    // Default LIGHT_THEME uses #666 for tick labels
    expect(svg).toContain("#666")
  })

  it("applies dark theme colors when theme='dark'", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
      size: [400, 300],
      theme: "dark",
    } as StaticOrdinalProps)
    // DARK_THEME uses #aaa for textSecondary
    expect(svg).toContain("#aaa")
    // DARK_THEME uses #555 for border
    expect(svg).toContain("#555")
    // The client canvas paints the active theme background when no explicit
    // background prop overrides it; standalone SVG must do the same.
    expect(svg).toMatch(/<rect[^>]*width="400"[^>]*height="300"[^>]*fill="#1a1a2e"/)
  })

  it("applies tufte theme with serif font", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
      size: [400, 300],
      theme: "tufte",
    } as StaticOrdinalProps)
    expect(svg).toContain("Georgia")
  })

  it("applies carbon theme", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
      size: [400, 300],
      theme: "carbon",
    } as StaticOrdinalProps)
    expect(svg).toContain("IBM Plex Sans")
  })

  it("applies custom theme object", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
      size: [400, 300],
      theme: { colors: { primary: "#ff00ff" } },
    } as StaticOrdinalProps)
    // Custom theme should still render with inherited light theme defaults
    expect(svg).toContain("<svg")
  })

  it("applies theme to XY charts", () => {
    const svg = renderXYToStaticSVG({
      chartType: "line",
      data: [{ x: 0, y: 10 }, { x: 1, y: 20 }],
      xAccessor: "x",
      yAccessor: "y",
      size: [400, 300],
      theme: "journalist",
    } as StaticXYProps)
    expect(svg).toContain("Franklin Gothic")
  })

  it("applies theme to network charts", () => {
    const svg = renderNetworkToStaticSVG({
      chartType: "force",
      nodes: [{ id: "A" }, { id: "B" }],
      edges: [{ source: "A", target: "B" }],
      size: [400, 400],
      theme: "dark",
    } as StaticNetworkProps)
    expect(svg).toContain("sans-serif")
  })

  it("filters sparse frame-level inputs before SSR pipeline ingestion", () => {
    expect(() => renderToStaticSVG("xy", {
      chartType: "line",
      data: [null, { x: 0, y: 10 }, undefined, { x: 1, y: 20 }],
      xAccessor: "x",
      yAccessor: "y",
      size: [300, 200],
    } as StaticFrameProps)).not.toThrow()

    expect(() => renderToStaticSVG("ordinal", {
      chartType: "bar",
      data: [null, { category: "A", value: 10 }, undefined],
      oAccessor: "category",
      rAccessor: "value",
      size: [300, 200],
    } as StaticFrameProps)).not.toThrow()

    expect(() => renderToStaticSVG("network", {
      chartType: "force",
      nodes: [null, { id: "A" }, undefined, { id: "B" }],
      edges: [null, { source: "A", target: "B" }, undefined],
      size: [300, 200],
    } as StaticFrameProps)).not.toThrow()

    expect(() => renderToStaticSVG("geo", {
      points: [null, { x: -122.4, y: 37.8 }, undefined],
      xAccessor: "x",
      yAccessor: "y",
      size: [300, 200],
    } as unknown as StaticFrameProps)).not.toThrow()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// Accessibility
// ═══════════════════════════════════════════════════════════════════════

describe("Accessibility", () => {
  it("adds role='img' to SVG element", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
    })
    expect(svg).toContain('role="img"')
  })

  it("adds <title> element when title is provided", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
      title: "Revenue by Region",
    })
    expect(svg).toContain("<title")
    expect(svg).toContain("Revenue by Region")
    expect(svg).toContain('aria-labelledby="semiotic-title')
  })

  it("adds <desc> element when description is provided", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
      description: "A bar chart showing revenue",
    } as StaticOrdinalProps)
    expect(svg).toContain("<desc")
    expect(svg).toContain("A bar chart showing revenue")
    expect(svg).toContain('aria-labelledby')
    expect(svg).toContain("semiotic-desc")
  })

  it("includes both title and desc in aria-labelledby", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
      title: "Chart Title",
      description: "Chart description",
    } as StaticOrdinalProps)
    expect(svg).toContain('aria-labelledby="semiotic-title semiotic-desc"')
  })

  it("adds role='img' to empty charts", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: [],
      oAccessor: "category",
      rAccessor: "value",
    })
    expect(svg).toContain('role="img"')
  })

  it("adds role='img' to XY charts", () => {
    const svg = renderXYToStaticSVG({
      chartType: "line",
      data: [{ x: 0, y: 10 }],
      xAccessor: "x",
      yAccessor: "y",
    } as StaticXYProps)
    expect(svg).toContain('role="img"')
  })

  it("adds role='img' to network charts", () => {
    const svg = renderNetworkToStaticSVG({
      chartType: "force",
      nodes: [{ id: "A" }],
      edges: [],
      size: [200, 200],
    } as StaticNetworkProps)
    expect(svg).toContain('role="img"')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// Grid Lines
// ═══════════════════════════════════════════════════════════════════════

describe("Grid lines", () => {
  it("renders grid when showGrid is true (XY)", () => {
    const svg = renderXYToStaticSVG({
      chartType: "line",
      data: [{ x: 0, y: 10 }, { x: 1, y: 20 }, { x: 2, y: 15 }],
      xAccessor: "x",
      yAccessor: "y",
      size: [400, 300],
      showGrid: true,
    } as StaticXYProps)
    expect(svg).toContain("semiotic-grid")
  })

  it("does not render grid by default (XY)", () => {
    const svg = renderXYToStaticSVG({
      chartType: "line",
      data: [{ x: 0, y: 10 }, { x: 1, y: 20 }],
      xAccessor: "x",
      yAccessor: "y",
      size: [400, 300],
    } as StaticXYProps)
    expect(svg).not.toContain("semiotic-grid")
  })

  it("renders grid when showGrid is true (ordinal vertical)", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
      size: [400, 300],
      showGrid: true,
    } as StaticOrdinalProps)
    expect(svg).toContain("semiotic-grid")
  })

  it("renders grid for horizontal ordinal charts", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
      projection: "horizontal",
      size: [400, 300],
      showGrid: true,
    } as StaticOrdinalProps)
    expect(svg).toContain("semiotic-grid")
  })

  it("does not render grid for radial charts", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "pie",
      data: pieData,
      oAccessor: "category",
      rAccessor: "value",
      projection: "radial",
      size: [400, 400],
      showGrid: true,
    } as StaticOrdinalProps)
    expect(svg).not.toContain("semiotic-grid")
  })
})

// ═══════════════════════════════════════════════════════════════════════
// Legend Rendering
// ═══════════════════════════════════════════════════════════════════════

describe("Legend rendering", () => {
  it("renders legend when showLegend=true with colorAccessor", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
      colorAccessor: "group",
      size: [500, 300],
      showLegend: true,
    } as StaticOrdinalProps)
    expect(svg).toContain("semiotic-legend")
    expect(svg).toContain(">X<")
    expect(svg).toContain(">Y<")
  })

  it("does not render legend when showLegend is false/undefined", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
      colorAccessor: "group",
      size: [500, 300],
    })
    expect(svg).not.toContain("semiotic-legend")
  })

  it("renders legend for XY charts", () => {
    const svg = renderXYToStaticSVG({
      chartType: "scatter",
      data: scatterData,
      xAccessor: "x",
      yAccessor: "y",
      colorAccessor: "color",
      size: [500, 300],
      showLegend: true,
    } as StaticXYProps)
    expect(svg).toContain("semiotic-legend")
    expect(svg).toContain(">A<")
    expect(svg).toContain(">B<")
  })

  it("renders no legend when no color accessor", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
      size: [500, 300],
      showLegend: true,
    } as StaticOrdinalProps)
    // No color accessor = no categories = no legend
    expect(svg).not.toContain("semiotic-legend")
  })

  it("supports static horizontal legend alignment and swatch sizing", () => {
    const start = renderXYToStaticSVG({
      chartType: "line",
      data: lineData,
      xAccessor: "x",
      yAccessor: "y",
      groupAccessor: "series",
      colorAccessor: "series",
      size: [500, 300],
      showLegend: true,
      legendPosition: "top",
      legendLayout: { align: "start", swatchSize: 8 },
    } as StaticXYProps)
    const end = renderXYToStaticSVG({
      chartType: "line",
      data: lineData,
      xAccessor: "x",
      yAccessor: "y",
      groupAccessor: "series",
      colorAccessor: "series",
      size: [500, 300],
      showLegend: true,
      legendPosition: "top",
      legendLayout: { align: "end", swatchSize: 8 },
    } as StaticXYProps)

    const firstItemX = (svg: string) =>
      Number(svg.match(/class="semiotic-legend" transform="translate\([^)]*\)"><g transform="translate\(([\d.]+),/)?.[1])

    expect(start).toContain('width="8" height="8"')
    expect(firstItemX(end)).toBeGreaterThan(firstItemX(start))
  })

  it("renders caller-supplied legendGroups in SSR without showLegend", () => {
    const svg = renderChart("LineChart", {
      data: lineData,
      xAccessor: "x",
      yAccessor: "y",
      width: 420,
      height: 280,
      legendPosition: "top",
      legendLayout: { swatchSize: 8, align: "end" },
      legend: {
        legendGroups: [{
          label: "Series",
          type: "fill",
          styleFn: (item: { color?: string }) => ({ fill: item.color || "#999" }),
          items: [
            { label: "Kafka", color: "#e41a1c" },
            { label: "Flink", color: "#377eb8" },
          ],
        }],
      },
    })

    expect(svg).toContain(">Kafka<")
    expect(svg).toContain(">Flink<")
    expect(svg).toContain('width="8" height="8"')
    expect(svg.match(/id="data-area" transform="translate\([\d.]+,([\d.]+)\)"/)?.[1]).not.toBe("20")
  })

  it("composes caller legendGroups after an inferred series legend in SSR", () => {
    const svg = renderChart("LineChart", {
      data: lineData,
      xAccessor: "x",
      yAccessor: "y",
      lineBy: "series",
      colorBy: "series",
      width: 420,
      height: 280,
      legend: {
        legendGroups: [{
          label: "Context",
          type: "line",
          styleFn: () => ({ stroke: "#111" }),
          items: [{ label: "Target" }],
        }],
      },
    })

    expect(svg).toContain(">alpha<")
    expect(svg).toContain(">beta<")
    expect(svg).toContain(">Target<")
    expect(svg).toContain(">Context<")
  })

  it("renders static TemporalHistogram data with bins, category colors, and legend", () => {
    const svg = renderChart("TemporalHistogram", {
      binSize: 1000,
      data: [
        { time: 100, value: 5, kind: "Errors" },
        { time: 900, value: 7, kind: "Warnings" },
        { time: 2100, value: 4, kind: "Errors" },
      ],
      categoryAccessor: "kind",
      colors: { Errors: "#d62728", Warnings: "#f59e0b" },
      width: 420,
      height: 240,
    })

    expect(svg).toContain("stream-xy-frame")
    expect(svg).toContain("#d62728")
    expect(svg).toContain("#f59e0b")
    expect(svg).toContain(">Errors<")
    expect(svg).toContain(">Warnings<")
    expect(svg).toMatch(/<rect[^>]*fill="#d62728"[^>]*><\/rect><text[^>]*>Errors<\/text>/)
    expect(svg).toMatch(/<rect[^>]*fill="#f59e0b"[^>]*><\/rect><text[^>]*>Warnings<\/text>/)
  })

  it("renders caller-supplied gradient legends in SSR", () => {
    const svg = renderChart("LineChart", {
      data: lineData,
      xAccessor: "x",
      yAccessor: "y",
      width: 420,
      height: 280,
      legendPosition: "right",
      legend: {
        gradient: {
          label: "Revenue",
          domain: [0, 100],
          colorFn: (value: number) => value > 50 ? "#08519c" : "#deebf7",
        },
      },
    })

    expect(svg).toContain(">Revenue<")
    expect(svg).toContain("<linearGradient")
    expect(svg).toContain(">100<")
  })

  it("wraps top legends within chart content and reserves margin for wrapped rows", () => {
    const wrappedData = [
      "Customer Acquisition",
      "Expansion Revenue",
      "Retention Risk",
      "Support Load",
      "Platform Health",
    ].flatMap((series, i) => [
      { x: 0, y: 10 + i, series },
      { x: 1, y: 12 + i, series },
    ])
    const svg = renderXYToStaticSVG({
      chartType: "line",
      data: wrappedData,
      xAccessor: "x",
      yAccessor: "y",
      groupAccessor: "series",
      colorAccessor: "series",
      size: [360, 260],
      showLegend: true,
      legendPosition: "top",
      legendLayout: { maxWidth: 180, align: "start" },
    } as StaticXYProps)

    const dataAreaTop = Number(svg.match(/id="data-area" transform="translate\([\d.]+,([\d.]+)\)"/)?.[1])
    expect(svg).toContain('transform="translate(40,8)"')
    expect(dataAreaTop).toBeGreaterThan(40)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// Annotations in server SVG
// ═══════════════════════════════════════════════════════════════════════

describe("Annotations in server SVG", () => {
  it("renders y-threshold annotation on XY chart", () => {
    const svg = renderXYToStaticSVG({
      chartType: "line",
      data: [{ x: 0, y: 10 }, { x: 1, y: 20 }, { x: 2, y: 15 }],
      xAccessor: "x",
      yAccessor: "y",
      size: [400, 300],
      annotations: [{ type: "y-threshold", value: 15, label: "Target", color: "#e45050" }],
    } as StaticXYProps)
    expect(svg).toContain("semiotic-annotations")
    expect(svg).toContain("Target")
    expect(svg).toContain("#e45050")
  })

  it("renders y-threshold annotation on ordinal chart", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
      size: [400, 300],
      annotations: [{ type: "y-threshold", value: 15, label: "Goal" }],
    } as StaticOrdinalProps)
    expect(svg).toContain("Goal")
  })

  it("renders multiple annotations", () => {
    const svg = renderXYToStaticSVG({
      chartType: "line",
      data: [{ x: 0, y: 10 }, { x: 1, y: 20 }, { x: 2, y: 15 }],
      xAccessor: "x",
      yAccessor: "y",
      size: [400, 300],
      annotations: [
        { type: "y-threshold", value: 15, label: "Target" },
        { type: "x-threshold", value: 1, label: "Midpoint" },
      ],
    } as StaticXYProps)
    expect(svg).toContain("Target")
    expect(svg).toContain("Midpoint")
  })
})

// ═══════════════════════════════════════════════════════════════════════
// renderChart HOC-level API
// ═══════════════════════════════════════════════════════════════════════

describe("renderChart", () => {
  // ── XY Charts ──────────────────────────────────────────────────────

  it("renders LineChart", () => {
    const svg = renderChart("LineChart", {
      data: lineData,
      xAccessor: "x",
      yAccessor: "y",
      width: 400,
      height: 300,
    })
    expect(svg).toContain("<svg")
    expect(svg).toContain('role="img"')
    expect(svg).toContain("<path") // line path
  })

  it("forwards top-level frame props through renderChart", () => {
    const svg = renderChart("LineChart", {
      data: lineData,
      xAccessor: "x",
      yAccessor: "y",
      xLabel: "Time",
      yLabel: "Revenue",
      xFormat: () => "tick",
      width: 400,
      height: 300,
    })
    expect(svg).toContain(">Time<")
    expect(svg).toContain(">Revenue<")
    expect(svg).toContain(">tick<")
  })

  it("renders Scatterplot", () => {
    const svg = renderChart("Scatterplot", {
      data: scatterData,
      xAccessor: "x",
      yAccessor: "y",
      width: 400,
      height: 300,
    })
    expect(svg).toContain("<circle")
  })

  it("mirrors Scatterplot's categorical point and legend defaults", () => {
    const svg = renderChart("Scatterplot", {
      data: scatterData.map((d, index) => ({ ...d, color: index === 1 ? "legend-beta" : "legend-alpha" })),
      xAccessor: "x",
      yAccessor: "y",
      colorBy: "color",
      width: 400,
      height: 300,
    })
    expect(svg).toContain("legend-alpha")
    expect(svg).toContain("legend-beta")
    expect(svg).toContain('fill="#1f77b4"')
    expect(svg).toContain('fill="#ff7f0e"')
    expect(svg).toContain('r="5"')
  })

  it("mirrors QuadrantChart's categorical point and legend defaults", () => {
    const svg = renderChart("QuadrantChart", {
      data: scatterData.map((d, index) => ({ ...d, color: index === 1 ? "quadrant-beta" : "quadrant-alpha" })),
      xAccessor: "x",
      yAccessor: "y",
      colorBy: "color",
      width: 400,
      height: 300,
    })
    expect(svg).toContain("quadrant-alpha")
    expect(svg).toContain("quadrant-beta")
    expect(svg).toContain('fill="#1f77b4"')
    expect(svg).toContain('fill="#ff7f0e"')
    expect(svg).toContain('r="5"')
  })

  it("renders ConnectedScatterplot with both connectors and points", () => {
    const svg = renderChart("ConnectedScatterplot", {
      data: scatterData,
      xAccessor: "x",
      yAccessor: "y",
      orderAccessor: "x",
      width: 400,
      height: 300,
    })
    // ConnectedScatterplot renders its connectors as individually colored
    // SVG line segments (not a single uniform LineChart path).
    expect(svg).toContain("<line")
    expect(svg).toContain('stroke="#440154"')
    expect(countMatches(svg, /<circle/g)).toBeGreaterThan(0)
  })

  it("renders Heatmap", () => {
    const svg = renderChart("Heatmap", {
      data: [
        { x: 0, y: 0, value: 10 },
        { x: 1, y: 0, value: 20 },
        { x: 0, y: 1, value: 15 },
      ],
      xAccessor: "x",
      yAccessor: "y",
      valueAccessor: "value",
      width: 400,
      height: 300,
    })
    expect(svg).toContain("<rect")
  })

  it("renders Heatmap cell labels when showValues is enabled", () => {
    const svg = renderChart("Heatmap", {
      data: [
        { x: 0, y: 0, value: 10 },
        { x: 1, y: 0, value: 20 },
        { x: 0, y: 1, value: 15 },
        { x: 1, y: 1, value: 25 },
      ],
      xAccessor: "x",
      yAccessor: "y",
      valueAccessor: "value",
      showValues: true,
      width: 400,
      height: 300,
    })
    expect(svg).toContain(">10<")
    expect(svg).toContain(">25<")
  })

  // ── Ordinal Charts ─────────────────────────────────────────────────

  it("renders BarChart", () => {
    const svg = renderChart("BarChart", {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      width: 400,
      height: 300,
    })
    expect(svg).toContain("<rect")
    expect(countMatches(svg, /<rect /g)).toBeGreaterThanOrEqual(3)
  })

  it("renders horizontal BarChart", () => {
    const svg = renderChart("BarChart", {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      orientation: "horizontal",
      width: 400,
      height: 300,
    })
    expect(svg).toContain("<rect")
  })

  it("renders StackedBarChart", () => {
    const svg = renderChart("StackedBarChart", {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      stackBy: "group",
      width: 400,
      height: 300,
    })
    expect(svg).toContain("<rect")
  })

  it("forwards StackedBarChart barPadding", () => {
    const tight = renderChart("StackedBarChart", {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      stackBy: "group",
      barPadding: 0,
      width: 400,
      height: 300,
    })
    const loose = renderChart("StackedBarChart", {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      stackBy: "group",
      barPadding: 40,
      width: 400,
      height: 300,
    })
    expect(loose).not.toEqual(tight)
  })

  it("renders GroupedBarChart", () => {
    const svg = renderChart("GroupedBarChart", {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      groupBy: "group",
      width: 400,
      height: 300,
    })
    expect(svg).toContain("<rect")
  })

  it("uses GroupedBarChart's automatic legend when groupBy is set", () => {
    const svg = renderChart("GroupedBarChart", {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      groupBy: "group",
      width: 400,
      height: 300,
    })
    expect(svg).toContain("semiotic-legend")
  })

  it("renders PieChart", () => {
    const svg = renderChart("PieChart", {
      data: pieData,
      categoryAccessor: "category",
      valueAccessor: "value",
      width: 400,
      height: 400,
    })
    expect(svg).toContain("<path")
    expect(countMatches(svg, /<path /g)).toBeGreaterThanOrEqual(3)
  })

  it("uses PieChart's category legend by default", () => {
    const svg = renderChart("PieChart", {
      data: pieData,
      categoryAccessor: "category",
      valueAccessor: "value",
      width: 400,
      height: 400,
    })
    expect(svg).toContain("semiotic-legend")
  })

  it("preprocesses Likert data into the HOC's diverging layout", () => {
    const svg = renderChart("LikertChart", {
      data: [
        { question: "Support", score: 1 },
        { question: "Support", score: 3 },
        { question: "Support", score: 5 },
      ],
      levels: ["Disagree", "Neutral", "Agree"],
      width: 400,
      height: 300,
    })
    expect(svg).toContain("semiotic-legend")
    expect(svg).toContain(">Disagree<")
    expect(svg).toContain(">Agree<")
    // Default ThemeProvider state supplies RdBu, sampled by the shared Likert
    // palette resolver instead of the unthemed Carbon fallback.
    expect(svg).toContain("#67001f")
    expect(svg).toContain("#053061")
    expect(svg).toContain('transform="translate(100,50)"')
  })

  it("renders DonutChart", () => {
    const svg = renderChart("DonutChart", {
      data: pieData,
      categoryAccessor: "category",
      valueAccessor: "value",
      width: 400,
      height: 400,
    })
    expect(svg).toContain("<path")
  })

  it("renders GaugeChart arc-length gradients across multiple slices", () => {
    const svg = renderChart("GaugeChart", {
      value: 70,
      min: 0,
      max: 100,
      fillZones: true,
      showNeedle: false,
      backgroundColor: "#d1d5db",
      cornerRadius: 14,
      gradientFill: {
        colorStops: [
          { offset: 0, color: "#ef4444" },
          { offset: 0.5, color: "#f59e0b" },
          { offset: 1, color: "#3b82f6" },
        ],
      },
    })
    const fills = new Set<string>()
    for (const match of svg.matchAll(/<path\b[^>]*fill="([^"]+)"/g)) {
      fills.add(match[1])
    }
    expect(svg).toContain("#d1d5db")
    expect(fills.size).toBeGreaterThan(3)
  })

  it("matches GaugeChart's partial-arc layout and value content in SSR", () => {
    const svg = renderChart("GaugeChart", {
      value: 70,
      min: 0,
      max: 100,
      sweep: 180,
      showNeedle: false,
      width: 400,
      height: 300,
    })

    // The scene center is offset so the *visible* half arc is centered in the
    // widget, rather than treating its hub as a full-circle chart center.
    expect(svg).toContain('transform="translate(200,244)"')
    expect(svg).toContain("<foreignObject")
    expect(svg).toContain(">70<")
    expect(svg).not.toContain("stroke-linecap=\"round\"")
  })

  it("renders GaugeChart threshold tick lines and labels", () => {
    const svg = renderChart("GaugeChart", {
      value: 50,
      min: 0,
      max: 100,
      thresholds: [
        { value: 25, color: "#f59e0b", label: "Low" },
        { value: 75, color: "#22c55e", label: "High" },
      ],
      width: 400,
      height: 300,
    })
    expect(svg).toContain(">Low<")
    expect(svg).toContain(">High<")
    expect(svg).toContain('stroke-linecap="round"')
  })

  it("matches FunnelChart axis defaults by orientation", () => {
    const funnelData = [
      { step: "Visited", value: 100 },
      { step: "Signed up", value: 45 },
      { step: "Paid", value: 20 },
    ]
    const horizontal = renderChart("FunnelChart", {
      data: funnelData,
      stepAccessor: "step",
      valueAccessor: "value",
      orientation: "horizontal",
      width: 400,
      height: 300,
    })
    const vertical = renderChart("FunnelChart", {
      data: funnelData,
      stepAccessor: "step",
      valueAccessor: "value",
      orientation: "vertical",
      width: 400,
      height: 300,
    })
    expect(horizontal).not.toContain('id="axes"')
    expect(vertical).toContain('id="axes"')
  })

  it("renders Histogram", () => {
    const histData = Array.from({ length: 50 }, (_, _i) => ({
      category: "All",
      value: Math.random() * 100,
    }))
    const svg = renderChart("Histogram", {
      data: histData,
      categoryAccessor: "category",
      valueAccessor: "value",
      bins: 10,
      width: 400,
      height: 300,
    })
    expect(svg).toContain("<rect")
  })

  it("renders BoxPlot", () => {
    const boxData = Array.from({ length: 30 }, (_, i) => ({
      category: i < 15 ? "A" : "B",
      value: Math.random() * 100,
    }))
    const svg = renderChart("BoxPlot", {
      data: boxData,
      categoryAccessor: "category",
      valueAccessor: "value",
      width: 400,
      height: 300,
    })
    expect(svg).toContain("<line") // whiskers
    expect(svg).toContain("<rect") // boxes
  })

  it("renders SwarmPlot", () => {
    const svg = renderChart("SwarmPlot", {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      width: 400,
      height: 300,
    })
    expect(svg).toContain("<circle")
  })

  it("mirrors ordinal chart default orientations, colors, and legends", () => {
    const data = [
      { category: "one", value: 2, group: "legend-alpha" },
      { category: "two", value: 4, group: "legend-beta" },
      { category: "three", value: 3, group: "legend-alpha" },
    ]
    const swarm = renderChart("SwarmPlot", { data, categoryAccessor: "category", valueAccessor: "value", colorBy: "group", width: 400, height: 300 })
    const stacked = renderChart("StackedBarChart", { data, categoryAccessor: "category", valueAccessor: "value", stackBy: "group", width: 400, height: 300 })
    const swimlane = renderChart("SwimlaneChart", { data, categoryAccessor: "category", subcategoryAccessor: "group", valueAccessor: "value", width: 400, height: 300 })
    const ridgeline = renderChart("RidgelinePlot", { data, categoryAccessor: "group", valueAccessor: "value", width: 400, height: 300 })

    for (const svg of [swarm, stacked, swimlane]) {
      expect(svg).toContain("legend-alpha")
      expect(svg).toContain("legend-beta")
      expect(svg).toContain('fill="#1f77b4"')
      expect(svg).toContain('fill="#ff7f0e"')
    }
    // RidgelinePlot defaults to horizontal: categories occupy the vertical
    // ordinal axis, so its category ticks have x=0 rather than y=0.
    expect(ridgeline).toMatch(/<text x="-8"[^>]*>legend-alpha<\/text>/)
  })

  it("mirrors ViolinPlot's vertical IQR and default summary style", () => {
    const data = [1, 2, 3, 5, 8, 13].map(value => ({ category: "distribution", value }))
    const svg = renderChart("ViolinPlot", {
      data,
      categoryAccessor: "category",
      valueAccessor: "value",
      width: 400,
      height: 300,
    })
    expect(svg).toContain('fill="#1f77b4"')
    // The IQR follows the vertical violin's value axis: a constant x.
    expect(svg).toMatch(/<line x1="([^"]+)" y1="[^"]+" x2="\1" y2="[^"]+" stroke="#1f77b4"/)
  })

  // ── Network Charts ─────────────────────────────────────────────────

  it("renders ForceDirectedGraph", () => {
    const svg = renderChart("ForceDirectedGraph", {
      nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
      edges: [{ source: "A", target: "B" }, { source: "B", target: "C" }],
      width: 400,
      height: 400,
    })
    expect(svg).toContain("<circle")
    expect(countMatches(svg, /<circle /g)).toBeGreaterThanOrEqual(3)
  })

  it("renders SankeyDiagram", () => {
    const svg = renderChart("SankeyDiagram", {
      edges: networkEdges,
      width: 500,
      height: 300,
    })
    expect(svg).toContain("<rect") // nodes
    expect(svg).toContain("<path") // edges
  })

  it("mirrors ProcessSankey's chart-owned categorical legend and margin contract", () => {
    const props = {
      nodes: [
        { id: "intake", phase: "Intake", xExtent: [0, 20] },
        { id: "review", phase: "Review", xExtent: [20, 50] },
      ],
      edges: [{ source: "intake", target: "review", value: 4, startTime: 0, endTime: 50 }],
      domain: [0, 50],
      nodeIdAccessor: "id",
      colorBy: "phase",
      width: 400,
      height: 300,
    }
    const svg = renderChart("ProcessSankey", props)
    const explicitRight = renderChart("ProcessSankey", { ...props, margin: { right: 30 } })

    // The HOC owns this specific legend rather than the frame auto-legend.
    // Its default right gutter is 140px; an explicit caller margin remains
    // authoritative for external legend layouts.
    expect(svg).toContain(">Intake<")
    expect(svg).toContain(">Review<")
    expect(svg).toContain('class="semiotic-legend" transform="translate(270,30)"')
    expect(explicitRight).toContain('class="semiotic-legend" transform="translate(380,30)"')
  })

  it("resolves ProcessSankey colors from the active theme", () => {
    const svg = renderChart("ProcessSankey", {
      nodes: [
        { id: "intake", phase: "Intake", xExtent: [0, 20] },
        { id: "review", phase: "Review", xExtent: [20, 50] },
      ],
      edges: [{ source: "intake", target: "review", value: 4, startTime: 0, endTime: 50 }],
      domain: [0, 50],
      nodeIdAccessor: "id",
      colorBy: "phase",
      theme: "dark",
      width: 400,
      height: 300,
    })
    expect(svg).toContain("#4fc3f7")
    expect(svg).toContain("#ffb74d")
    expect(svg).not.toContain("#1f77b4")
    expect(svg).not.toContain("#ff7f0e")
  })

  it("uses Sankey and TreeDiagram's HOC-level monocolor/black-outline defaults", () => {
    const sankey = renderChart("SankeyDiagram", {
      edges: networkEdges,
      width: 500,
      height: 300,
    })
    const tree = renderChart("TreeDiagram", {
      data: { id: "root", children: [{ id: "left" }, { id: "right" }] },
      childrenAccessor: "children",
      width: 500,
      height: 300,
    })
    expect(sankey).toContain('fill="#1f77b4"')
    expect(sankey).not.toContain('fill="#ff7f0e"')
    expect(tree).toContain('stroke="black"')
  })

  it("preserves Treemap's HOC node-border token", () => {
    const svg = renderChart("Treemap", {
      data: { id: "root", children: [{ id: "A", value: 3 }, { id: "B", value: 2 }] },
      childrenAccessor: "children",
      valueAccessor: "value",
      width: 500,
      height: 300,
    })
    expect(svg).toContain('stroke="var(--semiotic-cell-border, var(--semiotic-border, #fff))"')
  })

  it("uses XYCustomChart's automatic categorical legend", () => {
    const svg = renderChart("XYCustomChart", {
      data: [{ x: 1, y: 1, category: "custom-alpha" }, { x: 2, y: 2, category: "custom-beta" }],
      colorBy: "category",
      layout: () => ({ nodes: [{ type: "rect", x: 0, y: 0, w: 1, h: 1, style: { fill: "#007bff" }, datum: null }] }),
      width: 400,
      height: 240,
    })
    expect(svg).toContain("semiotic-legend")
    expect(svg).toContain("custom-alpha")
    expect(svg).toContain("custom-beta")
  })

  // ── With features ─────────────────────────────────────────────────

  it("renders chart with theme", () => {
    const svg = renderChart("BarChart", {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      theme: "dark",
      width: 400,
      height: 300,
    })
    expect(svg).toContain("#555") // dark theme border
  })

  it("renders chart with title and description", () => {
    const svg = renderChart("BarChart", {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      title: "Sales Chart",
      description: "Shows sales by category",
      width: 400,
      height: 300,
    })
    expect(svg).toContain("<title")
    expect(svg).toContain("Sales Chart")
    expect(svg).toContain("<desc")
    expect(svg).toContain("Shows sales by category")
  })

  it("renders chart with grid", () => {
    const svg = renderChart("BarChart", {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      showGrid: true,
      width: 400,
      height: 300,
    })
    expect(svg).toContain("semiotic-grid")
  })

  it("renders chart with annotations", () => {
    const svg = renderChart("BarChart", {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      annotations: [{ type: "y-threshold", value: 15, label: "Target" }],
      width: 400,
      height: 300,
    })
    expect(svg).toContain("Target")
  })

  it("renders chart with boolean gradientFill shorthand", () => {
    const svg = renderChart("BarChart", {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      gradientFill: true,
      width: 400,
      height: 300,
    })
    expect(svg).toContain("<linearGradient")
    expect(svg).toMatch(/fill="url\(#/)
  })

  it("renders chart with object-form gradientFill", () => {
    const svg = renderChart("BarChart", {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      gradientFill: { topOpacity: 0.8, bottomOpacity: 0.1 },
      width: 400,
      height: 300,
    })
    expect(svg).toContain("<linearGradient")
  })

  it("renders StackedBarChart with gradientFill", () => {
    const svg = renderChart("StackedBarChart", {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      stackBy: "group",
      gradientFill: true,
      width: 400,
      height: 300,
    })
    expect(svg).toContain("<linearGradient")
  })

  it("renders GroupedBarChart with gradientFill", () => {
    const svg = renderChart("GroupedBarChart", {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      groupBy: "group",
      gradientFill: true,
      width: 400,
      height: 300,
    })
    expect(svg).toContain("<linearGradient")
  })

  it("renders chart with legend", () => {
    const svg = renderChart("BarChart", {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      colorBy: "group",
      showLegend: true,
      width: 500,
      height: 300,
    })
    expect(svg).toContain("semiotic-legend")
  })

  it("throws for unknown component", () => {
    expect(() => renderChart("UnknownChart" as RenderChartName, {})).toThrow(
      /Unknown chart component/
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════
// renderDashboard
// ═══════════════════════════════════════════════════════════════════════

describe("renderDashboard", () => {
  it("renders empty dashboard", () => {
    const svg = renderDashboard([], { width: 800, height: 400 })
    expect(svg).toContain("<svg")
    expect(svg).toContain('role="img"')
  })

  it("renders dashboard with title", () => {
    const svg = renderDashboard([], {
      title: "Q1 Dashboard",
      width: 800,
      height: 400,
    })
    expect(svg).toContain("<title")
    expect(svg).toContain("Q1 Dashboard")
  })

  it("renders dashboard with subtitle", () => {
    const svg = renderDashboard([], {
      title: "Dashboard",
      subtitle: "January - March 2026",
      width: 800,
      height: 400,
    })
    expect(svg).toContain("January - March 2026")
  })

  it("renders dashboard with multiple charts", () => {
    const svg = renderDashboard(
      [
        {
          component: "BarChart",
          props: {
            data: barData,
            categoryAccessor: "category",
            valueAccessor: "value",
          },
        },
        {
          component: "PieChart",
          props: {
            data: pieData,
            categoryAccessor: "category",
            valueAccessor: "value",
          },
        },
      ],
      {
        title: "Multi-Chart",
        width: 1200,
        layout: { columns: 2, gap: 16 },
      }
    )
    expect(svg).toContain("<svg")
    // Both charts rendered via foreignObject
    expect(countMatches(svg, /foreignObject/g)).toBeGreaterThanOrEqual(4) // open + close for each
    // Both charts should produce <rect (bar) or <path (pie)
    expect(svg).toContain("<rect")
    expect(svg).toContain("<path")
  })

  it("applies theme to all dashboard charts", () => {
    const svg = renderDashboard(
      [
        {
          component: "BarChart",
          props: {
            data: barData,
            categoryAccessor: "category",
            valueAccessor: "value",
          },
        },
      ],
      {
        theme: "dark",
        width: 800,
      }
    )
    // The inner chart should use dark theme colors
    expect(svg).toContain("#555") // dark border
  })

  it("renders dashboard with background", () => {
    const svg = renderDashboard([], {
      width: 800,
      height: 400,
      background: "#f0f0f0",
    })
    expect(svg).toContain("#f0f0f0")
  })

  it("handles frameType-based charts", () => {
    const svg = renderDashboard(
      [
        {
          frameType: "ordinal",
          props: {
            chartType: "bar",
            data: barData,
            oAccessor: "category",
            rAccessor: "value",
          },
        },
      ],
      { width: 800 }
    )
    expect(svg).toContain("<rect")
  })

  it("respects colSpan for emphasis charts", () => {
    const svg = renderDashboard(
      [
        {
          component: "BarChart",
          colSpan: 2,
          props: {
            data: barData,
            categoryAccessor: "category",
            valueAccessor: "value",
          },
        },
        {
          component: "PieChart",
          props: {
            data: pieData,
            categoryAccessor: "category",
            valueAccessor: "value",
          },
        },
      ],
      {
        width: 1200,
        layout: { columns: 2 },
      }
    )
    expect(svg).toContain("<svg")
  })
})

// ═══════════════════════════════════════════════════════════════════════
// Parity: renderChart vs renderToStaticSVG
// ═══════════════════════════════════════════════════════════════════════

describe("Parity: renderChart vs frame-level API", () => {
  it("BarChart produces same structure as ordinal frame", () => {
    const hoc = renderChart("BarChart", {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      width: 400,
      height: 300,
    })
    const frame = renderToStaticSVG("ordinal", {
      chartType: "bar",
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
      size: [400, 300],
    } as StaticFrameProps)

    // Both should be valid SVGs with bars
    expect(hoc).toContain("<svg")
    expect(frame).toContain("<svg")

    // Both should have the same number of data rects
    const hocRects = countMatches(hoc, /<rect /g)
    const frameRects = countMatches(frame, /<rect /g)
    expect(hocRects).toBe(frameRects)
  })

  it("PieChart produces same structure as radial ordinal frame", () => {
    const hoc = renderChart("PieChart", {
      data: pieData,
      categoryAccessor: "category",
      valueAccessor: "value",
      width: 400,
      height: 400,
    })
    const frame = renderToStaticSVG("ordinal", {
      chartType: "pie",
      data: pieData,
      oAccessor: "category",
      rAccessor: "value",
      projection: "radial",
      size: [400, 400],
    } as StaticFrameProps)

    const hocPaths = countMatches(hoc, /<path /g)
    const framePaths = countMatches(frame, /<path /g)
    expect(hocPaths).toBe(framePaths)
  })

  it("SankeyDiagram produces same structure as sankey frame", () => {
    const hoc = renderChart("SankeyDiagram", {
      edges: networkEdges,
      width: 500,
      height: 300,
    })
    const frame = renderToStaticSVG("network", {
      chartType: "sankey",
      edges: networkEdges,
      size: [500, 300],
    } as StaticFrameProps)

    const hocRects = countMatches(hoc, /<rect /g)
    const frameRects = countMatches(frame, /<rect /g)
    expect(hocRects).toBe(frameRects)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// Edge cases and error handling
// ═══════════════════════════════════════════════════════════════════════

describe("Edge cases", () => {
  it("handles empty data gracefully", () => {
    const svg = renderChart("BarChart", {
      data: [],
      categoryAccessor: "category",
      valueAccessor: "value",
    })
    expect(svg).toContain("<svg")
    expect(svg).toContain('role="img"')
  })

  it("handles undefined data gracefully", () => {
    const svg = renderChart("BarChart", {
      categoryAccessor: "category",
      valueAccessor: "value",
    })
    expect(svg).toContain("<svg")
  })

  it("handles single data point", () => {
    const svg = renderChart("Scatterplot", {
      data: [{ x: 5, y: 10 }],
      xAccessor: "x",
      yAccessor: "y",
    })
    expect(svg).toContain("<svg")
    expect(svg).toContain("<circle")
  })

  it("renders without axes when showAxes=false", () => {
    const svg = renderChart("BarChart", {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      showAxes: false,
    })
    expect(svg).toContain("<svg")
    expect(svg).not.toContain('id="axes"')
  })

  it("renders with custom background", () => {
    const svg = renderChart("BarChart", {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      background: "#1a1a2e",
    })
    expect(svg).toContain("#1a1a2e")
  })

  it("handles large datasets", () => {
    const largeData = Array.from({ length: 1000 }, (_, i) => ({
      category: `cat-${i % 20}`,
      value: Math.random() * 100,
    }))
    const svg = renderChart("BarChart", {
      data: largeData,
      categoryAccessor: "category",
      valueAccessor: "value",
    })
    expect(svg).toContain("<svg")
    expect(svg).toContain("<rect")
  })
})
