// Polyfill TextEncoder/TextDecoder for react-dom/server in jsdom
import { TextEncoder, TextDecoder } from "util"
Object.assign(global, { TextEncoder, TextDecoder })

import {
  renderToStaticSVG,
  renderXYToStaticSVG,
  renderOrdinalToStaticSVG,
  renderNetworkToStaticSVG
} from "./renderToStaticSVG"

// ── Helpers ──────────────────────────────────────────────────────────

function countMatches(svg: string, pattern: RegExp): number {
  return (svg.match(pattern) || []).length
}

// ── Ordinal SSR: Bar charts ─────────────────────────────────────────

describe("renderOrdinalToStaticSVG", () => {
  const barData = [
    { category: "A", value: 10 },
    { category: "B", value: 20 },
    { category: "C", value: 15 }
  ]

  it("renders vertical bar chart", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
      size: [400, 300]
    })

    expect(svg).toContain("<svg")
    expect(svg).toContain("stream-ordinal-frame")
    // 3 categories => 3 rects
    expect(countMatches(svg, /<rect /g)).toBeGreaterThanOrEqual(3)
    // Should have axes
    expect(svg).toContain("ordinal-axes")
  })

  it("renders horizontal bar chart", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
      projection: "horizontal",
      size: [400, 300]
    })

    expect(svg).toContain("<svg")
    expect(countMatches(svg, /<rect /g)).toBeGreaterThanOrEqual(3)
    expect(svg).toContain("ordinal-axes")
  })

  it("renders empty SVG for empty data", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: [],
      oAccessor: "category",
      rAccessor: "value"
    })

    expect(svg).toContain("<svg")
    expect(svg).toContain("stream-ordinal-frame")
    // No data marks
    expect(countMatches(svg, /<rect /g)).toBe(0)
  })

  it("renders with title", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
      title: "Sales by Region"
    })

    expect(svg).toContain("Sales by Region")
  })

  it("renders with background", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
      background: "#f0f0f0"
    })

    expect(svg).toContain("#f0f0f0")
  })

  it("renders without axes when showAxes is false", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
      showAxes: false
    })

    expect(svg).not.toContain("ordinal-axes")
  })

  it("renders with custom className", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
      className: "my-chart"
    })

    expect(svg).toContain("stream-ordinal-frame my-chart")
  })

  it("renders axis labels", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
      oLabel: "Category",
      rLabel: "Value"
    })

    expect(svg).toContain("Category")
    expect(svg).toContain("Value")
  })
})

// ── Ordinal SSR: Cluster bar ────────────────────────────────────────

describe("renderOrdinalToStaticSVG - clusterbar", () => {
  const clusterData = [
    { category: "A", group: "X", value: 10 },
    { category: "A", group: "Y", value: 15 },
    { category: "B", group: "X", value: 20 },
    { category: "B", group: "Y", value: 25 }
  ]

  it("renders cluster bar chart with grouped bars", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "clusterbar",
      data: clusterData,
      oAccessor: "category",
      rAccessor: "value",
      groupBy: "group",
      size: [400, 300]
    })

    expect(svg).toContain("<svg")
    // 4 data points = 4 rects (plus possible axis/background rects)
    expect(countMatches(svg, /<rect /g)).toBeGreaterThanOrEqual(4)
  })
})

// ── Ordinal SSR: Pie / Donut ────────────────────────────────────────

describe("renderOrdinalToStaticSVG - pie", () => {
  const pieData = [
    { category: "A", value: 30 },
    { category: "B", value: 50 },
    { category: "C", value: 20 }
  ]

  it("renders pie chart with wedge paths", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "pie",
      data: pieData,
      oAccessor: "category",
      rAccessor: "value",
      projection: "radial",
      size: [400, 400]
    })

    expect(svg).toContain("<svg")
    // 3 wedges => 3 <path> elements
    expect(countMatches(svg, /<path /g)).toBeGreaterThanOrEqual(3)
    // No axes for radial
    expect(svg).not.toContain("ordinal-axes")
  })

  it("renders donut chart with inner radius", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "donut",
      data: pieData,
      oAccessor: "category",
      rAccessor: "value",
      projection: "radial",
      innerRadius: 50,
      size: [400, 400]
    })

    expect(svg).toContain("<svg")
    expect(countMatches(svg, /<path /g)).toBeGreaterThanOrEqual(3)
  })
})

