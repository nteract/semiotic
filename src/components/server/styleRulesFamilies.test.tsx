import { describe, it, expect } from "vitest"
import { renderChart } from "./renderToStaticSVG"

describe("styleRules across families (server / renderChart)", () => {
  it("XY Scatterplot — recolors points by an axis threshold", () => {
    const svg = renderChart("Scatterplot", {
      data: [
        { x: 2, y: 4 },
        { x: 6, y: 9 },
        { x: 9, y: 18 },
      ],
      xAccessor: "x",
      yAccessor: "y",
      styleRules: [{ when: { axis: "y", gte: 15 }, style: { fill: "#d7263d" } }],
    })
    expect(svg).toContain("#d7263d")
  })

  it("XY Scatterplot — hatches points over a threshold (SSR <pattern>)", () => {
    const svg = renderChart("Scatterplot", {
      data: [
        { x: 2, y: 4 },
        { x: 9, y: 18 },
      ],
      xAccessor: "x",
      yAccessor: "y",
      styleRules: [{ when: { axis: "y", gt: 10 }, style: { fill: { type: "hatch", background: "#ffd166", stroke: "#e0a92a" } } }],
    })
    expect(svg).toContain("<pattern")
    expect(svg).toContain("#e0a92a")
  })

  it("XY LineChart — recolors a series by a threshold (per-series)", () => {
    const svg = renderChart("LineChart", {
      data: [
        { x: 1, y: 40 },
        { x: 2, y: 55 },
        { x: 3, y: 70 },
      ],
      xAccessor: "x",
      yAccessor: "y",
      styleRules: [{ when: { axis: "y", gte: 40 }, style: { stroke: "#d7263d" } }],
    })
    expect(svg).toContain("#d7263d")
  })

  it("Network ForceDirectedGraph — styles a group of nodes", () => {
    const svg = renderChart("ForceDirectedGraph", {
      nodes: [
        { id: "a", kind: "db" },
        { id: "b", kind: "svc" },
        { id: "c", kind: "db" },
      ],
      edges: [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
      ],
      styleRules: [{ when: { field: "kind", eq: "db" }, style: { fill: "#8b5cf6" } }],
    })
    expect(svg).toContain("#8b5cf6")
  })

  it("Network ForceDirectedGraph — hatches a node group in SSR (<pattern>)", () => {
    const svg = renderChart("ForceDirectedGraph", {
      nodes: [
        { id: "a", kind: "db" },
        { id: "b", kind: "svc" },
      ],
      edges: [{ source: "a", target: "b" }],
      styleRules: [{ when: { field: "kind", eq: "db" }, style: { fill: { type: "hatch", background: "#8b5cf6", stroke: "#fff" } } }],
    })
    expect(svg).toContain("<pattern")
  })

  it("Physics GaltonBoardChart — hatches balls over a threshold in SSR (<pattern>)", () => {
    const svg = renderChart("GaltonBoardChart", {
      data: [{ value: 2 }, { value: 14 }],
      valueAccessor: "value",
      styleRules: [{ when: { gte: 10 }, style: { fill: { type: "hatch", background: "#d7263d", stroke: "#fff" } } }],
    })
    expect(svg).toContain("<pattern")
  })

  it("Geo ChoroplethMap — hatches a flagged feature (SSR <pattern>)", () => {
    const areas = [
      { type: "Feature", properties: { id: "A", v: 5, status: "ok" }, geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] } },
      { type: "Feature", properties: { id: "B", v: 9, status: "review" }, geometry: { type: "Polygon", coordinates: [[[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]] } },
    ]
    const svg = renderChart("ChoroplethMap", {
      areas,
      valueAccessor: "v",
      styleRules: [{ when: { field: "status", eq: "review" }, style: { fill: { type: "hatch", background: "#eee", stroke: "#d7263d" } } }],
    })
    expect(svg).toContain("<pattern")
    expect(svg).toContain("#d7263d")
  })

  it("Geo ChoroplethMap — SSR fills features by value (CSR parity, no styleRules)", () => {
    const areas = [
      { type: "Feature", properties: { id: "A", v: 2 }, geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] } },
      { type: "Feature", properties: { id: "B", v: 9 }, geometry: { type: "Polygon", coordinates: [[[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]] } },
    ]
    const svg = renderChart("ChoroplethMap", { areas, valueAccessor: "v" })
    // The two features must resolve to DIFFERENT sequential-scale fills, not both gray.
    const fills = [...svg.matchAll(/<path[^>]*fill="([^"]+)"/g)].map((m) => m[1]).filter((f) => f !== "#ccc" && f !== "none")
    const distinct = new Set(fills)
    expect(distinct.size).toBeGreaterThan(1)
  })

  it("Geo ProportionalSymbolMap — SSR colors points by colorBy (CSR parity)", () => {
    const svg = renderChart("ProportionalSymbolMap", {
      points: [
        { lon: 0, lat: 0, cat: "x", n: 5 },
        { lon: 10, lat: 10, cat: "y", n: 9 },
      ],
      sizeBy: "n",
      colorBy: "cat",
    })
    const circleFills = new Set([...svg.matchAll(/<circle[^>]*fill="([^"]+)"/g)].map((m) => m[1]))
    // Two categories → two distinct point colors, not one default.
    expect(circleFills.size).toBeGreaterThan(1)
  })

  it("Stacked bar — hatches within-limit yellow and over-max red (docs flagship)", () => {
    // Split each burst at the Max line (15) so the overage is its own segment.
    const rows = []
    for (const [i, b] of [2, 6, 8].entries()) {
      const t = `t${i}`
      rows.push({ t, tier: "Fast scaling", value: 10 })
      rows.push({ t, tier: "Fixed-rate", value: Math.min(b, 5) })
      const over = Math.max(0, 10 + b - 15)
      if (over > 0) rows.push({ t, tier: "Over max", value: over })
    }
    const svg = renderChart("StackedBarChart", {
      data: rows,
      categoryAccessor: "t",
      stackBy: "tier",
      valueAccessor: "value",
      colorScheme: { "Fast scaling": "#3fa34d", "Fixed-rate": "#f0b429", "Over max": "#d7263d" },
      valueExtent: [0, 20],
      styleRules: [
        { when: { field: "tier", eq: "Fixed-rate" }, style: { fill: { type: "hatch", background: "#f7d774", stroke: "#e0a92a" } } },
        { when: { field: "tier", eq: "Over max" }, style: { fill: { type: "hatch", background: "#f8b4b4", stroke: "#d7263d" } } },
      ],
    })
    // Both hatch patterns present: yellow (within-limit) and red (over-max).
    expect(svg).toContain("#e0a92a")
    expect(svg).toContain("#d7263d")
    expect((svg.match(/<pattern/g) || []).length).toBeGreaterThanOrEqual(2)
  })

  it("Physics GaltonBoardChart — recolors balls over a threshold", () => {
    const svg = renderChart("GaltonBoardChart", {
      data: [{ value: 2 }, { value: 8 }, { value: 14 }],
      valueAccessor: "value",
      styleRules: [{ when: { gte: 10 }, style: { fill: "#d7263d" } }],
    })
    expect(svg).toContain("#d7263d")
  })
})
