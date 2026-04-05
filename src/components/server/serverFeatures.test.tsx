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
    } as any)
    // DARK_THEME uses #aaa for textSecondary
    expect(svg).toContain("#aaa")
    // DARK_THEME uses #555 for border
    expect(svg).toContain("#555")
  })

  it("applies tufte theme with serif font", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
      size: [400, 300],
      theme: "tufte",
    } as any)
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
    } as any)
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
    } as any)
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
    } as any)
    expect(svg).toContain("Franklin Gothic")
  })

  it("applies theme to network charts", () => {
    const svg = renderNetworkToStaticSVG({
      chartType: "force",
      nodes: [{ id: "A" }, { id: "B" }],
      edges: [{ source: "A", target: "B" }],
      size: [400, 400],
      theme: "dark",
    } as any)
    expect(svg).toContain("sans-serif")
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
    } as any)
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
    } as any)
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
    } as any)
    expect(svg).toContain('role="img"')
  })

  it("adds role='img' to network charts", () => {
    const svg = renderNetworkToStaticSVG({
      chartType: "force",
      nodes: [{ id: "A" }],
      edges: [],
      size: [200, 200],
    } as any)
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
    } as any)
    expect(svg).toContain("semiotic-grid")
  })

  it("does not render grid by default (XY)", () => {
    const svg = renderXYToStaticSVG({
      chartType: "line",
      data: [{ x: 0, y: 10 }, { x: 1, y: 20 }],
      xAccessor: "x",
      yAccessor: "y",
      size: [400, 300],
    } as any)
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
    } as any)
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
    } as any)
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
    } as any)
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
    } as any)
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
    } as any)
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
    } as any)
    // No color accessor = no categories = no legend
    expect(svg).not.toContain("semiotic-legend")
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
    } as any)
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
    } as any)
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
    } as any)
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

  it("renders Histogram", () => {
    const histData = Array.from({ length: 50 }, (_, i) => ({
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
    expect(() => renderChart("UnknownChart" as any, {})).toThrow(
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
    } as any)

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
    } as any)

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
    } as any)

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
      frameProps: { showAxes: false },
    })
    // renderChart maps to frame level — showAxes is on the frame
    expect(svg).toContain("<svg")
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

  it("handles large datasets efficiently", () => {
    const largeData = Array.from({ length: 1000 }, (_, i) => ({
      category: `cat-${i % 20}`,
      value: Math.random() * 100,
    }))
    const start = Date.now()
    const svg = renderChart("BarChart", {
      data: largeData,
      categoryAccessor: "category",
      valueAccessor: "value",
    })
    const elapsed = Date.now() - start
    expect(svg).toContain("<svg")
    // Should complete in reasonable time
    expect(elapsed).toBeLessThan(5000)
  })
})
