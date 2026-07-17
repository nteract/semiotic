/**
 * Comprehensive integration tests for semiotic/server features:
 * - Theme inlining
 * - Legend rendering
 * - Accessibility (title, desc, role)
 * - Grid lines
 * - Annotations
 * - DifferenceChart server layout
 *
 * Tests verify actual SVG output structure, not just "contains string".
 *
 * The renderChart HOC-level API, renderDashboard composition, parity, and
 * edge-case tests live in the sibling serverFeatures.renderChart.test.tsx
 * (split out to keep both files under the test hard limit — see
 * scripts/file-size-policy.json).
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
} from "./renderToStaticSVG"

// ── Helpers ──────────────────────────────────────────────────────────

type StaticFrameProps = Parameters<typeof renderToStaticSVG>[1]
type StaticXYProps = Parameters<typeof renderXYToStaticSVG>[0]
type StaticOrdinalProps = Parameters<typeof renderOrdinalToStaticSVG>[0]
type StaticNetworkProps = Parameters<typeof renderNetworkToStaticSVG>[0]

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

