/**
 * Server rendering coverage tests.
 *
 * Exercises renderChart with combinations that have caused issues:
 * - Annotations across chart types
 * - Theme + background resolution
 * - Legend positioning at all 4 positions
 * - GaugeChart with various sweep/value combos
 * - Dashboard composition
 */

import { TextEncoder, TextDecoder } from "util"
Object.assign(global, { TextEncoder, TextDecoder })

import { renderChart, renderDashboard } from "../../components/server/renderToStaticSVG"

function isValidSVG(svg: string): boolean {
  return svg.startsWith("<svg") && svg.includes("</svg>") && svg.includes('xmlns="http://www.w3.org/2000/svg"')
}

const barData = [
  { category: "A", value: 10, group: "X" },
  { category: "B", value: 20, group: "Y" },
  { category: "C", value: 15, group: "X" },
]

const lineData = [
  { x: 1, y: 10, series: "Alpha" },
  { x: 2, y: 20, series: "Alpha" },
  { x: 3, y: 15, series: "Beta" },
  { x: 4, y: 25, series: "Beta" },
]

// ── Annotations ────────────────────────────────────────────────────────

describe("annotations across chart types", () => {
  it("y-threshold renders on bar chart", () => {
    const svg = renderChart("BarChart", {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      annotations: [{ type: "y-threshold", value: 15, label: "Target", color: "#e45050" }],
      width: 400, height: 300,
    })
    expect(isValidSVG(svg)).toBe(true)
    expect(svg).toContain("Target")
  })

  it("y-threshold renders on line chart", () => {
    const svg = renderChart("LineChart", {
      data: lineData,
      xAccessor: "x",
      yAccessor: "y",
      annotations: [{ type: "y-threshold", value: 18, label: "SLA" }],
      width: 400, height: 300,
    })
    expect(isValidSVG(svg)).toBe(true)
    expect(svg).toContain("SLA")
  })

  it("category-highlight renders on bar chart", () => {
    const svg = renderChart("BarChart", {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      annotations: [{ type: "category-highlight", category: "B", color: "#4589ff", opacity: 0.15 }],
      width: 400, height: 300,
    })
    expect(isValidSVG(svg)).toBe(true)
  })
})

// ── Theme + background ─────────────────────────────────────────────────

describe("theme and background resolution", () => {
  const themes = ["tufte", "dark", "bi-tool", "pastels", "italian", "journalist", "playful", "high-contrast"]

  for (const theme of themes) {
    it(`${theme} theme produces valid SVG`, () => {
      const svg = renderChart("BarChart", {
        data: barData,
        categoryAccessor: "category",
        valueAccessor: "value",
        theme,
        width: 300, height: 200,
      })
      expect(isValidSVG(svg)).toBe(true)
    })
  }

  it("explicit background overrides theme", () => {
    const svg = renderChart("BarChart", {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      theme: "dark",
      background: "#ff0000",
      width: 300, height: 200,
    })
    expect(svg).toContain("#ff0000")
  })

  it("dark themes with colorBy use theme categorical colors", () => {
    const svg = renderChart("BarChart", {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      colorBy: "group",
      theme: "dark",
      width: 300, height: 200,
    })
    expect(isValidSVG(svg)).toBe(true)
    // Should have rect elements with fills (not all the same default color)
    const rectCount = (svg.match(/<rect /g) || []).length
    expect(rectCount).toBeGreaterThan(0)
  })
})

// ── Legend positions ───────────────────────────────────────────────────

describe("legend at all four positions", () => {
  const positions = ["right", "left", "top", "bottom"] as const

  for (const pos of positions) {
    it(`legend at ${pos} produces valid SVG with legend group`, () => {
      const svg = renderChart("BarChart", {
        data: barData,
        categoryAccessor: "category",
        valueAccessor: "value",
        colorBy: "group",
        showLegend: true,
        legendPosition: pos,
        width: 400, height: 300,
      })
      expect(isValidSVG(svg)).toBe(true)
      expect(svg).toContain("semiotic-legend")
    })
  }
})

// ── GaugeChart variations ──────────────────────────────────────────────