// ── Ordinal SSR: Point / Swarm ──────────────────────────────────────

describe("renderOrdinalToStaticSVG - point/swarm", () => {
  const pointData = [
    { category: "A", value: 10 },
    { category: "A", value: 12 },
    { category: "B", value: 20 },
    { category: "B", value: 18 }
  ]

  it("renders point chart with circles", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "point",
      data: pointData,
      oAccessor: "category",
      rAccessor: "value",
      size: [400, 300]
    })

    expect(svg).toContain("<svg")
    expect(countMatches(svg, /<circle /g)).toBeGreaterThanOrEqual(4)
  })

  it("renders swarm chart with jittered circles", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "swarm",
      data: pointData,
      oAccessor: "category",
      rAccessor: "value",
      size: [400, 300]
    })

    expect(svg).toContain("<svg")
    expect(countMatches(svg, /<circle /g)).toBeGreaterThanOrEqual(4)
  })
})

// ── Ordinal SSR: Boxplot ────────────────────────────────────────────

describe("renderOrdinalToStaticSVG - boxplot", () => {
  const boxData = Array.from({ length: 30 }, (_, i) => ({
    category: i < 15 ? "A" : "B",
    value: Math.random() * 100
  }))

  it("renders boxplot with whiskers and box", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "boxplot",
      data: boxData,
      oAccessor: "category",
      rAccessor: "value",
      size: [400, 300]
    })

    expect(svg).toContain("<svg")
    // Should contain boxplot group elements with lines and rects
    expect(countMatches(svg, /<line /g)).toBeGreaterThan(0)
    expect(countMatches(svg, /<rect /g)).toBeGreaterThan(0)
  })
})

// ── Ordinal SSR: Violin ─────────────────────────────────────────────

describe("renderOrdinalToStaticSVG - violin", () => {
  const violinData = Array.from({ length: 40 }, (_, i) => ({
    category: i < 20 ? "A" : "B",
    value: Math.random() * 100
  }))

  it("renders violin plot with path shapes", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "violin",
      data: violinData,
      oAccessor: "category",
      rAccessor: "value",
      size: [400, 300]
    })

    expect(svg).toContain("<svg")
    // Violin shapes are <path> elements
    expect(countMatches(svg, /<path /g)).toBeGreaterThanOrEqual(2)
  })
})

// ── Ordinal SSR: Histogram ──────────────────────────────────────────

describe("renderOrdinalToStaticSVG - histogram", () => {
  const histData = Array.from({ length: 50 }, (_, i) => ({
    category: "All",
    value: Math.random() * 100
  }))

  it("renders histogram with binned rects", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "histogram",
      data: histData,
      oAccessor: "category",
      rAccessor: "value",
      bins: 10,
      size: [400, 300]
    })

    expect(svg).toContain("<svg")
    // Multiple binned rects
    expect(countMatches(svg, /<rect /g)).toBeGreaterThan(1)
  })
})

// ── Ordinal SSR: Timeline ───────────────────────────────────────────

describe("renderOrdinalToStaticSVG - timeline", () => {
  const timelineData = [
    { category: "Task A", range: [0, 30] },
    { category: "Task B", range: [10, 50] },
    { category: "Task C", range: [25, 70] }
  ]

  it("renders timeline with range bars", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "timeline",
      data: timelineData,
      oAccessor: "category",
      rAccessor: (d: any) => d.range,
      size: [400, 300]
    })

    expect(svg).toContain("<svg")
    // 3 timeline bars
    expect(countMatches(svg, /<rect /g)).toBeGreaterThanOrEqual(3)
  })
})

// ── renderToStaticSVG dispatch ──────────────────────────────────────