describe("GaugeChart rendering", () => {
  const thresholds = [
    { value: 60, color: "#22c55e", label: "Normal" },
    { value: 80, color: "#f59e0b", label: "Warning" },
    { value: 100, color: "#ef4444", label: "Critical" },
  ]

  it("renders at minimum value", () => {
    const svg = renderChart("GaugeChart", {
      value: 0, min: 0, max: 100, sweep: 240,
      thresholds, width: 300, height: 300,
    })
    expect(isValidSVG(svg)).toBe(true)
    // Needle should be present (line + circle)
    expect(svg).toContain("<line")
    expect(svg).toContain("<circle")
  })

  it("renders at maximum value", () => {
    const svg = renderChart("GaugeChart", {
      value: 100, min: 0, max: 100, sweep: 240,
      thresholds, width: 300, height: 300,
    })
    expect(isValidSVG(svg)).toBe(true)
  })

  it("renders with custom sweep angle", () => {
    const svg = renderChart("GaugeChart", {
      value: 50, min: 0, max: 100, sweep: 180,
      thresholds, width: 300, height: 300,
    })
    expect(isValidSVG(svg)).toBe(true)
  })

  it("handles min === max without crash (divide-by-zero guard)", () => {
    const svg = renderChart("GaugeChart", {
      value: 50, min: 50, max: 50, sweep: 240,
      thresholds: [{ value: 50, color: "#ccc" }],
      width: 300, height: 300,
    })
    expect(isValidSVG(svg)).toBe(true)
  })
})

// ── Dashboard composition ──────────────────────────────────────────────

describe("dashboard composition", () => {
  it("renders mixed chart types in one dashboard", () => {
    const svg = renderDashboard([
      { component: "BarChart", props: { data: barData, categoryAccessor: "category", valueAccessor: "value" } },
      { component: "LineChart", props: { data: lineData, xAccessor: "x", yAccessor: "y" } },
      { component: "PieChart", props: { data: barData, categoryAccessor: "category", valueAccessor: "value" } },
    ], { width: 900, layout: { columns: 3 } })

    expect(isValidSVG(svg)).toBe(true)
    // Each chart is in a foreignObject
    const foreignObjects = (svg.match(/foreignObject/g) || []).length
    expect(foreignObjects).toBeGreaterThanOrEqual(6) // open + close for each
  })

  it("dashboard with theme applies consistently", () => {
    const svg = renderDashboard([
      { component: "BarChart", props: { data: barData, categoryAccessor: "category", valueAccessor: "value" } },
      { component: "LineChart", props: { data: lineData, xAccessor: "x", yAccessor: "y" } },
    ], { theme: "dark", width: 800 })

    expect(isValidSVG(svg)).toBe(true)
  })

  it("dashboard with colSpan and title", () => {
    const svg = renderDashboard([
      { component: "LineChart", colSpan: 2, props: { data: lineData, xAccessor: "x", yAccessor: "y", title: "Wide Chart" } },
      { component: "BarChart", props: { data: barData, categoryAccessor: "category", valueAccessor: "value" } },
    ], {
      title: "My Dashboard",
      subtitle: "Q1 2026",
      width: 800,
      layout: { columns: 2 },
    })

    expect(isValidSVG(svg)).toBe(true)
    expect(svg).toContain("My Dashboard")
  })
})

// ── Custom margins ────────────────────────────────────────────────────

describe("custom margins", () => {
  it("respects explicit margin on renderChart", () => {
    const svg = renderChart("BarChart", {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      margin: { top: 50, right: 50, bottom: 50, left: 100 },
      width: 400, height: 300,
    })
    expect(isValidSVG(svg)).toBe(true)
    // The translate transform should reflect the margin
    expect(svg).toContain("translate(100,50)")
  })
})

// ── Hierarchy SSR ─────────────────────────────────────────────────────

describe("hierarchy charts with colorByDepth", () => {
  const treeData = {
    name: "Root",
    children: [
      { name: "A", children: [{ name: "A1" }, { name: "A2" }] },
      { name: "B", children: [{ name: "B1" }] },
    ]
  }

  it("treemap with colorByDepth produces colored rects", () => {
    const svg = renderChart("Treemap", {
      data: treeData,
      childrenAccessor: "children",
      valueAccessor: (d: any) => d.children ? 0 : 1,
      colorByDepth: true,
      width: 400, height: 300,
    })
    expect(isValidSVG(svg)).toBe(true)
    // Should have rect elements for treemap cells
    const rects = (svg.match(/<rect /g) || []).length
    expect(rects).toBeGreaterThan(1)
  })

  it("tree diagram with theme uses theme colors for depth", () => {
    const svg = renderChart("TreeDiagram", {
      data: treeData,
      childrenAccessor: "children",
      colorByDepth: true,
      theme: "italian",
      width: 400, height: 300,
    })
    expect(isValidSVG(svg)).toBe(true)
  })
})