describe("renderToStaticSVG dispatch", () => {
  it("dispatches ordinal frame type correctly", () => {
    const svg = renderToStaticSVG("ordinal", {
      chartType: "bar",
      data: [
        { category: "A", value: 10 },
        { category: "B", value: 20 }
      ],
      oAccessor: "category",
      rAccessor: "value"
    } as any)

    expect(svg).toContain("stream-ordinal-frame")
    expect(countMatches(svg, /<rect /g)).toBeGreaterThanOrEqual(2)
  })

  it("throws for unknown frame type", () => {
    expect(() => renderToStaticSVG("unknown" as any, {} as any)).toThrow(
      /Unknown frame type/
    )
  })
})

// ── Regression: XY SSR still works ──────────────────────────────────

describe("renderXYToStaticSVG - regression", () => {
  it("renders line chart", () => {
    const svg = renderXYToStaticSVG({
      chartType: "line",
      data: [
        { x: 0, y: 10 },
        { x: 1, y: 20 },
        { x: 2, y: 15 }
      ],
      xAccessor: "x",
      yAccessor: "y",
      size: [400, 300]
    } as any)

    expect(svg).toContain("<svg")
    expect(svg).toContain("stream-xy-frame")
  })
})

// ── Regression: Network SSR still works ─────────────────────────────

describe("renderNetworkToStaticSVG - regression", () => {
  it("renders force directed graph", () => {
    const svg = renderNetworkToStaticSVG({
      chartType: "force",
      nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
      edges: [
        { source: "A", target: "B" },
        { source: "B", target: "C" }
      ],
      size: [400, 400]
    } as any)

    expect(svg).toContain("<svg")
    expect(svg).toContain("stream-network-frame")
  })
})

// ── Network SSR: Node inference from edges ──────────────────────────

describe("renderNetworkToStaticSVG - node inference", () => {
  it("sankey infers nodes from edge source/target when no nodes provided", () => {
    const svg = renderNetworkToStaticSVG({
      chartType: "sankey",
      edges: [
        { source: "Revenue", target: "Product", value: 80 },
        { source: "Revenue", target: "Services", value: 50 },
        { source: "Product", target: "Profit", value: 60 },
        { source: "Services", target: "Profit", value: 40 },
      ],
      size: [500, 300]
    } as any)

    expect(svg).toContain("<svg")
    // 4 unique nodes: Revenue, Product, Services, Profit
    expect(countMatches(svg, /<rect /g)).toBeGreaterThanOrEqual(4)
    // 4 edges
    expect(countMatches(svg, /<path /g)).toBeGreaterThanOrEqual(4)
    // Labels for nodes
    expect(svg).toContain("Revenue")
    expect(svg).toContain("Product")
    expect(svg).toContain("Profit")
  })

  it("force infers nodes from edges when no nodes provided", () => {
    const svg = renderNetworkToStaticSVG({
      chartType: "force",
      edges: [
        { source: "A", target: "B" },
        { source: "B", target: "C" },
        { source: "C", target: "A" },
      ],
      size: [400, 400]
    } as any)

    expect(svg).toContain("<svg")
    // 3 unique nodes
    expect(countMatches(svg, /<circle /g)).toBeGreaterThanOrEqual(3)
  })

  it("returns empty SVG when neither nodes nor edges provided", () => {
    const svg = renderNetworkToStaticSVG({
      chartType: "sankey",
      size: [500, 300]
    } as any)

    expect(svg).toContain("<svg")
    expect(countMatches(svg, /<rect /g)).toBe(0)
    expect(countMatches(svg, /<path /g)).toBe(0)
  })

  it("prefers explicit nodes when both nodes and edges provided", () => {
    const svg = renderNetworkToStaticSVG({
      chartType: "force",
      nodes: [{ id: "X" }, { id: "Y" }],
      edges: [{ source: "X", target: "Y" }],
      size: [400, 400]
    } as any)

    expect(svg).toContain("<svg")
    expect(countMatches(svg, /<circle /g)).toBeGreaterThanOrEqual(2)
  })
})
